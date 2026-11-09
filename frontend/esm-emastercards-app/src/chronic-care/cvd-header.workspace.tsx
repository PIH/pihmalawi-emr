import React from 'react';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { type NcdHeaderConfig, NcdHeaderPanel } from '../shared/ncd-header-panel';
import { CVD_CARD_KEY, CVD_FORMS } from './cvd-concepts';
import { CVD_HEADER_SECTIONS, type CvdHeaderSection } from './cvd-fields';
import { checkCvdHeader } from './cvd-rules';

export interface CvdHeaderWorkspaceProps {
  patientUuid: string;
  section: CvdHeaderSection | 'start';
}

export const CVD_HEADER_CONFIG: NcdHeaderConfig = {
  cardKey: CVD_CARD_KEY,
  form: CVD_FORMS.header,
  sections: CVD_HEADER_SECTIONS,
  startSections: ['patientGuardian', 'diagnoses'],
  i18nPrefix: 'cvdSection_',
  checkHeader: checkCvdHeader,
  diagnosisNames: '',
  cardName: 'Cardiac and Vascular Disease eMastercard',
};

/**
 * Edits one section of the Cardiac and Vascular Disease eMastercard header (the single initial encounter
 * cardiac-and-vascular-disease-emastercard.xml saves). Until the header exists, the card is started with the patient
 * and guardian details and the diagnoses.
 */
const CvdHeaderWorkspace: React.FC<Workspace2DefinitionProps<CvdHeaderWorkspaceProps>> = (props) => (
  <NcdHeaderPanel {...props} config={CVD_HEADER_CONFIG} />
);

export default CvdHeaderWorkspace;
