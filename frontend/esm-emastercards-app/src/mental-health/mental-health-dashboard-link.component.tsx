import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardExtension, usePatient } from '@openmrs/esm-framework';
import { useCardGroup } from '../art/art.resource';
import { CardGroupNav } from '../shared/card-group';
import { MH_CARD_KEY } from './mh-concepts';

/**
 * The Mental health entry in the patient chart's left navigation, for patients with a card of the Mental Health
 * Record. With more than one (mental health and epilepsy), it expands to a link for each card.
 */
const MentalHealthDashboardLink: React.FC<{ basePath: string; patientUuid?: string }> = ({ basePath, patientUuid }) => {
  const { patientUuid: chartPatientUuid } = usePatient();
  // every card is listed for every patient; the page is for those a card is available to
  const { cards } = useCardGroup(patientUuid ?? chartPatientUuid, MH_CARD_KEY);
  if (!cards.length) {
    return null;
  }
  if (cards.length > 1) {
    // titled by the record the cards belong to, the Mental Health Record
    return <CardGroupNav basePath={basePath} path="mentalHealth" title={cards[0].group} icon="omrs-icon-medication" cards={cards} defaultKey={MH_CARD_KEY} />;
  }
  return (
    <BrowserRouter>
      <DashboardExtension basePath={basePath} title="Mental Health" path="mentalHealth" icon="omrs-icon-medication" />
    </BrowserRouter>
  );
};

export default MentalHealthDashboardLink;
