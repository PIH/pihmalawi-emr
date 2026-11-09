import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useSWRConfig } from 'swr';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, InlineLoading, InlineNotification, Select, SelectItem, TextInput } from '@carbon/react';
import { ConfigurableLink, useSession, type Workspace2DefinitionProps, Workspace2 } from '@openmrs/esm-framework';
import { type ArtField, formatDay } from '../art/art-fields';
import { encounterValues, useCardEncounters, useChws, useEMastercard, useLocationsTagged } from '../art/art.resource';
import { buildObsPayload, type FieldValue, saveEncounter } from '../art/obs-diff';
import { GroupedFields } from '../mental-health/grouped-fields';
import { carryOver, useCarriedPatientGuardian } from '../shared/patient-guardian';
import { HTN_CARD_KEY, HTN_FORMS, HTN_HEADER } from './htn-concepts';
import { HTN_HEADER_SECTIONS, HTN_START_FIELDS, type HtnHeaderSection } from './htn-fields';
import { applyHeaderChange, checkHeader, LIMITS, showsTbYear } from './htn-rules';
import styles from '../art/art-panel.scss';

export interface HtnHeaderWorkspaceProps {
  patientUuid: string;
  section: HtnHeaderSection | 'start';
}

/**
 * Edits one section of the Hypertension and Diabetes eMastercard header (the single initial encounter
 * hypertension-and-diabetes-emastercard.xml saves), leaving the other sections' obs as they are. Until the header
 * exists, the card is started with the patient and guardian details and the diagnoses.
 */
const HtnHeaderWorkspace: React.FC<Workspace2DefinitionProps<HtnHeaderWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, section },
}) => {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();
  const session = useSession();
  const { card, systemLocationsTag, isLoading: loadingCard } = useEMastercard(patientUuid, HTN_CARD_KEY);
  const { encounters, isLoading } = useCardEncounters(patientUuid, HTN_FORMS.header);
  const locations = useLocationsTagged(systemLocationsTag);
  const { carried, isLoading: loadingCarried } = useCarriedPatientGuardian(patientUuid, HTN_CARD_KEY);

  // the card's header, or the only one there is (the card may not have been refreshed since it was created)
  const encounter = encounters.find((e) => e.uuid === card?.initialEncounterUuid) ?? (encounters.length === 1 ? encounters[0] : undefined);
  const unknownHeaders = encounters.length > 1 && !encounter;
  const starting = !encounter || section === 'start';
  const fields: Array<ArtField> = starting ? HTN_START_FIELDS : HTN_HEADER_SECTIONS[section as HtnHeaderSection].fields;
  const withPatientGuardian = starting || section === 'patientGuardian';
  const chws = useChws(withPatientGuardian ? patientUuid : null, HTN_HEADER.chwRelationshipType);
  const title = starting
    ? encounter
      ? t('htnSection_start', 'Patient details and diagnoses')
      : t('startCard', 'Start the card')
    : t(`htnSection_${section}`, HTN_HEADER_SECTIONS[section as HtnHeaderSection].title);

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
    if (withPatientGuardian) {
      const c = carryOver(fields, saved, carried);
      setValues(c.values);
      setCopiedFrom(c.filled.length ? c.from : []);
    } else {
      setValues(saved);
    }
    setLocation(encounter?.location?.uuid ?? session?.sessionLocation?.uuid ?? '');
  }, [ready, values, fields, encounter, session, withPatientGuardian, carried]);

  if (card?.state === 'UNAVAILABLE' || unknownHeaders) {
    return (
      <Workspace2 title={title}>
        <div className={styles.panel}>
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title={card?.message ?? t('multipleHtnHeaders', 'Multiple Hypertension and Diabetes eMastercard forms found')}
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
  const rules = checkHeader(fields, values);
  // a number outside its concept's limits shows while it is typed; the other rules once saving is tried
  const shownRules = submitted ? rules : Object.fromEntries(Object.entries(rules).filter(([name]) => name in LIMITS));

  const save = async () => {
    setSubmitted(true);
    setError(null);
    if (Object.values(rules).some((r) => r?.level === 'error')) {
      return;
    }
    setSaving(true);
    try {
      await saveEncounter(HTN_FORMS.header, {
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

  const grouped = (sectionFields: Array<ArtField>) => (
    <GroupedFields
      fields={sectionFields.filter((f) => f.name !== 'tbYear' || showsTbYear(values))}
      values={values}
      readOnly={readOnly}
      rules={shownRules}
      onChange={(next) => {
        setValues((v) => applyHeaderChange(v, { ...v, ...next }));
        setDirty(true);
      }}
    />
  );

  return (
    <Workspace2 title={title} hasUnsavedChanges={dirty}>
      <div className={styles.panel}>
        <div className={styles.row}>
          {encounter ? (
            <TextInput id="htn-header-date" labelText={t('cardDate', 'Card date')} value={formatDay(encounter.encounterDatetime)} readOnly />
          ) : (
            <TextInput
              id="htn-header-date"
              type="date"
              labelText={t('cardDate', 'Card date')}
              value={date}
              max={dayjs().format('YYYY-MM-DD')}
              readOnly={readOnly}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
          <Select
            id="htn-header-location"
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

        {starting ? (
          <>
            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>{t('htnSection_patientGuardian', HTN_HEADER_SECTIONS.patientGuardian.title)}</h4>
              {grouped(HTN_HEADER_SECTIONS.patientGuardian.fields)}
            </section>
            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>{t('htnSection_diagnoses', HTN_HEADER_SECTIONS.diagnoses.title)}</h4>
              {grouped(HTN_HEADER_SECTIONS.diagnoses.fields)}
            </section>
          </>
        ) : (
          <section className={styles.section}>{grouped(fields)}</section>
        )}

        {submitted && rules.diagnosis && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title={t('tickOneDiagnosis', 'Tick at least one diagnosis: Type 1 DM, Type 2 DM or Hypertension.')}
          />
        )}

        {withPatientGuardian && (
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

export default HtnHeaderWorkspace;
