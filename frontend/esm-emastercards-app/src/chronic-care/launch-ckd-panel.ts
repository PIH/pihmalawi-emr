import { useCallback } from 'react';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { CKD_FORMS, type CkdForm } from './ckd-concepts';

/** The chronic kidney disease card's side panels, one per form (the card header has one panel with sections) */
export type CkdPanel = CkdForm;

export const CKD_WORKSPACES: Record<CkdPanel, string> = {
  header: 'pihmalawi-ckd-header-workspace',
  visit: 'pihmalawi-ckd-visit-workspace',
  quarterlyLabs: 'pihmalawi-ckd-quarterly-labs-workspace',
  annualLabs: 'pihmalawi-ckd-annual-labs-workspace',
  imaging: 'pihmalawi-ckd-imaging-workspace',
  hospitalisation: 'pihmalawi-ckd-hospitalisation-workspace',
};

/** Opens a chronic kidney disease panel on an encounter that exists, or on the card header */
export function launchCkdPanel(panel: CkdPanel, props: object) {
  launchWorkspace2(CKD_WORKSPACES[panel], props);
}

/**
 * Opens a panel for a new encounter, which is recorded in an O3 visit: when the patient has none, the chart first
 * asks to start one (or choose a past one), as it does for vitals
 */
export function useLaunchCkdPanel(patientUuid: string) {
  const visit = useLaunchWorkspaceRequiringVisit(patientUuid, CKD_WORKSPACES.visit);
  const quarterlyLabs = useLaunchWorkspaceRequiringVisit(patientUuid, CKD_WORKSPACES.quarterlyLabs);
  const annualLabs = useLaunchWorkspaceRequiringVisit(patientUuid, CKD_WORKSPACES.annualLabs);
  const imaging = useLaunchWorkspaceRequiringVisit(patientUuid, CKD_WORKSPACES.imaging);
  const hospitalisation = useLaunchWorkspaceRequiringVisit(patientUuid, CKD_WORKSPACES.hospitalisation);
  return useCallback(
    (panel: Exclude<CkdPanel, 'header'>) => ({ visit, quarterlyLabs, annualLabs, imaging, hospitalisation })[panel]({ patientUuid }),
    [visit, quarterlyLabs, annualLabs, imaging, hospitalisation, patientUuid],
  );
}

/** The native panel an encounter is edited in, by its encounter type, whatever form saved it; else null */
export function ckdPanelForEncounter(encounter: { encounterType?: { uuid: string } | null }): CkdPanel | null {
  const type = encounter.encounterType?.uuid?.toLowerCase();
  return (Object.keys(CKD_FORMS) as Array<CkdPanel>).find((panel) => CKD_FORMS[panel].encounterType === type) ?? null;
}
