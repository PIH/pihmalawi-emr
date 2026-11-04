import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardExtension, usePatient } from '@openmrs/esm-framework';
import { useEMastercard } from '../art/art.resource';
import { MH_CARD_KEY } from './mh-concepts';

/** The Mental health entry in the patient chart's left navigation, for patients with a mental health card */
const MentalHealthDashboardLink: React.FC<{ basePath: string; patientUuid?: string }> = ({ basePath, patientUuid }) => {
  const { patientUuid: chartPatientUuid } = usePatient();
  const { card } = useEMastercard(patientUuid ?? chartPatientUuid, MH_CARD_KEY);
  // every card is listed for every patient; the page is for those the card is available to
  if (!card || card.state === 'UNAVAILABLE') {
    return null;
  }
  return (
    <BrowserRouter>
      <DashboardExtension basePath={basePath} title="Mental health" path="mentalHealth" icon="omrs-icon-medication" />
    </BrowserRouter>
  );
};

export default MentalHealthDashboardLink;
