import React from 'react';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { type NcdHeaderConfig, NcdHeaderPanel } from '../shared/ncd-header-panel';
import { HIE_CARD_KEY, HIE_FORMS } from './hie-concepts';
import { HIE_HEADER_SECTIONS, type HieHeaderSection } from './hie-fields';
import { checkHieHeader } from './hie-rules';

export interface HieHeaderWorkspaceProps {
  patientUuid: string;
  section: HieHeaderSection | 'start';
}

export const HIE_HEADER_CONFIG: NcdHeaderConfig = {
  cardKey: HIE_CARD_KEY,
  form: HIE_FORMS.header,
  sections: HIE_HEADER_SECTIONS,
  startSections: ['patientGuardian', 'overview'],
  i18nPrefix: 'hieSection_',
  checkHeader: checkHieHeader,
  diagnosisNames: '',
  cardName: 'PDC Developmental Delay eMastercard',
};

/**
 * Edits one section of the HIE / Developmental Delay eMastercard header (the single initial encounter
 * pdc-developmental-delay-emastercard.xml saves). Until the header exists, the card is started with both sections.
 */
const HieHeaderWorkspace: React.FC<Workspace2DefinitionProps<HieHeaderWorkspaceProps>> = (props) => (
  <NcdHeaderPanel {...props} config={HIE_HEADER_CONFIG} />
);

export default HieHeaderWorkspace;
