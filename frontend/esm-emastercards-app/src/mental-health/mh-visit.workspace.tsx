import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useSWRConfig } from 'swr';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, InlineLoading, InlineNotification, RadioButton, RadioButtonGroup, Select, SelectItem, TextInput } from '@carbon/react';
import { usePatient, useSession, type Workspace2DefinitionProps, Workspace2 } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { type ArtField, formatDay } from '../art/art-fields';
import { checkDuplicate, checkHeightHistory, checkHeightWeight, checkNextAppointment, type RuleResult, sameDayValue } from '../art/art-rules';
import { encounterValues, obsValue, useArtEncounter, useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { buildObsPayload, encounterDatetimeFor, type FieldValue, saveEncounter } from '../art/obs-diff';
import { ArtFieldInput } from '../art/fields';
import { MH_CARD_KEY, MH_FORMS, MH_VISIT } from './mh-concepts';
import { MEDICATIONS, medicationFields, MH_VISIT_FIELDS, MSE_FINDINGS } from './mh-fields';
import { mseState, setMse } from './mh-rules';
import { GroupedFields } from './grouped-fields';
import styles from '../art/art-panel.scss';

export interface MhVisitWorkspaceProps {
  patientUuid: string;
  /** The visit to edit; a new one is recorded in the chart's current O3 visit */
  encounterUuid?: string;
}

const F = MH_VISIT_FIELDS;
const REFERENCE_FIELDS = [F.height, F.weight, F.phq9Score];
const WELLBEING_FIELDS = [
  F.stable,
  F.dailyActivities,
  F.useChamba,
  F.useAlcohol,
  F.useOtherDrugs,
  F.pregnant,
  F.familyPlanning,
  F.suicideRisk,
  F.sideEffects,
  F.hospitalised,
  F.counselling,
];
const MEDICATION_FIELDS = MEDICATIONS.flatMap(medicationFields);
const ALL_FIELDS: Array<ArtField> = [...Object.values(F), ...MEDICATION_FIELDS];

const day = (date: string) => dayjs(date).format('YYYY-MM-DD');
const list = (value: FieldValue) => (Array.isArray(value) ? value : []);

/**
 * Records or edits a mental health visit natively, saving the encounter mental-health-visit.xml saves, with its
 * rules: MSE findings present or absent, the required next appointment and the flowsheet's checks
 */
const MhVisitWorkspace: React.FC<Workspace2DefinitionProps<MhVisitWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, encounterUuid },
}) => {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();
  const session = useSession();
  const { patient } = usePatient(patientUuid);
  const { visitContext } = usePatientChartStore(patientUuid);
  const { card, systemLocationsTag } = useEMastercard(patientUuid, MH_CARD_KEY);
  const { encounters: visits, isLoading } = useCardEncounters(patientUuid, MH_FORMS.visit);
  const locations = useLocationsTagged(systemLocationsTag);
  const { encounter: fetched, isLoading: loadingEncounter } = useArtEncounter(
    patientUuid,
    encounterUuid && !visits.some((e) => e.uuid === encounterUuid) ? encounterUuid : undefined,
  );
  const editing = encounterUuid ? (visits.find((e) => e.uuid === encounterUuid) ?? fetched) : undefined;
  const visitDate = editing?.encounterDatetime ?? (visitContext ? encounterDatetimeFor(visitContext) : null);
  const visitDay = visitDate ? day(visitDate) : null;
  const { obs: sameDay, isLoading: loadingSameDay } = useSameDayObs(
    patientUuid,
    [...REFERENCE_FIELDS.map((f) => f.concept), MH_VISIT.nextAppointment],
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
    // an older visit may hold a finding as both present and absent; it was present
    initial.mseAbsent = list(initial.mseAbsent).filter((a) => mseState(list(initial.msePresent), [], a) !== 'present');
    if (!editing && !initial.nextAppointment) {
      const next = sameDayValue((sameDay[MH_VISIT.nextAppointment] ?? []) as Array<any>, visitDay);
      initial.nextAppointment = next ? String(next).slice(0, 10) : null;
    }
    setValues(initial);
    setLocation(editing?.location?.uuid ?? session?.sessionLocation?.uuid ?? '');
  }, [ready, values, editing, sameDay, visitDay, session]);

  const title = editing ? t('editMentalHealthVisit', 'Edit mental health visit') : t('recordMentalHealthVisit', 'Record mental health visit');
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
    setValues(next);
    setDirty(true);
  };
  const num = (name: string) => {
    const value = values[name] ?? references[name];
    return value === null || value === undefined ? null : Number(value);
  };
  const nextRule = checkNextAppointment(values.nextAppointment as string, visitDate);
  const duplicateRule = checkDuplicate(visitDate, others.map((v) => ({ date: v.encounterDatetime, encounterUuid: v.uuid })), encounterUuid);
  const birthDate = patient?.birthDate;
  // the flowsheet's height checks, only for a height or weight the clinician entered here
  const heightRule: RuleResult =
    values.height !== null || values.weight !== null
      ? (checkHeightWeight(num('height'), num('weight')) ??
        checkHeightHistory(
          values.height === null ? null : Number(values.height),
          birthDate ? dayjs(visitDate).diff(dayjs(birthDate), 'year') : 99,
          others
            .filter((v) => obsValue(v, MH_VISIT.height) !== null)
            .map((v) => ({ height: Number(obsValue(v, MH_VISIT.height)), date: v.encounterDatetime })),
          visitDate,
        ))
      : null;

  const save = async () => {
    setSubmitted(true);
    setError(null);
    if ([nextRule, duplicateRule].some((r) => r?.level === 'error')) {
      return;
    }
    setSaving(true);
    try {
      await saveEncounter(MH_FORMS.visit, {
        patientUuid,
        encounterUuid,
        visitUuid: editing ? undefined : visitContext?.uuid,
        datetime: visitDate,
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
      rule={rule}
      onChange={(value) => change({ ...values, [f.name]: value })}
    />
  );

  return (
    <Workspace2 title={title} hasUnsavedChanges={dirty}>
      <div className={styles.panel}>
        <div className={styles.row}>
          <TextInput id="mh-visit-date" labelText={t('visitDate', 'Visit date')} value={formatDay(visitDate)} readOnly />
          <Select
            id="mh-visit-location"
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
          <h4 className={styles.sectionTitle}>{t('visit', 'Visit')}</h4>
          <div className={styles.row}>
            {field(F.height, heightRule)}
            {field(F.weight)}
            {field(F.phq9Score)}
          </div>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('mentalStatusExamination', 'Mental status examination')}</h4>
          {MSE_FINDINGS.map((f) => {
            const state = mseState(list(values.msePresent), list(values.mseAbsent), f.answer);
            return (
              <fieldset key={f.key} className={styles.fieldset}>
                <RadioButtonGroup
                  legendText={f.label}
                  name={`mse-${f.key}`}
                  valueSelected={state ?? ''}
                  orientation="horizontal"
                  disabled={readOnly}
                  onChange={(selected) => change(setMse(values, f.answer, selected as 'present' | 'absent'))}
                >
                  <RadioButton id={`mse-${f.key}-present`} labelText={t('yes', 'Yes')} value="present" />
                  <RadioButton id={`mse-${f.key}-absent`} labelText={t('no', 'No')} value="absent" />
                </RadioButtonGroup>
                {!readOnly && state && (
                  <button type="button" className={styles.clear} onClick={() => change(setMse(values, f.answer, null))}>
                    {t('clear', 'Clear')}
                  </button>
                )}
              </fieldset>
            );
          })}
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('wellbeing', 'Wellbeing')}</h4>
          <GroupedFields fields={WELLBEING_FIELDS} values={values} readOnly={readOnly} onChange={change} />
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('treatmentDetails', 'Treatment details')}</h4>
          <GroupedFields fields={MEDICATION_FIELDS} values={values} readOnly={readOnly} onChange={change} />
        </section>

        <section className={styles.section}>
          {field(F.comments)}
          {field(F.nextAppointment, submitted || values.nextAppointment ? nextRule : null)}
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

export default MhVisitWorkspace;
