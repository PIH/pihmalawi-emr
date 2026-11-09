import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardExtension, usePatient } from '@openmrs/esm-framework';
import { useCardGroup } from '../art/art.resource';
import { CardGroupNav } from '../shared/card-group';
import { HTN_CARD_KEY } from './htn-concepts';

/**
 * The Chronic Care entry in the patient chart's left navigation, for patients with a card of the Chronic Care Record.
 * With more than one (e.g. hypertension and diabetes, and chronic lung disease), it expands to a link for each card.
 */
const ChronicCareDashboardLink: React.FC<{
  basePath: string;
  patientUuid?: string;
}> = ({ basePath, patientUuid }) => {
  const { patientUuid: chartPatientUuid } = usePatient();
  const { cards } = useCardGroup(patientUuid ?? chartPatientUuid, HTN_CARD_KEY);
  if (!cards.length) {
    return null;
  }
  if (cards.length > 1) {
    return (
      <CardGroupNav basePath={basePath} path="chronicCare" title={cards[0].group} icon="omrs-icon-activity" cards={cards} defaultKey={HTN_CARD_KEY} />
    );
  }
  return (
    <BrowserRouter>
      <DashboardExtension basePath={basePath} title="Chronic Care" path="chronicCare" icon="omrs-icon-activity" />
    </BrowserRouter>
  );
};

export default ChronicCareDashboardLink;
