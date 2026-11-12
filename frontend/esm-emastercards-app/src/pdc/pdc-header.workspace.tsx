import React from 'react';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { type NcdHeaderConfig, NcdHeaderPanel } from '../shared/ncd-header-panel';
import { PDC_CARD_KEY, PDC_FORMS } from './pdc-concepts';
import { PDC_HEADER_SECTIONS, type PdcHeaderSection } from './pdc-fields';
import { applyPdcHeaderChange, checkPdcHeader } from './pdc-rules';

export interface PdcHeaderWorkspaceProps {
  patientUuid: string;
  section: PdcHeaderSection | 'start';
}

export const PDC_HEADER_CONFIG: NcdHeaderConfig = {
  cardKey: PDC_CARD_KEY,
  form: PDC_FORMS.header,
  sections: PDC_HEADER_SECTIONS,
  startSections: ['patientGuardian', 'referral', 'conditions'],
  i18nPrefix: 'pdcSection_',
  checkHeader: checkPdcHeader,
  applyChange: applyPdcHeaderChange,
  diagnosisNames: '',
  cardName: 'PDC eMastercard',
};

/**
 * Edits one section of the PDC eMastercard header (the single initial encounter pdc-emastercard.xml saves). Until the
 * header exists, the card is started with the patient and guardian details, the referral and the conditions at enrolment.
 */
const PdcHeaderWorkspace: React.FC<Workspace2DefinitionProps<PdcHeaderWorkspaceProps>> = (props) => (
  <NcdHeaderPanel {...props} config={PDC_HEADER_CONFIG} />
);

export default PdcHeaderWorkspace;
