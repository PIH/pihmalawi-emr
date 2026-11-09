import React from 'react';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { type NcdHeaderConfig, NcdHeaderPanel } from '../shared/ncd-header-panel';
import { CKD_CARD_KEY, CKD_FORMS } from './ckd-concepts';
import { CKD_HEADER_SECTIONS, type CkdHeaderSection } from './ckd-fields';
import { checkCkdHeader } from './ckd-rules';

export interface CkdHeaderWorkspaceProps {
  patientUuid: string;
  section: CkdHeaderSection | 'start';
}

export const CKD_HEADER_CONFIG: NcdHeaderConfig = {
  cardKey: CKD_CARD_KEY,
  form: CKD_FORMS.header,
  sections: CKD_HEADER_SECTIONS,
  startSections: ['patientGuardian', 'etiology', 'diagnoses'],
  i18nPrefix: 'ckdSection_',
  checkHeader: checkCkdHeader,
  diagnosisNames: '',
  cardName: 'Chronic Kidney Disease eMastercard',
};

/**
 * Edits one section of the Chronic Kidney Disease eMastercard header (the single initial encounter
 * chronic-kidney-disease-emastercard.xml saves). Until the header exists, the card is started with the patient and
 * guardian details, the presumed etiology and the diagnoses.
 */
const CkdHeaderWorkspace: React.FC<Workspace2DefinitionProps<CkdHeaderWorkspaceProps>> = (props) => (
  <NcdHeaderPanel {...props} config={CKD_HEADER_CONFIG} />
);

export default CkdHeaderWorkspace;
