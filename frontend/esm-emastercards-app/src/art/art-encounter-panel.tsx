import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useSWRConfig } from 'swr';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, InlineLoading, InlineNotification, Select, SelectItem, TextInput } from '@carbon/react';
import { useSession, Workspace2 } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { type ArtFormKind } from './art-concepts';
import { type ArtField, formatDay } from './art-fields';
import { checkDuplicate, sameDayValue } from './art-rules';
import { type ArtEncounter, memberValue, obsGroups, obsValue, useArtCard, useArtEncounter, useArtEncounters, useLocationsTagged, useSameDayObs } from './art.resource';
import { buildObsPayload, encounterDatetimeFor, type FieldValue, saveArtEncounter } from './obs-diff';
import { ArtFieldInput } from './fields';
import styles from './art-panel.scss';

interface ArtEncounterPanelProps {
  kind: ArtFormKind;
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
  closeWorkspace: (options?: { discardUnsavedChanges?: boolean }) => void;
}

function valuesOf(fields: Array<ArtField>, encounter: ArtEncounter | undefined) {
  const values: Record<string, FieldValue> = {};
  fields.forEach((f) => {
    values[f.name] = f.group
      ? memberValue(obsGroups(encounter, f.group.concept)[0], f.concept)
      : obsValue(encounter, f.concept, f.kind === 'multi');
  });
  return values;
}

/**
 * A side panel for one of the ART card's flowsheet forms whose questions need no rules of their own: records a
 * new encounter in the chart's O3 visit, or edits one, saving it as the HTML form does
 */
export const ArtEncounterPanel: React.FC<ArtEncounterPanelProps> = ({
  kind,
  patientUuid,
  encounterUuid,
  title,
  fields,
  taggedLocations,
  onFieldChange = (_, values) => values,
  isShown = () => true,
  closeWorkspace,
}) => {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();
  const session = useSession();
  const { visitContext } = usePatientChartStore(patientUuid);
  const { card, systemLocationsTag } = useArtCard(patientUuid);
  const { encounters, isLoading } = useArtEncounters(patientUuid, kind);
  const locations = useLocationsTagged(taggedLocations ? systemLocationsTag : null);

  const { encounter: fetched, isLoading: loadingEncounter } = useArtEncounter(
    patientUuid,
    encounterUuid && !encounters.some((e) => e.uuid === encounterUuid) ? encounterUuid : undefined,
  );
  const editing = encounterUuid ? (encounters.find((e) => e.uuid === encounterUuid) ?? fetched) : undefined;
  const date = editing?.encounterDatetime ?? (visitContext ? encounterDatetimeFor(visitContext) : null);
  const day = date ? dayjs(date).format('YYYY-MM-DD') : null;
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
      setValues(valuesOf(fields, editing));
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
  const duplicate = checkDuplicate(date, encounters.filter((e) => e.uuid !== encounterUuid).map((e) => ({ date: e.encounterDatetime, encounterUuid: e.uuid })), encounterUuid);

  const save = async () => {
    setSubmitted(true);
    setError(null);
    if (duplicate) {
      return;
    }
    setSaving(true);
    try {
      await saveArtEncounter(kind, {
        patientUuid,
        encounterUuid,
        visitUuid: editing ? undefined : visitContext?.uuid,
        datetime: date,
        locationUuid: location,
        payload: buildObsPayload(shownFields, values, editing?.obs ?? [], references),
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
          <TextInput id={`art-${kind}-date`} labelText={t('date', 'Date')} value={formatDay(date)} readOnly />
          <Select
            id={`art-${kind}-location`}
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
          {shownFields.map((f) => (
            <ArtFieldInput
              key={f.name}
              field={f}
              value={values[f.name] ?? null}
              reference={references[f.name]}
              readOnly={readOnly}
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
