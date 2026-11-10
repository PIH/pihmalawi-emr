import React from 'react';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { type NcdHeaderConfig, NcdHeaderPanel } from '../shared/ncd-header-panel';
import { EC_CARD_KEY, EC_FORMS } from './ec-concepts';
import { EC_HEADER_SECTIONS, type EcHeaderSection } from './ec-fields';
import { applyEcHeaderChange, checkEcHeader } from './ec-rules';

export interface EcHeaderWorkspaceProps {
  patientUuid: string;
  section: EcHeaderSection | 'start';
}

export const EC_HEADER_CONFIG: NcdHeaderConfig = {
  cardKey: EC_CARD_KEY,
  form: EC_FORMS.header,
  sections: EC_HEADER_SECTIONS,
  startSections: ['patientGuardian', 'status'],
  i18nPrefix: 'ecSection_',
  checkHeader: checkEcHeader,
  applyChange: applyEcHeaderChange,
  diagnosisNames: '',
  cardName: 'Exposed Child eMastercard',
};

/**
 * Edits one section of the Exposed Child eMastercard header (the single initial encounter exposed-child-emastercard.xml
 * saves). Until the header exists, the card is started with the child and guardian details and the status at enrolment.
 */
const EcHeaderWorkspace: React.FC<Workspace2DefinitionProps<EcHeaderWorkspaceProps>> = (props) => (
  <NcdHeaderPanel {...props} config={EC_HEADER_CONFIG} />
);

export default EcHeaderWorkspace;
