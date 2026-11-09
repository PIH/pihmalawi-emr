import React from 'react';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { type NcdHeaderConfig, NcdHeaderPanel } from '../shared/ncd-header-panel';
import { CLD_CARD_KEY, CLD_FORMS } from './cld-concepts';
import { CLD_HEADER_SECTIONS, type CldHeaderSection } from './cld-fields';
import { checkCldHeader } from './cld-rules';

export interface CldHeaderWorkspaceProps {
  patientUuid: string;
  section: CldHeaderSection | 'start';
}

export const CLD_HEADER_CONFIG: NcdHeaderConfig = {
  cardKey: CLD_CARD_KEY,
  form: CLD_FORMS.header,
  sections: CLD_HEADER_SECTIONS,
  startSections: ['patientGuardian', 'diagnoses'],
  i18nPrefix: 'cldSection_',
  checkHeader: checkCldHeader,
  diagnosisNames: 'Asthma or COPD',
  cardName: 'Chronic Lung Disease eMastercard',
};

/**
 * Edits one section of the Chronic Lung Disease eMastercard header (the single initial encounter
 * chronic-lung-disease-emastercard.xml saves). Until the header exists, the card is started with the patient and
 * guardian details and the diagnoses.
 */
const CldHeaderWorkspace: React.FC<Workspace2DefinitionProps<CldHeaderWorkspaceProps>> = (props) => (
  <NcdHeaderPanel {...props} config={CLD_HEADER_CONFIG} />
);

export default CldHeaderWorkspace;
