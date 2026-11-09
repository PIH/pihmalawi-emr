import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification } from '@carbon/react';
import { YES } from '../art/art-concepts';
import { type ArtField, formatDay } from '../art/art-fields';
import { type ArtEncounter, obsValue, useCardEncounters, useEMastercard, useObsOnDays } from '../art/art.resource';
import { enrolmentText } from '../emastercards.resource';
import { medicationDetail, medicationsOf, medicationText } from '../shared/medications';
import {
  type Column,
  day,
  EncounterTable,
  fieldCells,
  HeaderSectionCard,
  Headline,
  MedicationHistoryCard,
  MonitoringCard,
  type MonitoringRow,
  RedIf,
  type Referenced,
  shown,
  TableCard,
  valueOf,
} from '../shared/ncd-card';
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
const same = (a: unknown, b: string) => String(a ?? '').toLowerCase() === b.toLowerCase();

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
  const onRecord = (panel: 'quarterlyLabs' | 'annualLabs' | 'hospitalisation') => (canRecord ? () => launch(panel) : undefined);

  const section = (key: HtnHeaderSection) => (
    <HeaderSectionCard
      key={key}
      title={t(`htnSection_${key}`, HTN_HEADER_SECTIONS[key].title)}
      fields={HTN_HEADER_SECTIONS[key].fields}
      header={header}
      canEdit={canEdit}
      onEdit={() => launchHtnPanel('header', { patientUuid, section: key })}
      onStart={() => launchHtnPanel('header', { patientUuid, section: 'start' })}
    />
  );

  const redIf = (value: string | null, raised: boolean) => <RedIf value={value} raised={raised} />;
  const yesInRed = (value: string | null) => (value === 'Yes' ? <span className={styles.present}>{t('yes', 'Yes')}</span> : (value ?? '–'));

  // the measurements and risk factors of the latest visits, as the mental status examination is shown on the mental health card
  const monitoringRows: Array<MonitoringRow> = [
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
        <MonitoringCard
          visits={visits}
          count={RECENT_VISITS}
          rows={monitoringRows}
          empty={t('noHtnVisits', 'No hypertension and diabetes visits recorded yet')}
        />
        <MedicationHistoryCard visits={visits} medications={HTN_MEDICATIONS} />
      </div>

      <div className={styles.cards}>
        <TableCard title={t('quarterlyLabs', 'Quarterly Laboratory Tests')} onRecord={onRecord('quarterlyLabs')}>
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
        </TableCard>

        <TableCard title={t('annualLabs', 'Annual Laboratory Tests')} onRecord={onRecord('annualLabs')}>
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
        </TableCard>
      </div>

      <TableCard title={t('hospitalisationHistory', 'Hospitalisation History')} onRecord={onRecord('hospitalisation')}>
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
      </TableCard>

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
