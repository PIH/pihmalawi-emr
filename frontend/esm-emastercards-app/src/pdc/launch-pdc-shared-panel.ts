import { useCallback } from 'react';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { type PdcSharedForm } from './pdc-shared-forms';

/** One panel for every form the PDC condition cards share, told which form by its props */
export const PDC_SHARED_WORKSPACE = 'pihmalawi-pdc-shared-workspace';

/** Opens a shared PDC form's panel on an encounter that exists */
export function launchPdcSharedPanel(props: { patientUuid: string; form: PdcSharedForm; cardKey: string; encounterUuid: string }) {
  launchWorkspace2(PDC_SHARED_WORKSPACE, props);
}

/** Opens a shared PDC form's panel for a new encounter, in an O3 visit: when there is none the chart first asks to start one */
export function useLaunchPdcSharedPanel(patientUuid: string, cardKey: string) {
  const launch = useLaunchWorkspaceRequiringVisit(patientUuid, PDC_SHARED_WORKSPACE);
  return useCallback((form: PdcSharedForm) => launch({ patientUuid, form, cardKey }), [launch, patientUuid, cardKey]);
}
