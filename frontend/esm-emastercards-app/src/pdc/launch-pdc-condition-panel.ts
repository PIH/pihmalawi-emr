import { useCallback } from 'react';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { type PdcCondition, type PdcConditionForm } from './pdc-condition';

/** Opens a PDC condition card's panel on an encounter that exists, or on the card header */
export function launchConditionPanel(condition: PdcCondition, panel: PdcConditionForm, props: object) {
  launchWorkspace2(condition.workspaces[panel], props);
}

/**
 * Opens a condition card's panel for a new encounter, which is recorded in an O3 visit: when the patient has none,
 * the chart first asks to start one (or choose a past one), as it does for vitals
 */
export function useLaunchConditionPanel(patientUuid: string, condition: PdcCondition) {
  const visit = useLaunchWorkspaceRequiringVisit(patientUuid, condition.workspaces.visit);
  const labs = useLaunchWorkspaceRequiringVisit(patientUuid, condition.workspaces.labs);
  return useCallback((panel: 'visit' | 'labs') => ({ visit, labs })[panel]({ patientUuid }), [visit, labs, patientUuid]);
}

/**
 * The condition card and native panel an encounter is edited in, by its encounter type, whatever form saved it; else
 * null. By encounter type: the cleft lip / palate visit form's UUID is the HIE visit's encounter type. A lab test
 * encounter the cleft lip / palate and other diagnosis cards share opens on the first of the patient's cards
 * (cardKeys, e.g. those they may change) it belongs to, else on the first card it belongs to.
 */
export function conditionPanelForEncounter(
  conditions: Array<PdcCondition>,
  encounter: { encounterType?: { uuid: string } | null },
  cardKeys: Array<string> = [],
): { condition: PdcCondition; panel: PdcConditionForm } | null {
  const type = encounter.encounterType?.uuid?.toLowerCase();
  const matches = conditions.flatMap((condition) => {
    const panel = (Object.keys(condition.forms) as Array<PdcConditionForm>).find((p) => condition.forms[p].encounterType === type);
    return panel ? [{ condition, panel }] : [];
  });
  return matches.find((m) => cardKeys.includes(m.condition.key)) ?? matches[0] ?? null;
}
