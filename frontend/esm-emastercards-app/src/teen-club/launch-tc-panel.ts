import { useCallback } from 'react';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { TC_FORMS, type TcForm } from './tc-concepts';

/** The teen club card's side panels, one per form */
export type TcPanel = TcForm;

export const TC_WORKSPACES: Record<TcPanel, string> = {
  header: 'pihmalawi-tc-header-workspace',
  visit: 'pihmalawi-tc-visit-workspace',
  survey: 'pihmalawi-tc-survey-workspace',
};

/** Opens a teen club panel on an encounter that exists, or on the card header */
export function launchTcPanel(panel: TcPanel, props: object) {
  launchWorkspace2(TC_WORKSPACES[panel], props);
}

/**
 * Opens a panel for a new encounter, which is recorded in an O3 visit: when the patient has none, the chart first
 * asks to start one (or choose a past one), as it does for vitals
 */
export function useLaunchTcPanel(patientUuid: string) {
  const visit = useLaunchWorkspaceRequiringVisit(patientUuid, TC_WORKSPACES.visit);
  const survey = useLaunchWorkspaceRequiringVisit(patientUuid, TC_WORKSPACES.survey);
  return useCallback((panel: Exclude<TcPanel, 'header'>) => ({ visit, survey })[panel]({ patientUuid }), [visit, survey, patientUuid]);
}

/** The native panel an encounter is edited in, by its encounter type, whatever form saved it; else null */
export function tcPanelForEncounter(encounter: { encounterType?: { uuid: string } | null }): TcPanel | null {
  const type = encounter.encounterType?.uuid?.toLowerCase();
  return (Object.keys(TC_FORMS) as Array<TcPanel>).find((panel) => TC_FORMS[panel].encounterType === type) ?? null;
}
