import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardExtension, usePatient } from '@openmrs/esm-framework';
import { useArtCard } from './art.resource';

/** The HIV care entry in the patient chart's left navigation, for patients with an ART patient card */
const HivCareDashboardLink: React.FC<{ basePath: string; patientUuid?: string }> = ({ basePath, patientUuid }) => {
  const { patientUuid: chartPatientUuid } = usePatient();
  const { card } = useArtCard(patientUuid ?? chartPatientUuid);
  // every card is listed for every patient; the page is for those the card is available to
  if (!card || card.state === 'UNAVAILABLE') {
    return null;
  }
  return (
    <BrowserRouter>
      <DashboardExtension basePath={basePath} title="HIV care" path="hivCare" icon="omrs-icon-medication" />
    </BrowserRouter>
  );
};

export default HivCareDashboardLink;
