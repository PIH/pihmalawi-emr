import React from 'react';
import { useTranslation } from 'react-i18next';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { ArtEncounterPanel } from '../art/art-encounter-panel';
import { checkRange } from '../shared/ncd';
import { CLD_CARD_KEY, CLD_FORMS } from './cld-concepts';
import { CLD_PEAK_FLOW_FIELDS } from './cld-fields';

export interface CldEncounterWorkspaceProps {
  patientUuid: string;
  encounterUuid?: string;
}

/** Records or edits a peak flow result as chronic-lung-disease-peak-flow.xml does */
const CldPeakFlowWorkspace: React.FC<Workspace2DefinitionProps<CldEncounterWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, encounterUuid },
}) => {
  const { t } = useTranslation();
  return (
    <ArtEncounterPanel
      form={CLD_FORMS.peakFlow}
      cardKey={CLD_CARD_KEY}
      patientUuid={patientUuid}
      encounterUuid={encounterUuid}
      title={{ record: t('recordPeakFlow', 'Record peak flow'), edit: t('editPeakFlow', 'Edit peak flow') }}
      fields={CLD_PEAK_FLOW_FIELDS}
      taggedLocations
      rules={(values) => ({ peakFlow: checkRange('peakFlow', values.peakFlow) })}
      live={['peakFlow']}
      closeWorkspace={closeWorkspace}
    />
  );
};

export default CldPeakFlowWorkspace;
