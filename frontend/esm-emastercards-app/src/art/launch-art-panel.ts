import { useCallback } from 'react';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';

/** The ART card's side panels, one per form (the card header has one panel with sections) */
export type ArtPanel = 'visit' | 'initial' | 'viralLoad' | 'followUpTesting';

export const ART_WORKSPACES: Record<ArtPanel, string> = {
  visit: 'pihmalawi-art-visit-workspace',
  initial: 'pihmalawi-art-initial-workspace',
  viralLoad: 'pihmalawi-art-viral-load-workspace',
  followUpTesting: 'pihmalawi-art-follow-up-testing-workspace',
};

/** Opens an ART panel on an encounter that exists, or on the card header */
export function launchArtPanel(panel: ArtPanel, props: object) {
  launchWorkspace2(ART_WORKSPACES[panel], props);
}

/**
 * Opens an ART panel for a new encounter, which is recorded in an O3 visit: when the patient has none, the chart
 * first asks to start one (or choose a past one), as it does for vitals
 */
export function useLaunchArtPanel(patientUuid: string) {
  const visit = useLaunchWorkspaceRequiringVisit(patientUuid, ART_WORKSPACES.visit);
  const viralLoad = useLaunchWorkspaceRequiringVisit(patientUuid, ART_WORKSPACES.viralLoad);
  const followUpTesting = useLaunchWorkspaceRequiringVisit(patientUuid, ART_WORKSPACES.followUpTesting);
  return useCallback(
    (panel: Exclude<ArtPanel, 'initial'>) => ({ visit, viralLoad, followUpTesting })[panel]({ patientUuid }),
    [visit, viralLoad, followUpTesting, patientUuid],
  );
}
