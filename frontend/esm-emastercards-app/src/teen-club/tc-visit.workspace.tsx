import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useSWRConfig } from 'swr';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, InlineLoading, InlineNotification, Select, SelectItem } from '@carbon/react';
import { usePatient, useSession, type Workspace2DefinitionProps, Workspace2 } from '@openmrs/esm-framework';
import { type ArtField } from '../art/art-fields';
import { checkDuplicate, checkHeightHistory, checkHeightWeight, checkNextAppointment, type RuleResult, sameDayValue } from '../art/art-rules';
import {
  encounterValues,
  obsValue,
  useArtEncounter,
  useCardEncounters,
  useEMastercard,
  useLocationsTagged,
  useSameDayObs,
} from '../art/art.resource';
import { buildObsPayload, type FieldValue, saveEncounter } from '../art/obs-diff';
import { ArtFieldInput } from '../art/fields';
import { LIMITS, rangeRules } from '../shared/ncd';
import { checkRecordDay, RecordDateInput, resolveVisit, usePastVisitType, useRecordDate } from '../shared/record-date';
import { TC_CARD_KEY, TC_FORMS, TC_VISIT } from './tc-concepts';
import { TC_VISIT_FIELDS } from './tc-fields';
import styles from '../art/art-panel.scss';

export interface TcVisitWorkspaceProps {
  patientUuid: string;
  /** The visit to edit; a new one is recorded in the chart's current O3 visit, or on an earlier day */
  encounterUuid?: string;
}

const F = TC_VISIT_FIELDS;
const ALL_FIELDS: Array<ArtField> = Object.values(F);
const REFERENCE_FIELDS = ALL_FIELDS.filter((f) => f.reference);

/**
 * Records or edits a teen club visit natively, saving the encounter teen-club-visit.xml saves: height, weight, MUAC/BMI
 * and TB status (shown from those recorded the same day, as its obsreference fields do), the TB, nutrition, mental
 * health and STI screening and referrals, hospitalisation and the next appointment, prefilled from the same day
 */
const TcVisitWorkspace: React.FC<Workspace2DefinitionProps<TcVisitWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, encounterUuid },
}) => {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();
  const session = useSession();
  const { patient } = usePatient(patientUuid);
  const { card, systemLocationsTag } = useEMastercard(patientUuid, TC_CARD_KEY);
  const { encounters: visits, isLoading } = useCardEncounters(patientUuid, TC_FORMS.visit);
  const locations = useLocationsTagged(systemLocationsTag);
  const { encounter: fetched, isLoading: loadingEncounter } = useArtEncounter(
    patientUuid,
    encounterUuid && !visits.some((e) => e.uuid === encounterUuid) ? encounterUuid : undefined,
  );
  const editing = encounterUuid ? (visits.find((e) => e.uuid === encounterUuid) ?? fetched) : undefined;
  // today's visit by default, or an earlier day for a past visit
  const record = useRecordDate(patientUuid, editing);
  const pastVisitType = usePastVisitType();
  const visitDate = record.datetime;
  const visitDay = record.day;
  const { obs: sameDay, isLoading: loadingSameDay } = useSameDayObs(
    patientUuid,
    [...REFERENCE_FIELDS.map((f) => f.concept), TC_VISIT.nextAppointment],
    visitDay,
  );
  const references = useMemo(() => {
    const refs: Record<string, FieldValue> = {};
    REFERENCE_FIELDS.forEach((f) => (refs[f.name] = sameDayValue((sameDay[f.concept] ?? []) as Array<any>, visitDay, encounterUuid)));
    return refs;
  }, [sameDay, visitDay, encounterUuid]);

  const [values, setValues] = useState<Record<string, FieldValue> | null>(null);
  const [location, setLocation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = !isLoading && !loadingEncounter && !loadingSameDay && (!encounterUuid || editing);
  useEffect(() => {
    if (!ready || values) {
      return;
    }
    const initial = encounterValues(ALL_FIELDS, editing);
    // a next appointment already booked the same day, in another encounter, as the form's obsreference shows it
    if (!editing && !initial.nextAppointment) {
      const next = sameDayValue((sameDay[TC_VISIT.nextAppointment] ?? []) as Array<any>, visitDay);
      initial.nextAppointment = next ? String(next).slice(0, 10) : null;
    }
    setValues(initial);
    setLocation(editing?.location?.uuid ?? session?.sessionLocation?.uuid ?? '');
  }, [ready, values, editing, sameDay, visitDay, session]);

  const title = editing ? t('editTcVisit', 'Edit teen club visit') : t('recordTcVisit', 'Record teen club visit');
  if (!values) {
    return (
      <Workspace2 title={title}>
        <InlineLoading description={t('loading', 'Loading...')} />
      </Workspace2>
    );
  }
  if (!visitDate) {
    return (
      <Workspace2 title={title}>
        <InlineNotification kind="warning" lowContrast hideCloseButton title={t('startVisitToRecord', 'Start a visit to record this.')} />
      </Workspace2>
    );
  }

  const readOnly = card?.state !== 'EDIT';
  const others = visits.filter((v) => v.uuid !== encounterUuid);
  const change = (next: Record<string, FieldValue>) => {
    setValues((v) => ({ ...v, ...next }));
    setDirty(true);
  };
  const num = (name: string) => {
    const value = values[name] ?? references[name];
    return value === null || value === undefined ? null : Number(value);
  };
  const dateRule = record.editable ? checkRecordDay(record.day, patient?.birthDate) : null;
  const nextRule = values.nextAppointment ? checkNextAppointment(values.nextAppointment as string, visitDate) : null;
  const duplicateRule = checkDuplicate(
    visitDate,
    others.map((v) => ({ date: v.encounterDatetime, encounterUuid: v.uuid })),
    encounterUuid,
  );
  // each number within its concept's limits, shown while it is typed
  const limitRules = rangeRules(values, Object.keys(LIMITS));
  const birthDate = patient?.birthDate;
  // the flowsheet's height checks, only for a height or weight the clinician entered here
  const heightRule: RuleResult =
    values.height !== null || values.weight !== null
      ? (checkHeightWeight(num('height'), num('weight')) ??
        checkHeightHistory(
          values.height === null ? null : Number(values.height),
          birthDate ? dayjs(visitDate).diff(dayjs(birthDate), 'year') : 99,
          others
            .filter((v) => obsValue(v, TC_VISIT.height) !== null)
            .map((v) => ({ height: Number(obsValue(v, TC_VISIT.height)), date: v.encounterDatetime })),
          visitDate,
        ))
      : null;

  const save = async () => {
    setSubmitted(true);
    setError(null);
    if ([dateRule, nextRule, duplicateRule, ...Object.values(limitRules)].some((r) => r?.level === 'error')) {
      return;
    }
    setSaving(true);
    try {
      await saveEncounter(TC_FORMS.visit, {
        patientUuid,
        encounterUuid,
        ...(editing
          ? { datetime: visitDate }
          : await resolveVisit(patientUuid, record.day, { visitContext: record.visitContext, locationUuid: location, visitTypeUuid: pastVisitType })),
        locationUuid: location,
        payload: buildObsPayload(ALL_FIELDS, values, editing?.obs ?? [], references),
      });
      mutate(() => true);
      closeWorkspace({ discardUnsavedChanges: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const field = (f: ArtField, rule: RuleResult = null) => (
    <ArtFieldInput
      key={f.name}
      field={f}
      value={values[f.name] ?? null}
      reference={references[f.name]}
      readOnly={readOnly}
      rule={limitRules[f.name] ?? rule}
      onChange={(value) => change({ [f.name]: value })}
    />
  );

  return (
    <Workspace2 title={title} hasUnsavedChanges={dirty}>
      <div className={styles.panel}>
        <div className={styles.row}>
          <RecordDateInput id="tc-visit-date" label={t('visitDate', 'Visit date')} record={record} rule={dateRule} readOnly={readOnly} />
          <Select
            id="tc-visit-location"
            labelText={t('location', 'Location')}
            value={location}
            disabled={readOnly}
            onChange={(e) => {
              setLocation(e.target.value);
              setDirty(true);
            }}
          >
            <SelectItem value="" text={t('chooseLocation', 'Choose a location')} />
            {locations.map((l) => (
              <SelectItem key={l.uuid} value={l.uuid} text={l.display} />
            ))}
          </Select>
        </div>
        {submitted && duplicateRule && <InlineNotification kind="error" lowContrast hideCloseButton title={duplicateRule.message} />}

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('measurements', 'Measurements')}</h4>
          <div className={styles.row}>
            {field(F.height, heightRule)}
            {field(F.weight)}
            {field(F.muacBmi)}
          </div>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('tbScreening', 'TB Screening')}</h4>
          {field(F.tbStatus)}
          {field(F.tbScreeningOutcome)}
          {field(F.sputumCollected)}
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('nutrition', 'Nutrition')}</h4>
          {field(F.muacNormal)}
          {field(F.nutritionReferral)}
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('mentalHealth', 'Mental health')}</h4>
          {field(F.mentalHealthScreened)}
          {field(F.mentalHealthReferred)}
          {field(F.mentalHealthRegistered)}
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('sti', 'STI')}</h4>
          {field(F.stiScreeningOutcome)}
          {field(F.stiReferral)}
        </section>

        <section className={styles.section}>
          {field(F.hospitalised)}
          {field(F.nextAppointment, nextRule)}
        </section>

        {error && <InlineNotification kind="error" lowContrast hideCloseButton title={error} />}

        {!readOnly && (
          <ButtonSet>
            <Button kind="secondary" onClick={() => closeWorkspace()}>
              {t('discard', 'Discard')}
            </Button>
            <Button kind="primary" onClick={save} disabled={saving}>
              {t('saveAndClose', 'Save and close')}
            </Button>
          </ButtonSet>
        )}
      </div>
    </Workspace2>
  );
};

export default TcVisitWorkspace;
