import React, { useEffect, useMemo, useState } from 'react';
import { useSWRConfig } from 'swr';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, InlineLoading, InlineNotification, Select, SelectItem } from '@carbon/react';
import { usePatient, useSession, Workspace2 } from '@openmrs/esm-framework';
import { type ArtField } from './art-fields';
import { checkDuplicate, type RuleResult, sameDayValue } from './art-rules';
import {
  encounterValues,
  useArtEncounter,
  useCardEncounters,
  useEMastercard,
  useLocationsTagged,
  useSameDayObs,
} from './art.resource';
import { buildObsPayload, type CardForm, type FieldValue, saveEncounter } from './obs-diff';
import { ArtFieldInput } from './fields';
import { checkRecordDay, RecordDateInput, resolveVisit, usePastVisitType, useRecordDate } from '../shared/record-date';
import styles from './art-panel.scss';

interface ArtEncounterPanelProps {
  /** The form whose encounters the panel records and edits */
  form: CardForm;
  /** The eMastercard the form belongs to, whose state decides whether the panel can save */
  cardKey: string;
  patientUuid: string;
  encounterUuid?: string;
  title: { record: string; edit: string };
  fields: Array<ArtField>;
  /** Whether the location is one of the Neno system locations (the form's encounterLocation tags) */
  taggedLocations: boolean;
  /** Changes other values when one changes, e.g. viral load results clearing each other */
  onFieldChange?: (name: string, values: Record<string, FieldValue>) => Record<string, FieldValue>;
  /** Whether a field is asked, given the other answers */
  isShown?: (field: ArtField, values: Record<string, FieldValue>) => boolean;
  /** Each field's rule given the answers and the encounter's date; an error blocks saving */
  rules?: (values: Record<string, FieldValue>, date: string) => Record<string, RuleResult>;
  /** The fields whose errors show while the value is typed, e.g. a number outside its concept's limits */
  live?: Array<string>;
  /** The values as saved, given the encounter's day: sets the hidden fields, e.g. a sample date to the test's date */
  prepare?: (values: Record<string, FieldValue>, day: string) => Record<string, FieldValue>;
  closeWorkspace: (options?: { discardUnsavedChanges?: boolean }) => void;
}

/**
 * A side panel for one of the ART card's flowsheet forms whose questions need no rules of their own: records a
 * new encounter in the chart's O3 visit, or edits one, saving it as the HTML form does
 */
export const ArtEncounterPanel: React.FC<ArtEncounterPanelProps> = ({
  form,
  cardKey,
  patientUuid,
  encounterUuid,
  title,
  fields,
  taggedLocations,
  onFieldChange = (_, values) => values,
  isShown = () => true,
  rules = () => ({}),
  prepare = (values) => values,
  live = [],
  closeWorkspace,
}) => {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();
  const session = useSession();
  const { patient } = usePatient(patientUuid);
  const { card, systemLocationsTag } = useEMastercard(patientUuid, cardKey);
  const { encounters, isLoading } = useCardEncounters(patientUuid, form);
  const locations = useLocationsTagged(taggedLocations ? systemLocationsTag : null);

  const { encounter: fetched, isLoading: loadingEncounter } = useArtEncounter(
    patientUuid,
    encounterUuid && !encounters.some((e) => e.uuid === encounterUuid) ? encounterUuid : undefined,
  );
  const editing = encounterUuid ? (encounters.find((e) => e.uuid === encounterUuid) ?? fetched) : undefined;
  // today's visit by default, or an earlier day for a past visit
  const record = useRecordDate(patientUuid, editing);
  const pastVisitType = usePastVisitType();
  const date = record.datetime;
  const day = record.day;
  const referenceFields = fields.filter((f) => f.reference);
  const { obs: sameDay, isLoading: loadingSameDay } = useSameDayObs(patientUuid, referenceFields.map((f) => f.concept), day);
  const references = useMemo(() => {
    const refs: Record<string, FieldValue> = {};
    referenceFields.forEach((f) => (refs[f.name] = sameDayValue((sameDay[f.concept] ?? []) as Array<any>, day, encounterUuid)));
    return refs;
  }, [sameDay, day, encounterUuid, referenceFields]);

  const [values, setValues] = useState<Record<string, FieldValue> | null>(null);
  const [location, setLocation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = !isLoading && !loadingEncounter && !loadingSameDay && (!encounterUuid || editing);
  useEffect(() => {
    if (ready && !values) {
      setValues(encounterValues(fields, editing));
      setLocation(editing?.location?.uuid ?? session?.sessionLocation?.uuid ?? '');
    }
  }, [ready, values, fields, editing, session]);

  const heading = editing ? title.edit : title.record;
  if (!values) {
    return (
      <Workspace2 title={heading}>
        <InlineLoading description={t('loading', 'Loading...')} />
      </Workspace2>
    );
  }
  if (!date) {
    return (
      <Workspace2 title={heading}>
        <InlineNotification kind="warning" lowContrast hideCloseButton title={t('startVisitToRecord', 'Start a visit to record this.')} />
      </Workspace2>
    );
  }

  const readOnly = card?.state !== 'EDIT';
  const shownFields = fields.filter((f) => isShown(f, values));
  const fieldRules = rules(values, date);
  const blocked = shownFields.some((f) => fieldRules[f.name]?.level === 'error');
  const dateRule = record.editable ? checkRecordDay(record.day, patient?.birthDate) : null;
  const duplicate = checkDuplicate(date, encounters.filter((e) => e.uuid !== encounterUuid).map((e) => ({ date: e.encounterDatetime, encounterUuid: e.uuid })), encounterUuid);

  const save = async () => {
    setSubmitted(true);
    setError(null);
    if (duplicate || blocked || dateRule) {
      return;
    }
    setSaving(true);
    try {
      await saveEncounter(form, {
        patientUuid,
        encounterUuid,
...(editing
          ? { datetime: date }
          : await resolveVisit(patientUuid, record.day, { visitContext: record.visitContext, locationUuid: location, visitTypeUuid: pastVisitType })),
        locationUuid: location,
        payload: buildObsPayload(shownFields, prepare(values, record.day), editing?.obs ?? [], references),
      });
      mutate(() => true);
      closeWorkspace({ discardUnsavedChanges: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Workspace2 title={heading} hasUnsavedChanges={dirty}>
      <div className={styles.panel}>
        <div className={styles.row}>
          <RecordDateInput id={`card-${form.encounterType}-date`} label={t('date', 'Date')} record={record} rule={dateRule} readOnly={readOnly} />
          <Select
            id={`card-${form.encounterType}-location`}
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
        {submitted && duplicate && <InlineNotification kind="error" lowContrast hideCloseButton title={duplicate.message} />}

        <section className={styles.section}>
          {shownFields.filter((f) => !f.hidden).map((f) => (
            <ArtFieldInput
              key={f.name}
              field={f}
              value={values[f.name] ?? null}
              reference={references[f.name]}
              readOnly={readOnly}
              rule={submitted || live.includes(f.name) || fieldRules[f.name]?.level === 'warning' ? (fieldRules[f.name] ?? null) : null}
              onChange={(value) => {
                setValues((v) => onFieldChange(f.name, { ...v, [f.name]: value }));
                setDirty(true);
              }}
            />
          ))}
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
