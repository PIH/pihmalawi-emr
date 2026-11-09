import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification, Tag } from '@carbon/react';
import { type ArtField, formatDay } from '../art/art-fields';
import { type ArtEncounter, obsValue, useCardEncounters, useEMastercard, useObsOnDays } from '../art/art.resource';
import { enrolmentText } from '../emastercards.resource';
import {
  type Column,
  day,
  EncounterTable,
  fieldCells,
  HeaderSectionCard,
  Headline,
  MonitoringCard,
  type MonitoringRow,
  RedIf,
  type Referenced,
  shown,
  TableCard,
  valueOf,
} from '../shared/ncd-card';
import { NCO_CARD_KEY, NCO_CARD_VERSION, NCO_FORMS, NCO_VISIT } from './nco-concepts';
import {
  NCO_ANNUAL_LAB_FIELDS,
  NCO_HEADER_SECTIONS,
  NCO_HOSPITALISATION_FIELDS,
  NCO_QUARTERLY_LAB_FIELDS,
  NCO_VISIT_FIELDS,
  type NcoHeaderSection,
} from './nco-fields';
import { bpRaised } from './htn-rules';
import { launchNcoPanel, useLaunchNcoPanel, type NcoPanel } from './launch-nco-panel';
import styles from '../care-page.scss';

/** How many of the latest visits the monitoring table shows */
const RECENT_VISITS = 4;
/** How many of the latest visits show values recorded the same day in other encounters, e.g. vitals */
const REFERENCED_VISITS = 12;

const F = NCO_VISIT_FIELDS;
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
const medicationsText = (v: ArtEncounter) => (obsValue(v, NCO_VISIT.medications) as string) || null;

interface NcoCardProps {
  patientUuid: string;
  /** The chart page's title, e.g. Chronic Care Record */
  title: string;
  tabs?: React.ReactNode;
}

/**
 * The NCD Other eMastercard, natively in O3: the headline, the card header's sections, monitoring and medication
 * history, laboratory tests and hospitalisations, and the visits, each edited in its own side panel
 */
const NcoCard: React.FC<NcoCardProps> = ({ patientUuid, title, tabs }) => {
  const { t } = useTranslation();
  const { card, isLoading, error } = useEMastercard(patientUuid, NCO_CARD_KEY);
  const { encounters: headers } = useCardEncounters(patientUuid, NCO_FORMS.header);
  const { encounters: visits } = useCardEncounters(patientUuid, NCO_FORMS.visit);
  const { encounters: quarterlyLabs } = useCardEncounters(patientUuid, NCO_FORMS.quarterlyLabs);
  const { encounters: annualLabs } = useCardEncounters(patientUuid, NCO_FORMS.annualLabs);
  const { encounters: hospitalisations } = useCardEncounters(patientUuid, NCO_FORMS.hospitalisation);
  const referenced = useObsOnDays(
    patientUuid,
    REFERENCE_FIELDS.map((f) => f.concept),
    [...new Set(visits.slice(0, REFERENCED_VISITS).map((v) => day(v.encounterDatetime)))],
  );
  const labReferenceFields = [...NCO_QUARTERLY_LAB_FIELDS, ...NCO_ANNUAL_LAB_FIELDS].filter((f) => f.reference);
  const referencedLabs = useObsOnDays(
    patientUuid,
    labReferenceFields.map((f) => f.concept),
    [...new Set([...quarterlyLabs, ...annualLabs].map((e) => day(e.encounterDatetime)))],
  );
  const launch = useLaunchNcoPanel(patientUuid);

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
          title={card?.message ?? t('noNcoCard', 'This patient has no NCD other patient card.')}
        />
      </div>
    );
  }

  const canEdit = card.state === 'CREATE' || card.state === 'EDIT';
  const canRecord = card.state === 'EDIT';
  const header = headers.find((e) => e.uuid === card.initialEncounterUuid) ?? (headers.length === 1 ? headers[0] : null);
  const latest = visits[0];
  const bp = visits.map((v) => ({ v, bp: bloodPressure(v, referenced) })).find((x) => x.bp);
  // the medications of the latest visit that wrote any down: a visit for a check-up alone doesn't stop them
  const medicationVisit = visits.find((v) => medicationsText(v));
  const medicationVisits = visits.filter((v) => medicationsText(v));
  const lastDischarge = hospitalisations[0];
  const next = formatDay(obsValue(latest, NCO_VISIT.nextAppointment) as string);
  const description = [
    t('ncoPatientCard', 'NCD other patient card'),
    t('cardVersion', 'version {{version}}', { version: NCO_CARD_VERSION }),
    enrolmentText(card, t, formatDay),
  ]
    .filter(Boolean)
    .join(' · ');
  const onRecord = (panel: Exclude<NcoPanel, 'header' | 'visit'>) => (canRecord ? () => launch(panel) : undefined);
  const onEdit = (panel: Exclude<NcoPanel, 'header'>) =>
    canEdit ? (e: ArtEncounter) => launchNcoPanel(panel, { patientUuid, encounterUuid: e.uuid }) : undefined;

  const section = (key: NcoHeaderSection) => (
    <HeaderSectionCard
      key={key}
      title={t(`ncoSection_${key}`, NCO_HEADER_SECTIONS[key].title)}
      fields={NCO_HEADER_SECTIONS[key].fields}
      header={header}
      canEdit={canEdit}
      onEdit={() => launchNcoPanel('header', { patientUuid, section: key })}
      onStart={() => launchNcoPanel('header', { patientUuid, section: 'start' })}
    />
  );

  const plain = (field: ArtField) => (v: ArtEncounter) => shown(v, field, referenced) ?? '–';

  // the measurements, risk factors and treatment of the latest visits
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
    { key: 'tobacco', label: t('tobacco', 'Tobacco'), cell: plain(F.tobacco) },
    { key: 'alcohol', label: t('alcohol', 'Alcohol'), cell: plain(F.alcohol) },
    { key: 'fruitVegetables', label: t('fruitVegetablesShort', 'Fruit/vegetable portions'), cell: plain(F.fruitVegetables) },
    { key: 'exercise', label: t('exerciseShort', 'Exercise days per week'), cell: plain(F.exercise) },
    {
      key: 'hospitalised',
      label: t('hospitalised', 'Hospitalised'),
      cell: (v) => <RedIf value={shown(v, F.hospitalised)} raised={yes(v, F.hospitalised)} />,
    },
    { key: 'medicationsChanged', label: t('medicationsChanged', 'Medications changed'), cell: plain(F.medicationsChanged) },
  ];

  const visitColumns: Array<Column> = [
    { key: 'date', header: t('visitDate', 'Visit date') },
    { key: 'location', header: t('location', 'Location') },
    { key: 'weight', header: t('weight', 'Weight') },
    { key: 'bp', header: t('bp', 'BP') },
    { key: 'pulse', header: t('heartRate', 'Heart rate') },
    { key: 'spo2', header: t('spo2', 'SpO2') },
    { key: 'hospitalised', header: t('hospitalised', 'Hospitalised') },
    { key: 'medications', header: t('medications', 'Medications') },
    { key: 'comments', header: t('comments', 'Comments') },
    { key: 'next', header: t('nextAppointment', 'Next appointment') },
  ];
  const visitCells = (v: ArtEncounter): Record<string, React.ReactNode> => ({
    date: formatDay(v.encounterDatetime),
    location: v.location?.display ?? null,
    weight: shown(v, F.weight, referenced),
    bp: bloodPressure(v, referenced)?.text ?? null,
    pulse: shown(v, F.pulse),
    spo2: shown(v, F.spo2),
    hospitalised: shown(v, F.hospitalised),
    medications: medicationsText(v),
    comments: shown(v, F.comments),
    next: [shown(v, F.nextAppointment), shown(v, F.nextAppointmentLocation)].filter(Boolean).join(' · ') || null,
  });
  const tableColumns = (fields: Array<ArtField>, dateHeader = t('date', 'Date')): Array<Column> => [
    { key: 'date', header: dateHeader },
    ...fields.map((f) => ({ key: f.name, header: t(`ncoField_${f.name}`, f.label) })),
  ];
  const table = (
    key: string,
    label: string,
    panel: Exclude<NcoPanel, 'header' | 'visit'>,
    fields: Array<ArtField>,
    encounters: Array<ArtEncounter>,
    extra: { dateHeader?: string; empty?: string; referenced?: Referenced } = {},
  ) => (
    <TableCard title={t(key, label)} onRecord={onRecord(panel)}>
      <EncounterTable
        label={t(key, label)}
        columns={tableColumns(fields, extra.dateHeader)}
        encounters={encounters}
        cells={(e) => fieldCells(fields, e, extra.referenced)}
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
              {t('recordNcoVisit', 'Record NCD other visit')}
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
          title={t('startNcoCardFirst', 'Start the card first: visits, tests and hospitalisations can be recorded once it has been saved.')}
        />
      )}

      <section aria-label={t('ncoAtAGlance', 'NCD other at a glance')} className={styles.headlines}>
        <Headline
          label={t('bloodPressure', 'Blood pressure')}
          value={bp ? `${bp.bp.text} mmHg` : null}
          detail={bp ? t('measured', 'Measured {{date}}', { date: formatDay(bp.v.encounterDatetime) }) : null}
          alert={bp?.bp.raised}
        />
        <Headline
          label={t('currentMedication', 'Current medication')}
          value={medicationVisit ? medicationsText(medicationVisit) : null}
          detail={medicationVisit ? t('dispensed', 'Dispensed {{date}}', { date: formatDay(medicationVisit.encounterDatetime) }) : null}
        />
        <Headline
          label={t('hospitalisations', 'Hospitalisations')}
          value={String(hospitalisations.length)}
          detail={lastDischarge ? t('lastDischarged', 'Last discharged {{date}}', { date: formatDay(lastDischarge.encounterDatetime) }) : null}
        />
        <Headline
          label={t('nextAppointment', 'Next appointment')}
          value={next}
          detail={
            next
              ? [shown(latest, F.nextAppointmentLocation), t('booked', 'Booked {{date}}', { date: formatDay(latest.encounterDatetime) })]
                  .filter(Boolean)
                  .join(' · ')
              : null
          }
        />
      </section>

      <div className={styles.cards}>
        {section('patientGuardian')}
        {section('diagnoses')}
      </div>
      <div className={styles.cards}>
        {section('history')}
        {section('imaging')}
      </div>

      <div className={styles.cards}>
        <MonitoringCard visits={visits} count={RECENT_VISITS} rows={monitoringRows} empty={t('noNcoVisits', 'No NCD other visits recorded yet')} />
        {/* the medications as the visits wrote them, the visits that changed the treatment marked */}
        <section aria-label={t('medicationHistory', 'Medication History')} className={styles.card}>
          <div className={styles.cardHeader}>
            <h4 className={styles.cardTitle}>{t('medicationHistory', 'Medication History')}</h4>
          </div>
          <ol className={styles.history}>
            {medicationVisits.map((v, i) => (
              <li key={v.uuid}>
                <span className={styles.historyDate}>{formatDay(v.encounterDatetime)}</span>
                <span className={styles.historyRegimen}>{medicationsText(v)}</span>
                {i === 0 && (
                  <Tag type="green" size="sm">
                    {t('current', 'Current')}
                  </Tag>
                )}
                {yes(v, F.medicationsChanged) && (
                  <Tag type="blue" size="sm">
                    {t('changed', 'Changed')}
                  </Tag>
                )}
              </li>
            ))}
          </ol>
          {!medicationVisits.length && <p className={styles.empty}>{t('noMedications', 'No medications recorded yet')}</p>}
        </section>
      </div>

      <div className={styles.cards}>
        {table('quarterlyLabs', 'Quarterly Laboratory Tests', 'quarterlyLabs', NCO_QUARTERLY_LAB_FIELDS, quarterlyLabs, {
          referenced: referencedLabs,
        })}
        {table('annualLabs', 'Annual Laboratory Tests', 'annualLabs', NCO_ANNUAL_LAB_FIELDS, annualLabs, { referenced: referencedLabs })}
      </div>
      {table('hospitalisationHistory', 'Hospitalisation History', 'hospitalisation', NCO_HOSPITALISATION_FIELDS, hospitalisations, {
        dateHeader: t('dateOfDischarge', 'Date of discharge'),
        empty: t('noHospitalisations', 'No hospitalisations recorded yet'),
      })}

      <TableCard title={t('ncoVisits', 'NCD Other Visits')}>
        <EncounterTable
          label={t('ncoVisits', 'NCD Other Visits')}
          columns={visitColumns}
          encounters={visits}
          cells={visitCells}
          onEdit={onEdit('visit')}
          empty={t('noNcoVisits', 'No NCD other visits recorded yet')}
        />
      </TableCard>
    </div>
  );
};

export default NcoCard;
