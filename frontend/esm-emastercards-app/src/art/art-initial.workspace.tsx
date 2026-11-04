import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import useSWR, { useSWRConfig } from 'swr';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, InlineLoading, InlineNotification, Select, SelectItem, TextInput } from '@carbon/react';
import {
  ConfigurableLink,
  openmrsFetch,
  restBaseUrl,
  usePatient,
  useSession,
  type Workspace2DefinitionProps,
  Workspace2,
} from '@openmrs/esm-framework';
import { ART_INITIAL } from './art-concepts';
import { type ArtField, formatDay, INITIAL_SECTIONS, type InitialSection } from './art-fields';
import { type RuleResult, sameDayValue } from './art-rules';
import { obsValue, useArtCard, useArtEncounters, useLocationsTagged, useSameDayObs } from './art.resource';
import { buildObsPayload, type FieldValue, saveArtEncounter } from './obs-diff';
import { ArtFieldInput } from './fields';
import styles from './art-panel.scss';

export interface ArtInitialWorkspaceProps {
  patientUuid: string;
  section: InitialSection;
}

interface Relationship {
  personA: { uuid?: string; display: string };
  relationshipType: { uuid: string };
}

/** The patient's community health workers, as art-emastercard.xml shows them: person A of a CHW relationship */
function useChws(patientUuid: string) {
  const { data } = useSWR(
    patientUuid ? `${restBaseUrl}/relationship?person=${patientUuid}&v=custom:(personA:(uuid,display),relationshipType:(uuid))` : null,
    (url: string) => openmrsFetch<{ results: Array<Relationship> }>(url).then((res) => res.data?.results ?? []),
  );
  return (data ?? [])
    .filter((r) => r.relationshipType?.uuid === ART_INITIAL.chwRelationshipType && r.personA?.uuid !== patientUuid)
    .map((r) => r.personA.display);
}

/**
 * Edits one section of the ART card header (the single ART initial encounter that art-emastercard.xml saves),
 * creating the encounter when the patient has none, and leaving the other sections' obs as they are
 */
const ArtInitialWorkspace: React.FC<Workspace2DefinitionProps<ArtInitialWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, section },
}) => {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();
  const session = useSession();
  const { patient } = usePatient(patientUuid);
  const { card, systemLocationsTag, isLoading: loadingCard } = useArtCard(patientUuid);
  const { encounters, isLoading } = useArtEncounters(patientUuid, 'initial');
  const locations = useLocationsTagged(systemLocationsTag);
  const chws = useChws(section === 'patientGuardian' ? patientUuid : null);

  const { title, fields: allFields } = INITIAL_SECTIONS[section];
  const female = patient?.gender === 'female';
  const fields = allFields.filter((f) => female || !f.femaleOnly);
  // the card's header, or the only one there is (the card may not have been refreshed since it was created)
  const encounter =
    encounters.find((e) => e.uuid === card?.initialEncounterUuid) ?? (encounters.length === 1 ? encounters[0] : undefined);
  const unknownHeaders = encounters.length > 1 && !encounter;

  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const headerDay = encounter ? dayjs(encounter.encounterDatetime).format('YYYY-MM-DD') : date;
  const referenceFields = fields.filter((f) => f.reference);
  const { obs: sameDay, isLoading: loadingSameDay } = useSameDayObs(
    patientUuid,
    referenceFields.map((f) => f.concept),
    headerDay,
  );
  const references = useMemo(() => {
    const refs: Record<string, FieldValue> = {};
    referenceFields.forEach((f) => (refs[f.name] = sameDayValue((sameDay[f.concept] ?? []) as Array<any>, headerDay, encounter?.uuid)));
    return refs;
  }, [sameDay, headerDay, encounter, referenceFields]);

  const [values, setValues] = useState<Record<string, FieldValue> | null>(null);
  const [location, setLocation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = !loadingCard && !isLoading && !loadingSameDay && card;
  useEffect(() => {
    if (!ready || values) {
      return;
    }
    const initial: Record<string, FieldValue> = {};
    fields.forEach((f) => (initial[f.name] = obsValue(encounter, f.concept, f.kind === 'multi')));
    setValues(initial);
    setLocation(encounter?.location?.uuid ?? session?.sessionLocation?.uuid ?? '');
  }, [ready, values, fields, encounter, session]);

  if (card?.state === 'UNAVAILABLE' || unknownHeaders) {
    return (
      <Workspace2 title={t(`section_${section}`, title)}>
        <div className={styles.panel}>
          <InlineNotification kind="warning" lowContrast hideCloseButton title={card?.message ?? t('multipleHeaders', 'Multiple ART eMastercard forms found')} />
        </div>
      </Workspace2>
    );
  }
  if (!values) {
    return (
      <Workspace2 title={t(`section_${section}`, title)}>
        <InlineLoading description={t('loading', 'Loading...')} />
      </Workspace2>
    );
  }

  const readOnly = card.state !== 'EDIT' && card.state !== 'CREATE';
  const today = dayjs().format('YYYY-MM-DD');
  const requiredRule = (f: ArtField): RuleResult => {
    const value = values[f.name];
    if (f.required && (value === null || value === undefined || value === '')) {
      return { level: 'error', message: 'Required' };
    }
    // the forms refuse future dates unless allowFutureDates
    if (f.kind === 'date' && !f.future && value && String(value).slice(0, 10) > today) {
      return { level: 'error', message: 'Cannot be in the future' };
    }
    return null;
  };

  const save = async () => {
    setSubmitted(true);
    setError(null);
    if (fields.some((f) => requiredRule(f))) {
      return;
    }
    setSaving(true);
    try {
      await saveArtEncounter('initial', {
        patientUuid,
        encounterUuid: encounter?.uuid,
        datetime: encounter?.encounterDatetime ?? date,
        locationUuid: location,
        payload: buildObsPayload(fields, values, encounter?.obs ?? [], references),
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
    <Workspace2 title={t(`section_${section}`, title)} hasUnsavedChanges={dirty}>
      <div className={styles.panel}>
        <div className={styles.row}>
          {encounter ? (
            <TextInput id="art-initial-date" labelText={t('cardDate', 'Card date')} value={formatDay(encounter.encounterDatetime)} readOnly />
          ) : (
            <TextInput
              id="art-initial-date"
              type="date"
              labelText={t('cardDate', 'Card date')}
              value={date}
              readOnly={readOnly}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
          <Select
            id="art-initial-location"
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

        <section className={styles.section}>
          {fields.map((f) => (
            <ArtFieldInput
              key={f.name}
              field={f}
              value={values[f.name] ?? null}
              reference={references[f.name]}
              readOnly={readOnly}
              rule={submitted ? requiredRule(f) : null}
              onChange={(value) => {
                setValues((v) => ({ ...v, [f.name]: value }));
                setDirty(true);
              }}
            />
          ))}
        </section>

        {section === 'patientGuardian' && (
          <section className={styles.section}>
            <dl className={styles.row}>
              <div>
                <dt className={styles.legend}>{t('chw', 'CHW')}</dt>
                <dd>{chws.length ? chws.join(', ') : '–'}</dd>
              </div>
            </dl>
            <ConfigurableLink to={`\${openmrsSpaBase}patient/${patientUuid}/edit`}>
              {t('editDemographics', 'Edit name, address and other details in registration')}
            </ConfigurableLink>
          </section>
        )}

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

export default ArtInitialWorkspace;
