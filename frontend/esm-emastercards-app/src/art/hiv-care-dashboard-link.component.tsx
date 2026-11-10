import React from 'react';
import { usePatient } from '@openmrs/esm-framework';
import { useHivCards } from '../hiv-care/hiv-cards';
import { CardGroupNav } from '../shared/card-group';

/**
 * The HIV Care entry in the patient chart's left navigation, for patients with an HIV card (ART, teen club, pre-ART,
 * exposed child). It expands to a link for each of the patient's cards, even only one, so the card is named, e.g. ART.
 */
const HivCareDashboardLink: React.FC<{ basePath: string; patientUuid?: string }> = ({ basePath, patientUuid }) => {
  const { patientUuid: chartPatientUuid } = usePatient();
  // every card is listed for every patient; the page is for those a card is available to
  const { cards } = useHivCards(patientUuid ?? chartPatientUuid);
  if (!cards.length) {
    return null;
  }
  return <CardGroupNav basePath={basePath} path="hivCare" title="HIV Care" icon="omrs-icon-medication" cards={cards} defaultKey="art" />;
};

export default HivCareDashboardLink;
