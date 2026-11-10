import React from 'react';
import { useTranslation } from 'react-i18next';
import HivCareDashboard from '../art/hiv-care-dashboard.component';
import { CARD_PARAM, cardName, CardGroupTabs, selectedCard, useCurrentUrl } from '../shared/card-group';
import LegacyCardPage from '../shared/legacy-card-page.component';
import { TC_CARD_KEY } from '../teen-club/tc-concepts';
import TcCard from '../teen-club/tc-card.component';
import { useHivCards } from './hiv-cards';
import styles from '../care-page.scss';

/**
 * The HIV care page: the patient's HIV cards as tabs, the ART and teen club cards natively and the others (pre-ART,
 * exposed child) in their legacy flowsheet
 */
const HivCarePage: React.FC<{ patientUuid: string }> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { cards, inactive } = useHivCards(patientUuid);
  const url = useCurrentUrl();
  const selected = selectedCard(cards, url.searchParams.get(CARD_PARAM), 'art');
  const title = t('hivCare', 'HIV care');
  const tabs = (
    <div className={styles.tabsRow}>
      <CardGroupTabs patientUuid={patientUuid} path="hivCare" cards={cards} selected={selected?.key ?? 'art'} label={t('hivCards', 'HIV cards')} />
      {inactive.map((c) => (
        <span key={c.key} className={styles.detail}>
          {t('cardShowsWhen', '{{card}} shows only when it is a state on treatment/in advanced care in Enrolments', {
            card: t(`cardName_${c.key}`, cardName(c)),
          })}
        </span>
      ))}
    </div>
  );
  if (selected?.key === TC_CARD_KEY) {
    return <TcCard patientUuid={patientUuid} title={title} tabs={tabs} />;
  }
  if (selected && selected.key !== 'art') {
    return <LegacyCardPage card={selected} patientUuid={patientUuid} title={title} tabs={tabs} />;
  }
  return <HivCareDashboard patientUuid={patientUuid} title={title} tabs={tabs} />;
};

export default HivCarePage;
