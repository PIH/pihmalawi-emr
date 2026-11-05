import { useCallback } from 'react';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';

/** The mental health card's side panels, one per form (the card header has one panel with sections) */
export type MhPanel = 'header' | 'visit' | 'screening';

export const MH_WORKSPACES: Record<MhPanel, string> = {
  header: 'pihmalawi-mh-header-workspace',
  visit: 'pihmalawi-mh-visit-workspace',
  screening: 'pihmalawi-mh-screening-workspace',
};

/** Opens a mental health panel on an encounter that exists, or on the card header */
export function launchMhPanel(panel: MhPanel, props: object) {
  launchWorkspace2(MH_WORKSPACES[panel], props);
}

/**
 * Opens a mental health panel for a new visit or screening, which is recorded in an O3 visit: when the patient has
 * none, the chart first asks to start one (or choose a past one), as it does for vitals
 */
export function useLaunchMhPanel(patientUuid: string) {
  const visit = useLaunchWorkspaceRequiringVisit(patientUuid, MH_WORKSPACES.visit);
  const screening = useLaunchWorkspaceRequiringVisit(patientUuid, MH_WORKSPACES.screening);
  return useCallback((panel: Exclude<MhPanel, 'header'>) => ({ visit, screening })[panel]({ patientUuid }), [visit, screening, patientUuid]);
}
