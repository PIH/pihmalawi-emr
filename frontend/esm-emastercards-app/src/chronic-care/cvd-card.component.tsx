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
import { CVD_CARD_KEY, CVD_CARD_VERSION, CVD_FORMS, CVD_VISIT } from './cvd-concepts';
import {
  CVD_CHEST_XRAY_FIELDS,
  CVD_ECHO_FIELDS,
  CVD_EKG_FIELDS,
  CVD_HEADER_SECTIONS,
  CVD_HOSPITALISATION_FIELDS,
  CVD_MEDICATIONS,
  CVD_PROTOCOL_LAB_FIELDS,
  CVD_QUARTERLY_LAB_FIELDS,
  CVD_SYMPTOM_FIELDS,
  CVD_VISIT_FIELDS,
  type CvdHeaderSection,
} from './cvd-fields';
import { severeNyha } from './cvd-rules';
import { bpRaised } from './htn-rules';
import { launchCvdPanel, useLaunchCvdPanel, type CvdPanel } from './launch-cvd-panel';
import styles from '../care-page.scss';

/** How many of the latest visits the monitoring table shows */
const RECENT_VISITS = 4;
/** How many of the latest visits show values recorded the same day in other encounters, e.g. vitals */
const REFERENCED_VISITS = 12;

const F = CVD_VISIT_FIELDS;
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

interface CvdCardProps {
  patientUuid: string;
  /** The chart page's title, e.g. Chronic Care Record */
  title: string;
  tabs?: React.ReactNode;
}

/**
 * The Cardiac and Vascular Disease eMastercard, natively in O3: the headline, the card header's sections, monitoring
 * and medication history, imaging, laboratory tests and hospitalisations, and the visits, each edited in its own side
 * panel
 */
const CvdCard: React.FC<CvdCardProps> = ({ patientUuid, title, tabs }) => {
  const { t } = useTranslation();
  const { card, isLoading, error } = useEMastercard(patientUuid, CVD_CARD_KEY);
  const { encounters: headers } = useCardEncounters(patientUuid, CVD_FORMS.header);
  const { encounters: visits } = useCardEncounters(patientUuid, CVD_FORMS.visit);
  const { encounters: echoes } = useCardEncounters(patientUuid, CVD_FORMS.echo);
  const { encounters: ekgs } = useCardEncounters(patientUuid, CVD_FORMS.ekg);
  const { encounters: chestXrays } = useCardEncounters(patientUuid, CVD_FORMS.chestXray);
  const { encounters: quarterlyLabs } = useCardEncounters(patientUuid, CVD_FORMS.quarterlyLabs);
  const { encounters: protocolLabs } = useCardEncounters(patientUuid, CVD_FORMS.protocolLabs);
  const { encounters: hospitalisations } = useCardEncounters(patientUuid, CVD_FORMS.hospitalisation);
  const referenced = useObsOnDays(
    patientUuid,
    REFERENCE_FIELDS.map((f) => f.concept),
    [...new Set(visits.slice(0, REFERENCED_VISITS).map((v) => day(v.encounterDatetime)))],
  );
  const creatinine = CVD_PROTOCOL_LAB_FIELDS.find((f) => f.name === 'creatinine');
  const referencedLabs = useObsOnDays(patientUuid, [creatinine.concept], [...new Set(protocolLabs.map((e) => day(e.encounterDatetime)))]);
  const launch = useLaunchCvdPanel(patientUuid);

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
          title={card?.message ?? t('noCvdCard', 'This patient has no cardiac and vascular disease patient card.')}
        />
      </div>
    );
  }

  const canEdit = card.state === 'CREATE' || card.state === 'EDIT';
  const canRecord = card.state === 'EDIT';
  const header = headers.find((e) => e.uuid === card.initialEncounterUuid) ?? (headers.length === 1 ? headers[0] : null);
  const latest = visits[0];
  const bp = visits.map((v) => ({ v, bp: bloodPressure(v, referenced) })).find((x) => x.bp);
  const withNyha = visits.find((v) => valueOf(v, F.nyha));
  const withVolume = visits.find((v) => valueOf(v, F.volumeStatus));
  // the medications of the latest visit that dispensed any: a visit for a check-up alone doesn't stop them
  const medicationVisit = visits.find((v) => medicationsOf(v, CVD_MEDICATIONS).length);
  const meds = medicationVisit ? medicationsOf(medicationVisit, CVD_MEDICATIONS) : [];
  const next = formatDay(obsValue(latest, CVD_VISIT.nextAppointment) as string);
  const description = [
    t('cvdPatientCard', 'Cardiac and vascular disease patient card'),
    t('cardVersion', 'version {{version}}', { version: CVD_CARD_VERSION }),
    enrolmentText(card, t, formatDay),
  ]
    .filter(Boolean)
    .join(' · ');
  const on = (v: ArtEncounter) => t('assessed', 'Assessed {{date}}', { date: formatDay(v.encounterDatetime) });
  const onRecord = (panel: Exclude<CvdPanel, 'header' | 'visit'>) => (canRecord ? () => launch(panel) : undefined);
  const onEdit = (panel: Exclude<CvdPanel, 'header'>) =>
    canEdit ? (e: ArtEncounter) => launchCvdPanel(panel, { patientUuid, encounterUuid: e.uuid }) : undefined;

  const section = (key: CvdHeaderSection) => (
    <HeaderSectionCard
      key={key}
      title={t(`cvdSection_${key}`, CVD_HEADER_SECTIONS[key].title)}
      fields={CVD_HEADER_SECTIONS[key].fields}
      header={header}
      canEdit={canEdit}
      onEdit={() => launchCvdPanel('header', { patientUuid, section: key })}
      onStart={() => launchCvdPanel('header', { patientUuid, section: 'start' })}
    />
  );

  const red = (v: ArtEncounter, field: ArtField, raised: boolean) => <RedIf value={shown(v, field, referenced)} raised={raised} />;
  const plain = (field: ArtField) => (v: ArtEncounter) => shown(v, field, referenced) ?? '–';

  // the measurements, symptoms and examination of the latest visits
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
    { key: 'spo2', label: t('spo2', 'SpO2'), cell: plain(F.spo2) },
    { key: 'weight', label: t('weight', 'Weight'), cell: plain(F.weight) },
    { key: 'weightChange', label: t('weightChange', 'Weight change'), cell: plain(F.weightChange) },
    ...CVD_SYMPTOM_FIELDS.map((f) => ({ key: f.name, label: f.label, cell: plain(f) })),
    { key: 'oedema', label: t('oedema', 'Oedema'), cell: plain(F.oedema) },
    { key: 'crackles', label: t('crackles', 'Bibasilar crackles'), cell: (v) => red(v, F.crackles, yes(v, F.crackles)) },
    { key: 'jvpElevated', label: t('jvpElevated', 'JVP elevated'), cell: (v) => red(v, F.jvpElevated, yes(v, F.jvpElevated)) },
    { key: 'volumeStatus', label: t('volumeStatus', 'Volume status'), cell: plain(F.volumeStatus) },
    { key: 'nyha', label: t('nyhaClass', 'NYHA class'), cell: (v) => red(v, F.nyha, severeNyha(valueOf(v, F.nyha))) },
    { key: 'hospitalised', label: t('hospitalised', 'Hospitalised'), cell: (v) => red(v, F.hospitalised, yes(v, F.hospitalised)) },
    { key: 'tookMedsToday', label: t('tookMedsToday', 'Took medication today'), cell: plain(F.tookMedsToday) },
  ];

  const visitColumns: Array<Column> = [
    { key: 'date', header: t('visitDate', 'Visit date') },
    { key: 'location', header: t('location', 'Location') },
    { key: 'weight', header: t('weight', 'Weight') },
    { key: 'bp', header: t('bp', 'BP') },
    { key: 'pulse', header: t('heartRate', 'Heart rate') },
    { key: 'spo2', header: t('spo2', 'SpO2') },
    { key: 'oedema', header: t('oedema', 'Oedema') },
    { key: 'volumeStatus', header: t('volumeStatus', 'Volume status') },
    { key: 'nyha', header: t('nyhaClass', 'NYHA class') },
    { key: 'hospitalised', header: t('hospitalised', 'Hospitalised') },
    { key: 'alcohol', header: t('alcohol', 'Alcohol') },
    { key: 'tobacco', header: t('tobacco', 'Tobacco') },
    { key: 'medications', header: t('medications', 'Medications') },
    { key: 'referrals', header: t('referrals', 'Referrals') },
    { key: 'next', header: t('nextAppointment', 'Next appointment') },
  ];
  const visitCells = (v: ArtEncounter): Record<string, React.ReactNode> => ({
    date: formatDay(v.encounterDatetime),
    location: v.location?.display ?? null,
    weight: shown(v, F.weight, referenced),
    bp: bloodPressure(v, referenced)?.text ?? null,
    pulse: shown(v, F.pulse),
    spo2: shown(v, F.spo2),
    oedema: shown(v, F.oedema),
    volumeStatus: shown(v, F.volumeStatus),
    nyha: shown(v, F.nyha),
    hospitalised: shown(v, F.hospitalised),
    alcohol: shown(v, F.alcohol),
    tobacco: shown(v, F.tobacco),
    medications: medicationsOf(v, CVD_MEDICATIONS).map(medicationText).join(', ') || null,
    referrals:
      [
        yes(v, F.mentalHealthReferral) ? t('mentalHealth', 'Mental health') : null,
        yes(v, F.palliativeReferral) ? t('palliative', 'Palliative') : null,
        yes(v, F.chwFollowUp) ? t('chwFollowUp', 'CHW follow-up') : null,
      ]
        .filter(Boolean)
        .join(', ') || null,
    next: shown(v, F.nextAppointment),
  });
  const tableColumns = (fields: Array<ArtField>, dateHeader = t('date', 'Date')): Array<Column> => [
    { key: 'date', header: dateHeader },
    ...fields.map((f) => ({ key: f.name, header: t(`cvdField_${f.name}`, f.label) })),
  ];
  const table = (
    key: string,
    label: string,
    panel: Exclude<CvdPanel, 'header' | 'visit'>,
    fields: Array<ArtField>,
    encounters: Array<ArtEncounter>,
    extra: { referenced?: Referenced; dateHeader?: string; empty?: string } = {},
  ) => (
    <TableCard title={t(key, label)} onRecord={onRecord(panel)}>
      <EncounterTable
        label={t(key, label)}
        columns={tableColumns(fields, extra.dateHeader)}
        encounters={encounters}
        cells={(e) => fieldCells(fields, e, extra.referenced)}
        onEdit={onEdit(panel)}
        empty={extra.empty ?? t('noResults', 'No results recorded yet')}
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
              {t('recordCvdVisit', 'Record cardiac and vascular disease visit')}
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
          title={t('startCvdCardFirst', 'Start the card first: visits, imaging, tests and hospitalisations can be recorded once it has been saved.')}
        />
      )}

      <section aria-label={t('cvdAtAGlance', 'Cardiac and vascular disease at a glance')} className={styles.headlines}>
        <Headline
          label={t('bloodPressure', 'Blood pressure')}
          value={bp ? `${bp.bp.text} mmHg` : null}
          detail={bp ? t('measured', 'Measured {{date}}', { date: formatDay(bp.v.encounterDatetime) }) : null}
          alert={bp?.bp.raised}
        />
        <Headline
          label={t('nyhaClass', 'NYHA class')}
          value={withNyha ? shown(withNyha, F.nyha) : null}
          detail={withNyha ? on(withNyha) : null}
          alert={withNyha ? severeNyha(valueOf(withNyha, F.nyha)) : false}
        />
        <Headline
          label={t('volumeStatus', 'Volume status')}
          value={withVolume ? shown(withVolume, F.volumeStatus) : null}
          detail={withVolume ? on(withVolume) : null}
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
        {section('diagnoses')}
        {section('history')}
      </div>

      <div className={styles.cards}>
        <MonitoringCard
          visits={visits}
          count={RECENT_VISITS}
          rows={monitoringRows}
          empty={t('noCvdVisits', 'No cardiac and vascular disease visits recorded yet')}
        />
        <MedicationHistoryCard visits={visits} medications={CVD_MEDICATIONS} />
      </div>

      <div className={styles.cards}>
        {section('imaging')}
        {table('echocardiogram', 'Echocardiogram', 'echo', CVD_ECHO_FIELDS, echoes)}
      </div>
      <div className={styles.cards}>
        {table('ecg', 'ECG', 'ekg', CVD_EKG_FIELDS, ekgs)}
        {table('chestXray', 'Chest X-ray', 'chestXray', CVD_CHEST_XRAY_FIELDS, chestXrays)}
      </div>
      <div className={styles.cards}>
        {table('quarterlyLabs', 'Quarterly Laboratory Tests', 'quarterlyLabs', CVD_QUARTERLY_LAB_FIELDS, quarterlyLabs, {
          empty: t('noLabTests', 'No tests recorded yet'),
        })}
        {table('protocolLabs', 'Laboratory Tests per Protocol', 'protocolLabs', CVD_PROTOCOL_LAB_FIELDS, protocolLabs, {
          referenced: referencedLabs,
          empty: t('noLabTests', 'No tests recorded yet'),
        })}
      </div>
      {table('hospitalisationHistory', 'Hospitalisation History', 'hospitalisation', CVD_HOSPITALISATION_FIELDS, hospitalisations, {
        dateHeader: t('dateOfDischarge', 'Date of discharge'),
        empty: t('noHospitalisations', 'No hospitalisations recorded yet'),
      })}

      <TableCard title={t('cvdVisits', 'Cardiac and Vascular Disease Visits')}>
        <EncounterTable
          label={t('cvdVisits', 'Cardiac and Vascular Disease Visits')}
          columns={visitColumns}
          encounters={visits}
          cells={visitCells}
          onEdit={onEdit('visit')}
          empty={t('noCvdVisits', 'No cardiac and vascular disease visits recorded yet')}
        />
      </TableCard>
    </div>
  );
};

export default CvdCard;
