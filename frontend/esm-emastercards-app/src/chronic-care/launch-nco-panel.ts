import { useCallback } from 'react';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { NCO_FORMS, type NcoForm } from './nco-concepts';

/** The NCD other card's side panels, one per form (the card header has one panel with sections) */
export type NcoPanel = NcoForm;

export const NCO_WORKSPACES: Record<NcoPanel, string> = {
  header: 'pihmalawi-nco-header-workspace',
  visit: 'pihmalawi-nco-visit-workspace',
  quarterlyLabs: 'pihmalawi-nco-quarterly-labs-workspace',
  annualLabs: 'pihmalawi-nco-annual-labs-workspace',
  hospitalisation: 'pihmalawi-nco-hospitalisation-workspace',
};

/** Opens a NCD other panel on an encounter that exists, or on the card header */
export function launchNcoPanel(panel: NcoPanel, props: object) {
  launchWorkspace2(NCO_WORKSPACES[panel], props);
}

/**
 * Opens a panel for a new encounter, which is recorded in an O3 visit: when the patient has none, the chart first
 * asks to start one (or choose a past one), as it does for vitals
 */
export function useLaunchNcoPanel(patientUuid: string) {
  const visit = useLaunchWorkspaceRequiringVisit(patientUuid, NCO_WORKSPACES.visit);
  const quarterlyLabs = useLaunchWorkspaceRequiringVisit(patientUuid, NCO_WORKSPACES.quarterlyLabs);
  const annualLabs = useLaunchWorkspaceRequiringVisit(patientUuid, NCO_WORKSPACES.annualLabs);
  const hospitalisation = useLaunchWorkspaceRequiringVisit(patientUuid, NCO_WORKSPACES.hospitalisation);
  return useCallback(
    (panel: Exclude<NcoPanel, 'header'>) => ({ visit, quarterlyLabs, annualLabs, hospitalisation })[panel]({ patientUuid }),
    [visit, quarterlyLabs, annualLabs, hospitalisation, patientUuid],
  );
}

/** The native panel an encounter is edited in, by its encounter type, whatever form saved it; else null */
export function ncoPanelForEncounter(encounter: { encounterType?: { uuid: string } | null }): NcoPanel | null {
  const type = encounter.encounterType?.uuid?.toLowerCase();
  return (Object.keys(NCO_FORMS) as Array<NcoPanel>).find((panel) => NCO_FORMS[panel].encounterType === type) ?? null;
}
