import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardExtension, usePatient } from '@openmrs/esm-framework';
import { useHivCards } from '../hiv-care/hiv-cards';
import { CardGroupNav } from '../shared/card-group';

/**
 * The HIV care entry in the patient chart's left navigation, for patients with an HIV card (ART, teen club, pre-ART,
 * exposed child). With more than one, it expands to a link for each card.
 */
const HivCareDashboardLink: React.FC<{ basePath: string; patientUuid?: string }> = ({ basePath, patientUuid }) => {
  const { patientUuid: chartPatientUuid } = usePatient();
  // every card is listed for every patient; the page is for those a card is available to
  const { cards } = useHivCards(patientUuid ?? chartPatientUuid);
  if (!cards.length) {
    return null;
  }
  if (cards.length > 1) {
    return <CardGroupNav basePath={basePath} path="hivCare" title="HIV care" icon="omrs-icon-medication" cards={cards} defaultKey="art" />;
  }
  return (
    <BrowserRouter>
      <DashboardExtension basePath={basePath} title="HIV care" path="hivCare" icon="omrs-icon-medication" />
    </BrowserRouter>
  );
};

export default HivCareDashboardLink;
