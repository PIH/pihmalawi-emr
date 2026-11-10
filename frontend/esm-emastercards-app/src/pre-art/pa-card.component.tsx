import React from 'react';
import { useTranslation } from 'react-i18next';
import { InlineLoading, InlineNotification } from '@carbon/react';
import { type ArtField, formatDay } from '../art/art-fields';
import { type ArtEncounter, obsValue, useCardEncounters, useEMastercard } from '../art/art.resource';
import { enrolmentText } from '../emastercards.resource';
import {
  type Column,
  EncounterTable,
  HeaderSectionCard,
  Headline,
  MonitoringCard,
  type MonitoringRow,
  RedIf,
  shown,
  TableCard,
  valueOf,
} from '../shared/ncd-card';
import { NO, PA_CARD_KEY, PA_CARD_VERSION, PA_FORMS, PA_VISIT } from './pa-concepts';
import { PA_HEADER_SECTIONS, PA_VISIT_FIELDS, type PaHeaderSection } from './pa-fields';
import styles from '../care-page.scss';

/** How many of the latest visits the monitoring table shows */
const RECENT_VISITS = 4;

const F = PA_VISIT_FIELDS;
/** The visit table's columns after the date and location, in the form's order */
const VISIT_COLUMNS = Object.keys(F).filter((name) => name !== 'nextAppointment');

const noop = () => undefined;
/** Wasting is moderate or severe */
const wasted = (value: unknown) => Boolean(value) && String(value).toLowerCase() !== NO;

interface PaCardProps {
  patientUuid: string;
  /** The chart page's title, e.g. HIV Care */
  title: string;
  tabs?: React.ReactNode;
}

/**
 * The Pre-ART eMastercard, natively in O3 and view-only: the Pre-ART program has been retired, so no card is started
 * and no visit is recorded, but patients who have the card keep its history: the headline, the patient and guardian
 * details, the status at enrolment, the monitoring of the latest visits and the visits.
 */
const PaCard: React.FC<PaCardProps> = ({ patientUuid, title, tabs }) => {
  const { t } = useTranslation();
  const { card, isLoading, error } = useEMastercard(patientUuid, PA_CARD_KEY);
  const { encounters: headers } = useCardEncounters(patientUuid, PA_FORMS.header);
  const { encounters: visits } = useCardEncounters(patientUuid, PA_FORMS.visit);

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
  const header = headers.find((e) => e.uuid === card?.initialEncounterUuid) ?? (headers.length === 1 ? headers[0] : null);
  if (!card || (!header && !visits.length)) {
    return (
      <div className={styles.page}>
        <InlineNotification kind="warning" lowContrast hideCloseButton title={t('noPaCard', 'This patient has no Pre-ART patient card.')} />
      </div>
    );
  }

  const latest = visits[0];
  const withStage = visits.find((v) => valueOf(v, F.whoStage));
  const withCd4 = visits.find((v) => valueOf(v, F.cd4) !== null);
  const withTb = visits.find((v) => valueOf(v, F.tbStatus));
  const next = formatDay(obsValue(latest, PA_VISIT.nextAppointment) as string);
  const description = [
    t('paPatientCard', 'Pre-ART patient card'),
    t('cardVersion', 'version {{version}}', { version: PA_CARD_VERSION }),
    enrolmentText(card, t, formatDay),
  ]
    .filter(Boolean)
    .join(' · ');
  const on = (v: ArtEncounter) => t('assessed', 'Assessed {{date}}', { date: formatDay(v.encounterDatetime) });
  const plain = (field: ArtField) => (v: ArtEncounter) => shown(v, field) ?? '–';

  const section = (key: PaHeaderSection) => (
    <HeaderSectionCard
      key={key}
      title={t(`paSection_${key}`, PA_HEADER_SECTIONS[key].title)}
      fields={PA_HEADER_SECTIONS[key].fields}
      header={header}
      canEdit={false}
      onEdit={noop}
      onStart={noop}
    />
  );

  const monitoringRows: Array<MonitoringRow> = [
    { key: 'weight', label: t('weight', 'Weight'), cell: plain(F.weight) },
    { key: 'wasting', label: t('wasting', 'Wasting'), cell: (v) => <RedIf value={shown(v, F.wasting)} raised={wasted(valueOf(v, F.wasting))} /> },
    { key: 'tbStatus', label: t('tbStatus', 'TB status'), cell: plain(F.tbStatus) },
    { key: 'whoStage', label: t('whoStage', 'WHO stage'), cell: plain(F.whoStage) },
    { key: 'cd4', label: t('cd4', 'CD4'), cell: plain(F.cd4) },
  ];

  const visitColumns: Array<Column> = [
    { key: 'date', header: t('visitDate', 'Visit date') },
    { key: 'location', header: t('location', 'Location') },
    ...VISIT_COLUMNS.map((name) => ({ key: name, header: t(`paField_${name}`, F[name].label) })),
    { key: 'next', header: t('nextAppointment', 'Next appointment') },
  ];
  const visitCells = (v: ArtEncounter): Record<string, React.ReactNode> => ({
    date: formatDay(v.encounterDatetime),
    location: v.location?.display ?? null,
    ...Object.fromEntries(VISIT_COLUMNS.map((name) => [name, shown(v, F[name])])),
    next: shown(v, F.nextAppointment),
  });

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>{t('careAndTreatment', 'Care and treatment')}</span>
          <h3 className={styles.title}>{title}</h3>
          <span className={styles.description}>{description}</span>
        </div>
      </div>

      {tabs}

      <InlineNotification
        kind="info"
        lowContrast
        hideCloseButton
        title={t('paRetired', 'The Pre-ART program has been retired: this card is view-only.')}
      />

      <section aria-label={t('paAtAGlance', 'Pre-ART at a glance')} className={styles.headlines}>
        <Headline
          label={t('whoStage', 'WHO stage')}
          value={withStage ? shown(withStage, F.whoStage) : null}
          detail={withStage ? on(withStage) : null}
        />
        <Headline label={t('latestCd4', 'Latest CD4')} value={withCd4 ? shown(withCd4, F.cd4) : null} detail={withCd4 ? on(withCd4) : null} />
        <Headline label={t('tbStatus', 'TB status')} value={withTb ? shown(withTb, F.tbStatus) : null} detail={withTb ? on(withTb) : null} />
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

      <MonitoringCard visits={visits} count={RECENT_VISITS} rows={monitoringRows} empty={t('noPaVisits', 'No Pre-ART visits recorded')} />

      <TableCard title={t('paVisits', 'Pre-ART Visits')}>
        <EncounterTable
          label={t('paVisits', 'Pre-ART Visits')}
          columns={visitColumns}
          encounters={visits}
          cells={visitCells}
          empty={t('noPaVisits', 'No Pre-ART visits recorded')}
        />
      </TableCard>
    </div>
  );
};

export default PaCard;
