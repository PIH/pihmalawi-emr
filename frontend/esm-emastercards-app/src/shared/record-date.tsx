import React, { useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { TextInput } from '@carbon/react';
import { openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { formatDay } from '../art/art-fields';
import { type RuleResult } from '../art/art-rules';
import { encounterDatetimeFor } from '../art/obs-diff';
import { type ConfigObject } from '../config-schema';

const day = (date: string) => dayjs(date).format('YYYY-MM-DD');

interface ChartVisit {
  uuid: string;
  startDatetime: string;
  stopDatetime?: string | null;
  visitType?: { uuid: string } | null;
}

/**
 * The day a panel records its encounter on. A new encounter is recorded in the chart's current O3 visit by default,
 * or on an earlier day the clinician chooses, for entering a past visit as the legacy flowsheet allowed; an
 * encounter being edited keeps its own date.
 */
export function useRecordDate(patientUuid: string, editing?: { encounterDatetime: string } | null) {
  const { visitContext } = usePatientChartStore(patientUuid);
  const contextDay = visitContext ? day(encounterDatetimeFor(visitContext)) : null;
  const [chosen, setChosen] = useState<string | null>(null);
  const recordDay = editing ? day(editing.encounterDatetime) : (chosen ?? contextDay);
  const inContext = !editing && !!visitContext && recordDay === contextDay;
  return {
    /** The encounter's date and time as the panel's rules use it */
    datetime: editing ? editing.encounterDatetime : inContext ? encounterDatetimeFor(visitContext) : recordDay,
    day: recordDay,
    setDay: setChosen,
    editable: !editing,
    /** Whether the encounter goes into the chart's current visit */
    inContext,
    visitContext: visitContext as ChartVisit | null,
  };
}

/** A past day must be a real day, not in the future and not before the patient was born */
export function checkRecordDay(value: string | null, birthDate?: string | null): RuleResult {
  if (!value || !dayjs(value).isValid()) {
    return { level: 'error', message: 'Required' };
  }
  if (value > dayjs().format('YYYY-MM-DD')) {
    return { level: 'error', message: 'Cannot be in the future' };
  }
  if (birthDate && value < day(birthDate)) {
    return { level: 'error', message: 'Cannot be before the patient was born' };
  }
  return null;
}

/**
 * The O3 visit a new encounter on the given day goes into, and its date and time within it: the chart's current
 * visit when it is that day's, else the patient's visit on that day, else a visit for the day that is created, as
 * O3 records a past visit
 */
export async function resolveVisit(
  patientUuid: string,
  recordDay: string,
  {
    visitContext,
    locationUuid,
    visitTypeUuid,
  }: { visitContext: ChartVisit | null; locationUuid: string; visitTypeUuid: string },
): Promise<{ visitUuid: string; datetime: string }> {
  if (visitContext && day(encounterDatetimeFor(visitContext)) === recordDay) {
    return { visitUuid: visitContext.uuid, datetime: encounterDatetimeFor(visitContext) };
  }
  const startOfDay = dayjs(recordDay).startOf('day');
  const res = await openmrsFetch<{ results: Array<ChartVisit> }>(
    `${restBaseUrl}/visit?patient=${patientUuid}&includeInactive=true&v=custom:(uuid,startDatetime,stopDatetime)&limit=100`,
  );
  const existing = (res.data?.results ?? []).find((v) => {
    const start = day(v.startDatetime);
    const stop = v.stopDatetime ? day(v.stopDatetime) : dayjs().format('YYYY-MM-DD');
    return start <= recordDay && recordDay <= stop;
  });
  if (existing) {
    const start = dayjs(existing.startDatetime);
    return { visitUuid: existing.uuid, datetime: (start.isAfter(startOfDay) ? start : startOfDay).format('YYYY-MM-DDTHH:mm:ss.SSSZZ') };
  }
  const created = await openmrsFetch<{ uuid: string }>(`${restBaseUrl}/visit?v=custom:(uuid)`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      patient: patientUuid,
      visitType: visitContext?.visitType?.uuid ?? visitTypeUuid,
      location: locationUuid,
      startDatetime: startOfDay.format('YYYY-MM-DDTHH:mm:ss.SSSZZ'),
      stopDatetime: startOfDay.endOf('day').format('YYYY-MM-DDTHH:mm:ss.SSSZZ'),
    },
  });
  return { visitUuid: created.data.uuid, datetime: startOfDay.format('YYYY-MM-DDTHH:mm:ss.SSSZZ') };
}

/** The visit type a past visit is created with, from the configuration */
export function usePastVisitType(): string {
  const config = useConfig<ConfigObject>();
  return config?.pastVisitTypeUuid ?? 'f01c54cb-2225-471a-9cd5-d348552c337c';
}

/** The panel's date: chosen for a new encounter, today's visit by default; shown only for one being edited */
export const RecordDateInput: React.FC<{
  id: string;
  label: string;
  record: ReturnType<typeof useRecordDate>;
  rule: RuleResult;
  readOnly?: boolean;
}> = ({ id, label, record, rule, readOnly }) => {
  const { t } = useTranslation();
  if (!record.editable || readOnly) {
    return <TextInput id={id} labelText={label} value={formatDay(record.datetime) ?? ''} readOnly />;
  }
  return (
    <TextInput
      id={id}
      type="date"
      labelText={label}
      value={record.day ?? ''}
      max={dayjs().format('YYYY-MM-DD')}
      invalid={rule?.level === 'error'}
      invalidText={rule?.message}
      helperText={
        record.inContext
          ? t('recordedInCurrentVisit', 'Recorded in the current visit. Choose an earlier date to enter a past visit.')
          : t('recordedAsPastVisit', 'Entered as a past visit on this date.')
      }
      onChange={(e) => record.setDay(e.target.value || null)}
    />
  );
};
