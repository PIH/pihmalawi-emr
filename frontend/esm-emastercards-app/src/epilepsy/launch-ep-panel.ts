import { useCallback } from 'react';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';

/** The epilepsy card's side panels, one per form (the card header has one panel with sections) */
export type EpPanel = 'header' | 'visit';

export const EP_WORKSPACES: Record<EpPanel, string> = {
  header: 'pihmalawi-ep-header-workspace',
  visit: 'pihmalawi-ep-visit-workspace',
};

/** Opens an epilepsy panel on an encounter that exists, or on the card header */
export function launchEpPanel(panel: EpPanel, props: object) {
  launchWorkspace2(EP_WORKSPACES[panel], props);
}

/**
 * Opens the panel for a new epilepsy visit, which is recorded in an O3 visit: when the patient has none, the chart
 * first asks to start one (or choose a past one), as it does for vitals
 */
export function useLaunchEpVisit(patientUuid: string) {
  const visit = useLaunchWorkspaceRequiringVisit(patientUuid, EP_WORKSPACES.visit);
  return useCallback(() => visit({ patientUuid }), [visit, patientUuid]);
}
