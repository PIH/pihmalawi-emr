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
import { GroupedFields } from '../mental-health/grouped-fields';
import { checkRecordDay, RecordDateInput, resolveVisit, usePastVisitType, useRecordDate } from '../shared/record-date';
import { HTN_CARD_KEY, HTN_FORMS, HTN_VISIT } from './htn-concepts';
import { DRUG_CLASSES, FOOT_CHECK_FIELDS, HTN_MEDICATION_FIELDS, HTN_REFERENCE_FIELDS, HTN_VISIT_FIELDS, medicationFieldsOf } from './htn-fields';
import { LIMITS, rangeRules as limitRules } from './htn-rules';
import { useHtnConditions } from './htn-conditions';
import styles from '../art/art-panel.scss';

export interface HtnVisitWorkspaceProps {
  patientUuid: string;
  /** The visit to edit; a new one is recorded in the chart's current O3 visit, or on an earlier day */
  encounterUuid?: string;
}

const F = HTN_VISIT_FIELDS;
const ALL_FIELDS: Array<ArtField> = [...Object.values(F), ...HTN_MEDICATION_FIELDS];

/**
 * Records or edits a hypertension and diabetes visit natively, saving the encounter hypertension-and-diabetes-visit.xml
 * saves: the measurements (shown from vitals recorded the same day, as its obsreference fields do), glucose, risk
 * factors, foot check, the medications dispensed and the next appointment
 */
const HtnVisitWorkspace: React.FC<Workspace2DefinitionProps<HtnVisitWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, encounterUuid },
}) => {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();
  const session = useSession();
  const { patient } = usePatient(patientUuid);
  const { card, systemLocationsTag } = useEMastercard(patientUuid, HTN_CARD_KEY);
  const { encounters: visits, isLoading } = useCardEncounters(patientUuid, HTN_FORMS.visit);
  const locations = useLocationsTagged(systemLocationsTag);
  const conditions = useHtnConditions(patientUuid);
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
    [...HTN_REFERENCE_FIELDS.map((f) => f.concept), HTN_VISIT.nextAppointment],
    visitDay,
  );
  const references = useMemo(() => {
    const refs: Record<string, FieldValue> = {};
    HTN_REFERENCE_FIELDS.forEach((f) => (refs[f.name] = sameDayValue((sameDay[f.concept] ?? []) as Array<any>, visitDay, encounterUuid)));
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
    // a next appointment already booked the same day, in another encounter
    if (!editing && !initial.nextAppointment) {
      const next = sameDayValue((sameDay[HTN_VISIT.nextAppointment] ?? []) as Array<any>, visitDay);
      initial.nextAppointment = next ? String(next).slice(0, 10) : null;
    }
    setValues(initial);
    setLocation(editing?.location?.uuid ?? session?.sessionLocation?.uuid ?? '');
  }, [ready, values, editing, sameDay, visitDay, session]);

  const title = editing ? t('editHtnVisit', 'Edit hypertension and diabetes visit') : t('recordHtnVisit', 'Record hypertension and diabetes visit');
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
  const rangeRules = limitRules(values, Object.keys(LIMITS));
  const birthDate = patient?.birthDate;
  // the flowsheet's height checks, only for a height or weight the clinician entered here
  const heightRule: RuleResult =
    values.height !== null || values.weight !== null
      ? (checkHeightWeight(num('height'), num('weight')) ??
        checkHeightHistory(
          values.height === null ? null : Number(values.height),
          birthDate ? dayjs(visitDate).diff(dayjs(birthDate), 'year') : 99,
          others
            .filter((v) => obsValue(v, HTN_VISIT.height) !== null)
            .map((v) => ({
              height: Number(obsValue(v, HTN_VISIT.height)),
              date: v.encounterDatetime,
            })),
          visitDate,
        ))
      : null;

  const save = async () => {
    setSubmitted(true);
    setError(null);
    if ([dateRule, nextRule, duplicateRule, ...Object.values(rangeRules)].some((r) => r?.level === 'error')) {
      return;
    }
    setSaving(true);
    try {
      await saveEncounter(HTN_FORMS.visit, {
        patientUuid,
        encounterUuid,
        ...(editing
          ? { datetime: visitDate }
          : await resolveVisit(patientUuid, record.day, {
              visitContext: record.visitContext,
              locationUuid: location,
              visitTypeUuid: pastVisitType,
            })),
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
      rule={rangeRules[f.name] ?? rule}
      onChange={(value) => change({ [f.name]: value })}
    />
  );

  return (
    <Workspace2 title={title} hasUnsavedChanges={dirty}>
      <div className={styles.panel}>
        <div className={styles.row}>
          <RecordDateInput id="htn-visit-date" label={t('visitDate', 'Visit date')} record={record} rule={dateRule} readOnly={readOnly} />
          <Select
            id="htn-visit-location"
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
          </div>
          {field(F.bmi)}
          <div className={styles.row}>
            {field(F.systolicBp)}
            {field(F.diastolicBp)}
            {field(F.pulse)}
          </div>
        </section>

        {conditions.diabetes && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>{t('glucoseMonitoring', 'Glucose Monitoring')}</h4>
            <div className={styles.row}>
              {field(F.hbA1c)}
              {field(F.glucose)}
            </div>
            {field(F.glucoseTestType)}
          </section>
        )}

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('riskAssessment', 'Risk Assessment')}</h4>
          {field(F.tobacco)}
          {field(F.alcohol)}
          <div className={styles.row}>
            {field(F.fruitVegetables)}
            {field(F.exercise)}
          </div>
          <div className={styles.row}>
            {field(F.cvRisk)}
            {field(F.visualAcuity)}
          </div>
        </section>

        {conditions.diabetes && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>{t('footCheck', 'Foot Check')}</h4>
            {FOOT_CHECK_FIELDS.map((f) => field(f))}
          </section>
        )}

        <section className={styles.section}>{field(F.hospitalised)}</section>

        {DRUG_CLASSES.filter((c) => !c.condition || conditions[c.condition]).map((c) => (
          <section className={styles.section} key={c.key}>
            <h4 className={styles.sectionTitle}>{t(`drugClass_${c.key}`, c.title)}</h4>
            <GroupedFields fields={medicationFieldsOf(c.key)} values={values} readOnly={readOnly} onChange={change} />
          </section>
        ))}

        <section className={styles.section}>{field(F.nextAppointment, nextRule)}</section>

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

export default HtnVisitWorkspace;
