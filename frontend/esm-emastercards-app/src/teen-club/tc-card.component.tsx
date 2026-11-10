import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification } from '@carbon/react';
import { type ArtField, formatDay } from '../art/art-fields';
import { type ArtEncounter, obsValue, useCardEncounters, useEMastercard, useObsOnDays } from '../art/art.resource';
import { enrolmentText } from '../emastercards.resource';
import {
  type Column,
  day,
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
import { TC_CARD_KEY, TC_CARD_VERSION, TC_FORMS, TC_SURVEY, TC_VISIT } from './tc-concepts';
import { TC_HEADER_SECTIONS, TC_VISIT_FIELDS } from './tc-fields';
import { launchTcPanel, useLaunchTcPanel } from './launch-tc-panel';
import styles from '../care-page.scss';

/** How many of the latest visits the screening table shows */
const RECENT_VISITS = 4;
/** How many of the latest visits show values recorded the same day in other encounters, e.g. vitals */
const REFERENCED_VISITS = 12;

const F = TC_VISIT_FIELDS;
const REFERENCE_FIELDS: Array<ArtField> = Object.values(F).filter((f) => f.reference);

/** A screening outcome found positive, shown in red */
const positive = (v: ArtEncounter, field: ArtField) => shown(v, field) === '+';
const answered = (v: ArtEncounter, field: ArtField, answer: string) => shown(v, field) === answer;

interface TcCardProps {
  patientUuid: string;
  /** The chart page's title, e.g. HIV care */
  title: string;
  tabs?: React.ReactNode;
}

/**
 * The Teen Club eMastercard, natively in O3: the headline, the intake / referral form's patient and guardian details,
 * the screening of the latest visits, the intake surveys and the visits, each edited in its own side panel
 */
const TcCard: React.FC<TcCardProps> = ({ patientUuid, title, tabs }) => {
  const { t } = useTranslation();
  const { card, isLoading, error } = useEMastercard(patientUuid, TC_CARD_KEY);
  const { encounters: headers } = useCardEncounters(patientUuid, TC_FORMS.header);
  const { encounters: visits } = useCardEncounters(patientUuid, TC_FORMS.visit);
  const { encounters: surveys } = useCardEncounters(patientUuid, TC_FORMS.survey);
  const referenced = useObsOnDays(
    patientUuid,
    REFERENCE_FIELDS.map((f) => f.concept),
    [...new Set(visits.slice(0, REFERENCED_VISITS).map((v) => day(v.encounterDatetime)))],
  );
  const launch = useLaunchTcPanel(patientUuid);

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
          title={card?.message ?? t('noTcCard', 'This patient has no teen club patient card.')}
        />
      </div>
    );
  }

  const canEdit = card.state === 'CREATE' || card.state === 'EDIT';
  const canRecord = card.state === 'EDIT';
  const header = headers.find((e) => e.uuid === card.initialEncounterUuid) ?? (headers.length === 1 ? headers[0] : null);
  const latest = visits[0];
  const latestWith = (field: ArtField) => visits.find((v) => valueOf(v, field, referenced) !== null);
  const withTb = latestWith(F.tbStatus);
  const withNutrition = latestWith(F.muacNormal);
  const withMentalHealth = latestWith(F.mentalHealthScreened);
  const withSti = latestWith(F.stiScreeningOutcome);
  const next = formatDay(obsValue(latest, TC_VISIT.nextAppointment) as string);
  const description = [
    t('tcPatientCard', 'Teen club patient card'),
    t('cardVersion', 'version {{version}}', { version: TC_CARD_VERSION }),
    enrolmentText(card, t, formatDay),
  ]
    .filter(Boolean)
    .join(' · ');
  const on = (v: ArtEncounter) => t('assessed', 'Assessed {{date}}', { date: formatDay(v.encounterDatetime) });
  const plain = (field: ArtField) => (v: ArtEncounter) => shown(v, field, referenced) ?? '–';
  const red = (field: ArtField, raised: (v: ArtEncounter) => boolean) => (v: ArtEncounter) => (
    <RedIf value={shown(v, field, referenced)} raised={raised(v)} />
  );

  // the measurements and screening of the latest visits
  const monitoringRows: Array<MonitoringRow> = [
    { key: 'weight', label: t('weight', 'Weight'), cell: plain(F.weight) },
    { key: 'muacBmi', label: t('muacBmi', 'MUAC/BMI'), cell: plain(F.muacBmi) },
    { key: 'tbStatus', label: t('tbStatus', 'TB status'), cell: plain(F.tbStatus) },
    {
      key: 'tbScreeningOutcome',
      label: t('tbScreeningOutcome', 'TB screening outcome'),
      cell: red(F.tbScreeningOutcome, (v) => positive(v, F.tbScreeningOutcome)),
    },
    { key: 'sputumCollected', label: t('sputumCollected', 'Sputum collected'), cell: plain(F.sputumCollected) },
    // a MUAC that is not normal, in red
    { key: 'muacNormal', label: t('muacNormal', 'MUAC normal'), cell: red(F.muacNormal, (v) => answered(v, F.muacNormal, 'No')) },
    { key: 'nutritionReferral', label: t('nutritionReferred', 'Nutrition referred'), cell: plain(F.nutritionReferral) },
    { key: 'mentalHealthScreened', label: t('mentalHealthScreened', 'Mental health screened'), cell: plain(F.mentalHealthScreened) },
    { key: 'mentalHealthReferred', label: t('mentalHealthReferred', 'Mental health referred'), cell: plain(F.mentalHealthReferred) },
    { key: 'mentalHealthRegistered', label: t('mentalHealthRegistered', 'Mental health registered'), cell: plain(F.mentalHealthRegistered) },
    {
      key: 'stiScreeningOutcome',
      label: t('stiScreeningOutcome', 'STI screening outcome'),
      cell: red(F.stiScreeningOutcome, (v) => positive(v, F.stiScreeningOutcome)),
    },
    { key: 'stiReferral', label: t('stiReferral', 'Referred to STI clinic'), cell: plain(F.stiReferral) },
    { key: 'hospitalised', label: t('hospitalised', 'Hospitalised'), cell: red(F.hospitalised, (v) => answered(v, F.hospitalised, 'Yes')) },
  ];

  const visitColumns: Array<Column> = [
    { key: 'date', header: t('visitDate', 'Visit date') },
    { key: 'location', header: t('location', 'Location') },
    { key: 'height', header: t('height', 'Height') },
    { key: 'weight', header: t('weight', 'Weight') },
    { key: 'muacBmi', header: t('muacBmi', 'MUAC/BMI') },
    { key: 'tbStatus', header: t('tbStatus', 'TB status') },
    { key: 'tbScreeningOutcome', header: t('tbScreening', 'TB screening') },
    { key: 'muacNormal', header: t('muacNormal', 'MUAC normal') },
    { key: 'mentalHealthScreened', header: t('mentalHealthScreened', 'Mental health screened') },
    { key: 'stiScreeningOutcome', header: t('stiScreening', 'STI screening') },
    { key: 'hospitalised', header: t('hospitalised', 'Hospitalised') },
    { key: 'next', header: t('nextAppointment', 'Next appointment') },
  ];
  const visitCells = (v: ArtEncounter): Record<string, React.ReactNode> =>
    Object.fromEntries([
      ['date', formatDay(v.encounterDatetime)],
      ['location', v.location?.display ?? null],
      ...[
        'height',
        'weight',
        'muacBmi',
        'tbStatus',
        'tbScreeningOutcome',
        'muacNormal',
        'mentalHealthScreened',
        'stiScreeningOutcome',
        'hospitalised',
      ].map((name) => [name, shown(v, F[name], referenced)]),
      ['next', shown(v, F.nextAppointment, referenced)],
    ]);

  const surveyColumns: Array<Column> = [
    { key: 'date', header: t('date', 'Date') },
    { key: 'interviewDate', header: t('interviewDate', 'Interview date') },
    { key: 'location', header: t('location', 'Location') },
  ];
  const surveyCells = (e: ArtEncounter): Record<string, React.ReactNode> => ({
    date: formatDay(e.encounterDatetime),
    interviewDate: formatDay(obsValue(e, TC_SURVEY.interviewDate) as string),
    location: e.location?.display ?? null,
  });

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
              {t('recordTcVisit', 'Record teen club visit')}
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
          title={t('startTcCardFirst', 'Start the card first: visits and intake surveys can be recorded once it has been saved.')}
        />
      )}

      <section aria-label={t('tcAtAGlance', 'Teen club at a glance')} className={styles.headlines}>
        <Headline
          label={t('tbStatus', 'TB status')}
          value={withTb ? shown(withTb, F.tbStatus, referenced) : null}
          detail={withTb ? on(withTb) : null}
        />
        <Headline
          label={t('muacNormal', 'MUAC normal')}
          value={withNutrition ? shown(withNutrition, F.muacNormal) : null}
          detail={withNutrition ? on(withNutrition) : null}
          alert={withNutrition ? answered(withNutrition, F.muacNormal, 'No') : false}
        />
        <Headline
          label={t('mentalHealthScreened', 'Mental health screened')}
          value={withMentalHealth ? shown(withMentalHealth, F.mentalHealthScreened) : null}
          detail={withMentalHealth ? on(withMentalHealth) : null}
        />
        <Headline
          label={t('stiScreeningOutcome', 'STI screening outcome')}
          value={withSti ? shown(withSti, F.stiScreeningOutcome) : null}
          detail={withSti ? on(withSti) : null}
          alert={withSti ? positive(withSti, F.stiScreeningOutcome) : false}
        />
        <Headline
          label={t('nextAppointment', 'Next appointment')}
          value={next}
          detail={next ? t('booked', 'Booked {{date}}', { date: formatDay(latest.encounterDatetime) }) : null}
        />
      </section>

      <div className={styles.cards}>
        <HeaderSectionCard
          title={t('tcSection_patientGuardian', TC_HEADER_SECTIONS.patientGuardian.title)}
          fields={TC_HEADER_SECTIONS.patientGuardian.fields}
          header={header}
          canEdit={canEdit}
          onEdit={() => launchTcPanel('header', { patientUuid, section: 'patientGuardian' })}
          onStart={() => launchTcPanel('header', { patientUuid, section: 'start' })}
        />
        <TableCard title={t('intakeSurveys', 'Intake Surveys')} onRecord={canRecord ? () => launch('survey') : undefined}>
          <EncounterTable
            label={t('intakeSurveys', 'Intake Surveys')}
            columns={surveyColumns}
            encounters={surveys}
            cells={surveyCells}
            onEdit={canEdit ? (e) => launchTcPanel('survey', { patientUuid, encounterUuid: e.uuid }) : undefined}
            empty={t('noIntakeSurveys', 'No intake surveys recorded yet')}
          />
        </TableCard>
      </div>

      <MonitoringCard visits={visits} count={RECENT_VISITS} rows={monitoringRows} empty={t('noTcVisits', 'No teen club visits recorded yet')} />

      <TableCard title={t('tcVisits', 'Teen Club Visits')}>
        <EncounterTable
          label={t('tcVisits', 'Teen Club Visits')}
          columns={visitColumns}
          encounters={visits}
          cells={visitCells}
          onEdit={canEdit ? (v) => launchTcPanel('visit', { patientUuid, encounterUuid: v.uuid }) : undefined}
          empty={t('noTcVisits', 'No teen club visits recorded yet')}
        />
      </TableCard>
    </div>
  );
};

export default TcCard;
