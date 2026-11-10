import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification } from '@carbon/react';
import { type ArtField, formatDay } from '../art/art-fields';
import { type ArtEncounter, encounterValues, obsValue, useCardEncounters, useEMastercard, useObsOnDays } from '../art/art.resource';
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
  shown,
  TableCard,
  valueOf,
} from '../shared/ncd-card';
import { EC_CARD_KEY, EC_CARD_VERSION, EC_EID, EC_FORMS, EC_VISIT } from './ec-concepts';
import { EC_EID_FIELDS, EC_HEADER_SECTIONS, EC_VISIT_FIELDS, type EcHeaderSection } from './ec-fields';
import { hivInfected, wasted } from './ec-rules';
import { launchEcPanel, useLaunchEcPanel } from './launch-ec-panel';
import styles from '../care-page.scss';

/** How many of the latest visits the monitoring table shows */
const RECENT_VISITS = 4;
/** How many of the latest visits show values recorded the same day in other encounters, e.g. vitals */
const REFERENCED_VISITS = 12;

const F = EC_VISIT_FIELDS;
const REFERENCE_FIELDS: Array<ArtField> = Object.values(F).filter((f) => f.reference);

/** An EID test's result, from its group */
const eidResult = (e: ArtEncounter) => {
  const field = EC_EID_FIELDS.find((f) => f.name === 'result');
  return encounterValues([field], e).result;
};
const positiveResult = (e: ArtEncounter) => String(eidResult(e) ?? '').toLowerCase() === EC_EID.results[1].value;

interface EcCardProps {
  patientUuid: string;
  /** The chart page's title, e.g. HIV care */
  title: string;
  tabs?: React.ReactNode;
}

/**
 * The Exposed Child eMastercard, natively in O3: the headline, the child and guardian details and the status at
 * enrolment, the EID tests, the monitoring of the latest visits and the visits, each edited in its own side panel.
 * It is read-only once the child has an ART card.
 */
const EcCard: React.FC<EcCardProps> = ({ patientUuid, title, tabs }) => {
  const { t } = useTranslation();
  const { card, isLoading, error } = useEMastercard(patientUuid, EC_CARD_KEY);
  const { encounters: headers } = useCardEncounters(patientUuid, EC_FORMS.header);
  const { encounters: visits } = useCardEncounters(patientUuid, EC_FORMS.visit);
  const { encounters: eidTests } = useCardEncounters(patientUuid, EC_FORMS.eid);
  const referenced = useObsOnDays(
    patientUuid,
    REFERENCE_FIELDS.map((f) => f.concept),
    [...new Set(visits.slice(0, REFERENCED_VISITS).map((v) => day(v.encounterDatetime)))],
  );
  const launch = useLaunchEcPanel(patientUuid);

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
          title={card?.message ?? t('noEcCard', 'This patient has no exposed child patient card.')}
        />
      </div>
    );
  }

  const canEdit = card.state === 'CREATE' || card.state === 'EDIT';
  const canRecord = card.state === 'EDIT';
  const header = headers.find((e) => e.uuid === card.initialEncounterUuid) ?? (headers.length === 1 ? headers[0] : null);
  const latest = visits[0];
  const withStatus = visits.find((v) => valueOf(v, F.childHivStatus));
  const withFeeding = visits.find((v) => valueOf(v, F.breastfeeding, referenced));
  const latestTest = eidTests.find((e) => eidResult(e));
  const next = formatDay(obsValue(latest, EC_VISIT.nextAppointment) as string);
  const description = [
    t('ecPatientCard', 'Exposed child patient card'),
    t('cardVersion', 'version {{version}}', { version: EC_CARD_VERSION }),
    enrolmentText(card, t, formatDay),
  ]
    .filter(Boolean)
    .join(' · ');
  const on = (v: ArtEncounter) => t('assessed', 'Assessed {{date}}', { date: formatDay(v.encounterDatetime) });
  const plain = (field: ArtField) => (v: ArtEncounter) => shown(v, field, referenced) ?? '–';

  const section = (key: EcHeaderSection) => (
    <HeaderSectionCard
      key={key}
      title={t(`ecSection_${key}`, EC_HEADER_SECTIONS[key].title)}
      fields={EC_HEADER_SECTIONS[key].fields}
      header={header}
      canEdit={canEdit}
      onEdit={() => launchEcPanel('header', { patientUuid, section: key })}
      onStart={() => launchEcPanel('header', { patientUuid, section: 'start' })}
    />
  );

  // the growth, feeding and monitoring of the latest visits
  const monitoringRows: Array<MonitoringRow> = [
    { key: 'weight', label: t('weight', 'Weight'), cell: plain(F.weight) },
    { key: 'height', label: t('height', 'Height'), cell: plain(F.height) },
    { key: 'muac', label: t('muac', 'MUAC'), cell: plain(F.muac) },
    { key: 'wasting', label: t('wasting', 'Wasting'), cell: (v) => <RedIf value={shown(v, F.wasting)} raised={wasted(valueOf(v, F.wasting))} /> },
    { key: 'breastfeeding', label: t('breastfeeding', 'Breastfeeding'), cell: plain(F.breastfeeding) },
    { key: 'motherStatus', label: t('motherStatus', 'Mother status'), cell: plain(F.motherStatus) },
    {
      key: 'clinicalMonitoring',
      label: t('clinicalMonitoring', 'Clinical monitoring'),
      cell: (v) => <RedIf value={shown(v, F.clinicalMonitoring)} raised={shown(v, F.clinicalMonitoring) === 'Sick'} />,
    },
    {
      key: 'childHivStatus',
      label: t('hivInfection', 'HIV infection'),
      cell: (v) => <RedIf value={shown(v, F.childHivStatus)} raised={hivInfected(valueOf(v, F.childHivStatus))} />,
    },
    { key: 'cpt', label: t('cpt', 'CPT'), cell: plain(F.cpt) },
  ];

  const visitColumns: Array<Column> = [
    { key: 'date', header: t('visitDate', 'Visit date') },
    { key: 'location', header: t('location', 'Location') },
    ...['height', 'weight', 'muac', 'wasting', 'breastfeeding', 'motherStatus', 'clinicalMonitoring', 'childHivStatus', 'cpt'].map((name) => ({
      key: name,
      header: t(`ecField_${name}`, F[name].label),
    })),
    { key: 'next', header: t('nextAppointment', 'Next appointment') },
  ];
  const visitCells = (v: ArtEncounter): Record<string, React.ReactNode> => ({
    date: formatDay(v.encounterDatetime),
    location: v.location?.display ?? null,
    ...Object.fromEntries(
      ['height', 'weight', 'muac', 'wasting', 'breastfeeding', 'motherStatus', 'clinicalMonitoring', 'childHivStatus', 'cpt'].map((name) => [
        name,
        shown(v, F[name], referenced),
      ]),
    ),
    next: shown(v, F.nextAppointment),
  });
  const eidColumns: Array<Column> = [
    { key: 'date', header: t('sampleDate', 'Sample date') },
    ...EC_EID_FIELDS.filter((f) => f.name !== 'labLocation').map((f) => ({ key: f.name, header: t(`ecField_${f.name}`, f.label) })),
  ];
  const eidCells = (e: ArtEncounter): Record<string, React.ReactNode> => {
    const cells = fieldCells(EC_EID_FIELDS, e);
    return { ...cells, result: <RedIf value={cells.result as string} raised={positiveResult(e)} /> };
  };

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
              {t('recordEcVisit', 'Record exposed child visit')}
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
          title={t('startEcCardFirst', 'Start the card first: visits and EID tests can be recorded once it has been saved.')}
        />
      )}

      <section aria-label={t('ecAtAGlance', 'Exposed child at a glance')} className={styles.headlines}>
        <Headline
          label={t('hivInfection', 'HIV infection')}
          value={withStatus ? shown(withStatus, F.childHivStatus) : null}
          detail={withStatus ? on(withStatus) : null}
          alert={withStatus ? hivInfected(valueOf(withStatus, F.childHivStatus)) : false}
        />
        <Headline
          label={t('latestEidResult', 'Latest EID result')}
          value={latestTest ? (fieldCells(EC_EID_FIELDS, latestTest).result as string) : null}
          detail={latestTest ? t('sampleTaken', 'Sample taken {{date}}', { date: formatDay(latestTest.encounterDatetime) }) : null}
          alert={latestTest ? positiveResult(latestTest) : false}
        />
        <Headline
          label={t('breastfeeding', 'Breastfeeding')}
          value={withFeeding ? shown(withFeeding, F.breastfeeding, referenced) : null}
          detail={withFeeding ? on(withFeeding) : null}
        />
        <Headline
          label={t('nextAppointment', 'Next appointment')}
          value={next}
          detail={next ? t('booked', 'Booked {{date}}', { date: formatDay(latest.encounterDatetime) }) : null}
        />
      </section>

      <div className={styles.cards}>
        {section('patientGuardian')}
        {section('status')}
      </div>

      <TableCard title={t('eidTests', 'EID Tests')} onRecord={canRecord ? () => launch('eid') : undefined}>
        <EncounterTable
          label={t('eidTests', 'EID Tests')}
          columns={eidColumns}
          encounters={eidTests}
          cells={eidCells}
          onEdit={canEdit ? (e) => launchEcPanel('eid', { patientUuid, encounterUuid: e.uuid }) : undefined}
          empty={t('noEidTests', 'No EID tests recorded yet')}
        />
      </TableCard>

      <MonitoringCard visits={visits} count={RECENT_VISITS} rows={monitoringRows} empty={t('noEcVisits', 'No exposed child visits recorded yet')} />

      <TableCard title={t('ecVisits', 'Exposed Child Visits')}>
        <EncounterTable
          label={t('ecVisits', 'Exposed Child Visits')}
          columns={visitColumns}
          encounters={visits}
          cells={visitCells}
          onEdit={canEdit ? (v) => launchEcPanel('visit', { patientUuid, encounterUuid: v.uuid }) : undefined}
          empty={t('noEcVisits', 'No exposed child visits recorded yet')}
        />
      </TableCard>
    </div>
  );
};

export default EcCard;
