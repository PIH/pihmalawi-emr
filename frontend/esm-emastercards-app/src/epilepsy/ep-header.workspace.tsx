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
import { GroupedFields } from '../mental-health/grouped-fields';
import { carryOver, useCarriedPatientGuardian } from '../shared/patient-guardian';
import { EP_CARD_KEY, EP_FORMS, EP_HEADER } from './ep-concepts';
import { EP_DIAGNOSIS_FIELD, EP_HEADER_SECTIONS, EP_START_SECTION, type EpHeaderSection } from './ep-fields';
import { checkOnset } from './ep-rules';
import styles from '../art/art-panel.scss';

export interface EpHeaderWorkspaceProps {
  patientUuid: string;
  section: EpHeaderSection | 'start';
}

/**
 * Edits one section of the Epilepsy eMastercard header (the single initial encounter epilepsy-emastercard.xml
 * saves), leaving the other sections' obs as they are. Until the header exists, the card is started with the patient
 * and guardian section, which holds what the legacy form requires on its first save, and the card's diagnosis.
 */
const EpHeaderWorkspace: React.FC<Workspace2DefinitionProps<EpHeaderWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, section },
}) => {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();
  const session = useSession();
  const { card, systemLocationsTag, isLoading: loadingCard } = useEMastercard(patientUuid, EP_CARD_KEY);
  const { encounters, isLoading } = useCardEncounters(patientUuid, EP_FORMS.header);
  const locations = useLocationsTagged(systemLocationsTag);
  const { carried, isLoading: loadingCarried } = useCarriedPatientGuardian(patientUuid, EP_CARD_KEY);

  // the card's header, or the only one there is (the card may not have been refreshed since it was created)
  const encounter =
    encounters.find((e) => e.uuid === card?.initialEncounterUuid) ?? (encounters.length === 1 ? encounters[0] : undefined);
  const unknownHeaders = encounters.length > 1 && !encounter;
  const starting = !encounter;
  const shown: EpHeaderSection = starting || section === 'start' ? EP_START_SECTION : section;
  const fields: Array<ArtField> = EP_HEADER_SECTIONS[shown].fields;
  const chws = useChws(shown === 'patientGuardian' ? patientUuid : null, EP_HEADER.chwRelationshipType);
  const title = starting ? t('startCard', 'Start the card') : t(`epSection_${shown}`, EP_HEADER_SECTIONS[shown].title);

  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [values, setValues] = useState<Record<string, FieldValue> | null>(null);
  const [copiedFrom, setCopiedFrom] = useState<Array<string>>([]);
  const [location, setLocation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = !loadingCard && !isLoading && !loadingCarried && card;
  useEffect(() => {
    if (!ready || values) {
      return;
    }
    const saved = encounterValues(fields, encounter);
    if (shown === 'patientGuardian') {
      const c = carryOver(fields, saved, carried);
      setValues(c.values);
      setCopiedFrom(c.filled.length ? c.from : []);
    } else {
      setValues(saved);
    }
    setLocation(encounter?.location?.uuid ?? session?.sessionLocation?.uuid ?? '');
  }, [ready, values, fields, encounter, session, shown, carried]);

  if (card?.state === 'UNAVAILABLE' || unknownHeaders) {
    return (
      <Workspace2 title={title}>
        <div className={styles.panel}>
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title={card?.message ?? t('multipleEpHeaders', 'Multiple Epilepsy eMastercard forms found')}
          />
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
  if (shown === 'history') {
    Object.assign(rules, checkOnset(values));
  }

  const save = async () => {
    setSubmitted(true);
    setError(null);
    if (Object.values(rules).some((r) => r?.level === 'error')) {
      return;
    }
    setSaving(true);
    try {
      // a new card also saves its diagnosis, epilepsy, as the form's hidden checkbox does
      const toSave = starting ? [...fields, EP_DIAGNOSIS_FIELD] : fields;
      const toSaveValues = starting ? { ...values, [EP_DIAGNOSIS_FIELD.name]: EP_HEADER.epilepsy } : values;
      await saveEncounter(EP_FORMS.header, {
        patientUuid,
        encounterUuid: encounter?.uuid,
        datetime: encounter?.encounterDatetime ?? date,
        locationUuid: location,
        payload: buildObsPayload(toSave, toSaveValues, encounter?.obs ?? [], {}),
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
            <TextInput id="ep-header-date" labelText={t('cardDate', 'Card date')} value={formatDay(encounter.encounterDatetime)} readOnly />
          ) : (
            <TextInput
              id="ep-header-date"
              type="date"
              labelText={t('cardDate', 'Card date')}
              value={date}
              readOnly={readOnly}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
          <Select
            id="ep-header-location"
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

        {copiedFrom.length > 0 && !readOnly && (
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title={t('patientGuardianCopied', 'Patient and guardian details were filled in from {{cards}}. Check them, then save.', {
              cards: copiedFrom.join(', '),
            })}
          />
        )}

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

        {shown === 'patientGuardian' && (
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

export default EpHeaderWorkspace;
