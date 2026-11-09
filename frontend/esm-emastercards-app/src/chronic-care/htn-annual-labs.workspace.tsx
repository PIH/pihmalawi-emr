import React from 'react';
import { useTranslation } from 'react-i18next';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { ArtEncounterPanel } from '../art/art-encounter-panel';
import { HTN_CARD_KEY, HTN_FORMS } from './htn-concepts';
import { HTN_ANNUAL_LAB_FIELDS } from './htn-fields';
import { type HtnLabsWorkspaceProps } from './htn-quarterly-labs.workspace';

/**
 * Records or edits the annual laboratory tests as hypertension-and-diabetes-annual-laboratory-tests.xml does: ECG,
 * creatinine (shown from a result recorded the same day, as its obsreference does), lipid profile and fundoscopy
 */
const HtnAnnualLabsWorkspace: React.FC<Workspace2DefinitionProps<HtnLabsWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, encounterUuid },
}) => {
  const { t } = useTranslation();
  return (
    <ArtEncounterPanel
      form={HTN_FORMS.annualLabs}
      cardKey={HTN_CARD_KEY}
      patientUuid={patientUuid}
      encounterUuid={encounterUuid}
      title={{
        record: t('recordAnnualLabs', 'Record annual laboratory tests'),
        edit: t('editAnnualLabs', 'Edit annual laboratory tests'),
      }}
      fields={HTN_ANNUAL_LAB_FIELDS}
      taggedLocations
      closeWorkspace={closeWorkspace}
    />
  );
};

export default HtnAnnualLabsWorkspace;
