import React from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { InlineNotification } from '@carbon/react';
import { formatDay } from '../art/art-fields';
import { type EMastercardCard, enrolmentText, flowsheetUrl } from '../emastercards.resource';
import FlowsheetFrame from '../workspace/flowsheet-frame.component';
import styles from '../care-page.scss';

interface LegacyCardPageProps {
  card: EMastercardCard;
  patientUuid: string;
  /** The chart page's title, e.g. Mental health */
  title: string;
  tabs?: React.ReactNode;
}

/**
 * A card that is not kept natively in O3 yet, on its group's chart page: its legacy flowsheet, embedded, under the
 * page's heading and tabs
 */
const LegacyCardPage: React.FC<LegacyCardPageProps> = ({ card, title, tabs }) => {
  const { t } = useTranslation();
  const description = [card.label, enrolmentText(card, t, formatDay)].filter(Boolean).join(' · ');
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
      {card.state === 'VIEW' && card.message && <InlineNotification kind="info" lowContrast hideCloseButton title={card.message} />}
      <FlowsheetFrame
        title={card.label}
        url={flowsheetUrl(card, card.state === 'CREATE' ? { encounterDate: dayjs().format('YYYY-MM-DD') } : {})}
        onDirtyChange={() => {}}
        onClose={() => {}}
      />
    </div>
  );
};

export default LegacyCardPage;
