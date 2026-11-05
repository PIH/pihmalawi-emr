import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useSWRConfig } from 'swr';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, InlineLoading, InlineNotification, Select, SelectItem, TextInput } from '@carbon/react';
import { ConfigurableLink, useSession, type Workspace2DefinitionProps, Workspace2 } from '@openmrs/esm-framework';
import { type ArtField, formatDay } from '../art/art-fields';
import { type RuleResult } from '../art/art-rules';
import { encounterValues, useCardEncounters, useChws, useEMastercard, useLocationsTagged } from '../art/art.resource';
import { buildObsPayload, type FieldValue, saveEncounter } from '../art/obs-diff';
import { MH_CARD_KEY, MH_FORMS, MH_HEADER } from './mh-concepts';
import { MH_HEADER_SECTIONS, MH_START_FIELDS, type MhHeaderSection } from './mh-fields';
import { checkAtLeastOneDiagnosis, checkDiagnosisDates } from './mh-rules';
import { GroupedFields } from './grouped-fields';
import styles from '../art/art-panel.scss';

export interface MhHeaderWorkspaceProps {
  patientUuid: string;
  section: MhHeaderSection | 'start';
}

/**
 * Edits one section of the Mental Health eMastercard header (the single initial encounter that
 * mental-health-emastercard.xml saves), leaving the other sections' obs as they are. Until the header exists it is
 * started with what the legacy form requires on its first save: the follow-up agreement and the diagnoses.
 */
const MhHeaderWorkspace: React.FC<Workspace2DefinitionProps<MhHeaderWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, section },
}) => {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();
  const session = useSession();
  const { card, systemLocationsTag, isLoading: loadingCard } = useEMastercard(patientUuid, MH_CARD_KEY);
  const { encounters, isLoading } = useCardEncounters(patientUuid, MH_FORMS.header);
  const locations = useLocationsTagged(systemLocationsTag);

  // the card's header, or the only one there is (the card may not have been refreshed since it was created)
  const encounter =
    encounters.find((e) => e.uuid === card?.initialEncounterUuid) ?? (encounters.length === 1 ? encounters[0] : undefined);
  const unknownHeaders = encounters.length > 1 && !encounter;
  const starting = !encounter;
  const fields: Array<ArtField> = starting ? MH_START_FIELDS : MH_HEADER_SECTIONS[section === 'start' ? 'diagnoses' : section].fields;
  const asksDiagnoses = starting || section === 'diagnoses';
  const chws = useChws(!starting && section === 'patientGuardian' ? patientUuid : null, MH_HEADER.chwRelationshipType);
  const title = starting ? t('startCard', 'Start the card') : t(`mhSection_${section}`, MH_HEADER_SECTIONS[section === 'start' ? 'diagnoses' : section].title);

  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [values, setValues] = useState<Record<string, FieldValue> | null>(null);
  const [location, setLocation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = !loadingCard && !isLoading && card;
  useEffect(() => {
    if (ready && !values) {
      setValues(encounterValues(fields, encounter));
      setLocation(encounter?.location?.uuid ?? session?.sessionLocation?.uuid ?? '');
    }
  }, [ready, values, fields, encounter, session]);

  if (card?.state === 'UNAVAILABLE' || unknownHeaders) {
    return (
      <Workspace2 title={title}>
        <div className={styles.panel}>
          <InlineNotification kind="warning" lowContrast hideCloseButton title={card?.message ?? t('multipleMhHeaders', 'Multiple Mental Health eMastercard forms found')} />
        </div>
      </Workspace2>
    );
  }
  if (!values) {
    return (
      <Workspace2 title={title}>
        <InlineLoading description={t('loading', 'Loading...')} />
      </Workspace2>
    );
  }

  const readOnly = card.state !== 'EDIT' && card.state !== 'CREATE';
  const today = dayjs().format('YYYY-MM-DD');
  const rules: Record<string, RuleResult> = {};
  fields.forEach((f) => {
    const value = values[f.name];
    if (f.required && (value === null || value === undefined || value === '')) {
      rules[f.name] = { level: 'error', message: 'Required' };
    } else if (f.kind === 'date' && !f.future && value && String(value).slice(0, 10) > today) {
      // the forms refuse future dates unless allowFutureDates
      rules[f.name] = { level: 'error', message: 'Cannot be in the future' };
    }
  });
  if (asksDiagnoses) {
    Object.assign(rules, checkDiagnosisDates(values));
  }
  const noDiagnosis = asksDiagnoses ? checkAtLeastOneDiagnosis(values) : null;

  const save = async () => {
    setSubmitted(true);
    setError(null);
    if (noDiagnosis || Object.values(rules).some((r) => r?.level === 'error')) {
      return;
    }
    setSaving(true);
    try {
      await saveEncounter(MH_FORMS.header, {
        patientUuid,
        encounterUuid: encounter?.uuid,
        datetime: encounter?.encounterDatetime ?? date,
        locationUuid: location,
        payload: buildObsPayload(fields, values, encounter?.obs ?? [], {}),
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
    <Workspace2 title={title} hasUnsavedChanges={dirty}>
      <div className={styles.panel}>
        <div className={styles.row}>
          {encounter ? (
            <TextInput id="mh-header-date" labelText={t('cardDate', 'Card date')} value={formatDay(encounter.encounterDatetime)} readOnly />
          ) : (
            <TextInput
              id="mh-header-date"
              type="date"
              labelText={t('cardDate', 'Card date')}
              value={date}
              readOnly={readOnly}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
          <Select
            id="mh-header-location"
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

        {submitted && noDiagnosis && <InlineNotification kind="error" lowContrast hideCloseButton title={noDiagnosis.message} />}

        <section className={styles.section}>
          <GroupedFields
            fields={fields}
            values={values}
            readOnly={readOnly}
            rules={submitted ? rules : {}}
            onChange={(next) => {
              setValues(next);
              setDirty(true);
            }}
          />
        </section>

        {!starting && section === 'patientGuardian' && (
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

export default MhHeaderWorkspace;
