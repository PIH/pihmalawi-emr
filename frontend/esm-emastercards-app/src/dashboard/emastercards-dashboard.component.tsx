import React from 'react';
import { useTranslation } from 'react-i18next';
import { InlineLoading, InlineNotification } from '@carbon/react';
import { type EMastercardCard, useEMastercards } from '../emastercards.resource';
import EMastercardRow from './emastercard-row.component';
import styles from './emastercards.scss';

interface EMastercardsDashboardProps {
  patientUuid: string;
}

/** The patient's eMastercards, grouped as on the legacy patient dashboard */
const EMastercardsDashboard: React.FC<EMastercardsDashboardProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { cards, error, isLoading } = useEMastercards(patientUuid);

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

  const groups = new Map<string, Array<EMastercardCard>>();
  for (const card of cards) {
    groups.set(card.group, [...(groups.get(card.group) ?? []), card]);
  }

  return (
    <div className={styles.dashboard}>
      <h3 className={styles.title}>{t('emastercards', 'eMastercards')}</h3>
      {[...groups.entries()].map(([group, groupCards]) => {
        const headingId = `emastercard-group-${groupCards[0].key}`;
        return (
          <section key={group} className={styles.group} aria-labelledby={headingId}>
            <h4 id={headingId} className={styles.groupTitle}>
              {group}
            </h4>
            {groupCards.map((card) => (
              <EMastercardRow key={card.key} card={card} patientUuid={patientUuid} />
            ))}
          </section>
        );
      })}
    </div>
  );
};

export default EMastercardsDashboard;
