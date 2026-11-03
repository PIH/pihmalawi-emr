import React, { useState } from 'react';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification, Link } from '@carbon/react';
import { openmrsFetch, restBaseUrl, type Workspace2DefinitionProps, Workspace2 } from '@openmrs/esm-framework';
import { type EMastercardCard, flowsheetUrl, useEMastercards } from '../emastercards.resource';
import { findCardsForEncounter } from './find-cards-for-encounter';
import FlowsheetFrame from './flowsheet-frame.component';
import styles from './flowsheet.scss';

interface EncounterEditWorkspaceProps {
  form?: { uuid: string } | null;
  encounterUuid: string;
}

interface EncounterEditGroupProps {
  patientUuid: string;
}

interface Encounter {
  uuid: string;
  form: { uuid: string } | null;
  encounterType: { uuid: string } | null;
}

/**
 * Takes the place of the chart's form entry workspace, which "Edit this encounter" opens: Malawi encounters are
 * edited in the eMastercard they belong to, so this opens that eMastercard's flowsheet
 */
const EncounterEditWorkspace: React.FC<
  Workspace2DefinitionProps<EncounterEditWorkspaceProps, object, EncounterEditGroupProps>
> = ({ closeWorkspace, workspaceProps: { encounterUuid }, groupProps }) => {
  const { t } = useTranslation();
  const patientUuid = groupProps?.patientUuid;
  const { data: encounter, error: encounterError } = useSWR(
    encounterUuid ? `${restBaseUrl}/encounter/${encounterUuid}?v=custom:(uuid,form:(uuid),encounterType:(uuid))` : null,
    (url: string) => openmrsFetch<Encounter>(url).then((res) => res.data),
  );
  const { cards, isLoading, error } = useEMastercards(patientUuid);
  const [chosen, setChosen] = useState<EMastercardCard | null>(null);
  const [dirty, setDirty] = useState(false);
  const close = () => closeWorkspace({ discardUnsavedChanges: true });

  const matches = encounter ? findCardsForEncounter(encounter, cards) : [];
  const selected = chosen ?? (matches.length === 1 ? matches[0] : null);

  let content: React.ReactNode;
  if (encounterError || error) {
    content = (
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title={t('loadError', 'Could not load the eMastercards')}
        subtitle={(encounterError ?? error)?.message}
      />
    );
  } else if (!encounter || isLoading) {
    content = <InlineLoading description={t('loading', 'Loading...')} />;
  } else if (selected) {
    content = (
      <FlowsheetFrame title={selected.label} url={flowsheetUrl(selected)} onClose={close} onDirtyChange={setDirty} />
    );
  } else if (matches.length > 1) {
    content = (
      <div className={styles.message}>
        <p>{t('chooseEMastercard', 'This encounter is on more than one eMastercard. Which one should open?')}</p>
        {matches.map((card) => (
          <Button key={card.key} kind="ghost" onClick={() => setChosen(card)}>
            {card.label}
          </Button>
        ))}
      </div>
    );
  } else {
    content = (
      <div className={styles.message}>
        <p>
          {t(
            'cannotEditHere',
            "This encounter can't be edited here, because it isn't on any of the patient's eMastercards.",
          )}
        </p>
        <Link href={`${window.openmrsBase}/patientDashboard.form?patientId=${patientUuid}`}>
          {t('openPatientDashboard', 'Open the patient dashboard')}
        </Link>
      </div>
    );
  }

  return (
    <Workspace2 title={selected?.label ?? t('editEncounter', 'Edit encounter')} hasUnsavedChanges={dirty}>
      {content}
    </Workspace2>
  );
};

export default EncounterEditWorkspace;
