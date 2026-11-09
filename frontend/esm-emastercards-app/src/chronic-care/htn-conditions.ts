import { useCardEncounters, useEMastercard } from '../art/art.resource';
import { HTN_CARD_KEY, HTN_FORMS } from './htn-concepts';
import { type Condition } from './htn-fields';
import { conditionsOf } from './htn-rules';

/**
 * The conditions the patient's card header diagnoses, which decide what the card and its visit panel show: glucose,
 * the foot check and diabetes medications for diabetes, antihypertensives for hypertension
 */
export function useHtnConditions(patientUuid: string): Record<Condition, boolean> {
  const { card } = useEMastercard(patientUuid, HTN_CARD_KEY);
  const { encounters } = useCardEncounters(patientUuid, HTN_FORMS.header);
  const header = encounters.find((e) => e.uuid === card?.initialEncounterUuid) ?? (encounters.length === 1 ? encounters[0] : null);
  return conditionsOf(header);
}
