import React from 'react';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { type NcdHeaderConfig, NcdHeaderPanel } from '../shared/ncd-header-panel';
import { TC_CARD_KEY, TC_FORMS } from './tc-concepts';
import { TC_HEADER_SECTIONS, type TcHeaderSection } from './tc-fields';
import { applyTcHeaderChange, checkTcHeader } from './tc-rules';

export interface TcHeaderWorkspaceProps {
  patientUuid: string;
  section: TcHeaderSection | 'start';
}

export const TC_HEADER_CONFIG: NcdHeaderConfig = {
  cardKey: TC_CARD_KEY,
  form: TC_FORMS.header,
  sections: TC_HEADER_SECTIONS,
  startSections: ['patientGuardian'],
  i18nPrefix: 'tcSection_',
  checkHeader: checkTcHeader,
  applyChange: applyTcHeaderChange,
  diagnosisNames: '',
  cardName: 'Teen Club eMastercard',
};

/**
 * Edits the Teen Club eMastercard header, the intake / referral form (the single initial encounter
 * teen-club-emastercard.xml saves): the patient and guardian details, with the age at intake
 */
const TcHeaderWorkspace: React.FC<Workspace2DefinitionProps<TcHeaderWorkspaceProps>> = (props) => (
  <NcdHeaderPanel {...props} config={TC_HEADER_CONFIG} />
);

export default TcHeaderWorkspace;
