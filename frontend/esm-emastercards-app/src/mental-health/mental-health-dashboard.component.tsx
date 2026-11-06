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
import { type ArtEncounter, encounterValues, memberValue, obsGroups, obsValue, useCardEncounters, useCardGroup, useEMastercard } from '../art/art.resource';
import { CURRENT, EXPOSURE, MH_CARD_KEY, MH_CARD_VERSION, MH_FORMS, MH_HEADER, MH_VISIT } from './mh-concepts';
import { MedicationEntry, medicationChanges, medicationsOf, medicationText } from '../shared/medications';
import { MEDICATIONS, MH_HEADER_SECTIONS, MH_SCREENING_FIELDS, MH_VISIT_FIELDS, MSE_FINDINGS, type MhHeaderSection } from './mh-fields';
import { mseState } from './mh-rules';
import { launchMhPanel, useLaunchMhPanel } from './launch-mh-panel';
import { enrolmentText } from '../emastercards.resource';
import { CARD_PARAM, cardName, CardGroupTabs, selectedCard, useCurrentUrl } from '../shared/card-group';
import LegacyCardPage from '../shared/legacy-card-page.component';
import { EP_CARD_KEY } from '../epilepsy/ep-concepts';
import EpilepsyCard from '../epilepsy/epilepsy-card.component';
import styles from '../care-page.scss';

interface MentalHealthDashboardProps {
  patientUuid: string;
}

const same = (a: unknown, b: string) => String(a ?? '').toLowerCase() === b.toLowerCase();

/** How many of the latest visits the mental status examination table shows */
const MSE_VISITS = 4;

/** Current use of chamba, alcohol and other drugs ticked at a visit */
function currentUse(visit: ArtEncounter) {
  const uses: Array<[string, string, string]> = [
    [EXPOSURE.chambaGroup, EXPOSURE.history, 'Chamba'],
    [EXPOSURE.alcoholGroup, EXPOSURE.alcoholHistory, 'Alcohol'],
    [EXPOSURE.otherDrugsGroup, EXPOSURE.history, 'Other drugs'],
  ];
  return uses.filter(([group, concept]) => obsGroups(visit, group).some((g) => same(memberValue(g, concept), CURRENT))).map(([, , name]) => name);
}

const yesNoValue = (visit: ArtEncounter, concept: string) => {
  const value = obsValue(visit, concept);
  return same(value, YES) ? 'Yes' : same(value, NO) ? 'No' : null;
};

function visitCells(v: ArtEncounter): Record<string, string | null> {
  const f = MH_VISIT_FIELDS;
  const show = (field: ArtField) => displayValue(field, obsValue(v, field.concept, field.kind === 'multi'));
  const present = (obsValue(v, MH_VISIT.msePresent, true) as Array<string>)
    .map((a) => MSE_FINDINGS.find((m) => same(a, m.answer))?.label)
    .filter(Boolean);
  return {
    date: formatDay(v.encounterDatetime),
    location: v.location?.display ?? null,
    height: show(f.height),
    weight: show(f.weight),
    phq9: show(f.phq9Score),
    mse: present.join(', ') || null,
    use: currentUse(v).join(', ') || null,
    pregnant: same(obsValue(v, MH_VISIT.pregnant), YES) ? 'Yes' : null,
    familyPlanning: yesNoValue(v, MH_VISIT.familyPlanning),
    suicideRisk: yesNoValue(v, MH_VISIT.suicideRisk),
    sideEffects: show(f.sideEffects),
    hospitalised: yesNoValue(v, MH_VISIT.hospitalised),
    stable: yesNoValue(v, MH_VISIT.stable),
    dailyActivities: yesNoValue(v, MH_VISIT.dailyActivities),
    counselling: yesNoValue(v, MH_VISIT.counselling),
    medications: medicationsOf(v, MEDICATIONS).map(medicationText).join(', ') || null,
    next: show(f.nextAppointment),
  };
}

function screeningCells(e: ArtEncounter): Record<string, string | null> {
  const values = encounterValues(MH_SCREENING_FIELDS, e);
  const field = (name: string) => MH_SCREENING_FIELDS.find((f) => f.name === name);
  const withOther = (name: string, other: string, text: string) =>
    [displayValue(field(name), values[name]), values[other] ? `Other${values[text] ? `: ${values[text]}` : ''}` : null].filter(Boolean).join(', ') ||
    null;
  return {
    date: formatDay(e.encounterDatetime),
    diagnosis: withOther('diagnosis', 'otherDiagnosis', 'otherDiagnosisText'),
    intervention: withOther('intervention', 'otherIntervention', 'otherInterventionText'),
    session: displayValue(field('session'), values.session),
    outcome: displayValue(field('outcome'), values.outcome),
    outcomeDate: displayValue(field('outcomeDate'), values.outcomeDate),
    next: displayValue(field('nextAppointment'), values.nextAppointment),
  };
}

/** A header section's answers as the page lists them: ticked diagnoses and features with their dates, else label and value */
function sectionRows(key: MhHeaderSection, header: ArtEncounter | null): Array<{ key: string; label?: string; value: string }> {
  const { fields } = MH_HEADER_SECTIONS[key];
  const values = encounterValues(fields, header);
  if (key === 'diagnoses' || key === 'presentingFeatures') {
    return fields
      .filter((f) => f.checkbox && values[f.name])
      .map((f) => {
        const specify = (f.comment ? values[f.comment] : values[`${f.name}Name`]) as string | null;
        const name = specify ? `${f.label}: ${specify}` : f.label;
        return { key: f.name, value: [name, formatDay(values[`${f.name}Date`] as string)].filter(Boolean).join(' · ') };
      });
  }
  return fields
    .map((f) => ({ key: f.name, label: f.label, value: displayValue(f, values[f.name]) }))
    .filter((r) => r.value !== null);
}

const Headline: React.FC<{ label: string; value: string | null; detail?: string | null; alert?: boolean }> = ({ label, value, detail, alert }) => (
  <div className={styles.headline}>
    <span className={styles.label}>{label}</span>
    <span className={styles.value}>{value ?? '–'}</span>
    {detail && <span className={alert ? styles.due : styles.detail}>{detail}</span>}
  </div>
);

/**
 * The Mental Health eMastercard, natively in O3: the headline, the card header's sections, the mental status
 * examination and medication history, and the visits and screenings, each edited in its own side panel
 */
const MentalHealthCard: React.FC<MentalHealthDashboardProps & { tabs?: React.ReactNode }> = ({ patientUuid, tabs }) => {
  const { t } = useTranslation();
  const { card, isLoading, error } = useEMastercard(patientUuid, MH_CARD_KEY);
  const { encounters: headers } = useCardEncounters(patientUuid, MH_FORMS.header);
  const { encounters: visits } = useCardEncounters(patientUuid, MH_FORMS.visit);
  const { encounters: screenings } = useCardEncounters(patientUuid, MH_FORMS.screening);
  const launchNew = useLaunchMhPanel(patientUuid);

  const heading = (
    <div className={styles.heading}>
      <span className={styles.eyebrow}>{t('careAndTreatment', 'Care and treatment')}</span>
      <h3 className={styles.title}>{t('mentalHealthRecord', 'Mental Health Record')}</h3>
    </div>
  );
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
        {heading}
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={card?.message ?? t('noMentalHealthCard', 'This patient has no mental health patient card.')}
        />
      </div>
    );
  }

  const canEdit = card.state === 'CREATE' || card.state === 'EDIT';
  const header = headers.find((e) => e.uuid === card.initialEncounterUuid) ?? (headers.length === 1 ? headers[0] : null);
  const latest = visits[0];
  const assessed = (value: string | null) => (value ? t('assessed', 'Assessed {{date}}', { date: formatDay(latest.encounterDatetime) }) : null);
  const stable = latest ? yesNoValue(latest, MH_VISIT.stable) : null;
  const suicideRisk = latest ? yesNoValue(latest, MH_VISIT.suicideRisk) : null;
  const daily = latest ? yesNoValue(latest, MH_VISIT.dailyActivities) : null;
  const meds = latest ? medicationsOf(latest, MEDICATIONS) : [];
  const next = formatDay(obsValue(latest, MH_VISIT.nextAppointment) as string);
  const changes = medicationChanges(visits, MEDICATIONS);
  const mseVisits = visits.slice(0, MSE_VISITS);
  const description = [
    t('mentalHealthPatientCard', 'Mental health patient card'),
    t('cardVersion', 'version {{version}}', { version: MH_CARD_VERSION }),
    enrolmentText(card, t, formatDay),
  ]
    .filter(Boolean)
    .join(' · ');

  const recordButton = (text: string, onClick: () => void, kind: 'primary' | 'tertiary' = 'tertiary') =>
    canEdit && (
      <Button kind={kind} size="md" disabled={card.state !== 'EDIT'} onClick={onClick}>
        {text}
      </Button>
    );
  const editButton = (onClick: () => void) =>
    canEdit && (
      <Button kind="ghost" size="sm" onClick={onClick}>
        {t('editSection', 'Edit')}
      </Button>
    );

  const sectionAction = (key: MhHeaderSection) =>
    canEdit &&
    (header ? (
      editButton(() => launchMhPanel('header', { patientUuid, section: key }))
    ) : (
      <Button kind="ghost" size="sm" onClick={() => launchMhPanel('header', { patientUuid, section: 'start' })}>
        {t('startCard', 'Start the card')}
      </Button>
    ));

  const sectionBody = (key: MhHeaderSection) => {
    const rows = sectionRows(key, header);
    const listed = key === 'diagnoses' || key === 'presentingFeatures';
    return (
      <>
        {listed ? (
          <ul className={styles.history}>
            {rows.map((r) => (
              <li key={r.key}>{r.value}</li>
            ))}
          </ul>
        ) : (
          <dl className={styles.fields}>
            {rows.map((r) => (
              <React.Fragment key={r.key}>
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </React.Fragment>
            ))}
          </dl>
        )}
        {!rows.length && <p className={styles.empty}>{t('notRecorded', 'Not recorded yet')}</p>}
      </>
    );
  };

  const section = (key: MhHeaderSection, extra?: React.ReactNode) => {
    const title = t(`mhSection_${key}`, MH_HEADER_SECTIONS[key].title);
    return (
      <section aria-label={title} className={styles.card} key={key}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>{title}</h4>
          {sectionAction(key)}
        </div>
        {sectionBody(key)}
        {extra}
      </section>
    );
  };

  // as in the mockup, the presenting features sit under the diagnoses, in the same card, with their own Edit
  const presentingFeatures = (
    <div aria-label={t('mhSection_presentingFeatures', MH_HEADER_SECTIONS.presentingFeatures.title)} role="group">
      <div className={styles.subsectionHeader}>
        <h5 className={styles.subtitle}>{t('mhSection_presentingFeatures', MH_HEADER_SECTIONS.presentingFeatures.title)}</h5>
        {header && sectionAction('presentingFeatures')}
      </div>
      {sectionBody('presentingFeatures')}
    </div>
  );

  const visitColumns = [
    { key: 'date', header: t('visitDate', 'Visit date') },
    { key: 'location', header: t('location', 'Location') },
    { key: 'height', header: t('height', 'Height') },
    { key: 'weight', header: t('weight', 'Weight') },
    { key: 'phq9', header: t('phq9', 'PHQ-9') },
    { key: 'mse', header: t('mseFindings', 'MSE findings') },
    { key: 'use', header: t('currentUse', 'Current use') },
    { key: 'pregnant', header: t('pregnant', 'Pregnant') },
    { key: 'familyPlanning', header: t('familyPlanning', 'Family planning') },
    { key: 'suicideRisk', header: t('suicideRisk', 'Suicide risk') },
    { key: 'sideEffects', header: t('sideEffects', 'Side effects') },
    { key: 'hospitalised', header: t('hospitalised', 'Hospitalised') },
    { key: 'stable', header: t('stable', 'Stable') },
    { key: 'dailyActivities', header: t('dailyActivities', 'Daily activities') },
    { key: 'counselling', header: t('counselling', 'Counselling') },
    { key: 'medications', header: t('medications', 'Medications') },
    { key: 'next', header: t('nextAppointment', 'Next appointment') },
  ];
  const screeningColumns = [
    { key: 'date', header: t('date', 'Date') },
    { key: 'diagnosis', header: t('diagnosis', 'Diagnosis') },
    { key: 'intervention', header: t('intervention', 'Intervention') },
    { key: 'session', header: t('session', 'Session') },
    { key: 'outcome', header: t('outcome', 'Outcome') },
    { key: 'outcomeDate', header: t('outcomeDate', 'Outcome date') },
    { key: 'next', header: t('nextAppointment', 'Next appointment') },
  ];

  const table = (
    name: string,
    columns: Array<{ key: string; header: string }>,
    rows: Array<{ uuid: string; cells: Record<string, string | null> }>,
    onEdit: (uuid: string) => void,
  ) => (
    <div className={styles.tableWrapper}>
      <Table aria-label={name} size="sm">
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableHeader key={c.key}>{c.header}</TableHeader>
            ))}
            {canEdit && <TableHeader aria-label={t('actions', 'Actions')} />}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.uuid}>
              {columns.map((c) => (
                <TableCell key={c.key}>{r.cells[c.key] ?? ''}</TableCell>
              ))}
              {canEdit && <TableCell>{editButton(() => onEdit(r.uuid))}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>{t('careAndTreatment', 'Care and treatment')}</span>
          <h3 className={styles.title}>{t('mentalHealthRecord', 'Mental Health Record')}</h3>
          <span className={styles.description}>{description}</span>
        </div>
        <div className={styles.actions}>
          {recordButton(t('recordScreening', 'Record screening'), () => launchNew('screening'))}
          {recordButton(t('recordMentalHealthVisit', 'Record mental health visit'), () => launchNew('visit'), 'primary')}
        </div>
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
          title={t('startCardFirst', 'Start the card first: visits and screenings can be recorded once it has been saved.')}
        />
      )}

      <section aria-label={t('mentalHealthAtAGlance', 'Mental health at a glance')} className={styles.headlines}>
        <Headline label={t('patientStable', 'Patient stable')} value={stable} detail={assessed(stable)} />
        <Headline label={t('suicideRisk', 'Suicide risk')} value={suicideRisk} detail={assessed(suicideRisk)} alert={suicideRisk === 'Yes'} />
        <Headline
          label={t('currentMedication', 'Current medication')}
          value={meds.map((m) => m.amount).join(', ') || null}
          detail={meds.map((m) => [m.name, m.frequencyWords].filter(Boolean).join(' · ')).join(', ') || null}
        />
        <Headline
          label={t('dailyActivities', 'Daily activities')}
          value={daily === 'Yes' ? t('able', 'Able') : daily === 'No' ? t('notAble', 'Not able') : null}
          detail={assessed(daily)}
        />
        <Headline
          label={t('nextAppointment', 'Next appointment')}
          value={next}
          detail={next ? t('booked', 'Booked {{date}}', { date: formatDay(latest.encounterDatetime) }) : null}
        />
      </section>

      <div className={styles.cards}>
        {section('patientGuardian')}
        {section('diagnoses', presentingFeatures)}
        {section('historyExposures')}
      </div>

      <div className={styles.cards}>
        <section aria-label={t('mentalStatusExamination', 'Mental Status Examination')} className={styles.card}>
          <div className={styles.cardHeader}>
            <h4 className={styles.cardTitle}>{t('mentalStatusExamination', 'Mental Status Examination')}</h4>
            {mseVisits.length > 0 && (
              <span className={styles.detail}>{t('lastVisits', 'Last {{count}} visits', { count: MSE_VISITS })}</span>
            )}
          </div>
          {mseVisits.length ? (
            <div className={styles.tableWrapper}>
              <Table aria-label={t('mentalStatusExamination', 'Mental Status Examination')} size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>{t('finding', 'Finding')}</TableHeader>
                    {mseVisits.map((v) => (
                      <TableHeader key={v.uuid}>{formatDay(v.encounterDatetime)}</TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {MSE_FINDINGS.map((f) => (
                    <TableRow key={f.key}>
                      <TableCell>{f.label}</TableCell>
                      {mseVisits.map((v) => {
                        const state = mseState(
                          obsValue(v, MH_VISIT.msePresent, true) as Array<string>,
                          obsValue(v, MH_VISIT.mseAbsent, true) as Array<string>,
                          f.answer,
                        );
                        return (
                          <TableCell key={v.uuid}>
                            {state === 'present' ? (
                              <span className={styles.present}>{t('present', 'Present')}</span>
                            ) : state === 'absent' ? (
                              t('absent', 'Absent')
                            ) : (
                              '–'
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className={styles.empty}>{t('noMentalHealthVisits', 'No mental health visits recorded yet')}</p>
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
            <dt>{t('sideEffectsNow', 'Side effects now')}</dt>
            <dd>{(latest && displayValue(MH_VISIT_FIELDS.sideEffects, obsValue(latest, MH_VISIT.sideEffects))) ?? '–'}</dd>
            <dt>{t('counselling', 'Counselling')}</dt>
            <dd>{(latest && yesNoValue(latest, MH_VISIT.counselling)) ?? '–'}</dd>
            <dt>{t('hospitalisations', 'Hospitalisations')}</dt>
            <dd>{String(visits.filter((v) => same(obsValue(v, MH_VISIT.hospitalised), YES)).length)}</dd>
          </dl>
        </section>
      </div>

      <section aria-label={t('mentalHealthVisits', 'Mental Health Visits')} className={styles.card}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>{t('mentalHealthVisits', 'Mental Health Visits')}</h4>
        </div>
        {table(
          t('mentalHealthVisits', 'Mental Health Visits'),
          visitColumns,
          visits.map((v) => ({ uuid: v.uuid, cells: visitCells(v) })),
          (uuid) => launchMhPanel('visit', { patientUuid, encounterUuid: uuid }),
        )}
        {!visits.length && <p className={styles.empty}>{t('noMentalHealthVisits', 'No mental health visits recorded yet')}</p>}
      </section>

      <section aria-label={t('screenings', 'Screenings')} className={styles.card}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>{t('screenings', 'Screenings')}</h4>
        </div>
        {table(
          t('screenings', 'Screenings'),
          screeningColumns,
          screenings.map((e) => ({ uuid: e.uuid, cells: screeningCells(e) })),
          (uuid) => launchMhPanel('screening', { patientUuid, encounterUuid: uuid }),
        )}
        {!screenings.length && <p className={styles.empty}>{t('noScreenings', 'No screenings recorded yet')}</p>}
      </section>
    </div>
  );
};

/**
 * The Mental health page: the card the URL names among the patient's Mental Health Record cards, with a tab for
 * each when there is more than one. The mental health and epilepsy cards are kept natively; others show their legacy
 * card.
 */
const MentalHealthDashboard: React.FC<MentalHealthDashboardProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { cards, inactive } = useCardGroup(patientUuid, MH_CARD_KEY);
  const url = useCurrentUrl();
  const selected = selectedCard(cards, url.searchParams.get(CARD_PARAM), MH_CARD_KEY);
  const tabs = (
    <div className={styles.tabsRow}>
      <CardGroupTabs
        patientUuid={patientUuid}
        path="mentalHealth"
        cards={cards}
        selected={selected?.key ?? MH_CARD_KEY}
        label={t('mentalHealthCards', 'Mental health cards')}
      />
      {/* as in the mockup: why a card of the record is missing, when the patient is not on treatment or in advanced care for it */}
      {inactive.map((c) => (
        <span key={c.key} className={styles.detail}>
          {t('cardShowsWhen', '{{card}} shows only when it is a state on treatment/in advanced care in Enrolments', {
            card: t(`cardName_${c.key}`, cardName(c)),
          })}
        </span>
      ))}
    </div>
  );
  if (selected?.key === EP_CARD_KEY) {
    return <EpilepsyCard patientUuid={patientUuid} title={t('mentalHealthRecord', 'Mental Health Record')} tabs={tabs} />;
  }
  if (selected && selected.key !== MH_CARD_KEY) {
    return <LegacyCardPage card={selected} patientUuid={patientUuid} title={t('mentalHealthRecord', 'Mental Health Record')} tabs={tabs} />;
  }
  return <MentalHealthCard patientUuid={patientUuid} tabs={tabs} />;
};

export default MentalHealthDashboard;
