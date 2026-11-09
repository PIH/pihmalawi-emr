import React from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from '@carbon/react';
import { YES } from '../art/art-concepts';
import { type ArtField, displayValue, formatDay } from '../art/art-fields';
import { sameDayValue } from '../art/art-rules';
import { type ArtEncounter, encounterValues, obsValue, useCardEncounters, useEMastercard, useObsOnDays } from '../art/art.resource';
import { type FieldValue } from '../art/obs-diff';
import { enrolmentText } from '../emastercards.resource';
import { MedicationEntry, medicationChanges, medicationDetail, medicationsOf, medicationText } from '../shared/medications';
import { HTN_CARD_KEY, HTN_CARD_VERSION, HTN_FORMS, HTN_VISIT } from './htn-concepts';
import {
  FOOT_CHECK_FIELDS,
  HTN_ANNUAL_LAB_FIELDS,
  HTN_HEADER_SECTIONS,
  HTN_HOSPITALISATION_FIELDS,
  HTN_MEDICATIONS,
  HTN_QUARTERLY_LAB_FIELDS,
  HTN_REFERENCE_FIELDS,
  HTN_VISIT_FIELDS,
  type HtnHeaderSection,
} from './htn-fields';
import { bpRaised, conditionsOf, sugarRaised } from './htn-rules';
import { launchHtnPanel, useLaunchHtnPanel } from './launch-htn-panel';
import styles from '../care-page.scss';

/** How many of the latest visits the monitoring table shows */
const RECENT_VISITS = 4;
/** How many of the latest visits show values recorded the same day in other encounters, e.g. vitals */
const REFERENCED_VISITS = 12;

const F = HTN_VISIT_FIELDS;
const day = (date: string) => dayjs(date).format('YYYY-MM-DD');
const same = (a: unknown, b: string) => String(a ?? '').toLowerCase() === b.toLowerCase();

type Referenced = Record<string, Record<string, Array<{ value: FieldValue; obsDatetime: string; encounterUuid: string }>>>;

/**
 * A visit's answer to a question, or for an obsreference field without one, the value recorded the same day in
 * another encounter, as the flowsheet shows it
 */
function valueOf(v: ArtEncounter | undefined, field: ArtField, referenced: Referenced): FieldValue {
  if (!v) {
    return null;
  }
  const own = obsValue(v, field.concept, field.kind === 'multi');
  if ((own !== null && !(Array.isArray(own) && !own.length)) || !field.reference) {
    return own;
  }
  return sameDayValue(referenced[day(v.encounterDatetime)]?.[field.concept.toLowerCase()] ?? [], v.encounterDatetime);
}

const shown = (v: ArtEncounter | undefined, field: ArtField, referenced: Referenced) => displayValue(field, valueOf(v, field, referenced));

function bloodPressure(v: ArtEncounter | undefined, referenced: Referenced) {
  const systolic = valueOf(v, F.systolicBp, referenced);
  const diastolic = valueOf(v, F.diastolicBp, referenced);
  if (systolic === null && diastolic === null) {
    return null;
  }
  return {
    text: `${systolic ?? '–'}/${diastolic ?? '–'}`,
    raised: bpRaised(systolic, diastolic),
  };
}

function bloodSugar(v: ArtEncounter | undefined, referenced: Referenced) {
  const glucose = shown(v, F.glucose, referenced);
  return glucose ? [glucose, shown(v, F.glucoseTestType, referenced)].filter(Boolean).join(' · ') : null;
}

/** Whether a visit's blood sugar is raised, from its HbA1c or its fasting or random blood sugar */
const sugarRaisedAt = (v: ArtEncounter | undefined, referenced: Referenced, only?: 'hbA1c' | 'glucose') =>
  sugarRaised({
    hbA1c: only === 'glucose' ? null : valueOf(v, F.hbA1c, referenced),
    glucose: only === 'hbA1c' ? null : valueOf(v, F.glucose, referenced),
    testType: valueOf(v, F.glucoseTestType, referenced),
  });

/** The foot check findings answered Yes */
const footFindings = (v: ArtEncounter) =>
  FOOT_CHECK_FIELDS.filter((f) => same(obsValue(v, f.concept), YES))
    .map((f) => f.label.replace('Foot check: ', ''))
    .join(', ') || null;

/**
 * A header section's answers as the page lists them: the diagnoses and complications ticked, with their dates, then
 * every other answer by its label
 */
function sectionRows(key: HtnHeaderSection, header: ArtEncounter | null) {
  const { fields } = HTN_HEADER_SECTIONS[key];
  const values = encounterValues(fields, header);
  const listed = fields
    .filter((f) => f.checkbox && values[f.name])
    .map((f) => ({
      key: f.name,
      value: [f.label, formatDay(values[`${f.name}Date`] as string)].filter(Boolean).join(' · '),
    }));
  // the label the checkboxes are asked under, e.g. Complications
  const heading = fields.find((f) => f.checkbox && f.heading)?.heading ?? null;
  const dated = new Set(fields.filter((f) => f.checkbox).map((f) => `${f.name}Date`));
  const labelled = fields
    .filter((f) => !f.checkbox && !dated.has(f.name))
    .map((f) => ({
      key: f.name,
      label: f.label,
      value: displayValue(f, values[f.name]),
    }))
    .filter((r) => r.value !== null);
  return { listed, labelled, heading };
}

const Headline: React.FC<{
  label: string;
  value: string | null;
  detail?: string | null;
  alert?: boolean;
}> = ({ label, value, detail, alert }) => (
  <div className={styles.headline}>
    <span className={styles.label}>{label}</span>
    <span className={alert ? `${styles.value} ${styles.present}` : styles.value}>{value ?? '–'}</span>
    {detail && <span className={styles.detail}>{detail}</span>}
  </div>
);

interface Column {
  key: string;
  header: string;
}

/** A form's encounters as a table, each row edited in the form's panel */
const EncounterTable: React.FC<{
  label: string;
  columns: Array<Column>;
  encounters: Array<ArtEncounter>;
  cells: (e: ArtEncounter) => Record<string, React.ReactNode>;
  onEdit?: (e: ArtEncounter) => void;
  empty: string;
}> = ({ label, columns, encounters, cells, onEdit, empty }) => {
  const { t } = useTranslation();
  if (!encounters.length) {
    return <p className={styles.empty}>{empty}</p>;
  }
  return (
    <div className={styles.tableWrapper}>
      <Table aria-label={label} size="sm">
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableHeader key={c.key}>{c.header}</TableHeader>
            ))}
            {onEdit && <TableHeader aria-label={t('actions', 'Actions')} />}
          </TableRow>
        </TableHead>
        <TableBody>
          {encounters.map((e) => {
            const row = cells(e);
            return (
              <TableRow key={e.uuid}>
                {columns.map((c) => (
                  <TableCell key={c.key}>{row[c.key] ?? ''}</TableCell>
                ))}
                {onEdit && (
                  <TableCell>
                    <Button kind="ghost" size="sm" onClick={() => onEdit(e)}>
                      {t('editSection', 'Edit')}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

/** A form's answers as table cells, those in obs groups (e.g. the HIV test) included */
function fieldCells(fields: Array<ArtField>, e: ArtEncounter, referenced: Referenced = {}) {
  const values = encounterValues(fields, e);
  return {
    date: formatDay(e.encounterDatetime),
    ...Object.fromEntries(
      fields
        .filter((f) => !f.hidden)
        .map((f) => [f.name, f.reference && values[f.name] === null ? shown(e, f, referenced) : displayValue(f, values[f.name])]),
    ),
  };
}

interface HtnCardProps {
  patientUuid: string;
  /** The chart page's title, e.g. Chronic Care Record */
  title: string;
  tabs?: React.ReactNode;
}

/**
 * The Hypertension and Diabetes eMastercard, natively in O3: the headline, the card header's sections, monitoring and
 * medication history, the laboratory tests and hospitalisations, and the visits, each edited in its own side panel
 */
const HtnCard: React.FC<HtnCardProps> = ({ patientUuid, title, tabs }) => {
  const { t } = useTranslation();
  const { card, isLoading, error } = useEMastercard(patientUuid, HTN_CARD_KEY);
  const { encounters: headers } = useCardEncounters(patientUuid, HTN_FORMS.header);
  const { encounters: visits } = useCardEncounters(patientUuid, HTN_FORMS.visit);
  const { encounters: quarterlyLabs } = useCardEncounters(patientUuid, HTN_FORMS.quarterlyLabs);
  const { encounters: annualLabs } = useCardEncounters(patientUuid, HTN_FORMS.annualLabs);
  const { encounters: hospitalisations } = useCardEncounters(patientUuid, HTN_FORMS.hospitalisation);
  const referenced = useObsOnDays(
    patientUuid,
    HTN_REFERENCE_FIELDS.map((f) => f.concept),
    [...new Set(visits.slice(0, REFERENCED_VISITS).map((v) => day(v.encounterDatetime)))],
  );
  const creatinine = HTN_ANNUAL_LAB_FIELDS.find((f) => f.name === 'creatinine');
  const referencedLabs = useObsOnDays(patientUuid, [creatinine.concept], [...new Set(annualLabs.map((e) => day(e.encounterDatetime)))]);
  const launch = useLaunchHtnPanel(patientUuid);

  if (isLoading) {
    return <InlineLoading description={t('loading', 'Loading...')} />;
  }
  if (error) {
    return (
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title={t('loadError', 'Could not load the eMastercards')}
        subtitle={error.message}
      />
    );
  }
  if (!card || card.state === 'UNAVAILABLE') {
    return (
      <div className={styles.page}>
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={card?.message ?? t('noHtnCard', 'This patient has no hypertension and diabetes patient card.')}
        />
      </div>
    );
  }

  const canEdit = card.state === 'CREATE' || card.state === 'EDIT';
  const canRecord = card.state === 'EDIT';
  const header = headers.find((e) => e.uuid === card.initialEncounterUuid) ?? (headers.length === 1 ? headers[0] : null);
  const latest = visits[0];
  const conditions = conditionsOf(header);
  // the medications of the latest visit that dispensed any: a visit for a check-up alone doesn't stop them
  const medicationVisit = visits.find((v) => medicationsOf(v, HTN_MEDICATIONS).length);
  const bp = visits.map((v) => ({ v, bp: bloodPressure(v, referenced) })).find((x) => x.bp);
  const sugar = visits
    .map((v) => ({
      v,
      hbA1c: shown(v, F.hbA1c, referenced),
      glucose: bloodSugar(v, referenced),
    }))
    .find((x) => x.hbA1c || x.glucose);
  const meds = medicationVisit ? medicationsOf(medicationVisit, HTN_MEDICATIONS) : [];
  const next = formatDay(obsValue(latest, HTN_VISIT.nextAppointment) as string);
  const changes = medicationChanges(visits, HTN_MEDICATIONS);
  const recent = visits.slice(0, RECENT_VISITS);
  const description = [
    t('htnPatientCard', 'Hypertension and diabetes patient card'),
    t('cardVersion', 'version {{version}}', { version: HTN_CARD_VERSION }),
    enrolmentText(card, t, formatDay),
  ]
    .filter(Boolean)
    .join(' · ');

  const editButton = (onClick: () => void) =>
    canEdit && (
      <Button kind="ghost" size="sm" onClick={onClick}>
        {t('editSection', 'Edit')}
      </Button>
    );
  const recordButton = (panel: 'quarterlyLabs' | 'annualLabs' | 'hospitalisation') =>
    canRecord && (
      <Button kind="ghost" size="sm" onClick={() => launch(panel)}>
        {t('record', 'Record')}
      </Button>
    );

  const section = (key: HtnHeaderSection) => {
    const sectionTitle = t(`htnSection_${key}`, HTN_HEADER_SECTIONS[key].title);
    const { listed, labelled, heading } = sectionRows(key, header);
    return (
      <section aria-label={sectionTitle} className={styles.card} key={key}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>{sectionTitle}</h4>
          {canEdit &&
            (header ? (
              editButton(() => launchHtnPanel('header', { patientUuid, section: key }))
            ) : (
              <Button kind="ghost" size="sm" onClick={() => launchHtnPanel('header', { patientUuid, section: 'start' })}>
                {t('startCard', 'Start the card')}
              </Button>
            ))}
        </div>
        {listed.length > 0 && heading && <h5 className={styles.subsectionHeader}>{t(`heading_${heading}`, heading)}</h5>}
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

  const redIf = (value: string | null, raised: boolean) => (value ? <span className={raised ? styles.present : undefined}>{value}</span> : '–');
  const yesInRed = (value: string | null) => (value === 'Yes' ? <span className={styles.present}>{t('yes', 'Yes')}</span> : (value ?? '–'));

  // the measurements and risk factors of the latest visits, as the mental status examination is shown on the mental health card
  const monitoringRows: Array<{
    key: string;
    label: string;
    cell: (v: ArtEncounter) => React.ReactNode;
  }> = [
    {
      key: 'bp',
      label: t('bloodPressure', 'Blood pressure'),
      cell: (v) => {
        const value = bloodPressure(v, referenced);
        return value ? <span className={value.raised ? styles.present : undefined}>{value.text}</span> : '–';
      },
    },
    {
      key: 'pulse',
      label: t('pulseRate', 'Pulse rate'),
      cell: (v) => shown(v, F.pulse, referenced) ?? '–',
    },
    {
      key: 'weight',
      label: t('weight', 'Weight'),
      cell: (v) => shown(v, F.weight, referenced) ?? '–',
    },
    {
      key: 'bmi',
      label: t('bmi', 'BMI'),
      cell: (v) => shown(v, F.bmi, referenced) ?? '–',
    },
    ...(conditions.diabetes
      ? [
          {
            key: 'hbA1c',
            label: t('hbA1c', 'HbA1c'),
            cell: (v: ArtEncounter) => redIf(shown(v, F.hbA1c, referenced), sugarRaisedAt(v, referenced, 'hbA1c')),
          },
          {
            key: 'glucose',
            label: t('bloodSugar', 'Blood sugar'),
            cell: (v: ArtEncounter) => redIf(bloodSugar(v, referenced), sugarRaisedAt(v, referenced, 'glucose')),
          },
        ]
      : []),
    {
      key: 'tobacco',
      label: t('tobacco', 'Tobacco'),
      cell: (v) => shown(v, F.tobacco, referenced) ?? '–',
    },
    {
      key: 'alcohol',
      label: t('alcohol', 'Alcohol'),
      cell: (v) => shown(v, F.alcohol, referenced) ?? '–',
    },
    {
      key: 'fruitVegetables',
      label: t('fruitVegetablesShort', 'Fruit/vegetable portions'),
      cell: (v) => shown(v, F.fruitVegetables, referenced) ?? '–',
    },
    {
      key: 'exercise',
      label: t('exerciseShort', 'Exercise days per week'),
      cell: (v) => shown(v, F.exercise, referenced) ?? '–',
    },
    {
      key: 'cvRisk',
      label: t('cvRisk', 'CV risk'),
      cell: (v) => shown(v, F.cvRisk, referenced) ?? '–',
    },
    {
      key: 'visualAcuity',
      label: t('visualAcuity', 'Visual acuity'),
      cell: (v) => shown(v, F.visualAcuity, referenced) ?? '–',
    },
    ...(conditions.diabetes
      ? FOOT_CHECK_FIELDS.map((f) => ({
          key: f.name,
          label: f.label,
          cell: (v: ArtEncounter) => yesInRed(shown(v, f, referenced)),
        }))
      : []),
  ];

  const visitColumns: Array<Column> = [
    { key: 'date', header: t('visitDate', 'Visit date') },
    { key: 'location', header: t('location', 'Location') },
    { key: 'height', header: t('height', 'Height') },
    { key: 'weight', header: t('weight', 'Weight') },
    { key: 'bmi', header: t('bmi', 'BMI') },
    { key: 'bp', header: t('bp', 'BP') },
    { key: 'pulse', header: t('pulse', 'Pulse') },
    ...(conditions.diabetes
      ? [
          { key: 'hbA1c', header: t('hbA1c', 'HbA1c') },
          { key: 'glucose', header: t('bloodSugar', 'Blood sugar') },
        ]
      : []),
    { key: 'tobacco', header: t('tobacco', 'Tobacco') },
    { key: 'alcohol', header: t('alcohol', 'Alcohol') },
    { key: 'cvRisk', header: t('cvRisk', 'CV risk') },
    ...(conditions.diabetes ? [{ key: 'foot', header: t('footCheck', 'Foot Check') }] : []),
    { key: 'hospitalised', header: t('hospitalised', 'Hospitalised') },
    { key: 'medications', header: t('medications', 'Medications') },
    { key: 'next', header: t('nextAppointment', 'Next appointment') },
  ];
  const visitCells = (v: ArtEncounter): Record<string, React.ReactNode> => ({
    date: formatDay(v.encounterDatetime),
    location: v.location?.display ?? null,
    height: shown(v, F.height, referenced),
    weight: shown(v, F.weight, referenced),
    bmi: shown(v, F.bmi, referenced),
    bp: bloodPressure(v, referenced)?.text ?? null,
    pulse: shown(v, F.pulse, referenced),
    hbA1c: shown(v, F.hbA1c, referenced),
    glucose: bloodSugar(v, referenced),
    tobacco: shown(v, F.tobacco, referenced),
    alcohol: shown(v, F.alcohol, referenced),
    cvRisk: shown(v, F.cvRisk, referenced),
    foot: footFindings(v),
    hospitalised: same(obsValue(v, HTN_VISIT.hospitalised), YES) ? t('yes', 'Yes') : null,
    medications: medicationsOf(v, HTN_MEDICATIONS).map(medicationText).join(', ') || null,
    next: shown(v, F.nextAppointment, referenced),
  });

  const labColumns = (fields: Array<ArtField>, dateHeader = t('date', 'Date')): Array<Column> => [
    { key: 'date', header: dateHeader },
    ...fields.filter((f) => !f.hidden).map((f) => ({ key: f.name, header: t(`htnField_${f.name}`, f.label) })),
  ];
  const lastDischarge = hospitalisations[0];

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
            <Button kind="primary" size="md" disabled={!canRecord} onClick={() => launch('visit')}>
              {t('recordHtnVisit', 'Record hypertension and diabetes visit')}
            </Button>
          </div>
        )}
      </div>

      {tabs}

      {card.state === 'VIEW' && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title={card.message ?? t('viewOnly', 'You can view this card but not change it.')}
        />
      )}
      {card.state === 'CREATE' && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title={t('startHtnCardFirst', 'Start the card first: visits, tests and hospitalisations can be recorded once it has been saved.')}
        />
      )}

      <section aria-label={t('htnAtAGlance', 'Hypertension and diabetes at a glance')} className={styles.headlines}>
        <Headline
          label={t('bloodPressure', 'Blood pressure')}
          value={bp ? `${bp.bp.text} mmHg` : null}
          detail={
            bp
              ? t('measured', 'Measured {{date}}', {
                  date: formatDay(bp.v.encounterDatetime),
                })
              : null
          }
          alert={bp?.bp.raised}
        />
        {conditions.diabetes && (
          <Headline
            label={t('bloodSugar', 'Blood sugar')}
            value={sugar ? (sugar.hbA1c ? `HbA1c ${sugar.hbA1c}` : sugar.glucose) : null}
            detail={
              sugar
                ? [
                    sugar.hbA1c ? sugar.glucose : null,
                    t('measured', 'Measured {{date}}', {
                      date: formatDay(sugar.v.encounterDatetime),
                    }),
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : null
            }
            alert={sugar ? sugarRaisedAt(sugar.v, referenced) : false}
          />
        )}
        <Headline
          label={t('currentMedication', 'Current medication')}
          value={meds.map((m) => m.amount).join(', ') || null}
          detail={
            [
              medicationDetail(meds),
              medicationVisit
                ? t('dispensed', 'Dispensed {{date}}', {
                    date: formatDay(medicationVisit.encounterDatetime),
                  })
                : null,
            ]
              .filter(Boolean)
              .join(' · ') || null
          }
        />
        <Headline
          label={t('hospitalisations', 'Hospitalisations')}
          value={String(hospitalisations.length)}
          detail={
            lastDischarge
              ? t('lastDischarged', 'Last discharged {{date}}', {
                  date: formatDay(lastDischarge.encounterDatetime),
                })
              : null
          }
        />
        <Headline
          label={t('nextAppointment', 'Next appointment')}
          value={next}
          detail={
            next
              ? t('booked', 'Booked {{date}}', {
                  date: formatDay(latest.encounterDatetime),
                })
              : null
          }
        />
      </section>

      <div className={styles.cards}>
        {section('patientGuardian')}
        {section('diagnoses')}
        {section('history')}
      </div>

      <div className={styles.cards}>
        <section aria-label={t('monitoring', 'Monitoring')} className={styles.card}>
          <div className={styles.cardHeader}>
            <h4 className={styles.cardTitle}>{t('monitoring', 'Monitoring')}</h4>
            {recent.length > 0 && (
              <span className={styles.detail}>
                {t('lastVisits', 'Last {{count}} visits', {
                  count: RECENT_VISITS,
                })}
              </span>
            )}
          </div>
          {recent.length ? (
            <div className={styles.tableWrapper}>
              <Table aria-label={t('monitoring', 'Monitoring')} size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>{t('finding', 'Finding')}</TableHeader>
                    {recent.map((v) => (
                      <TableHeader key={v.uuid}>{formatDay(v.encounterDatetime)}</TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monitoringRows.map((r) => (
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
            <p className={styles.empty}>{t('noHtnVisits', 'No hypertension and diabetes visits recorded yet')}</p>
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
        </section>
      </div>

      <div className={styles.cards}>
        <section aria-label={t('quarterlyLabs', 'Quarterly Laboratory Tests')} className={styles.card}>
          <div className={styles.cardHeader}>
            <h4 className={styles.cardTitle}>{t('quarterlyLabs', 'Quarterly Laboratory Tests')}</h4>
            {recordButton('quarterlyLabs')}
          </div>
          <EncounterTable
            label={t('quarterlyLabs', 'Quarterly Laboratory Tests')}
            columns={labColumns(HTN_QUARTERLY_LAB_FIELDS)}
            encounters={quarterlyLabs}
            cells={(e) => fieldCells(HTN_QUARTERLY_LAB_FIELDS, e)}
            onEdit={
              canEdit
                ? (e) =>
                    launchHtnPanel('quarterlyLabs', {
                      patientUuid,
                      encounterUuid: e.uuid,
                    })
                : undefined
            }
            empty={t('noLabTests', 'No tests recorded yet')}
          />
        </section>

        <section aria-label={t('annualLabs', 'Annual Laboratory Tests')} className={styles.card}>
          <div className={styles.cardHeader}>
            <h4 className={styles.cardTitle}>{t('annualLabs', 'Annual Laboratory Tests')}</h4>
            {recordButton('annualLabs')}
          </div>
          <EncounterTable
            label={t('annualLabs', 'Annual Laboratory Tests')}
            columns={labColumns(HTN_ANNUAL_LAB_FIELDS)}
            encounters={annualLabs}
            cells={(e) => fieldCells(HTN_ANNUAL_LAB_FIELDS, e, referencedLabs)}
            onEdit={
              canEdit
                ? (e) =>
                    launchHtnPanel('annualLabs', {
                      patientUuid,
                      encounterUuid: e.uuid,
                    })
                : undefined
            }
            empty={t('noLabTests', 'No tests recorded yet')}
          />
        </section>
      </div>

      <section aria-label={t('hospitalisationHistory', 'Hospitalisation History')} className={styles.card}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>{t('hospitalisationHistory', 'Hospitalisation History')}</h4>
          {recordButton('hospitalisation')}
        </div>
        <EncounterTable
          label={t('hospitalisationHistory', 'Hospitalisation History')}
          columns={labColumns(HTN_HOSPITALISATION_FIELDS, t('dateOfDischarge', 'Date of discharge'))}
          encounters={hospitalisations}
          cells={(e) => fieldCells(HTN_HOSPITALISATION_FIELDS, e)}
          onEdit={
            canEdit
              ? (e) =>
                  launchHtnPanel('hospitalisation', {
                    patientUuid,
                    encounterUuid: e.uuid,
                  })
              : undefined
          }
          empty={t('noHospitalisations', 'No hospitalisations recorded yet')}
        />
      </section>

      <section aria-label={t('htnVisits', 'Hypertension and Diabetes Visits')} className={styles.card}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>{t('htnVisits', 'Hypertension and Diabetes Visits')}</h4>
        </div>
        <EncounterTable
          label={t('htnVisits', 'Hypertension and Diabetes Visits')}
          columns={visitColumns}
          encounters={visits}
          cells={visitCells}
          onEdit={
            canEdit
              ? (v) =>
                  launchHtnPanel('visit', {
                    patientUuid,
                    encounterUuid: v.uuid,
                  })
              : undefined
          }
          empty={t('noHtnVisits', 'No hypertension and diabetes visits recorded yet')}
        />
      </section>
    </div>
  );
};

export default HtnCard;
