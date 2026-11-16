import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification } from '@carbon/react';
import { type ArtField, displayValue, formatDay } from '../art/art-fields';
import { type ArtEncounter, encounterValues, useCardEncounters, useEMastercard, useObsOnDays } from '../art/art.resource';
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
  type Referenced,
  shown,
  TableCard,
} from '../shared/ncd-card';
import { HIE_CARD_KEY, HIE_CARD_VERSION, HIE_FORMS } from './hie-concepts';
import { HIE_FEEDING_FIELDS, HIE_HEADER_SECTIONS, HIE_LAB_FIELDS, HIE_PLAN_FIELDS, HIE_TONE_FIELDS, HIE_VISIT_FIELDS, type HieHeaderSection } from './hie-fields';
import { malnourished } from './hie-rules';
import { launchHiePanel, useLaunchHiePanel } from './launch-hie-panel';
import { PDC_FORMS } from './pdc-concepts';
import { PDC_HEADER_FIELDS } from './pdc-fields';
import PdcSharedRecords from './pdc-shared-records.component';
import styles from '../care-page.scss';

/** How many of the latest visits the monitoring table shows */
const RECENT_VISITS = 4;
/** How many of the latest visits show values recorded the same day in other encounters, e.g. vitals */
const REFERENCED_VISITS = 12;

const F = HIE_VISIT_FIELDS;
const ALL_FIELDS: Array<ArtField> = Object.values(F);
const REFERENCE_FIELDS = ALL_FIELDS.filter((f) => f.reference);
const CONDITIONS = PDC_HEADER_FIELDS.find((f) => f.name === 'conditions');

/** A visit's answer as the page shows it: a grouped one from its group, an obsreference one from the same day */
function answer(v: ArtEncounter | undefined, field: ArtField, referenced: Referenced): string | null {
  if (!v) {
    return null;
  }
  return field.group ? displayValue(field, encounterValues([field], v)[field.name]) : shown(v, field, referenced);
}

/** The questions of a set answered Yes, e.g. a Hypo tone, by their labels */
const yesOf = (v: ArtEncounter, fields: Array<ArtField>, referenced: Referenced) =>
  fields
    .filter((f) => answer(v, f, referenced) === 'Yes')
    .map((f) => f.label)
    .join(', ') || null;

const isYes = (v: ArtEncounter, field: ArtField, referenced: Referenced) => answer(v, field, referenced) === 'Yes';

interface HieCardProps {
  patientUuid: string;
  /** The chart page's title, e.g. Pediatric Development (PDC) */
  title: string;
  tabs?: React.ReactNode;
}

/**
 * The HIE / Developmental Delay eMastercard, natively in O3: the headline, the card header's sections, monitoring,
 * laboratory tests and the visits, then the records every PDC condition card shares (hospitalisations, complications,
 * vision, hearing and radiology screening), each edited in its own side panel. Its conditions at enrolment are the PDC
 * card's.
 */
const HieCard: React.FC<HieCardProps> = ({ patientUuid, title, tabs }) => {
  const { t } = useTranslation();
  const { card, isLoading, error } = useEMastercard(patientUuid, HIE_CARD_KEY);
  const { encounters: headers } = useCardEncounters(patientUuid, HIE_FORMS.header);
  const { encounters: visits } = useCardEncounters(patientUuid, HIE_FORMS.visit);
  const { encounters: labs } = useCardEncounters(patientUuid, HIE_FORMS.labs);
  const { encounters: pdcHeaders } = useCardEncounters(patientUuid, PDC_FORMS.header);
  const referenced = useObsOnDays(
    patientUuid,
    REFERENCE_FIELDS.map((f) => f.concept),
    [...new Set(visits.slice(0, REFERENCED_VISITS).map((v) => day(v.encounterDatetime)))],
  );
  const launch = useLaunchHiePanel(patientUuid);

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
          title={card?.message ?? t('noHieCard', 'This patient has no HIE / developmental delay patient card.')}
        />
      </div>
    );
  }

  const canEdit = card.state === 'CREATE' || card.state === 'EDIT';
  const canRecord = card.state === 'EDIT';
  const header = headers.find((e) => e.uuid === card.initialEncounterUuid) ?? (headers.length === 1 ? headers[0] : null);
  const latest = visits[0];
  const a = (v: ArtEncounter | undefined, field: ArtField) => answer(v, field, referenced);
  const withGrowth = visits.find((v) => a(v, F.weight) || a(v, F.height) || a(v, F.muac));
  const withMalnutrition = visits.find((v) => a(v, F.malnutrition));
  const withMdat = visits.find((v) => a(v, F.mdatSummary));
  const next = a(latest, F.nextAppointment);
  const conditions = displayValue(CONDITIONS, encounterValues([CONDITIONS], pdcHeaders[0]).conditions);
  const description = [
    t('hiePatientCard', 'HIE / developmental delay patient card'),
    t('cardVersion', 'version {{version}}', { version: HIE_CARD_VERSION }),
    enrolmentText(card, t, formatDay),
  ]
    .filter(Boolean)
    .join(' · ');
  const on = (v: ArtEncounter) => t('assessed', 'Assessed {{date}}', { date: formatDay(v.encounterDatetime) });
  const onEdit = (panel: 'visit' | 'labs') =>
    canEdit ? (e: ArtEncounter) => launchHiePanel(panel, { patientUuid, encounterUuid: e.uuid }) : undefined;

  const section = (key: HieHeaderSection) => (
    <HeaderSectionCard
      key={key}
      title={t(`hieSection_${key}`, HIE_HEADER_SECTIONS[key].title)}
      fields={HIE_HEADER_SECTIONS[key].fields}
      header={header}
      canEdit={canEdit}
      onEdit={() => launchHiePanel('header', { patientUuid, section: key })}
      onStart={() => launchHiePanel('header', { patientUuid, section: 'start' })}
    />
  );

  const plain = (field: ArtField) => (v: ArtEncounter) => a(v, field) ?? '–';
  const malnutrition = (v: ArtEncounter) => (
    <RedIf value={a(v, F.malnutrition)} raised={malnourished(encounterValues([F.malnutrition], v).malnutrition)} />
  );
  const cerebralPalsy = (v: ArtEncounter) => <RedIf value={a(v, F.signsOfCerebralPalsy)} raised={isYes(v, F.signsOfCerebralPalsy, referenced)} />;

  // the growth, development and treatment of the latest visits
  const monitoringRows: Array<MonitoringRow> = [
    { key: 'weight', label: t('weight', 'Weight'), cell: plain(F.weight) },
    { key: 'height', label: t('height', 'Height'), cell: plain(F.height) },
    { key: 'muac', label: t('muac', 'MUAC'), cell: plain(F.muac) },
    { key: 'weightForAge', label: t('weightForAge', 'W/A'), cell: plain(F.weightForAge) },
    { key: 'weightForHeight', label: t('weightForHeight', 'W/H'), cell: plain(F.weightForHeight) },
    { key: 'malnutrition', label: t('malnutrition', 'Malnutrition'), cell: malnutrition },
    { key: 'mdatSummary', label: t('mdatSummaryNormal', 'MDAT summary normal'), cell: plain(F.mdatSummary) },
    { key: 'tone', label: t('tone', 'Tone'), cell: (v) => yesOf(v, HIE_TONE_FIELDS, referenced) ?? '–' },
    { key: 'feeding', label: t('feeding', 'Feeding'), cell: (v) => yesOf(v, HIE_FEEDING_FIELDS, referenced) ?? '–' },
    { key: 'cerebralPalsy', label: t('signsOfCerebralPalsy', 'Signs of cerebral palsy'), cell: cerebralPalsy },
    { key: 'anticonvulsants', label: t('anticonvulsants', 'Anticonvulsants'), cell: plain(F.anticonvulsants) },
    { key: 'drugAndDose', label: t('drugAndDose', 'Drug and dose'), cell: plain(F.drugAndDose) },
  ];

  const visitColumns: Array<Column> = [
    { key: 'date', header: t('visitDate', 'Visit date') },
    { key: 'location', header: t('location', 'Location') },
    { key: 'weight', header: t('weight', 'Weight') },
    { key: 'height', header: t('height', 'Height') },
    { key: 'muac', header: t('muac', 'MUAC') },
    { key: 'malnutrition', header: t('malnutrition', 'Malnutrition') },
    { key: 'mdatSummary', header: t('mdatSummaryNormal', 'MDAT summary normal') },
    { key: 'cerebralPalsy', header: t('signsOfCerebralPalsy', 'Signs of cerebral palsy') },
    { key: 'underMentalHealthCare', header: t('underMentalHealthCare', 'Under mental health care') },
    { key: 'drugAndDose', header: t('drugAndDose', 'Drug and dose') },
    { key: 'plan', header: t('plan', 'Plan') },
    { key: 'referredOut', header: t('referredOut', 'Referred out') },
    { key: 'next', header: t('nextAppointment', 'Next appointment') },
  ];
  const visitCells = (v: ArtEncounter): Record<string, React.ReactNode> => {
    const values = encounterValues(ALL_FIELDS, v);
    // where to, else that the child was, with what either was specified as
    const referral = [
      displayValue(F.referredTo, values.referredTo) ?? (isYes(v, F.referredOut, referenced) ? t('yes', 'Yes') : null),
      values.referredToOther,
      values.referredOutSpecify,
    ]
      .filter(Boolean)
      .join(' · ');
    return {
      date: formatDay(v.encounterDatetime),
      location: v.location?.display ?? null,
      weight: a(v, F.weight),
      height: a(v, F.height),
      muac: a(v, F.muac),
      malnutrition: malnutrition(v),
      mdatSummary: a(v, F.mdatSummary),
      cerebralPalsy: a(v, F.signsOfCerebralPalsy),
      underMentalHealthCare: a(v, F.underMentalHealthCare),
      drugAndDose: [a(v, F.drugAndDose), isYes(v, F.doseAdjusted, referenced) ? t('doseAdjusted', 'dose adjusted') : null]
        .filter(Boolean)
        .join(', '),
      plan: yesOf(v, HIE_PLAN_FIELDS, referenced),
      referredOut: referral || null,
      next: a(v, F.nextAppointment),
    };
  };

  const labColumns: Array<Column> = [
    { key: 'date', header: t('date', 'Date') },
    { key: 'hb', header: t('hb', 'HB') },
    { key: 'tsh', header: t('tsh', 'TSH') },
    { key: 'otherTest', header: t('otherTest', 'Other test') },
  ];
  const labCells = (e: ArtEncounter): Record<string, React.ReactNode> => {
    const values = encounterValues(HIE_LAB_FIELDS, e);
    const lab = (name: string) =>
      displayValue(
        HIE_LAB_FIELDS.find((f) => f.name === name),
        values[name],
      );
    const hb = lab('hb');
    // the HB result with its date, when it was from another day than the tests were recorded
    const hbOn = values.hbDate && values.hbDate !== day(e.encounterDatetime) ? formatDay(values.hbDate as string) : null;
    const tshDone = values.tshDone ? t('tshDone', 'Done: {{answer}}', { answer: lab('tshDone') }) : null;
    const tshNormal = values.tshNormal ? t('tshNormal', 'Normal: {{answer}}', { answer: lab('tshNormal') }) : null;
    return {
      date: formatDay(e.encounterDatetime),
      hb: hb ? [hb, hbOn].filter(Boolean).join(' · ') : null,
      tsh: [lab('tshDate'), tshDone, tshNormal].filter(Boolean).join(' · ') || null,
      otherTest: [lab('otherTestDate'), lab('otherTestType'), lab('otherTestResult')].filter(Boolean).join(' · ') || null,
    };
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
              {t('recordHieVisit', 'Record HIE / developmental delay visit')}
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
          title={t('startHieCardFirst', 'Start the card first: visits and laboratory tests can be recorded once it has been saved.')}
        />
      )}

      <section aria-label={t('hieAtAGlance', 'HIE / developmental delay at a glance')} className={styles.headlines}>
        <Headline label={t('pdcConditionsAtEnrolment', 'Conditions at enrolment')} value={conditions} />
        <Headline
          label={t('growth', 'Growth')}
          value={withGrowth ? (a(withGrowth, F.weight) ?? a(withGrowth, F.height) ?? a(withGrowth, F.muac)) : null}
          detail={
            withGrowth
              ? [
                  a(withGrowth, F.weight) && a(withGrowth, F.height) && `${t('height', 'Height')} ${a(withGrowth, F.height)}`,
                  a(withGrowth, F.muac) && `${t('muac', 'MUAC')} ${a(withGrowth, F.muac)}`,
                  t('measured', 'Measured {{date}}', { date: formatDay(withGrowth.encounterDatetime) }),
                ]
                  .filter(Boolean)
                  .join(' · ')
              : null
          }
        />
        <Headline
          label={t('malnutrition', 'Malnutrition')}
          value={withMalnutrition ? a(withMalnutrition, F.malnutrition) : null}
          detail={withMalnutrition ? on(withMalnutrition) : null}
          alert={withMalnutrition ? malnourished(encounterValues([F.malnutrition], withMalnutrition).malnutrition) : false}
        />
        <Headline
          label={t('mdatSummaryNormal', 'MDAT summary normal')}
          value={withMdat ? a(withMdat, F.mdatSummary) : null}
          detail={withMdat ? on(withMdat) : null}
        />
        <Headline
          label={t('nextAppointment', 'Next appointment')}
          value={next}
          detail={next ? t('booked', 'Booked {{date}}', { date: formatDay(latest.encounterDatetime) }) : null}
        />
      </section>

      <div className={styles.cards}>
        {section('patientGuardian')}
        {section('overview')}
      </div>

      <div className={styles.cards}>
        <MonitoringCard
          visits={visits}
          count={RECENT_VISITS}
          rows={monitoringRows}
          empty={t('noHieVisits', 'No HIE / developmental delay visits recorded yet')}
        />
        <TableCard title={t('labTests', 'Laboratory Tests')} onRecord={canRecord ? () => launch('labs') : undefined}>
          <EncounterTable
            label={t('labTests', 'Laboratory Tests')}
            columns={labColumns}
            encounters={labs}
            cells={labCells}
            onEdit={onEdit('labs')}
            empty={t('noLabTests', 'No tests recorded yet')}
          />
        </TableCard>
      </div>

      <TableCard title={t('hieVisits', 'HIE / Developmental Delay Visits')}>
        <EncounterTable
          label={t('hieVisits', 'HIE / Developmental Delay Visits')}
          columns={visitColumns}
          encounters={visits}
          cells={visitCells}
          onEdit={onEdit('visit')}
          empty={t('noHieVisits', 'No HIE / developmental delay visits recorded yet')}
        />
      </TableCard>

      <PdcSharedRecords patientUuid={patientUuid} cardKey={HIE_CARD_KEY} canRecord={canRecord} canEdit={canEdit} />
    </div>
  );
};

export default HieCard;
