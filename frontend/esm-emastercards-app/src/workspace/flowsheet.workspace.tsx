import React, { useState } from 'react';
import { type Workspace2DefinitionProps, Workspace2 } from '@openmrs/esm-framework';
import { type EMastercardCard } from '../emastercards.resource';
import FlowsheetFrame from './flowsheet-frame.component';

export interface FlowsheetWorkspaceProps {
  card: EMastercardCard;
  patientUuid: string;
  url: string;
}

/** An eMastercard's flowsheet, in a panel of the patient chart */
const FlowsheetWorkspace: React.FC<Workspace2DefinitionProps<FlowsheetWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { card, url },
}) => {
  const [dirty, setDirty] = useState(false);
  return (
    <Workspace2 title={card.label} hasUnsavedChanges={dirty}>
      <FlowsheetFrame
        title={card.label}
        url={url}
        onDirtyChange={setDirty}
        onClose={() => closeWorkspace({ discardUnsavedChanges: true })}
      />
    </Workspace2>
  );
};

export default FlowsheetWorkspace;
