import { useCallback } from 'react';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { CVD_FORMS, type CvdForm } from './cvd-concepts';

/** The cardiac and vascular disease card's side panels, one per form (the card header has one panel with sections) */
export type CvdPanel = CvdForm;

export const CVD_WORKSPACES: Record<CvdPanel, string> = {
  header: 'pihmalawi-cvd-header-workspace',
  visit: 'pihmalawi-cvd-visit-workspace',
  echo: 'pihmalawi-cvd-echo-workspace',
  ekg: 'pihmalawi-cvd-ekg-workspace',
  chestXray: 'pihmalawi-cvd-chest-xray-workspace',
  quarterlyLabs: 'pihmalawi-cvd-quarterly-labs-workspace',
  protocolLabs: 'pihmalawi-cvd-protocol-labs-workspace',
  hospitalisation: 'pihmalawi-cvd-hospitalisation-workspace',
};

/** Opens a cardiac and vascular disease panel on an encounter that exists, or on the card header */
export function launchCvdPanel(panel: CvdPanel, props: object) {
  launchWorkspace2(CVD_WORKSPACES[panel], props);
}

/**
 * Opens a panel for a new encounter, which is recorded in an O3 visit: when the patient has none, the chart first
 * asks to start one (or choose a past one), as it does for vitals
 */
export function useLaunchCvdPanel(patientUuid: string) {
  const visit = useLaunchWorkspaceRequiringVisit(patientUuid, CVD_WORKSPACES.visit);
  const echo = useLaunchWorkspaceRequiringVisit(patientUuid, CVD_WORKSPACES.echo);
  const ekg = useLaunchWorkspaceRequiringVisit(patientUuid, CVD_WORKSPACES.ekg);
  const chestXray = useLaunchWorkspaceRequiringVisit(patientUuid, CVD_WORKSPACES.chestXray);
  const quarterlyLabs = useLaunchWorkspaceRequiringVisit(patientUuid, CVD_WORKSPACES.quarterlyLabs);
  const protocolLabs = useLaunchWorkspaceRequiringVisit(patientUuid, CVD_WORKSPACES.protocolLabs);
  const hospitalisation = useLaunchWorkspaceRequiringVisit(patientUuid, CVD_WORKSPACES.hospitalisation);
  return useCallback(
    (panel: Exclude<CvdPanel, 'header'>) => ({ visit, echo, ekg, chestXray, quarterlyLabs, protocolLabs, hospitalisation })[panel]({ patientUuid }),
    [visit, echo, ekg, chestXray, quarterlyLabs, protocolLabs, hospitalisation, patientUuid],
  );
}

/** The native panel an encounter is edited in, by its encounter type, whatever form saved it; else null */
export function cvdPanelForEncounter(encounter: { encounterType?: { uuid: string } | null }): CvdPanel | null {
  const type = encounter.encounterType?.uuid?.toLowerCase();
  return (Object.keys(CVD_FORMS) as Array<CvdPanel>).find((panel) => CVD_FORMS[panel].encounterType === type) ?? null;
}
