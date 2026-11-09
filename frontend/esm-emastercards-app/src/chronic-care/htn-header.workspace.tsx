import React from 'react';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { type NcdHeaderConfig, NcdHeaderPanel } from '../shared/ncd-header-panel';
import { HTN_CARD_KEY, HTN_FORMS } from './htn-concepts';
import { HTN_HEADER_SECTIONS, type HtnHeaderSection } from './htn-fields';
import { applyHeaderChange, checkHeader } from './htn-rules';

export interface HtnHeaderWorkspaceProps {
  patientUuid: string;
  section: HtnHeaderSection | 'start';
}

export const HTN_HEADER_CONFIG: NcdHeaderConfig = {
  cardKey: HTN_CARD_KEY,
  form: HTN_FORMS.header,
  sections: HTN_HEADER_SECTIONS,
  startSections: ['patientGuardian', 'diagnoses'],
  i18nPrefix: 'htnSection_',
  checkHeader,
  applyChange: applyHeaderChange,
  diagnosisNames: 'Type 1 DM, Type 2 DM or Hypertension',
  cardName: 'Hypertension and Diabetes eMastercard',
};

/**
 * Edits one section of the Hypertension and Diabetes eMastercard header (the single initial encounter
 * hypertension-and-diabetes-emastercard.xml saves). Until the header exists, the card is started with the patient and
 * guardian details and the diagnoses.
 */
const HtnHeaderWorkspace: React.FC<Workspace2DefinitionProps<HtnHeaderWorkspaceProps>> = (props) => (
  <NcdHeaderPanel {...props} config={HTN_HEADER_CONFIG} />
);

export default HtnHeaderWorkspace;
