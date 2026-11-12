import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCardGroup } from '../art/art.resource';
import { CARD_PARAM, CardGroupTabs, selectedCard, useCurrentUrl } from '../shared/card-group';
import LegacyCardPage from '../shared/legacy-card-page.component';
import { PDC_CARD_KEY } from './pdc-concepts';
import PdcCard from './pdc-card.component';
import styles from '../care-page.scss';

/** The page's path in the patient chart */
export const PDC_PATH = 'pediatricDevelopment';

/**
 * The Pediatric Development Clinic Record page: the patient's PDC cards as tabs, the PDC card natively and the
 * condition cards (HIE / developmental delay, trisomy 21, cleft lip / palate, other diagnosis) in their legacy flowsheet
 */
const PdcDashboard: React.FC<{ patientUuid: string }> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { cards } = useCardGroup(patientUuid, PDC_CARD_KEY);
  const url = useCurrentUrl();
  const selected = selectedCard(cards, url.searchParams.get(CARD_PARAM), PDC_CARD_KEY);
  const title = t('pdcRecord', 'Pediatric Development (PDC)');
  const tabs = (
    <div className={styles.tabsRow}>
      <CardGroupTabs
        patientUuid={patientUuid}
        path={PDC_PATH}
        cards={cards}
        selected={selected?.key ?? PDC_CARD_KEY}
        label={t('pdcCards', 'PDC cards')}
      />
    </div>
  );
  if (selected && selected.key !== PDC_CARD_KEY) {
    return <LegacyCardPage card={selected} patientUuid={patientUuid} title={title} tabs={tabs} />;
  }
  return <PdcCard patientUuid={patientUuid} title={title} tabs={tabs} />;
};

export default PdcDashboard;
