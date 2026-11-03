import React, { useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Button, TextInput } from '@carbon/react';
import { type EMastercardCard, launchFlowsheet } from '../emastercards.resource';
import { visitDetails } from './visit-details';
import styles from './emastercards.scss';

interface EMastercardRowProps {
  card: EMastercardCard;
  patientUuid: string;
}

/** One eMastercard: a button to create, edit or view it, or why it is not available */
const EMastercardRow: React.FC<EMastercardRowProps> = ({ card, patientUuid }) => {
  const { t } = useTranslation();
  const [encounterDate, setEncounterDate] = useState(dayjs().format('YYYY-MM-DD'));
  const readonlyNote = card.readonlyNote ? ` (${t('readonlyArtInitial', 'Readonly: ART Initial Encounter')})` : '';

  if (card.state === 'UNAVAILABLE') {
    return (
      <div className={styles.row}>
        <span className={styles.unavailable}>
          {card.message}
          {readonlyNote}
        </span>
      </div>
    );
  }

  if (card.state === 'CREATE') {
    return (
      <div className={styles.row}>
        <Button kind="ghost" size="sm" onClick={() => launchFlowsheet(card, patientUuid, { encounterDate })}>
          {t('createNew', 'Create new {{label}}', { label: card.label })}
        </Button>
        <TextInput
          id={`encounter-date-${card.key}`}
          className={styles.date}
          labelText={t('encounterDate', 'Encounter date')}
          hideLabel
          type="date"
          size="sm"
          value={encounterDate}
          onChange={(e) => setEncounterDate(e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className={styles.row}>
      <Button kind="ghost" size="sm" onClick={() => launchFlowsheet(card, patientUuid)}>
        {card.state === 'EDIT'
          ? t('edit', 'Edit {{label}}', { label: card.label })
          : t('view', 'View {{label}}', { label: card.label })}
      </Button>
      <span className={styles.details}>
        {card.created ? visitDetails(card) : null}
        {readonlyNote}
      </span>
      {card.state === 'VIEW' && card.message ? <span className={styles.note}>{card.message}</span> : null}
    </div>
  );
};

export default EMastercardRow;
