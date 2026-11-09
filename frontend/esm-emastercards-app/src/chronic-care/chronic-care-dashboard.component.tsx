import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCardGroup } from '../art/art.resource';
import { CARD_PARAM, cardName, CardGroupTabs, selectedCard, useCurrentUrl } from '../shared/card-group';
import LegacyCardPage from '../shared/legacy-card-page.component';
import { HTN_CARD_KEY } from './htn-concepts';
import HtnCard from './htn-card.component';
import { CLD_CARD_KEY } from './cld-concepts';
import CldCard from './cld-card.component';
import { CVD_CARD_KEY } from './cvd-concepts';
import CvdCard from './cvd-card.component';
import { CKD_CARD_KEY } from './ckd-concepts';
import CkdCard from './ckd-card.component';
import { SCD_CARD_KEY } from './scd-concepts';
import ScdCard from './scd-card.component';
import { NCO_CARD_KEY } from './nco-concepts';
import NcoCard from './nco-card.component';
import styles from '../care-page.scss';

/**
 * The Chronic Care Record page: the patient's chronic care cards as tabs, the hypertension and diabetes and chronic
 * lung disease cards natively and the others in their legacy flowsheet
 */
const ChronicCareDashboard: React.FC<{ patientUuid: string }> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { cards, inactive } = useCardGroup(patientUuid, HTN_CARD_KEY);
  const url = useCurrentUrl();
  const selected = selectedCard(cards, url.searchParams.get(CARD_PARAM), HTN_CARD_KEY);
  const title = t('chronicCareRecord', 'Chronic Care Record');
  // only the cards the patient has a state for in Enrolments, e.g. defaulted, not every chronic condition
  const lapsed = inactive.filter((c) => c.enrolment?.state);
  const tabs = (
    <div className={styles.tabsRow}>
      <CardGroupTabs
        patientUuid={patientUuid}
        path="chronicCare"
        cards={cards}
        selected={selected?.key ?? HTN_CARD_KEY}
        label={t('chronicCareCards', 'Chronic care cards')}
      />
      {lapsed.map((c) => (
        <span key={c.key} className={styles.detail}>
          {t('cardShowsWhen', '{{card}} shows only when it is a state on treatment/in advanced care in Enrolments', {
            card: t(`cardName_${c.key}`, cardName(c)),
          })}
        </span>
      ))}
    </div>
  );
  if (selected?.key === NCO_CARD_KEY) {
    return <NcoCard patientUuid={patientUuid} title={title} tabs={tabs} />;
  }
  if (selected?.key === SCD_CARD_KEY) {
    return <ScdCard patientUuid={patientUuid} title={title} tabs={tabs} />;
  }
  if (selected?.key === CKD_CARD_KEY) {
    return <CkdCard patientUuid={patientUuid} title={title} tabs={tabs} />;
  }
  if (selected?.key === CVD_CARD_KEY) {
    return <CvdCard patientUuid={patientUuid} title={title} tabs={tabs} />;
  }
  if (selected?.key === CLD_CARD_KEY) {
    return <CldCard patientUuid={patientUuid} title={title} tabs={tabs} />;
  }
  if (selected && selected.key !== HTN_CARD_KEY) {
    return <LegacyCardPage card={selected} patientUuid={patientUuid} title={title} tabs={tabs} />;
  }
  return <HtnCard patientUuid={patientUuid} title={title} tabs={tabs} />;
};

export default ChronicCareDashboard;
