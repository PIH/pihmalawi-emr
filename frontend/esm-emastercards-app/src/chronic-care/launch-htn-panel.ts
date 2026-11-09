import { useCallback } from 'react';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { HTN_FORMS, type HtnForm } from './htn-concepts';

/** The hypertension and diabetes card's side panels, one per form (the card header has one panel with sections) */
export type HtnPanel = HtnForm;

export const HTN_WORKSPACES: Record<HtnPanel, string> = {
  header: 'pihmalawi-htn-header-workspace',
  visit: 'pihmalawi-htn-visit-workspace',
  quarterlyLabs: 'pihmalawi-htn-quarterly-labs-workspace',
  annualLabs: 'pihmalawi-htn-annual-labs-workspace',
  hospitalisation: 'pihmalawi-htn-hospitalisation-workspace',
};

/** Opens a hypertension and diabetes panel on an encounter that exists, or on the card header */
export function launchHtnPanel(panel: HtnPanel, props: object) {
  launchWorkspace2(HTN_WORKSPACES[panel], props);
}

/**
 * Opens a panel for a new encounter, which is recorded in an O3 visit: when the patient has none, the chart first
 * asks to start one (or choose a past one), as it does for vitals
 */
export function useLaunchHtnPanel(patientUuid: string) {
  const visit = useLaunchWorkspaceRequiringVisit(patientUuid, HTN_WORKSPACES.visit);
  const quarterlyLabs = useLaunchWorkspaceRequiringVisit(patientUuid, HTN_WORKSPACES.quarterlyLabs);
  const annualLabs = useLaunchWorkspaceRequiringVisit(patientUuid, HTN_WORKSPACES.annualLabs);
  const hospitalisation = useLaunchWorkspaceRequiringVisit(patientUuid, HTN_WORKSPACES.hospitalisation);
  return useCallback(
    (panel: Exclude<HtnPanel, 'header'>) =>
      ({ visit, quarterlyLabs, annualLabs, hospitalisation })[panel]({
        patientUuid,
      }),
    [visit, quarterlyLabs, annualLabs, hospitalisation, patientUuid],
  );
}

/** The native panel an encounter is edited in, by its encounter type, whatever form saved it; else null */
export function htnPanelForEncounter(encounter: { encounterType?: { uuid: string } | null }): HtnPanel | null {
  const type = encounter.encounterType?.uuid?.toLowerCase();
  return (Object.keys(HTN_FORMS) as Array<HtnPanel>).find((panel) => HTN_FORMS[panel].encounterType === type) ?? null;
}
