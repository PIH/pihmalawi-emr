import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardExtension, usePatient } from '@openmrs/esm-framework';
import { useCardGroup } from '../art/art.resource';
import { CardGroupNav } from '../shared/card-group';
import { PDC_CARD_KEY } from './pdc-concepts';
import { PDC_PATH } from './pdc-dashboard.component';

/**
 * The Pediatric Development entry in the patient chart's left navigation, for children with a card of the Pediatric
 * Development Clinic Record. With more than one (e.g. the PDC card and HIE / developmental delay), it expands to a link
 * for each card.
 */
const PdcDashboardLink: React.FC<{ basePath: string; patientUuid?: string }> = ({ basePath, patientUuid }) => {
  const { patientUuid: chartPatientUuid } = usePatient();
  const { cards } = useCardGroup(patientUuid ?? chartPatientUuid, PDC_CARD_KEY);
  if (!cards.length) {
    return null;
  }
  if (cards.length > 1) {
    return (
      <CardGroupNav
        basePath={basePath}
        path={PDC_PATH}
        title="Pediatric Development (PDC)"
        icon="omrs-icon-baby"
        cards={cards}
        defaultKey={PDC_CARD_KEY}
      />
    );
  }
  return (
    <BrowserRouter>
      <DashboardExtension basePath={basePath} title="Pediatric Development (PDC)" path={PDC_PATH} icon="omrs-icon-baby" />
    </BrowserRouter>
  );
};

export default PdcDashboardLink;
