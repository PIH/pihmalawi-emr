import React from 'react';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { type NcdHeaderConfig, NcdHeaderPanel } from '../shared/ncd-header-panel';
import { NCO_CARD_KEY, NCO_FORMS } from './nco-concepts';
import { NCO_HEADER_SECTIONS, type NcoHeaderSection } from './nco-fields';
import { checkNcoHeader } from './nco-rules';

export interface NcoHeaderWorkspaceProps {
  patientUuid: string;
  section: NcoHeaderSection | 'start';
}

export const NCO_HEADER_CONFIG: NcdHeaderConfig = {
  cardKey: NCO_CARD_KEY,
  form: NCO_FORMS.header,
  sections: NCO_HEADER_SECTIONS,
  startSections: ['patientGuardian', 'diagnoses'],
  i18nPrefix: 'ncoSection_',
  checkHeader: checkNcoHeader,
  diagnosisNames: '',
  cardName: 'NCD Other eMastercard',
};

/**
 * Edits one section of the NCD Other eMastercard header (the single initial encounter ncd-other-emastercard.xml saves).
 * Until the header exists, the card is started with the patient and guardian details and the diagnoses, at least one
 * of which is required.
 */
const NcoHeaderWorkspace: React.FC<Workspace2DefinitionProps<NcoHeaderWorkspaceProps>> = (props) => (
  <NcdHeaderPanel {...props} config={NCO_HEADER_CONFIG} />
);

export default NcoHeaderWorkspace;
