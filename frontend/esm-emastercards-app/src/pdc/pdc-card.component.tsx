import React from 'react';
import { useTranslation } from 'react-i18next';
import { InlineLoading, InlineNotification } from '@carbon/react';
import { displayValue, formatDay } from '../art/art-fields';
import { encounterValues, useCardEncounters, useEMastercard } from '../art/art.resource';
import { enrolmentText } from '../emastercards.resource';
import { HeaderSectionCard, Headline } from '../shared/ncd-card';
import { PDC_CARD_KEY, PDC_CARD_VERSION, PDC_FORMS } from './pdc-concepts';
import { PDC_HEADER_FIELDS, PDC_HEADER_SECTIONS, type PdcHeaderSection } from './pdc-fields';
import { launchPdcPanel } from './launch-pdc-panel';
import styles from '../care-page.scss';

/** The sections in the order the page shows them */
const SECTIONS: Array<PdcHeaderSection> = ['patientGuardian', 'caretaker', 'referral', 'hivServices', 'history', 'conditions', 'summary'];

const byName = (name: string) => PDC_HEADER_FIELDS.find((f) => f.name === name);

interface PdcCardProps {
  patientUuid: string;
  /** The chart page's title, e.g. Pediatric Development Clinic */
  title: string;
  tabs?: React.ReactNode;
}

/**
 * The PDC eMastercard, natively in O3: the intake and referral card (pdc-emastercard.xml), its headline and its
 * sections, each edited in its own side panel. The child's visits are on the condition cards, e.g. HIE / developmental delay.
 */
const PdcCard: React.FC<PdcCardProps> = ({ patientUuid, title, tabs }) => {
  const { t } = useTranslation();
  const { card, isLoading, error } = useEMastercard(patientUuid, PDC_CARD_KEY);
  const { encounters: headers } = useCardEncounters(patientUuid, PDC_FORMS.header);

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
          title={card?.message ?? t('noPdcCard', 'This patient has no PDC patient card.')}
        />
      </div>
    );
  }

  const canEdit = card.state === 'CREATE' || card.state === 'EDIT';
  const header = headers.find((e) => e.uuid === card.initialEncounterUuid) ?? (headers.length === 1 ? headers[0] : null);
  const values = encounterValues(PDC_HEADER_FIELDS, header);
  const description = [
    t('pdcPatientCard', 'PDC patient card'),
    t('cardVersion', 'version {{version}}', { version: PDC_CARD_VERSION }),
    enrolmentText(card, t, formatDay),
  ]
    .filter(Boolean)
    .join(' · ');

  // the headline: what the child was referred for and enrolled with, their age at intake and where the program is
  const reasons = PDC_HEADER_SECTIONS.referral.fields.filter((f) => f.checkbox && values[f.name]).map((f) => f.label);
  const conditions = displayValue(byName('conditions'), values.conditions);
  const age =
    values.ageAtIntake_weeksUnit && values.ageAtIntake_weeks !== null
      ? t('ageInWeeks', '{{count}} weeks', { count: Number(values.ageAtIntake_weeks) })
      : values.ageAtIntake_monthsUnit && values.ageAtIntake_months !== null
        ? t('ageInMonths', '{{count}} months', { count: Number(values.ageAtIntake_months) })
        : null;
  const state = card.enrolment?.state;

  const section = (key: PdcHeaderSection) => (
    <HeaderSectionCard
      key={key}
      title={t(`pdcSection_${key}`, PDC_HEADER_SECTIONS[key].title)}
      fields={PDC_HEADER_SECTIONS[key].fields}
      header={header}
      canEdit={canEdit}
      onEdit={() => launchPdcPanel({ patientUuid, section: key })}
      onStart={() => launchPdcPanel({ patientUuid, section: 'start' })}
    />
  );

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
          title={t('startPdcCardFirst', 'Start the card first: its intake and referral details are recorded once, when the child joins the clinic.')}
        />
      )}

      <section aria-label={t('pdcAtAGlance', 'PDC at a glance')} className={styles.headlines}>
        <Headline label={t('pdcConditionsAtEnrolment', 'Conditions at enrolment')} value={conditions} />
        <Headline label={t('reasonsForReferral', 'Reasons for referral')} value={reasons.length ? reasons.join(', ') : null} />
        <Headline
          label={t('ageAtIntake', 'Age at intake')}
          value={age}
          detail={header ? t('intakeOn', 'Intake {{date}}', { date: formatDay(header.encounterDatetime) }) : null}
        />
        <Headline
          label={t('treatmentStatus', 'Treatment status')}
          value={state?.name ?? null}
          detail={state?.startDate ? t('sinceDate', 'Since {{date}}', { date: formatDay(state.startDate) }) : null}
        />
      </section>

      <div className={styles.cards}>{SECTIONS.map(section)}</div>
    </div>
  );
};

export default PdcCard;
