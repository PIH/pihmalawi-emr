import { useCallback } from 'react';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { ART_WORKSPACES } from '../art/launch-art-panel';
import { CKD_WORKSPACES } from '../chronic-care/launch-ckd-panel';
import { CLD_WORKSPACES } from '../chronic-care/launch-cld-panel';
import { CVD_WORKSPACES } from '../chronic-care/launch-cvd-panel';
import { HTN_WORKSPACES } from '../chronic-care/launch-htn-panel';
import { NCO_WORKSPACES } from '../chronic-care/launch-nco-panel';
import { SCD_WORKSPACES } from '../chronic-care/launch-scd-panel';
import { EP_WORKSPACES } from '../epilepsy/launch-ep-panel';
import { EC_WORKSPACES } from '../exposed-child/launch-ec-panel';
import { MH_WORKSPACES } from '../mental-health/launch-mh-panel';
import { TC_WORKSPACES } from '../teen-club/launch-tc-panel';
import { type EMastercardCard } from '../emastercards.resource';

/** Each native eMastercard's visit panel, by the card's key */
export const VISIT_WORKSPACES: Record<string, string> = {
  art: ART_WORKSPACES.visit,
  'teen-club': TC_WORKSPACES.visit,
  'exposed-child': EC_WORKSPACES.visit,
  'mental-health': MH_WORKSPACES.visit,
  epilepsy: EP_WORKSPACES.visit,
  'htn-dm': HTN_WORKSPACES.visit,
  asthma: CLD_WORKSPACES.visit,
  chf: CVD_WORKSPACES.visit,
  ckd: CKD_WORKSPACES.visit,
  scd: SCD_WORKSPACES.visit,
  'ncd-other': NCO_WORKSPACES.visit,
};

/** The cards a visit can be recorded on: native ones the patient has started and may change */
export const recordableCards = (cards: Array<EMastercardCard>) => cards.filter((c) => c.state === 'EDIT' && VISIT_WORKSPACES[c.key]);

/**
 * Opens a card's visit panel for a new visit, which is recorded in an O3 visit: when the patient has none, the chart
 * first asks to start one (or choose a past one), as each card's own Record visit does
 */
export function useLaunchCardVisit(patientUuid: string) {
  const launchers: Record<string, (props: object) => void> = {
    art: useLaunchWorkspaceRequiringVisit(patientUuid, VISIT_WORKSPACES.art),
    'teen-club': useLaunchWorkspaceRequiringVisit(patientUuid, VISIT_WORKSPACES['teen-club']),
    'exposed-child': useLaunchWorkspaceRequiringVisit(patientUuid, VISIT_WORKSPACES['exposed-child']),
    'mental-health': useLaunchWorkspaceRequiringVisit(patientUuid, VISIT_WORKSPACES['mental-health']),
    epilepsy: useLaunchWorkspaceRequiringVisit(patientUuid, VISIT_WORKSPACES.epilepsy),
    'htn-dm': useLaunchWorkspaceRequiringVisit(patientUuid, VISIT_WORKSPACES['htn-dm']),
    asthma: useLaunchWorkspaceRequiringVisit(patientUuid, VISIT_WORKSPACES.asthma),
    chf: useLaunchWorkspaceRequiringVisit(patientUuid, VISIT_WORKSPACES.chf),
    ckd: useLaunchWorkspaceRequiringVisit(patientUuid, VISIT_WORKSPACES.ckd),
    scd: useLaunchWorkspaceRequiringVisit(patientUuid, VISIT_WORKSPACES.scd),
    'ncd-other': useLaunchWorkspaceRequiringVisit(patientUuid, VISIT_WORKSPACES['ncd-other']),
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((key: string) => launchers[key]?.({ patientUuid }), [patientUuid, ...Object.values(launchers)]);
}
