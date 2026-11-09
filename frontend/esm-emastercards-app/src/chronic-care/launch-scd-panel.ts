import { useCallback } from 'react';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { SCD_FORMS, type ScdForm } from './scd-concepts';

/** The sickle cell disease card's side panels, one per form (the card header has one panel with sections) */
export type ScdPanel = ScdForm;

export const SCD_WORKSPACES: Record<ScdPanel, string> = {
  header: 'pihmalawi-scd-header-workspace',
  visit: 'pihmalawi-scd-visit-workspace',
  quarterlyScreening: 'pihmalawi-scd-quarterly-screening-workspace',
  annualMonitoring: 'pihmalawi-scd-annual-monitoring-workspace',
  hospitalisation: 'pihmalawi-scd-hospitalisation-workspace',
};

/** Opens a sickle cell disease panel on an encounter that exists, or on the card header */
export function launchScdPanel(panel: ScdPanel, props: object) {
  launchWorkspace2(SCD_WORKSPACES[panel], props);
}

/**
 * Opens a panel for a new encounter, which is recorded in an O3 visit: when the patient has none, the chart first
 * asks to start one (or choose a past one), as it does for vitals
 */
export function useLaunchScdPanel(patientUuid: string) {
  const visit = useLaunchWorkspaceRequiringVisit(patientUuid, SCD_WORKSPACES.visit);
  const quarterlyScreening = useLaunchWorkspaceRequiringVisit(patientUuid, SCD_WORKSPACES.quarterlyScreening);
  const annualMonitoring = useLaunchWorkspaceRequiringVisit(patientUuid, SCD_WORKSPACES.annualMonitoring);
  const hospitalisation = useLaunchWorkspaceRequiringVisit(patientUuid, SCD_WORKSPACES.hospitalisation);
  return useCallback(
    (panel: Exclude<ScdPanel, 'header'>) => ({ visit, quarterlyScreening, annualMonitoring, hospitalisation })[panel]({ patientUuid }),
    [visit, quarterlyScreening, annualMonitoring, hospitalisation, patientUuid],
  );
}

/** The native panel an encounter is edited in, by its encounter type, whatever form saved it; else null */
export function scdPanelForEncounter(encounter: { encounterType?: { uuid: string } | null }): ScdPanel | null {
  const type = encounter.encounterType?.uuid?.toLowerCase();
  return (Object.keys(SCD_FORMS) as Array<ScdPanel>).find((panel) => SCD_FORMS[panel].encounterType === type) ?? null;
}
