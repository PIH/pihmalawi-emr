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
import { type ArtEncounter, encounterValues, memberValue, obsGroups, obsValue, useCardEncounters, useEMastercard } from '../art/art.resource';
import { CURRENT, EXPOSURE, MH_CARD_KEY, MH_FORMS, MH_HEADER, MH_VISIT, NON_CODED_TEXT } from './mh-concepts';
import { MEDICATIONS, MH_HEADER_SECTIONS, MH_SCREENING_FIELDS, MH_VISIT_FIELDS, MSE_FINDINGS, type MhHeaderSection } from './mh-fields';
import { mseState } from './mh-rules';
import { launchMhPanel, useLaunchMhPanel } from './launch-mh-panel';
import styles from '../care-page.scss';

interface MentalHealthDashboardProps {
  patientUuid: string;
}

const same = (a: unknown, b: string) => String(a ?? '').toLowerCase() === b.toLowerCase();
const label = (options: Array<{ value: string; label: string }>, value: unknown) => options.find((o) => same(value, o.value))?.label ?? null;

/** A visit's medications, as the card writes them: e.g. RIS 2 mg, with its frequency */
function medicationsOf(visit: ArtEncounter) {
  return obsGroups(visit, MH_VISIT.dispensingGroup)
    .map((g) => {
      const med = MEDICATIONS.find((m) => same(memberValue(g, MH_VISIT.medication), m.drug));
      if (!med) {
        return null;
      }
      const name = med.key === 'other' ? (memberValue(g, NON_CODED_TEXT) as string) || med.short : med.short;
      const dose = memberValue(g, MH_VISIT.dose);
      const amount = [name, dose, label(MH_VISIT.doseUnits, memberValue(g, MH_VISIT.doseUnit))].filter((x) => x !== null && x !== '').join(' ');
      return { amount, frequency: label(MH_VISIT.frequencies, memberValue(g, MH_VISIT.frequency)) };
    })
    .filter(Boolean);
}

const medicationText = (m: { amount: string; frequency: string | null }) => [m.amount, m.frequency].filter(Boolean).join(' ');

/** The visits at which the medications changed (the first visit with any counting as one), newest first */
function medicationChanges(visits: Array<ArtEncounter>) {
  const changes: Array<{ date: string; text: string }> = [];
  [...visits].reverse().forEach((v) => {
    const meds = medicationsOf(v);
    if (!meds.length) {
      return;
    }
    const text = meds.map(medicationText).sort().join(', ');
    if (changes[changes.length - 1]?.text !== text) {
      changes.push({ date: v.encounterDatetime, text });
    }
  });
  return changes.reverse();
}

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
    medications: medicationsOf(v).map(medicationText).join(', ') || null,
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
const MentalHealthDashboard: React.FC<MentalHealthDashboardProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { card, isLoading, error } = useEMastercard(patientUuid, MH_CARD_KEY);
  const { encounters: headers } = useCardEncounters(patientUuid, MH_FORMS.header);
  const { encounters: visits } = useCardEncounters(patientUuid, MH_FORMS.visit);
  const { encounters: screenings } = useCardEncounters(patientUuid, MH_FORMS.screening);
  const launchNew = useLaunchMhPanel(patientUuid);

  const heading = (
    <div className={styles.heading}>
      <span className={styles.eyebrow}>{t('careAndTreatment', 'Care and treatment')}</span>
      <h3 className={styles.title}>{t('mentalHealth', 'Mental health')}</h3>
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
  const meds = latest ? medicationsOf(latest) : [];
  const next = formatDay(obsValue(latest, MH_VISIT.nextAppointment) as string);
  const changes = medicationChanges(visits);
  const mseVisits = visits.slice(0, 4);
  const description = [
    t('mentalHealthPatientCard', 'Mental health patient card'),
    header &&
      (header.location?.display
        ? t('enrolledAt', 'enrolled {{date}} at {{location}}', { date: formatDay(header.encounterDatetime), location: header.location.display })
        : t('enrolled', 'enrolled {{date}}', { date: formatDay(header.encounterDatetime) })),
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

  const section = (key: MhHeaderSection) => {
    const title = t(`mhSection_${key}`, MH_HEADER_SECTIONS[key].title);
    const rows = sectionRows(key, header);
    const listed = key === 'diagnoses' || key === 'presentingFeatures';
    return (
      <section aria-label={title} className={styles.card} key={key}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>{title}</h4>
          {canEdit &&
            (header ? (
              editButton(() => launchMhPanel('header', { patientUuid, section: key }))
            ) : (
              <Button kind="ghost" size="sm" onClick={() => launchMhPanel('header', { patientUuid, section: 'start' })}>
                {t('startCard', 'Start the card')}
              </Button>
            ))}
        </div>
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
      </section>
    );
  };

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
          <h3 className={styles.title}>{t('mentalHealth', 'Mental health')}</h3>
          <span className={styles.description}>{description}</span>
        </div>
        <div className={styles.actions}>
          {recordButton(t('recordScreening', 'Record screening'), () => launchNew('screening'))}
          {recordButton(t('recordMentalHealthVisit', 'Record mental health visit'), () => launchNew('visit'), 'primary')}
        </div>
      </div>

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
          detail={[...new Set(meds.map((m) => m.frequency).filter(Boolean))].join(', ') || null}
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
        {section('diagnoses')}
        {section('presentingFeatures')}
        {section('historyExposures')}
      </div>

      <div className={styles.cards}>
        <section aria-label={t('mentalStatusExamination', 'Mental status examination')} className={styles.card}>
          <div className={styles.cardHeader}>
            <h4 className={styles.cardTitle}>{t('mentalStatusExamination', 'Mental status examination')}</h4>
          </div>
          {mseVisits.length ? (
            <div className={styles.tableWrapper}>
              <Table aria-label={t('mentalStatusExamination', 'Mental status examination')} size="sm">
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
                            {state === 'present' ? t('present', 'Present') : state === 'absent' ? t('absent', 'Absent') : '–'}
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

        <section aria-label={t('medicationHistory', 'Medication history')} className={styles.card}>
          <div className={styles.cardHeader}>
            <h4 className={styles.cardTitle}>{t('medicationHistory', 'Medication history')}</h4>
          </div>
          <ol className={styles.history}>
            {changes.map((c, i) => (
              <li key={c.date}>
                <span className={styles.historyDate}>{formatDay(c.date)}</span>
                <span className={styles.historyRegimen}>{c.text}</span>
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

      <section aria-label={t('mentalHealthVisits', 'Mental health visits')} className={styles.card}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>{t('mentalHealthVisits', 'Mental health visits')}</h4>
        </div>
        {table(
          t('mentalHealthVisits', 'Mental health visits'),
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

export default MentalHealthDashboard;
