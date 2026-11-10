import { useCallback } from 'react';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { EC_FORMS, type EcForm } from './ec-concepts';

/** The exposed child card's side panels, one per form (the card header has one panel with sections) */
export type EcPanel = EcForm;

export const EC_WORKSPACES: Record<EcPanel, string> = {
  header: 'pihmalawi-ec-header-workspace',
  visit: 'pihmalawi-ec-visit-workspace',
  eid: 'pihmalawi-ec-eid-workspace',
};

/** Opens an exposed child panel on an encounter that exists, or on the card header */
export function launchEcPanel(panel: EcPanel, props: object) {
  launchWorkspace2(EC_WORKSPACES[panel], props);
}

/**
 * Opens a panel for a new encounter, which is recorded in an O3 visit: when the patient has none, the chart first
 * asks to start one (or choose a past one), as it does for vitals
 */
export function useLaunchEcPanel(patientUuid: string) {
  const visit = useLaunchWorkspaceRequiringVisit(patientUuid, EC_WORKSPACES.visit);
  const eid = useLaunchWorkspaceRequiringVisit(patientUuid, EC_WORKSPACES.eid);
  return useCallback((panel: Exclude<EcPanel, 'header'>) => ({ visit, eid })[panel]({ patientUuid }), [visit, eid, patientUuid]);
}

/** The native panel an encounter is edited in, by its encounter type, whatever form saved it; else null */
export function ecPanelForEncounter(encounter: { encounterType?: { uuid: string } | null }): EcPanel | null {
  const type = encounter.encounterType?.uuid?.toLowerCase();
  return (Object.keys(EC_FORMS) as Array<EcPanel>).find((panel) => EC_FORMS[panel].encounterType === type) ?? null;
}
