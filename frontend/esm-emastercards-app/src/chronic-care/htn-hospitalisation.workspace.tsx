import React from 'react';
import { useTranslation } from 'react-i18next';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { ArtEncounterPanel } from '../art/art-encounter-panel';
import { HTN_CARD_KEY, HTN_FORMS } from './htn-concepts';
import { HTN_HOSPITALISATION_FIELDS } from './htn-fields';
import { type HtnLabsWorkspaceProps } from './htn-quarterly-labs.workspace';

/**
 * Records or edits a hospitalisation as hypertension-and-diabetes-hospitalization-history.xml does; its date is the
 * date of discharge
 */
const HtnHospitalisationWorkspace: React.FC<Workspace2DefinitionProps<HtnLabsWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, encounterUuid },
}) => {
  const { t } = useTranslation();
  return (
    <ArtEncounterPanel
      form={HTN_FORMS.hospitalisation}
      cardKey={HTN_CARD_KEY}
      patientUuid={patientUuid}
      encounterUuid={encounterUuid}
      title={{
        record: t('recordHospitalisation', 'Record hospitalisation'),
        edit: t('editHospitalisation', 'Edit hospitalisation'),
      }}
      fields={HTN_HOSPITALISATION_FIELDS}
      taggedLocations
      closeWorkspace={closeWorkspace}
    />
  );
};

export default HtnHospitalisationWorkspace;
