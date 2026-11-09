import React from 'react';
import { useTranslation } from 'react-i18next';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { ArtEncounterPanel } from '../art/art-encounter-panel';
import { HTN_CARD_KEY, HTN_FORMS } from './htn-concepts';
import { HTN_QUARTERLY_LAB_FIELDS } from './htn-fields';

export interface HtnLabsWorkspaceProps {
  patientUuid: string;
  encounterUuid?: string;
}

/**
 * Records or edits the quarterly laboratory tests as hypertension-and-diabetes-quarterly-laboratory-tests.xml does:
 * proteinuria and an HIV test, whose sample date is set to the test's date when it has a result
 */
const HtnQuarterlyLabsWorkspace: React.FC<Workspace2DefinitionProps<HtnLabsWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, encounterUuid },
}) => {
  const { t } = useTranslation();
  return (
    <ArtEncounterPanel
      form={HTN_FORMS.quarterlyLabs}
      cardKey={HTN_CARD_KEY}
      patientUuid={patientUuid}
      encounterUuid={encounterUuid}
      title={{
        record: t('recordQuarterlyLabs', 'Record quarterly laboratory tests'),
        edit: t('editQuarterlyLabs', 'Edit quarterly laboratory tests'),
      }}
      fields={HTN_QUARTERLY_LAB_FIELDS}
      taggedLocations
      prepare={(values, day) => ({
        ...values,
        hivSampleDate: values.hivResult ? day : null,
      })}
      closeWorkspace={closeWorkspace}
    />
  );
};

export default HtnQuarterlyLabsWorkspace;
