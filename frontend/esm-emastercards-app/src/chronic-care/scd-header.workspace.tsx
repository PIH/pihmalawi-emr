import React from 'react';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { type NcdHeaderConfig, NcdHeaderPanel } from '../shared/ncd-header-panel';
import { SCD_CARD_KEY, SCD_FORMS } from './scd-concepts';
import { SCD_FIXED_VALUES, SCD_HEADER_SECTIONS, type ScdHeaderSection } from './scd-fields';
import { checkScdHeader } from './scd-rules';

export interface ScdHeaderWorkspaceProps {
  patientUuid: string;
  section: ScdHeaderSection | 'start';
}

export const SCD_HEADER_CONFIG: NcdHeaderConfig = {
  cardKey: SCD_CARD_KEY,
  form: SCD_FORMS.header,
  sections: SCD_HEADER_SECTIONS,
  startSections: ['patientGuardian', 'diagnosis'],
  i18nPrefix: 'scdSection_',
  checkHeader: checkScdHeader,
  diagnosisNames: '',
  cardName: 'Sickle Cell Disease eMastercard',
  fixed: SCD_FIXED_VALUES,
};

/**
 * Edits one section of the Sickle Cell Disease eMastercard header (the single initial encounter
 * sickle-cell-disease-emastercard.xml saves). Until the header exists, the card is started with the patient and
 * guardian details and the diagnosis, whose date is required.
 */
const ScdHeaderWorkspace: React.FC<Workspace2DefinitionProps<ScdHeaderWorkspaceProps>> = (props) => (
  <NcdHeaderPanel {...props} config={SCD_HEADER_CONFIG} />
);

export default ScdHeaderWorkspace;
