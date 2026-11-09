import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useSWRConfig } from 'swr';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, InlineLoading, InlineNotification, Select, SelectItem, TextInput } from '@carbon/react';
import { ConfigurableLink, useSession, type Workspace2DefinitionProps, Workspace2 } from '@openmrs/esm-framework';
import { type ArtField, formatDay } from '../art/art-fields';
import { type RuleResult } from '../art/art-rules';
import { encounterValues, useCardEncounters, useChws, useEMastercard, useLocationsTagged } from '../art/art.resource';
import { buildObsPayload, type CardForm, type FieldValue, saveEncounter } from '../art/obs-diff';
import { GroupedFields } from '../mental-health/grouped-fields';
import { carryOver, useCarriedPatientGuardian } from './patient-guardian';
import { clearUnasked, LIMITS, NCD_HEADER } from './ncd';
import styles from '../art/art-panel.scss';

/** An NCD card's header: its form, its sections and their rules */
export interface NcdHeaderConfig {
  cardKey: string;
  form: CardForm;
  /** The sections, each shown in its own card on the page and edited in its own panel */
  sections: Record<string, { title: string; fields: Array<ArtField> }>;
  /** The sections the card is started with: what the form requires on its first save, and the diagnoses */
  startSections: Array<string>;
  /** The translation keys' prefix of the sections' titles, e.g. htnSection_ */
  i18nPrefix: string;
  checkHeader: (fields: Array<ArtField>, values: Record<string, FieldValue>) => Record<string, RuleResult>;
  /** The answers after a change, e.g. one type of diabetes unticking the other; else those no longer asked are cleared */
  applyChange?: (previous: Record<string, FieldValue>, next: Record<string, FieldValue>) => Record<string, FieldValue>;
  /** What to tick when no diagnosis is, e.g. Type 1 DM, Type 2 DM or Hypertension; empty for a card with many */
  diagnosisNames: string;
  /** The card's name, for the message when it has several headers */
  cardName: string;
  /** Answers saved with the fields they belong to, never asked: e.g. the card's diagnosis, which the form saves in a hidden checkbox */
  fixed?: Record<string, FieldValue>;
}

export interface NcdHeaderPanelProps {
  patientUuid: string;
  section: string;
}

/**
 * Edits one section of an NCD eMastercard header (the single initial encounter its form saves), leaving the other
 * sections' obs as they are. Until the header exists, the card is started with its start sections.
 */
export const NcdHeaderPanel: React.FC<
  Pick<Workspace2DefinitionProps<NcdHeaderPanelProps>, 'closeWorkspace' | 'workspaceProps'> & { config: NcdHeaderConfig }
> = ({ closeWorkspace, workspaceProps: { patientUuid, section }, config }) => {
  const { t } = useTranslation();
  const { cardKey, form, sections, startSections, i18nPrefix } = config;
  const applyChange =
    config.applyChange ??
    ((_, next) =>
      clearUnasked(
        Object.values(sections).flatMap((s) => s.fields),
        next,
      ));
  const { mutate } = useSWRConfig();
  const session = useSession();
  const { card, systemLocationsTag, isLoading: loadingCard } = useEMastercard(patientUuid, cardKey);
  const { encounters, isLoading } = useCardEncounters(patientUuid, form);
  const locations = useLocationsTagged(systemLocationsTag);
  const { carried, isLoading: loadingCarried } = useCarriedPatientGuardian(patientUuid, cardKey);

  // the card's header, or the only one there is (the card may not have been refreshed since it was created)
  const encounter = encounters.find((e) => e.uuid === card?.initialEncounterUuid) ?? (encounters.length === 1 ? encounters[0] : undefined);
  const unknownHeaders = encounters.length > 1 && !encounter;
  const starting = !encounter || section === 'start';
  const fields: Array<ArtField> = starting ? startSections.flatMap((k) => sections[k].fields) : sections[section].fields;
  const withPatientGuardian = starting || section === 'patientGuardian';
  const chws = useChws(withPatientGuardian ? patientUuid : null, NCD_HEADER.chwRelationshipType);
  const title = starting
    ? encounter
      ? t('ncdSection_start', 'Patient details and diagnoses')
      : t('startCard', 'Start the card')
    : t(`${i18nPrefix}${section}`, sections[section].title);

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
            title={card?.message ?? t('multipleCardHeaders', 'Multiple {{card}} forms found', { card: config.cardName })}
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
  const rules = config.checkHeader(fields, values);
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
      await saveEncounter(form, {
        patientUuid,
        encounterUuid: encounter?.uuid,
        datetime: encounter?.encounterDatetime ?? date,
        locationUuid: location,
        payload: buildObsPayload(fields, { ...values, ...config.fixed }, encounter?.obs ?? [], {}),
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
      fields={sectionFields.filter((f) => !f.hidden && (!f.shownWhen || f.shownWhen(values)))}
      values={values}
      readOnly={readOnly}
      rules={shownRules}
      onChange={(next) => {
        setValues((v) => applyChange(v, { ...v, ...next }));
        setDirty(true);
      }}
    />
  );

  return (
    <Workspace2 title={title} hasUnsavedChanges={dirty}>
      <div className={styles.panel}>
        <div className={styles.row}>
          {encounter ? (
            <TextInput id="ncd-header-date" labelText={t('cardDate', 'Card date')} value={formatDay(encounter.encounterDatetime)} readOnly />
          ) : (
            <TextInput
              id="ncd-header-date"
              type="date"
              labelText={t('cardDate', 'Card date')}
              value={date}
              max={dayjs().format('YYYY-MM-DD')}
              readOnly={readOnly}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
          <Select
            id="ncd-header-location"
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
          startSections.map((k) => (
            <section className={styles.section} key={k}>
              <h4 className={styles.sectionTitle}>{t(`${i18nPrefix}${k}`, sections[k].title)}</h4>
              {grouped(sections[k].fields)}
            </section>
          ))
        ) : (
          <section className={styles.section}>{grouped(fields)}</section>
        )}

        {submitted && rules.diagnosis && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title={
              config.diagnosisNames
                ? t('tickOneDiagnosisOf', 'Tick at least one diagnosis: {{diagnoses}}.', { diagnoses: config.diagnosisNames })
                : t('tickOneDiagnosis', 'Tick at least one diagnosis.')
            }
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
