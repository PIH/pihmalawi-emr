import React from 'react';
import { useTranslation } from 'react-i18next';
import HivCareDashboard from '../art/hiv-care-dashboard.component';
import { CARD_PARAM, cardName, CardGroupTabs, selectedCard, useCurrentUrl } from '../shared/card-group';
import LegacyCardPage from '../shared/legacy-card-page.component';
import { TC_CARD_KEY } from '../teen-club/tc-concepts';
import TcCard from '../teen-club/tc-card.component';
import { EC_CARD_KEY } from '../exposed-child/ec-concepts';
import EcCard from '../exposed-child/ec-card.component';
import { useHivCards } from './hiv-cards';
import styles from '../care-page.scss';

/** The Enrolments state an HIV card is for, which its note names when the patient is not in it */
const HIV_CARD_STATES: Record<string, string> = {
  art: 'on antiretrovirals',
  'teen-club': 'Patient transfer in or First time initiation',
  'pre-art': 'Pre-ART (Continue)',
  'exposed-child': 'Exposed Child (Continue)',
};

/**
 * The HIV care page: the patient's HIV cards as tabs, the ART, teen club and exposed child cards natively and the
 * pre-ART card in its legacy flowsheet
 */
const HivCarePage: React.FC<{ patientUuid: string }> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { cards, inactive } = useHivCards(patientUuid);
  const url = useCurrentUrl();
  const selected = selectedCard(cards, url.searchParams.get(CARD_PARAM), 'art');
  const title = t('hivCare', 'HIV Care');
  const tabs = (
    <div className={styles.tabsRow}>
      <CardGroupTabs patientUuid={patientUuid} path="hivCare" cards={cards} selected={selected?.key ?? 'art'} label={t('hivCards', 'HIV cards')} />
      {inactive.map((c) => (
        <span key={c.key} className={styles.detail}>
          {HIV_CARD_STATES[c.key]
            ? t('cardShowsWhenState', '{{card}} shows only when it is a state {{state}} in Enrolments', {
                card: t(`cardName_${c.key}`, cardName(c)),
                state: t(`cardState_${c.key}`, HIV_CARD_STATES[c.key]),
              })
            : t('cardShowsWhen', '{{card}} shows only when it is a state on treatment/in advanced care in Enrolments', {
                card: t(`cardName_${c.key}`, cardName(c)),
              })}
        </span>
      ))}
    </div>
  );
  if (selected?.key === EC_CARD_KEY) {
    return <EcCard patientUuid={patientUuid} title={title} tabs={tabs} />;
  }
  if (selected?.key === TC_CARD_KEY) {
    return <TcCard patientUuid={patientUuid} title={title} tabs={tabs} />;
  }
  if (selected && selected.key !== 'art') {
    return <LegacyCardPage card={selected} patientUuid={patientUuid} title={title} tabs={tabs} />;
  }
  return <HivCareDashboard patientUuid={patientUuid} title={title} tabs={tabs} />;
};

export default HivCarePage;
