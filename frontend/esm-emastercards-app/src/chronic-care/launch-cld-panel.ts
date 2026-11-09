import { useCallback } from 'react';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { CLD_FORMS, type CldForm } from './cld-concepts';

/** The chronic lung disease card's side panels, one per form (the card header has one panel with sections) */
export type CldPanel = CldForm;

export const CLD_WORKSPACES: Record<CldPanel, string> = {
  header: 'pihmalawi-cld-header-workspace',
  visit: 'pihmalawi-cld-visit-workspace',
  peakFlow: 'pihmalawi-cld-peak-flow-workspace',
  hospitalisation: 'pihmalawi-cld-hospitalisation-workspace',
};

/** Opens a chronic lung disease panel on an encounter that exists, or on the card header */
export function launchCldPanel(panel: CldPanel, props: object) {
  launchWorkspace2(CLD_WORKSPACES[panel], props);
}

/**
 * Opens a panel for a new encounter, which is recorded in an O3 visit: when the patient has none, the chart first
 * asks to start one (or choose a past one), as it does for vitals
 */
export function useLaunchCldPanel(patientUuid: string) {
  const visit = useLaunchWorkspaceRequiringVisit(patientUuid, CLD_WORKSPACES.visit);
  const peakFlow = useLaunchWorkspaceRequiringVisit(patientUuid, CLD_WORKSPACES.peakFlow);
  const hospitalisation = useLaunchWorkspaceRequiringVisit(patientUuid, CLD_WORKSPACES.hospitalisation);
  return useCallback(
    (panel: Exclude<CldPanel, 'header'>) => ({ visit, peakFlow, hospitalisation })[panel]({ patientUuid }),
    [visit, peakFlow, hospitalisation, patientUuid],
  );
}

/** The native panel an encounter is edited in, by its encounter type, whatever form saved it; else null */
export function cldPanelForEncounter(encounter: { encounterType?: { uuid: string } | null }): CldPanel | null {
  const type = encounter.encounterType?.uuid?.toLowerCase();
  return (Object.keys(CLD_FORMS) as Array<CldPanel>).find((panel) => CLD_FORMS[panel].encounterType === type) ?? null;
}
