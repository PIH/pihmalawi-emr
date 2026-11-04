import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useSWRConfig } from 'swr';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ButtonSet,
  Checkbox,
  InlineLoading,
  InlineNotification,
  Select,
  SelectItem,
  TextInput,
} from '@carbon/react';
import { usePatient, useSession, type Workspace2DefinitionProps, Workspace2 } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { ART_VISIT } from './art-concepts';
import { ART_VISIT_FIELDS, type ArtField, formatDay, PREVENTIVE_THERAPIES, PREVENTIVE_THERAPY_FIELDS } from './art-fields';
import {
  adherencePercent,
  checkDuplicate,
  checkHeightHistory,
  checkHeightWeight,
  checkNextAppointment,
  checkRegimen,
  type RuleResult,
  sameDayValue,
} from './art-rules';
import {
  type ArtEncounter,
  memberValue,
  obsGroups,
  obsValue,
  useArtCard,
  useArtEncounter,
  useArtEncounters,
  useLocationsTagged,
  useSameDayObs,
} from './art.resource';
import { buildObsPayload, encounterDatetimeFor, type FieldValue, saveArtEncounter } from './obs-diff';
import { ArtFieldInput } from './fields';
import styles from './art-panel.scss';

export interface ArtVisitWorkspaceProps {
  patientUuid: string;
  /** The ART visit to edit; a new one is recorded in the chart's current O3 visit */
  encounterUuid?: string;
}

const F = ART_VISIT_FIELDS;
const REFERENCE_FIELDS = [F.height, F.weight, F.systolicBp, F.diastolicBp];

function day(date: string) {
  return dayjs(date).format('YYYY-MM-DD');
}

function valuesOf(encounter: ArtEncounter | undefined): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {};
  Object.values(F).forEach((f) => (values[f.name] = obsValue(encounter, f.concept, f.kind === 'multi')));
  obsGroups(encounter, ART_VISIT.preventiveTherapyGroup).forEach((g) => {
    const drug = PREVENTIVE_THERAPIES.find((p) => p.drug === String(memberValue(g, ART_VISIT.preventiveTherapyStatus)).toLowerCase());
    if (drug) {
      values[`${drug.key}Status`] = drug.drug;
      values[`${drug.key}Pills`] = memberValue(g, ART_VISIT.preventiveTherapyPills);
    }
  });
  return values;
}

/**
 * Records or edits an ART visit natively, saving the encounter art-visit.xml saves, with its rules: the regimen
 * check, required tablets and next appointment, the flowsheet's height and appointment checks and no second ART
 * visit on one day
 */
const ArtVisitWorkspace: React.FC<Workspace2DefinitionProps<ArtVisitWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, encounterUuid },
}) => {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();
  const session = useSession();
  const { patient } = usePatient(patientUuid);
  const { visitContext } = usePatientChartStore(patientUuid);
  const { card, systemLocationsTag } = useArtCard(patientUuid);
  const { encounters: visits, isLoading } = useArtEncounters(patientUuid, 'visit');
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
    [...REFERENCE_FIELDS.map((f) => f.concept), ART_VISIT.nextAppointment],
    visitDay,
  );
  const references = useMemo(() => {
    const refs: Record<string, FieldValue> = {};
    REFERENCE_FIELDS.forEach((f) => {
      refs[f.name] = sameDayValue((sameDay[f.concept] ?? []) as Array<any>, visitDay, encounterUuid);
    });
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
    const initial = valuesOf(editing);
    REFERENCE_FIELDS.forEach((f) => {
      if (f.reference === 'override' && initial[f.name] === null && references[f.name] !== null) {
        initial[f.name] = references[f.name];
      }
    });
    if (!editing && !initial.nextAppointment) {
      const next = sameDayValue((sameDay[ART_VISIT.nextAppointment] ?? []) as Array<any>, visitDay);
      initial.nextAppointment = next ? String(next).slice(0, 10) : null;
    }
    setValues(initial);
    setLocation(editing?.location?.uuid ?? session?.sessionLocation?.uuid ?? '');
  }, [ready, values, editing, references, sameDay, visitDay, session]);

  const readOnly = card?.state !== 'EDIT';
  const female = patient?.gender === 'female';
  const others = visits.filter((v) => v.uuid !== encounterUuid);

  if (!values) {
    return (
      <Workspace2 title={t('artVisit', 'ART visit')}>
        <InlineLoading description={t('loading', 'Loading...')} />
      </Workspace2>
    );
  }
  if (!visitDate) {
    return (
      <Workspace2 title={t('recordArtVisit', 'Record ART visit')}>
        <InlineNotification kind="warning" lowContrast hideCloseButton title={t('startVisitFirst', 'Start a visit to record an ART visit.')} />
      </Workspace2>
    );
  }

  const set = (name: string) => (value: FieldValue) => {
    setValues((v) => ({ ...v, [name]: value }));
    setDirty(true);
  };
  const num = (name: string) => (values[name] === null || values[name] === undefined ? null : Number(values[name]));

  const regimenRule = checkRegimen(
    values.artRegimen as string,
    others
      .map((v) => ({ regimen: obsValue(v, ART_VISIT.artRegimen) as string, date: v.encounterDatetime, encounterUuid: v.uuid }))
      .filter((h) => h.regimen),
    visitDate,
    encounterUuid,
  );
  const nextRule = checkNextAppointment(values.nextAppointment as string, visitDate);
  const tabletsRule: RuleResult = values.numArvsGiven === null || values.numArvsGiven === undefined ? { level: 'error', message: 'Required' } : null;
  const duplicateRule = checkDuplicate(visitDate, others.map((v) => ({ date: v.encounterDatetime, encounterUuid: v.uuid })), encounterUuid);
  const birthDate = patient?.birthDate;
  const heightRule =
    checkHeightWeight(num('height'), num('weight')) ??
    checkHeightHistory(
      num('height'),
      birthDate ? dayjs(visitDate).diff(dayjs(birthDate), 'year') : 99,
      others
        .filter((v) => obsValue(v, ART_VISIT.height) !== null)
        .map((v) => ({ height: Number(obsValue(v, ART_VISIT.height)), date: v.encounterDatetime })),
      visitDate,
    );
  // shown once there is a value or the clinician tried to save; "Required" only after trying
  const shown = (rule: RuleResult, value: FieldValue) =>
    rule && (submitted || (value !== null && value !== undefined && value !== '')) ? rule : null;

  const previous = others.find((v) => day(v.encounterDatetime) < visitDay);
  const adherence = adherencePercent(
    num('pillCount'),
    previous ? (obsValue(previous, ART_VISIT.numArvsGiven) as number) : null,
    previous ? dayjs(visitDay).diff(dayjs(day(previous.encounterDatetime)), 'day') : 0,
  );

  const save = async () => {
    setSubmitted(true);
    setError(null);
    const blocking = [regimenRule, nextRule, tabletsRule, duplicateRule].some((r) => r?.level === 'error');
    if (blocking) {
      return;
    }
    const fields: Array<ArtField> = [...Object.values(F).filter((f) => female || !f.femaleOnly), ...PREVENTIVE_THERAPY_FIELDS];
    const payload = buildObsPayload(fields, values, editing?.obs ?? [], references);
    setSaving(true);
    try {
      await saveArtEncounter('visit', {
        patientUuid,
        encounterUuid,
        visitUuid: editing ? undefined : visitContext?.uuid,
        datetime: visitDate,
        locationUuid: location,
        payload,
      });
      mutate(() => true);
      closeWorkspace({ discardUnsavedChanges: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const field = (f: ArtField, rule?: RuleResult, extra: Partial<React.ComponentProps<typeof ArtFieldInput>> = {}) => (
    <ArtFieldInput
      key={f.name}
      field={f}
      value={values[f.name] ?? null}
      onChange={set(f.name)}
      reference={references[f.name]}
      rule={rule}
      readOnly={readOnly}
      {...extra}
    />
  );

  return (
    <Workspace2 title={editing ? t('editArtVisit', 'Edit ART visit') : t('recordArtVisit', 'Record ART visit')} hasUnsavedChanges={dirty}>
      <div className={styles.panel}>
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('visit', 'Visit')}</h4>
          <div className={styles.row}>
            <TextInput id="art-visit-date" labelText={t('visitDate', 'Visit date')} value={formatDay(visitDate)} readOnly />
            <Select
              id="art-visit-location"
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
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('clinical', 'Clinical')}</h4>
          <div className={styles.row}>
            {field(F.height, shown(heightRule, values.height))}
            {field(F.weight)}
            {field(F.systolicBp)}
            {field(F.diastolicBp)}
          </div>
          {female && field(F.pregnantLactating)}
          {field(F.tbStatus)}
          {field(F.sideEffects)}
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('adherence', 'Adherence')}</h4>
          <div className={styles.row}>
            {field(F.pillCount)}
            {field(F.dosesMissed)}
          </div>
          {adherence !== null && <span className={styles.hint}>{t('adherencePercent', 'Adherence: {{percent}}%', { percent: adherence })}</span>}
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('dispensing', 'Dispensing')}</h4>
          {field(F.artRegimen, shown(regimenRule, values.artRegimen))}
          <div className={styles.row}>
            {field(F.numArvsGiven, submitted ? tabletsRule : null)}
            {field(F.arvsGivenTo, undefined, { booleanLabels: [t('patient', 'Patient (P)'), t('guardian', 'Guardian (G)')] })}
          </div>
          <fieldset className={styles.fieldset} aria-label={t('cptIptGiven', 'CPT/IPT given')}>
            <legend className={styles.legend}>{t('cptIptGiven', 'CPT/IPT given')}</legend>
            {PREVENTIVE_THERAPIES.map((p) => (
              <div key={p.key} className={styles.therapy}>
                <Checkbox
                  id={`art-${p.key}`}
                  labelText={p.label}
                  checked={Boolean(values[`${p.key}Status`])}
                  disabled={readOnly}
                  onChange={(_, { checked }) => set(`${p.key}Status`)(checked ? p.drug : null)}
                />
                <TextInput
                  id={`art-${p.key}-pills`}
                  labelText={t('pillsOf', '{{drug}} pills', { drug: p.label, interpolation: { escapeValue: false } })}
                  type="number"
                  readOnly={readOnly}
                  value={values[`${p.key}Pills`] === null || values[`${p.key}Pills`] === undefined ? '' : String(values[`${p.key}Pills`])}
                  onChange={(e) => set(`${p.key}Pills`)(e.target.value === '' ? null : Number(e.target.value))}
                />
              </div>
            ))}
          </fieldset>
          {field(F.nextAppointment, shown(nextRule, values.nextAppointment))}
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

export default ArtVisitWorkspace;
