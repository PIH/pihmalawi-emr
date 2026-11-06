import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  InlineLoading,
  InlineNotification,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { NO, YES } from '../art/art-concepts';
import { type ArtField, displayValue, formatDay } from '../art/art-fields';
import { type ArtEncounter, encounterValues, obsValue, useCardEncounters, useEMastercard } from '../art/art.resource';
import { enrolmentText } from '../emastercards.resource';
import { MedicationEntry, medicationChanges, medicationDetail, medicationsOf, medicationText } from '../shared/medications';
import { EP_CARD_KEY, EP_CARD_VERSION, EP_FORMS, EP_VISIT } from './ep-concepts';
import { EP_HEADER_SECTIONS, EP_MEDICATIONS, EP_VISIT_FIELDS, type EpHeaderSection } from './ep-fields';
import { launchEpPanel, useLaunchEpVisit } from './launch-ep-panel';
import styles from '../care-page.scss';

/** How many of the latest visits the seizure activity table shows */
const RECENT_VISITS = 4;

const same = (a: unknown, b: string) => String(a ?? '').toLowerCase() === b.toLowerCase();

const yesNoValue = (visit: ArtEncounter | undefined, concept: string) => {
  const value = obsValue(visit, concept);
  return same(value, YES) ? 'Yes' : same(value, NO) ? 'No' : null;
};

const show = (visit: ArtEncounter | undefined, field: ArtField) =>
  visit ? displayValue(field, obsValue(visit, field.concept, field.kind === 'multi')) : null;

function visitCells(v: ArtEncounter): Record<string, string | null> {
  const f = EP_VISIT_FIELDS;
  return {
    date: formatDay(v.encounterDatetime),
    location: v.location?.display ?? null,
    height: show(v, f.height),
    weight: show(v, f.weight),
    bmi: show(v, f.bmi),
    seizures: show(v, f.anySeizures),
    numberOfSeizures: show(v, f.numberOfSeizures),
    triggers: show(v, f.triggers) ?? show(v, f.anyTriggers),
    silentMarkers: show(v, f.silentMarkers),
    hospitalised: show(v, f.hospitalised),
    pregnant: same(obsValue(v, EP_VISIT.pregnant), YES) ? 'Yes' : null,
    familyPlanning: show(v, f.familyPlanning),
    medications: medicationsOf(v, EP_MEDICATIONS).map(medicationText).join(', ') || null,
    comments: show(v, f.comments),
    next: show(v, f.nextAppointment),
  };
}

/**
 * A header section's answers as the page lists them: the exposures and complications ticked, with what an Other was
 * and its date, then every other answer by its label
 */
function sectionRows(key: EpHeaderSection, header: ArtEncounter | null) {
  const { fields } = EP_HEADER_SECTIONS[key];
  const values = encounterValues(fields, header);
  const listed = fields
    .filter((f) => f.checkbox && values[f.name])
    .map((f) => {
      const specify = f.comment ? (values[f.comment] as string | null) : null;
      return { key: f.name, value: [specify ? `${f.label}: ${specify}` : f.label, formatDay(values[`${f.name}Date`] as string)].filter(Boolean).join(' · ') };
    });
  const dated = new Set(fields.filter((f) => f.checkbox).map((f) => `${f.name}Date`));
  const labelled = fields
    .filter((f) => !f.checkbox && !dated.has(f.name))
    .map((f) => ({ key: f.name, label: f.label, value: displayValue(f, values[f.name]) }))
    .filter((r) => r.value !== null);
  return { listed, labelled };
}

const Headline: React.FC<{ label: string; value: string | null; detail?: string | null; alert?: boolean }> = ({ label, value, detail, alert }) => (
  <div className={styles.headline}>
    <span className={styles.label}>{label}</span>
    <span className={styles.value}>{value ?? '–'}</span>
    {detail && <span className={alert ? styles.due : styles.detail}>{detail}</span>}
  </div>
);

interface EpilepsyCardProps {
  patientUuid: string;
  /** The chart page's title, e.g. Mental health */
  title: string;
  tabs?: React.ReactNode;
}

/**
 * The Epilepsy eMastercard, natively in O3: the headline, the card header's sections, the seizure activity and
 * medication history, and the visits, each edited in its own side panel
 */
const EpilepsyCard: React.FC<EpilepsyCardProps> = ({ patientUuid, title, tabs }) => {
  const { t } = useTranslation();
  const { card, isLoading, error } = useEMastercard(patientUuid, EP_CARD_KEY);
  const { encounters: headers } = useCardEncounters(patientUuid, EP_FORMS.header);
  const { encounters: visits } = useCardEncounters(patientUuid, EP_FORMS.visit);
  const recordVisit = useLaunchEpVisit(patientUuid);

  if (isLoading) {
    return <InlineLoading description={t('loading', 'Loading...')} />;
  }
  if (error) {
    return (
      <InlineNotification kind="error" lowContrast hideCloseButton title={t('loadError', 'Could not load the eMastercards')} subtitle={error.message} />
    );
  }
  if (!card || card.state === 'UNAVAILABLE') {
    return (
      <div className={styles.page}>
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={card?.message ?? t('noEpilepsyCard', 'This patient has no epilepsy patient card.')}
        />
      </div>
    );
  }

  const canEdit = card.state === 'CREATE' || card.state === 'EDIT';
  const header = headers.find((e) => e.uuid === card.initialEncounterUuid) ?? (headers.length === 1 ? headers[0] : null);
  const latest = visits[0];
  const assessed = (value: string | null) => (value ? t('assessed', 'Assessed {{date}}', { date: formatDay(latest.encounterDatetime) }) : null);
  const seizures = yesNoValue(latest, EP_VISIT.anySeizures);
  const count = obsValue(latest, EP_VISIT.numberOfSeizures);
  const anyTriggers = yesNoValue(latest, EP_VISIT.anyTriggers);
  const triggers = show(latest, EP_VISIT_FIELDS.triggers);
  const hospitalised = yesNoValue(latest, EP_VISIT.hospitalised);
  const meds = latest ? medicationsOf(latest, EP_MEDICATIONS) : [];
  const next = formatDay(obsValue(latest, EP_VISIT.nextAppointment) as string);
  const changes = medicationChanges(visits, EP_MEDICATIONS);
  const recent = visits.slice(0, RECENT_VISITS);
  const description = [
    t('epilepsyPatientCard', 'Epilepsy patient card'),
    t('cardVersion', 'version {{version}}', { version: EP_CARD_VERSION }),
    enrolmentText(card, t, formatDay),
  ].filter(Boolean).join(' · ');

  const editButton = (onClick: () => void) =>
    canEdit && (
      <Button kind="ghost" size="sm" onClick={onClick}>
        {t('editSection', 'Edit')}
      </Button>
    );

  const section = (key: EpHeaderSection) => {
    const sectionTitle = t(`epSection_${key}`, EP_HEADER_SECTIONS[key].title);
    const { listed, labelled } = sectionRows(key, header);
    return (
      <section aria-label={sectionTitle} className={styles.card} key={key}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>{sectionTitle}</h4>
          {canEdit &&
            (header ? (
              editButton(() => launchEpPanel('header', { patientUuid, section: key }))
            ) : (
              <Button kind="ghost" size="sm" onClick={() => launchEpPanel('header', { patientUuid, section: 'start' })}>
                {t('startCard', 'Start the card')}
              </Button>
            ))}
        </div>
        {listed.length > 0 && (
          <ul className={styles.history}>
            {listed.map((r) => (
              <li key={r.key}>{r.value}</li>
            ))}
          </ul>
        )}
        {labelled.length > 0 && (
          <dl className={styles.fields}>
            {labelled.map((r) => (
              <React.Fragment key={r.key}>
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </React.Fragment>
            ))}
          </dl>
        )}
        {!listed.length && !labelled.length && <p className={styles.empty}>{t('notRecorded', 'Not recorded yet')}</p>}
      </section>
    );
  };

  // the seizure activity of the latest visits, as the mental status examination is shown on the mental health card
  const activityRows: Array<{ key: string; label: string; cell: (v: ArtEncounter) => React.ReactNode }> = [
    {
      key: 'seizures',
      label: t('seizuresSinceLastVisit', 'Seizures since last visit'),
      cell: (v) => {
        const value = yesNoValue(v, EP_VISIT.anySeizures);
        return value === 'Yes' ? <span className={styles.present}>{t('yes', 'Yes')}</span> : (value ?? '–');
      },
    },
    { key: 'count', label: t('numberOfSeizures', 'Number of seizures'), cell: (v) => show(v, EP_VISIT_FIELDS.numberOfSeizures) ?? '–' },
    { key: 'anyTriggers', label: t('anyTriggers', 'Any triggers'), cell: (v) => show(v, EP_VISIT_FIELDS.anyTriggers) ?? '–' },
    { key: 'triggers', label: t('seizureTriggers', 'Seizure triggers'), cell: (v) => show(v, EP_VISIT_FIELDS.triggers) ?? '–' },
    { key: 'silentMarkers', label: t('silentMarkers', 'Silent markers'), cell: (v) => show(v, EP_VISIT_FIELDS.silentMarkers) ?? '–' },
  ];

  const visitColumns = [
    { key: 'date', header: t('visitDate', 'Visit date') },
    { key: 'location', header: t('location', 'Location') },
    { key: 'height', header: t('height', 'Height') },
    { key: 'weight', header: t('weight', 'Weight') },
    { key: 'bmi', header: t('bmi', 'BMI') },
    { key: 'seizures', header: t('seizures', 'Seizures') },
    { key: 'numberOfSeizures', header: t('numberOfSeizuresShort', 'No. of seizures') },
    { key: 'triggers', header: t('triggers', 'Triggers') },
    { key: 'silentMarkers', header: t('silentMarkers', 'Silent markers') },
    { key: 'hospitalised', header: t('hospitalised', 'Hospitalised') },
    { key: 'pregnant', header: t('pregnant', 'Pregnant') },
    { key: 'familyPlanning', header: t('familyPlanning', 'Family planning') },
    { key: 'medications', header: t('medications', 'Medications') },
    { key: 'comments', header: t('comment', 'Comment') },
    { key: 'next', header: t('nextAppointment', 'Next appointment') },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>{t('careAndTreatment', 'Care and treatment')}</span>
          <h3 className={styles.title}>{title}</h3>
          <span className={styles.description}>{description}</span>
        </div>
        {canEdit && (
          <div className={styles.actions}>
            <Button kind="primary" size="md" disabled={card.state !== 'EDIT'} onClick={recordVisit}>
              {t('recordEpilepsyVisit', 'Record epilepsy visit')}
            </Button>
          </div>
        )}
      </div>

      {tabs}

      {card.state === 'VIEW' && (
        <InlineNotification kind="info" lowContrast hideCloseButton title={card.message ?? t('viewOnly', 'You can view this card but not change it.')} />
      )}
      {card.state === 'CREATE' && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title={t('startEpilepsyCardFirst', 'Start the card first: visits can be recorded once it has been saved.')}
        />
      )}

      <section aria-label={t('epilepsyAtAGlance', 'Epilepsy at a glance')} className={styles.headlines}>
        <Headline
          label={t('seizuresSinceLastVisit', 'Seizures since last visit')}
          value={seizures}
          detail={
            seizures
              ? [count !== null && count !== undefined ? t('seizureCount', '{{count}} seizures', { count: Number(count) }) : null, assessed(seizures)]
                  .filter(Boolean)
                  .join(' · ')
              : null
          }
          alert={seizures === 'Yes'}
        />
        <Headline label={t('triggers', 'Triggers')} value={anyTriggers ?? (triggers ? 'Yes' : null)} detail={triggers ?? assessed(anyTriggers)} />
        <Headline
          label={t('currentMedication', 'Current medication')}
          value={meds.map((m) => m.amount).join(', ') || null}
          detail={medicationDetail(meds)}
        />
        <Headline label={t('hospitalisedSinceLastVisit', 'Hospitalised since last visit')} value={hospitalised} detail={assessed(hospitalised)} />
        <Headline
          label={t('nextAppointment', 'Next appointment')}
          value={next}
          detail={next ? t('booked', 'Booked {{date}}', { date: formatDay(latest.encounterDatetime) }) : null}
        />
      </section>

      <div className={styles.cards}>
        {section('patientGuardian')}
        {section('seizureTypes')}
        {section('familyHistory')}
      </div>
      <div className={styles.cards}>
        {section('history')}
        {section('exposures')}
      </div>

      <div className={styles.cards}>
        <section aria-label={t('seizureActivity', 'Seizure Activity')} className={styles.card}>
          <div className={styles.cardHeader}>
            <h4 className={styles.cardTitle}>{t('seizureActivity', 'Seizure Activity')}</h4>
            {recent.length > 0 && (
              <span className={styles.detail}>{t('lastVisits', 'Last {{count}} visits', { count: RECENT_VISITS })}</span>
            )}
          </div>
          {recent.length ? (
            <div className={styles.tableWrapper}>
              <Table aria-label={t('seizureActivity', 'Seizure Activity')} size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>{t('finding', 'Finding')}</TableHeader>
                    {recent.map((v) => (
                      <TableHeader key={v.uuid}>{formatDay(v.encounterDatetime)}</TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activityRows.map((r) => (
                    <TableRow key={r.key}>
                      <TableCell>{r.label}</TableCell>
                      {recent.map((v) => (
                        <TableCell key={v.uuid}>{r.cell(v)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className={styles.empty}>{t('noEpilepsyVisits', 'No epilepsy visits recorded yet')}</p>
          )}
        </section>

        <section aria-label={t('medicationHistory', 'Medication History')} className={styles.card}>
          <div className={styles.cardHeader}>
            <h4 className={styles.cardTitle}>{t('medicationHistory', 'Medication History')}</h4>
          </div>
          <ol className={styles.history}>
            {changes.map((c, i) => (
              <li key={c.date}>
                <span className={styles.historyDate}>{formatDay(c.date)}</span>
                <span className={styles.historyRegimen}>
                  {c.medications.map((m, j) => (
                    <React.Fragment key={j}>
                      {j > 0 && ', '}
                      <MedicationEntry medication={m} />
                    </React.Fragment>
                  ))}
                </span>
                {i === 0 && (
                  <Tag type="green" size="sm">
                    {t('current', 'Current')}
                  </Tag>
                )}
              </li>
            ))}
          </ol>
          {!changes.length && <p className={styles.empty}>{t('noMedications', 'No medications recorded yet')}</p>}
          <dl className={styles.fields}>
            <dt>{t('hospitalisations', 'Hospitalisations')}</dt>
            <dd>{String(visits.filter((v) => same(obsValue(v, EP_VISIT.hospitalised), YES)).length)}</dd>
          </dl>
        </section>
      </div>

      <section aria-label={t('epilepsyVisits', 'Epilepsy Visits')} className={styles.card}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>{t('epilepsyVisits', 'Epilepsy Visits')}</h4>
        </div>
        <div className={styles.tableWrapper}>
          <Table aria-label={t('epilepsyVisits', 'Epilepsy Visits')} size="sm">
            <TableHead>
              <TableRow>
                {visitColumns.map((c) => (
                  <TableHeader key={c.key}>{c.header}</TableHeader>
                ))}
                {canEdit && <TableHeader aria-label={t('actions', 'Actions')} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {visits.map((v) => {
                const cells = visitCells(v);
                return (
                  <TableRow key={v.uuid}>
                    {visitColumns.map((c) => (
                      <TableCell key={c.key}>{cells[c.key] ?? ''}</TableCell>
                    ))}
                    {canEdit && <TableCell>{editButton(() => launchEpPanel('visit', { patientUuid, encounterUuid: v.uuid }))}</TableCell>}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {!visits.length && <p className={styles.empty}>{t('noEpilepsyVisits', 'No epilepsy visits recorded yet')}</p>}
      </section>
    </div>
  );
};

export default EpilepsyCard;
