import React from 'react';
import { useTranslation } from 'react-i18next';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { FOLLOW_UP_FIELDS } from './art-fields';
import { ArtEncounterPanel } from './art-encounter-panel';

export interface FollowUpTestingWorkspaceProps {
  patientUuid: string;
  encounterUuid?: string;
}

/** Records or edits ART follow-up tests (PHQ-9, CD4 and glucose) as art-follow-up-testing.xml does */
const FollowUpTestingWorkspace: React.FC<Workspace2DefinitionProps<FollowUpTestingWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, encounterUuid },
}) => {
  const { t } = useTranslation();
  return (
    <ArtEncounterPanel
      kind="followUpTesting"
      patientUuid={patientUuid}
      encounterUuid={encounterUuid}
      title={{ record: t('recordFollowUpTests', 'Record follow-up tests'), edit: t('editFollowUpTests', 'Edit follow-up tests') }}
      fields={FOLLOW_UP_FIELDS}
      taggedLocations
      closeWorkspace={closeWorkspace}
    />
  );
};

export default FollowUpTestingWorkspace;
