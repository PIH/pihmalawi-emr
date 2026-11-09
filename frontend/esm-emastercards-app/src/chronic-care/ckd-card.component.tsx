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
import { CKD_CARD_KEY, CKD_CARD_VERSION, CKD_FORMS, CKD_VISIT } from './ckd-concepts';
import {
  CKD_ANNUAL_LAB_FIELDS,
  CKD_HEADER_SECTIONS,
  CKD_HOSPITALISATION_FIELDS,
  CKD_IMAGING_FIELDS,
  CKD_MEDICATIONS,
  CKD_QUARTERLY_LAB_FIELDS,
  CKD_SYMPTOM_FIELDS,
  CKD_VISIT_FIELDS,
  type CkdHeaderSection,
} from './ckd-fields';
import { advancedCkd } from './ckd-rules';
import { bpRaised } from './htn-rules';
import { launchCkdPanel, useLaunchCkdPanel, type CkdPanel } from './launch-ckd-panel';
import styles from '../care-page.scss';

/** How many of the latest visits the monitoring table shows */
const RECENT_VISITS = 4;
/** How many of the latest visits show values recorded the same day in other encounters, e.g. vitals */
const REFERENCED_VISITS = 12;

const F = CKD_VISIT_FIELDS;
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

interface CkdCardProps {
  patientUuid: string;
  /** The chart page's title, e.g. Chronic Care Record */
  title: string;
  tabs?: React.ReactNode;
}

/**
 * The Chronic Kidney Disease eMastercard, natively in O3: the headline, the card header's sections, monitoring and
 * medication history, laboratory tests, ultrasounds and hospitalisations, and the visits, each edited in its own side
 * panel
 */
const CkdCard: React.FC<CkdCardProps> = ({ patientUuid, title, tabs }) => {
  const { t } = useTranslation();
  const { card, isLoading, error } = useEMastercard(patientUuid, CKD_CARD_KEY);
  const { encounters: headers } = useCardEncounters(patientUuid, CKD_FORMS.header);
  const { encounters: visits } = useCardEncounters(patientUuid, CKD_FORMS.visit);
  const { encounters: quarterlyLabs } = useCardEncounters(patientUuid, CKD_FORMS.quarterlyLabs);
  const { encounters: annualLabs } = useCardEncounters(patientUuid, CKD_FORMS.annualLabs);
  const { encounters: imaging } = useCardEncounters(patientUuid, CKD_FORMS.imaging);
  const { encounters: hospitalisations } = useCardEncounters(patientUuid, CKD_FORMS.hospitalisation);
  const referenced = useObsOnDays(
    patientUuid,
    REFERENCE_FIELDS.map((f) => f.concept),
    [...new Set(visits.slice(0, REFERENCED_VISITS).map((v) => day(v.encounterDatetime)))],
  );
  const launch = useLaunchCkdPanel(patientUuid);

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
          title={card?.message ?? t('noCkdCard', 'This patient has no chronic kidney disease patient card.')}
        />
      </div>
    );
  }

  const canEdit = card.state === 'CREATE' || card.state === 'EDIT';
  const canRecord = card.state === 'EDIT';
  const header = headers.find((e) => e.uuid === card.initialEncounterUuid) ?? (headers.length === 1 ? headers[0] : null);
  const latest = visits[0];
  const bp = visits.map((v) => ({ v, bp: bloodPressure(v, referenced) })).find((x) => x.bp);
  const withStage = visits.find((v) => valueOf(v, F.ckdStage));
  const withKidney = visits.find((v) => valueOf(v, F.gfr) !== null || valueOf(v, F.creatinine, referenced) !== null);
  // the medications of the latest visit that dispensed any: a visit for a check-up alone doesn't stop them
  const medicationVisit = visits.find((v) => medicationsOf(v, CKD_MEDICATIONS).length);
  const meds = medicationVisit ? medicationsOf(medicationVisit, CKD_MEDICATIONS) : [];
  const next = formatDay(obsValue(latest, CKD_VISIT.nextAppointment) as string);
  const description = [
    t('ckdPatientCard', 'Chronic kidney disease patient card'),
    t('cardVersion', 'version {{version}}', { version: CKD_CARD_VERSION }),
    enrolmentText(card, t, formatDay),
  ]
    .filter(Boolean)
    .join(' · ');
  const on = (v: ArtEncounter) => t('assessed', 'Assessed {{date}}', { date: formatDay(v.encounterDatetime) });
  const onRecord = (panel: Exclude<CkdPanel, 'header' | 'visit'>) => (canRecord ? () => launch(panel) : undefined);
  const onEdit = (panel: Exclude<CkdPanel, 'header'>) =>
    canEdit ? (e: ArtEncounter) => launchCkdPanel(panel, { patientUuid, encounterUuid: e.uuid }) : undefined;

  const section = (key: CkdHeaderSection) => (
    <HeaderSectionCard
      key={key}
      title={t(`ckdSection_${key}`, CKD_HEADER_SECTIONS[key].title)}
      fields={CKD_HEADER_SECTIONS[key].fields}
      header={header}
      canEdit={canEdit}
      onEdit={() => launchCkdPanel('header', { patientUuid, section: key })}
      onStart={() => launchCkdPanel('header', { patientUuid, section: 'start' })}
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
    { key: 'weight', label: t('weight', 'Weight'), cell: plain(F.weight) },
    { key: 'weightChange', label: t('weightChange', 'Weight change'), cell: plain(F.weightChange) },
    { key: 'gfr', label: t('gfr', 'GFR'), cell: plain(F.gfr) },
    { key: 'creatinine', label: t('creatinine', 'Creatinine'), cell: plain(F.creatinine) },
    { key: 'urineProtein', label: t('urineProtein', 'Urine protein'), cell: plain(F.urineProtein) },
    ...CKD_SYMPTOM_FIELDS.map((f) => ({
      key: f.name,
      label: f.label,
      // a newly confused patient, in red
      cell: f.name === 'confusion' ? (v: ArtEncounter) => red(v, f, yes(v, f)) : plain(f),
    })),
    { key: 'conjunctiva', label: t('conjunctiva', 'Conjunctiva'), cell: plain(F.conjunctiva) },
    { key: 'ascites', label: t('ascites', 'Ascites'), cell: plain(F.ascites) },
    { key: 'oedema', label: t('oedema', 'Oedema'), cell: plain(F.oedema) },
    { key: 'ckdStage', label: t('ckdStage', 'CKD stage'), cell: (v) => red(v, F.ckdStage, advancedCkd(valueOf(v, F.ckdStage))) },
    { key: 'nsaidUse', label: t('nsaidUse', 'NSAID use'), cell: plain(F.nsaidUse) },
    { key: 'tookMedsToday', label: t('tookMedsToday', 'Took medication today'), cell: plain(F.tookMedsToday) },
  ];

  const visitColumns: Array<Column> = [
    { key: 'date', header: t('visitDate', 'Visit date') },
    { key: 'location', header: t('location', 'Location') },
    { key: 'weight', header: t('weight', 'Weight') },
    { key: 'bp', header: t('bp', 'BP') },
    { key: 'gfr', header: t('gfr', 'GFR') },
    { key: 'creatinine', header: t('creatinine', 'Creatinine') },
    { key: 'urineProtein', header: t('urineProtein', 'Urine protein') },
    { key: 'oedema', header: t('oedema', 'Oedema') },
    { key: 'ckdStage', header: t('ckdStage', 'CKD stage') },
    { key: 'nsaidUse', header: t('nsaidUse', 'NSAID use') },
    { key: 'medications', header: t('medications', 'Medications') },
    { key: 'diet', header: t('diet', 'Diet') },
    { key: 'next', header: t('nextAppointment', 'Next appointment') },
  ];
  const visitCells = (v: ArtEncounter): Record<string, React.ReactNode> => ({
    date: formatDay(v.encounterDatetime),
    location: v.location?.display ?? null,
    weight: shown(v, F.weight, referenced),
    bp: bloodPressure(v, referenced)?.text ?? null,
    gfr: shown(v, F.gfr),
    creatinine: shown(v, F.creatinine, referenced),
    urineProtein: shown(v, F.urineProtein),
    oedema: shown(v, F.oedema),
    ckdStage: shown(v, F.ckdStage),
    nsaidUse: shown(v, F.nsaidUse),
    medications: medicationsOf(v, CKD_MEDICATIONS).map(medicationText).join(', ') || null,
    diet: shown(v, F.diet),
    next: shown(v, F.nextAppointment),
  });
  const tableColumns = (fields: Array<ArtField>, dateHeader = t('date', 'Date')): Array<Column> => [
    { key: 'date', header: dateHeader },
    ...fields.map((f) => ({ key: f.name, header: t(`ckdField_${f.name}`, f.label) })),
  ];
  const table = (
    key: string,
    label: string,
    panel: Exclude<CkdPanel, 'header' | 'visit'>,
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
              {t('recordCkdVisit', 'Record chronic kidney disease visit')}
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
            'startCkdCardFirst',
            'Start the card first: visits, tests, ultrasounds and hospitalisations can be recorded once it has been saved.',
          )}
        />
      )}

      <section aria-label={t('ckdAtAGlance', 'Chronic kidney disease at a glance')} className={styles.headlines}>
        <Headline
          label={t('bloodPressure', 'Blood pressure')}
          value={bp ? `${bp.bp.text} mmHg` : null}
          detail={bp ? t('measured', 'Measured {{date}}', { date: formatDay(bp.v.encounterDatetime) }) : null}
          alert={bp?.bp.raised}
        />
        <Headline
          label={t('ckdStage', 'CKD stage')}
          value={withStage ? shown(withStage, F.ckdStage) : null}
          detail={withStage ? on(withStage) : null}
          alert={withStage ? advancedCkd(valueOf(withStage, F.ckdStage)) : false}
        />
        <Headline
          label={t('gfr', 'GFR')}
          value={withKidney ? shown(withKidney, F.gfr) : null}
          detail={
            withKidney
              ? [
                  shown(withKidney, F.creatinine, referenced) && `${t('creatinine', 'Creatinine')} ${shown(withKidney, F.creatinine, referenced)}`,
                  on(withKidney),
                ]
                  .filter(Boolean)
                  .join(' · ')
              : null
          }
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
        {section('etiology')}
      </div>
      <div className={styles.cards}>
        {section('diagnoses')}
        {section('history')}
      </div>

      <div className={styles.cards}>
        <MonitoringCard
          visits={visits}
          count={RECENT_VISITS}
          rows={monitoringRows}
          empty={t('noCkdVisits', 'No chronic kidney disease visits recorded yet')}
        />
        <MedicationHistoryCard visits={visits} medications={CKD_MEDICATIONS} />
      </div>

      <div className={styles.cards}>
        {table('quarterlyLabs', 'Quarterly Laboratory Tests', 'quarterlyLabs', CKD_QUARTERLY_LAB_FIELDS, quarterlyLabs, {
          empty: t('noLabTests', 'No tests recorded yet'),
        })}
        {table('annualLabs', 'Annual Laboratory Tests', 'annualLabs', CKD_ANNUAL_LAB_FIELDS, annualLabs, {
          empty: t('noLabTests', 'No tests recorded yet'),
        })}
      </div>
      <div className={styles.cards}>
        {table('ultrasound', 'Ultrasound', 'imaging', CKD_IMAGING_FIELDS, imaging)}
        {table('hospitalisationHistory', 'Hospitalisation History', 'hospitalisation', CKD_HOSPITALISATION_FIELDS, hospitalisations, {
          dateHeader: t('dateOfDischarge', 'Date of discharge'),
          empty: t('noHospitalisations', 'No hospitalisations recorded yet'),
        })}
      </div>

      <TableCard title={t('ckdVisits', 'Chronic Kidney Disease Visits')}>
        <EncounterTable
          label={t('ckdVisits', 'Chronic Kidney Disease Visits')}
          columns={visitColumns}
          encounters={visits}
          cells={visitCells}
          onEdit={onEdit('visit')}
          empty={t('noCkdVisits', 'No chronic kidney disease visits recorded yet')}
        />
      </TableCard>
    </div>
  );
};

export default CkdCard;
