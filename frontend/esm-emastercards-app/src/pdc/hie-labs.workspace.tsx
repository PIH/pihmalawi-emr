import React from 'react';
import { useTranslation } from 'react-i18next';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { ArtEncounterPanel } from '../art/art-encounter-panel';
import { type NcdEncounterWorkspaceProps } from '../shared/ncd-encounter-workspace';
import { HIE_CARD_KEY, HIE_FORMS } from './hie-concepts';
import { HIE_LAB_FIELDS } from './hie-fields';
import { checkHieLabs } from './hie-rules';

/**
 * Records or edits the HIE / developmental delay card's laboratory tests natively, saving what
 * hie-developmental-delay-lab-tests.xml does: HB on its own date, the TSH construct and another test's construct
 */
const HieLabsWorkspace: React.FC<Workspace2DefinitionProps<NcdEncounterWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, encounterUuid },
}) => {
  const { t } = useTranslation();
  return (
    <ArtEncounterPanel
      form={HIE_FORMS.labs}
      cardKey={HIE_CARD_KEY}
      patientUuid={patientUuid}
      encounterUuid={encounterUuid}
      title={{ record: t('recordLabTests', 'Record laboratory tests'), edit: t('editLabTests', 'Edit laboratory tests') }}
      fields={HIE_LAB_FIELDS}
      taggedLocations
      rules={(values) => checkHieLabs(HIE_LAB_FIELDS, values)}
      closeWorkspace={closeWorkspace}
    />
  );
};

export default HieLabsWorkspace;
