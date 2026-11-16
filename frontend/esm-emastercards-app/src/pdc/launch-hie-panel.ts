import { useCallback } from 'react';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { HIE_FORMS, type HieForm } from './hie-concepts';

/** The HIE / developmental delay card's side panels, one per form (the card header has one panel with sections) */
export type HiePanel = HieForm;

export const HIE_WORKSPACES: Record<HiePanel, string> = {
  header: 'pihmalawi-hie-header-workspace',
  visit: 'pihmalawi-hie-visit-workspace',
  labs: 'pihmalawi-hie-labs-workspace',
};

/** Opens an HIE / developmental delay panel on an encounter that exists, or on the card header */
export function launchHiePanel(panel: HiePanel, props: object) {
  launchWorkspace2(HIE_WORKSPACES[panel], props);
}

/**
 * Opens a panel for a new encounter, which is recorded in an O3 visit: when the patient has none, the chart first
 * asks to start one (or choose a past one), as it does for vitals
 */
export function useLaunchHiePanel(patientUuid: string) {
  const visit = useLaunchWorkspaceRequiringVisit(patientUuid, HIE_WORKSPACES.visit);
  const labs = useLaunchWorkspaceRequiringVisit(patientUuid, HIE_WORKSPACES.labs);
  return useCallback((panel: Exclude<HiePanel, 'header'>) => ({ visit, labs })[panel]({ patientUuid }), [visit, labs, patientUuid]);
}

/** The native panel an encounter is edited in, by its encounter type, whatever form saved it; else null */
export function hiePanelForEncounter(encounter: { encounterType?: { uuid: string } | null }): HiePanel | null {
  const type = encounter.encounterType?.uuid?.toLowerCase();
  return (Object.keys(HIE_FORMS) as Array<HiePanel>).find((panel) => HIE_FORMS[panel].encounterType === type) ?? null;
}
