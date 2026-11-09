import React from 'react';
import { useTranslation } from 'react-i18next';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { ArtEncounterPanel } from '../art/art-encounter-panel';
import { CLD_CARD_KEY, CLD_FORMS } from './cld-concepts';
import { CLD_HOSPITALISATION_FIELDS } from './cld-fields';
import { type CldEncounterWorkspaceProps } from './cld-peak-flow.workspace';

/** Records or edits a hospitalisation as chronic-lung-disease-hospitalization.xml does; its date is the date of discharge */
const CldHospitalisationWorkspace: React.FC<Workspace2DefinitionProps<CldEncounterWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, encounterUuid },
}) => {
  const { t } = useTranslation();
  return (
    <ArtEncounterPanel
      form={CLD_FORMS.hospitalisation}
      cardKey={CLD_CARD_KEY}
      patientUuid={patientUuid}
      encounterUuid={encounterUuid}
      title={{ record: t('recordHospitalisation', 'Record hospitalisation'), edit: t('editHospitalisation', 'Edit hospitalisation') }}
      fields={CLD_HOSPITALISATION_FIELDS}
      taggedLocations
      closeWorkspace={closeWorkspace}
    />
  );
};

export default CldHospitalisationWorkspace;
