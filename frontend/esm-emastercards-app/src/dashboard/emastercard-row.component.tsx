import React, { useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Button, TextInput } from '@carbon/react';
import { navigate } from '@openmrs/esm-framework';
import { type EMastercardCard, launchFlowsheet } from '../emastercards.resource';
import { visitDetails } from './visit-details';
import styles from './emastercards.scss';

/** The cards kept natively in O3, by key: the chart page each one opens */
const NATIVE_PAGES: Record<string, { path: string; labelKey: string; label: string }> = {
  art: { path: 'hivCare', labelKey: 'openHivCare', label: 'Open HIV care' },
  'mental-health': { path: 'mentalHealth', labelKey: 'openMentalHealth', label: 'Open mental health' },
  epilepsy: { path: 'mentalHealth?card=epilepsy', labelKey: 'openEpilepsy', label: 'Open epilepsy' },
  'htn-dm': { path: 'chronicCare?card=htn-dm', labelKey: 'openHtnDm', label: 'Open hypertension and diabetes' },
};

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

  // The ART, mental health and epilepsy cards are kept natively in O3, on their chart pages; their legacy flowsheets stay
  // reachable for the pilot
  const page = NATIVE_PAGES[card.key];
  if (page) {
    return (
      <div className={styles.row}>
        <Button kind="ghost" size="sm" onClick={() => navigate({ to: `\${openmrsSpaBase}/patient/${patientUuid}/chart/${page.path}` })}>
          {t(page.labelKey, page.label)}
        </Button>
        <span className={styles.details}>
          {card.created ? visitDetails(card) : null}
          {readonlyNote}
        </span>
        <Button
          kind="ghost"
          size="sm"
          onClick={() => launchFlowsheet(card, patientUuid, card.state === 'CREATE' ? { encounterDate } : {})}
        >
          {t('openLegacyCard', 'Open legacy card')}
        </Button>
        {card.state === 'VIEW' && card.message ? <span className={styles.note}>{card.message}</span> : null}
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
