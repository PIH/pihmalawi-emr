import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification } from '@carbon/react';
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
import { SCD_CARD_KEY, SCD_CARD_VERSION, SCD_FORMS, SCD_VISIT } from './scd-concepts';
import {
  SCD_ANNUAL_MONITORING_FIELDS,
  SCD_FINDING_FIELDS,
  SCD_HEADER_SECTIONS,
  SCD_HOSPITALISATION_FIELDS,
  SCD_MEDICATIONS,
  SCD_QUARTERLY_SCREENING_FIELDS,
  SCD_VISIT_FIELDS,
  type ScdHeaderSection,
} from './scd-fields';
import { bpRaised } from './htn-rules';
import { launchScdPanel, useLaunchScdPanel, type ScdPanel } from './launch-scd-panel';
import styles from '../care-page.scss';

/** How many of the latest visits the monitoring table shows */
const RECENT_VISITS = 4;
/** How many of the latest visits show values recorded the same day in other encounters, e.g. vitals */
const REFERENCED_VISITS = 12;
/** The findings shown in red when present: a crisis's pain and fever, and a hospitalisation */
const ALARMING = ['pain', 'fever', 'hospitalised'];

const F = SCD_VISIT_FIELDS;
const REFERENCE_FIELDS: Array<ArtField> = Object.values(F).filter((f) => f.reference);

function bloodPressure(v: ArtEncounter | undefined, referenced: Referenced) {
  const systolic = valueOf(v, F.systolicBp, referenced);
  const diastolic = valueOf(v, F.diastolicBp, referenced);
  if (systolic === null && diastolic === null) {
    return null;
  }
  return { text: `${systolic ?? '–'}/${diastolic ?? '–'}`, raised: bpRaised(systolic, diastolic) };
}

const yes = (v: ArtEncounter, field: ArtField) => shown(v, field) === 'Yes';

interface ScdCardProps {
  patientUuid: string;
  /** The chart page's title, e.g. Chronic Care Record */
  title: string;
  tabs?: React.ReactNode;
}

/**
 * The Sickle Cell Disease eMastercard, natively in O3: the headline, the card header's sections, monitoring and
 * medication history, quarterly screening, annual monitoring and hospitalisations, and the visits, each edited in its
 * own side panel
 */
const ScdCard: React.FC<ScdCardProps> = ({ patientUuid, title, tabs }) => {
  const { t } = useTranslation();
  const { card, isLoading, error } = useEMastercard(patientUuid, SCD_CARD_KEY);
  const { encounters: headers } = useCardEncounters(patientUuid, SCD_FORMS.header);
  const { encounters: visits } = useCardEncounters(patientUuid, SCD_FORMS.visit);
  const { encounters: quarterlyScreenings } = useCardEncounters(patientUuid, SCD_FORMS.quarterlyScreening);
  const { encounters: annualMonitorings } = useCardEncounters(patientUuid, SCD_FORMS.annualMonitoring);
  const { encounters: hospitalisations } = useCardEncounters(patientUuid, SCD_FORMS.hospitalisation);
  const referenced = useObsOnDays(
    patientUuid,
    REFERENCE_FIELDS.map((f) => f.concept),
    [...new Set(visits.slice(0, REFERENCED_VISITS).map((v) => day(v.encounterDatetime)))],
  );
  const launch = useLaunchScdPanel(patientUuid);

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
          title={card?.message ?? t('noScdCard', 'This patient has no sickle cell disease patient card.')}
        />
      </div>
    );
  }

  const canEdit = card.state === 'CREATE' || card.state === 'EDIT';
  const canRecord = card.state === 'EDIT';
  const header = headers.find((e) => e.uuid === card.initialEncounterUuid) ?? (headers.length === 1 ? headers[0] : null);
  const latest = visits[0];
  const withHb = visits.find((v) => valueOf(v, F.haemoglobin) !== null);
  const withPain = visits.find((v) => valueOf(v, F.pain));
  const lastDischarge = hospitalisations[0];
  // the medications of the latest visit that dispensed any: a visit for a check-up alone doesn't stop them
  const medicationVisit = visits.find((v) => medicationsOf(v, SCD_MEDICATIONS).length);
  const meds = medicationVisit ? medicationsOf(medicationVisit, SCD_MEDICATIONS) : [];
  const next = formatDay(obsValue(latest, SCD_VISIT.nextAppointment) as string);
  const description = [
    t('scdPatientCard', 'Sickle cell disease patient card'),
    t('cardVersion', 'version {{version}}', { version: SCD_CARD_VERSION }),
    enrolmentText(card, t, formatDay),
  ]
    .filter(Boolean)
    .join(' · ');
  const on = (v: ArtEncounter) => t('assessed', 'Assessed {{date}}', { date: formatDay(v.encounterDatetime) });
  const onRecord = (panel: Exclude<ScdPanel, 'header' | 'visit'>) => (canRecord ? () => launch(panel) : undefined);
  const onEdit = (panel: Exclude<ScdPanel, 'header'>) =>
    canEdit ? (e: ArtEncounter) => launchScdPanel(panel, { patientUuid, encounterUuid: e.uuid }) : undefined;

  const section = (key: ScdHeaderSection) => (
    <HeaderSectionCard
      key={key}
      title={t(`scdSection_${key}`, SCD_HEADER_SECTIONS[key].title)}
      fields={SCD_HEADER_SECTIONS[key].fields}
      header={header}
      canEdit={canEdit}
      onEdit={() => launchScdPanel('header', { patientUuid, section: key })}
      onStart={() => launchScdPanel('header', { patientUuid, section: 'start' })}
    />
  );

  const plain = (field: ArtField) => (v: ArtEncounter) => shown(v, field, referenced) ?? '–';

  // the measurements, history and examination of the latest visits
  const monitoringRows: Array<MonitoringRow> = [
    {
      key: 'bp',
      label: t('bloodPressure', 'Blood pressure'),
      cell: (v) => {
        const value = bloodPressure(v, referenced);
        return <RedIf value={value?.text ?? null} raised={!!value?.raised} />;
      },
    },
    { key: 'pulse', label: t('heartRate', 'Heart rate'), cell: plain(F.pulse) },
    { key: 'weight', label: t('weight', 'Weight'), cell: plain(F.weight) },
    { key: 'bmiMuac', label: t('bmiMuac', 'BMI/MUAC'), cell: plain(F.bmiMuac) },
    { key: 'haemoglobin', label: t('haemoglobin', 'Hb'), cell: plain(F.haemoglobin) },
    { key: 'spo2', label: t('spo2', 'SpO2'), cell: plain(F.spo2) },
    { key: 'temperature', label: t('temperature', 'Temperature'), cell: plain(F.temperature) },
    ...SCD_FINDING_FIELDS.map((f) => ({
      key: f.name,
      label: f.label,
      cell: ALARMING.includes(f.name) ? (v: ArtEncounter) => <RedIf value={shown(v, f)} raised={yes(v, f)} /> : plain(f),
    })),
  ];

  const visitColumns: Array<Column> = [
    { key: 'date', header: t('visitDate', 'Visit date') },
    { key: 'location', header: t('location', 'Location') },
    { key: 'weight', header: t('weight', 'Weight') },
    { key: 'bp', header: t('bp', 'BP') },
    { key: 'haemoglobin', header: t('haemoglobin', 'Hb') },
    { key: 'spo2', header: t('spo2', 'SpO2') },
    { key: 'temperature', header: t('temperature', 'Temperature') },
    { key: 'pain', header: t('pain', 'Pain') },
    { key: 'fever', header: t('fever', 'Fever') },
    { key: 'hospitalised', header: t('hospitalised', 'Hospitalised') },
    { key: 'medications', header: t('medications', 'Medications') },
    { key: 'next', header: t('nextAppointment', 'Next appointment') },
  ];
  const visitCells = (v: ArtEncounter): Record<string, React.ReactNode> => ({
    date: formatDay(v.encounterDatetime),
    location: v.location?.display ?? null,
    weight: shown(v, F.weight, referenced),
    bp: bloodPressure(v, referenced)?.text ?? null,
    haemoglobin: shown(v, F.haemoglobin),
    spo2: shown(v, F.spo2),
    temperature: shown(v, F.temperature),
    pain: shown(v, F.pain),
    fever: shown(v, F.fever),
    hospitalised: shown(v, F.hospitalised),
    medications: medicationsOf(v, SCD_MEDICATIONS).map(medicationText).join(', ') || null,
    next: shown(v, F.nextAppointment),
  });
  const tableColumns = (fields: Array<ArtField>, dateHeader = t('date', 'Date')): Array<Column> => [
    { key: 'date', header: dateHeader },
    ...fields.map((f) => ({ key: f.name, header: t(`scdField_${f.name}`, f.label) })),
  ];
  const table = (
    key: string,
    label: string,
    panel: Exclude<ScdPanel, 'header' | 'visit'>,
    fields: Array<ArtField>,
    encounters: Array<ArtEncounter>,
    extra: { dateHeader?: string; empty?: string } = {},
  ) => (
    <TableCard title={t(key, label)} onRecord={onRecord(panel)}>
      <EncounterTable
        label={t(key, label)}
        columns={tableColumns(fields, extra.dateHeader)}
        encounters={encounters}
        cells={(e) => fieldCells(fields, e)}
        onEdit={onEdit(panel)}
        empty={extra.empty ?? t('noLabTests', 'No tests recorded yet')}
      />
    </TableCard>
  );

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
              {t('recordScdVisit', 'Record sickle cell disease visit')}
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
          title={t(
            'startScdCardFirst',
            'Start the card first: visits, screening, monitoring and hospitalisations can be recorded once it has been saved.',
          )}
        />
      )}

      <section aria-label={t('scdAtAGlance', 'Sickle cell disease at a glance')} className={styles.headlines}>
        <Headline label={t('haemoglobin', 'Hb')} value={withHb ? shown(withHb, F.haemoglobin) : null} detail={withHb ? on(withHb) : null} />
        <Headline
          label={t('pain', 'Pain')}
          value={withPain ? shown(withPain, F.pain) : null}
          detail={withPain ? on(withPain) : null}
          alert={withPain ? yes(withPain, F.pain) : false}
        />
        <Headline
          label={t('hospitalisations', 'Hospitalisations')}
          value={String(hospitalisations.length)}
          detail={lastDischarge ? t('lastDischarged', 'Last discharged {{date}}', { date: formatDay(lastDischarge.encounterDatetime) }) : null}
        />
        <Headline
          label={t('currentMedication', 'Current medication')}
          value={meds.map((m) => m.amount).join(', ') || null}
          detail={
            [
              medicationDetail(meds),
              medicationVisit ? t('dispensed', 'Dispensed {{date}}', { date: formatDay(medicationVisit.encounterDatetime) }) : null,
            ]
              .filter(Boolean)
              .join(' · ') || null
          }
        />
        <Headline
          label={t('nextAppointment', 'Next appointment')}
          value={next}
          detail={next ? t('booked', 'Booked {{date}}', { date: formatDay(latest.encounterDatetime) }) : null}
        />
      </section>

      <div className={styles.cards}>
        {section('patientGuardian')}
        {section('diagnosis')}
      </div>
      <div className={styles.cards}>
        {section('history')}
        {section('referral')}
      </div>

      <div className={styles.cards}>
        <MonitoringCard
          visits={visits}
          count={RECENT_VISITS}
          rows={monitoringRows}
          empty={t('noScdVisits', 'No sickle cell disease visits recorded yet')}
        />
        <MedicationHistoryCard visits={visits} medications={SCD_MEDICATIONS} />
      </div>

      <div className={styles.cards}>
        {table('quarterlyScreening', 'Quarterly Screening', 'quarterlyScreening', SCD_QUARTERLY_SCREENING_FIELDS, quarterlyScreenings)}
        {table('annualMonitoring', 'Annual Monitoring', 'annualMonitoring', SCD_ANNUAL_MONITORING_FIELDS, annualMonitorings)}
      </div>
      {table('hospitalisationHistory', 'Hospitalisation History', 'hospitalisation', SCD_HOSPITALISATION_FIELDS, hospitalisations, {
        dateHeader: t('dateOfDischarge', 'Date of discharge'),
        empty: t('noHospitalisations', 'No hospitalisations recorded yet'),
      })}

      <TableCard title={t('scdVisits', 'Sickle Cell Disease Visits')}>
        <EncounterTable
          label={t('scdVisits', 'Sickle Cell Disease Visits')}
          columns={visitColumns}
          encounters={visits}
          cells={visitCells}
          onEdit={onEdit('visit')}
          empty={t('noScdVisits', 'No sickle cell disease visits recorded yet')}
        />
      </TableCard>
    </div>
  );
};

export default ScdCard;
