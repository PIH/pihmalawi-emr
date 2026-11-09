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
  shown,
  TableCard,
  valueOf,
} from '../shared/ncd-card';
import { CLD_CARD_KEY, CLD_CARD_VERSION, CLD_FORMS, CLD_VISIT } from './cld-concepts';
import {
  CLD_HEADER_SECTIONS,
  CLD_HOSPITALISATION_FIELDS,
  CLD_MEDICATIONS,
  CLD_PEAK_FLOW_FIELDS,
  CLD_VISIT_FIELDS,
  type CldHeaderSection,
  INHALER_FIELDS,
} from './cld-fields';
import { cldConditionsOf, severeAsthma } from './cld-rules';
import { launchCldPanel, useLaunchCldPanel } from './launch-cld-panel';
import styles from '../care-page.scss';

/** How many of the latest visits the monitoring table shows */
const RECENT_VISITS = 4;
/** How many of the latest visits show the height and weight recorded the same day in other encounters, e.g. vitals */
const REFERENCED_VISITS = 12;

const F = CLD_VISIT_FIELDS;
const REFERENCE_FIELDS: Array<ArtField> = Object.values(F).filter((f) => f.reference);

/** Beta-agonist inhaler use as the visit counted it: per day, week, month or year */
const inhalerUse = (v: ArtEncounter | undefined) =>
  INHALER_FIELDS.map((f) => shown(v, f))
    .filter(Boolean)
    .join(', ') || null;

/** Day and night symptoms, e.g. 3 / 1 per week */
function symptoms(v: ArtEncounter | undefined) {
  const dayCount = valueOf(v, F.daySymptoms);
  const nightCount = valueOf(v, F.nightSymptoms);
  if (dayCount === null && nightCount === null) {
    return null;
  }
  return `${dayCount ?? '–'} / ${nightCount ?? '–'}`;
}

const exacerbated = (v: ArtEncounter) => shown(v, F.exacerbation) === 'Yes';

interface CldCardProps {
  patientUuid: string;
  /** The chart page's title, e.g. Chronic Care Record */
  title: string;
  tabs?: React.ReactNode;
}

/**
 * The Chronic Lung Disease eMastercard, natively in O3: the headline, the card header's sections, monitoring and
 * medication history, peak flows and hospitalisations, and the visits, each edited in its own side panel
 */
const CldCard: React.FC<CldCardProps> = ({ patientUuid, title, tabs }) => {
  const { t } = useTranslation();
  const { card, isLoading, error } = useEMastercard(patientUuid, CLD_CARD_KEY);
  const { encounters: headers } = useCardEncounters(patientUuid, CLD_FORMS.header);
  const { encounters: visits } = useCardEncounters(patientUuid, CLD_FORMS.visit);
  const { encounters: peakFlows } = useCardEncounters(patientUuid, CLD_FORMS.peakFlow);
  const { encounters: hospitalisations } = useCardEncounters(patientUuid, CLD_FORMS.hospitalisation);
  const referenced = useObsOnDays(
    patientUuid,
    REFERENCE_FIELDS.map((f) => f.concept),
    [...new Set(visits.slice(0, REFERENCED_VISITS).map((v) => day(v.encounterDatetime)))],
  );
  const launch = useLaunchCldPanel(patientUuid);

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
          title={card?.message ?? t('noCldCard', 'This patient has no chronic lung disease patient card.')}
        />
      </div>
    );
  }

  const canEdit = card.state === 'CREATE' || card.state === 'EDIT';
  const canRecord = card.state === 'EDIT';
  const header = headers.find((e) => e.uuid === card.initialEncounterUuid) ?? (headers.length === 1 ? headers[0] : null);
  const conditions = cldConditionsOf(header);
  const latest = visits[0];
  const withSymptoms = visits.find((v) => symptoms(v));
  const withInhaler = visits.find((v) => inhalerUse(v));
  const withSeverity = visits.find((v) => valueOf(v, F.asthmaSeverity));
  const peakFlow = peakFlows[0];
  // the medications of the latest visit that dispensed any: a visit for a check-up alone doesn't stop them
  const medicationVisit = visits.find((v) => medicationsOf(v, CLD_MEDICATIONS).length);
  const meds = medicationVisit ? medicationsOf(medicationVisit, CLD_MEDICATIONS) : [];
  const next = formatDay(obsValue(latest, CLD_VISIT.nextAppointment) as string);
  const description = [
    t('cldPatientCard', 'Chronic lung disease patient card'),
    t('cardVersion', 'version {{version}}', { version: CLD_CARD_VERSION }),
    enrolmentText(card, t, formatDay),
  ]
    .filter(Boolean)
    .join(' · ');
  const on = (v: ArtEncounter) => t('assessed', 'Assessed {{date}}', { date: formatDay(v.encounterDatetime) });
  const onRecord = (panel: 'peakFlow' | 'hospitalisation') => (canRecord ? () => launch(panel) : undefined);

  const section = (key: CldHeaderSection) => (
    <HeaderSectionCard
      key={key}
      title={t(`cldSection_${key}`, CLD_HEADER_SECTIONS[key].title)}
      fields={CLD_HEADER_SECTIONS[key].fields}
      header={header}
      canEdit={canEdit}
      onEdit={() => launchCldPanel('header', { patientUuid, section: key })}
      onStart={() => launchCldPanel('header', { patientUuid, section: 'start' })}
    />
  );

  const severity = (v: ArtEncounter) => <RedIf value={shown(v, F.asthmaSeverity)} raised={severeAsthma(valueOf(v, F.asthmaSeverity))} />;
  const exacerbation = (v: ArtEncounter) => <RedIf value={shown(v, F.exacerbation)} raised={exacerbated(v)} />;

  // the symptoms, inhaler use and exposures of the latest visits
  const monitoringRows: Array<MonitoringRow> = [
    { key: 'plannedVisit', label: t('plannedVisit', 'Planned visit'), cell: (v) => shown(v, F.plannedVisit) ?? '–' },
    { key: 'weight', label: t('weight', 'Weight'), cell: (v) => shown(v, F.weight, referenced) ?? '–' },
    { key: 'daySymptoms', label: t('daySymptoms', 'Day symptoms'), cell: (v) => shown(v, F.daySymptoms) ?? '–' },
    { key: 'nightSymptoms', label: t('nightSymptoms', 'Night symptoms'), cell: (v) => shown(v, F.nightSymptoms) ?? '–' },
    { key: 'inhaler', label: t('betaAgonistInhaler', 'Beta-agonist inhaler'), cell: (v) => inhalerUse(v) ?? '–' },
    { key: 'steroidDaily', label: t('steroidInhalerDaily', 'Steroid inhaler daily'), cell: (v) => shown(v, F.steroidDaily) ?? '–' },
    { key: 'exacerbation', label: t('exacerbationToday', 'Exacerbation today'), cell: exacerbation },
    ...(conditions.asthma ? [{ key: 'severity', label: t('asthmaSeverity', 'Asthma severity'), cell: severity }] : []),
    { key: 'cigarettes', label: t('smoking', 'Smoking'), cell: (v) => shown(v, F.cigarettes) ?? '–' },
    { key: 'passiveSmoking', label: t('passiveSmoking', 'Passive smoking'), cell: (v) => shown(v, F.passiveSmoking) ?? '–' },
    { key: 'indoorCooking', label: t('indoorCooking', 'Indoor cooking'), cell: (v) => shown(v, F.indoorCooking) ?? '–' },
  ];

  const visitColumns: Array<Column> = [
    { key: 'date', header: t('visitDate', 'Visit date') },
    { key: 'location', header: t('location', 'Location') },
    { key: 'plannedVisit', header: t('plannedVisit', 'Planned visit') },
    { key: 'height', header: t('height', 'Height') },
    { key: 'weight', header: t('weight', 'Weight') },
    { key: 'symptoms', header: t('daySlashNightSymptoms', 'Day / night symptoms') },
    { key: 'inhaler', header: t('betaAgonistInhaler', 'Beta-agonist inhaler') },
    { key: 'steroidDaily', header: t('steroidInhalerDaily', 'Steroid inhaler daily') },
    { key: 'exacerbation', header: t('exacerbation', 'Exacerbation') },
    ...(conditions.asthma ? [{ key: 'severity', header: t('asthmaSeverity', 'Asthma severity') }] : []),
    { key: 'copd', header: t('copd', 'COPD') },
    { key: 'otherDiagnosis', header: t('otherDiagnosis', 'Other diagnosis') },
    { key: 'medications', header: t('medications', 'Medications') },
    { key: 'comments', header: t('comments', 'Comments') },
    { key: 'next', header: t('nextAppointment', 'Next appointment') },
  ];
  const visitCells = (v: ArtEncounter): Record<string, React.ReactNode> => ({
    date: formatDay(v.encounterDatetime),
    location: v.location?.display ?? null,
    plannedVisit: shown(v, F.plannedVisit),
    height: shown(v, F.height, referenced),
    weight: shown(v, F.weight, referenced),
    symptoms: symptoms(v),
    inhaler: inhalerUse(v),
    steroidDaily: shown(v, F.steroidDaily),
    exacerbation: shown(v, F.exacerbation) && exacerbation(v),
    severity: shown(v, F.asthmaSeverity) && severity(v),
    copd: shown(v, F.copd) ? t('yes', 'Yes') : null,
    otherDiagnosis: shown(v, F.otherDiagnosis),
    medications: medicationsOf(v, CLD_MEDICATIONS).map(medicationText).join(', ') || null,
    comments: shown(v, F.comments),
    next: shown(v, F.nextAppointment),
  });
  const tableColumns = (fields: Array<ArtField>, dateHeader = t('date', 'Date')): Array<Column> => [
    { key: 'date', header: dateHeader },
    ...fields.map((f) => ({ key: f.name, header: t(`cldField_${f.name}`, f.label) })),
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
            <Button kind="primary" size="md" disabled={!canRecord} onClick={() => launch('visit')}>
              {t('recordCldVisit', 'Record chronic lung disease visit')}
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
          title={t('startCldCardFirst', 'Start the card first: visits, peak flows and hospitalisations can be recorded once it has been saved.')}
        />
      )}

      <section aria-label={t('cldAtAGlance', 'Chronic lung disease at a glance')} className={styles.headlines}>
        <Headline
          label={t('daySlashNightSymptoms', 'Day / night symptoms')}
          value={withSymptoms ? t('timesPerWeek', '{{times}} per week', { times: symptoms(withSymptoms) }) : null}
          detail={withSymptoms ? on(withSymptoms) : null}
        />
        <Headline
          label={t('betaAgonistInhaler', 'Beta-agonist inhaler')}
          value={inhalerUse(withInhaler)}
          detail={withInhaler ? on(withInhaler) : null}
        />
        <Headline
          label={t('peakFlow', 'Peak flow')}
          value={peakFlow ? shown(peakFlow, CLD_PEAK_FLOW_FIELDS[0]) : null}
          detail={peakFlow ? t('measured', 'Measured {{date}}', { date: formatDay(peakFlow.encounterDatetime) }) : null}
        />
        {conditions.asthma && (
          <Headline
            label={t('asthmaSeverity', 'Asthma severity')}
            value={withSeverity ? shown(withSeverity, F.asthmaSeverity) : null}
            detail={withSeverity ? on(withSeverity) : null}
            alert={withSeverity ? severeAsthma(valueOf(withSeverity, F.asthmaSeverity)) : false}
          />
        )}
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
          empty={t('noCldVisits', 'No chronic lung disease visits recorded yet')}
        />
        <MedicationHistoryCard visits={visits} medications={CLD_MEDICATIONS} />
      </div>

      <div className={styles.cards}>
        <TableCard title={t('peakFlowSpirometry', 'Peak Flow / Spirometry')} onRecord={onRecord('peakFlow')}>
          <EncounterTable
            label={t('peakFlowSpirometry', 'Peak Flow / Spirometry')}
            columns={tableColumns(CLD_PEAK_FLOW_FIELDS)}
            encounters={peakFlows}
            cells={(e) => fieldCells(CLD_PEAK_FLOW_FIELDS, e)}
            onEdit={canEdit ? (e) => launchCldPanel('peakFlow', { patientUuid, encounterUuid: e.uuid }) : undefined}
            empty={t('noPeakFlows', 'No peak flows recorded yet')}
          />
        </TableCard>

        <TableCard title={t('hospitalisationHistory', 'Hospitalisation History')} onRecord={onRecord('hospitalisation')}>
          <EncounterTable
            label={t('hospitalisationHistory', 'Hospitalisation History')}
            columns={tableColumns(CLD_HOSPITALISATION_FIELDS, t('dateOfDischarge', 'Date of discharge'))}
            encounters={hospitalisations}
            cells={(e) => fieldCells(CLD_HOSPITALISATION_FIELDS, e)}
            onEdit={canEdit ? (e) => launchCldPanel('hospitalisation', { patientUuid, encounterUuid: e.uuid }) : undefined}
            empty={t('noHospitalisations', 'No hospitalisations recorded yet')}
          />
        </TableCard>
      </div>

      <TableCard title={t('cldVisits', 'Chronic Lung Disease Visits')}>
        <EncounterTable
          label={t('cldVisits', 'Chronic Lung Disease Visits')}
          columns={visitColumns}
          encounters={visits}
          cells={visitCells}
          onEdit={canEdit ? (v) => launchCldPanel('visit', { patientUuid, encounterUuid: v.uuid }) : undefined}
          empty={t('noCldVisits', 'No chronic lung disease visits recorded yet')}
        />
      </TableCard>
    </div>
  );
};

export default CldCard;
