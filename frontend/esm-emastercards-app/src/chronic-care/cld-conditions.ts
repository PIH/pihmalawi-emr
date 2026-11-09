import { useCardEncounters, useEMastercard } from '../art/art.resource';
import { CLD_CARD_KEY, CLD_FORMS } from './cld-concepts';
import { cldConditionsOf } from './cld-rules';

/** The conditions the patient's card header diagnoses, asthma and COPD: asthma severity is asked only for asthma */
export function useCldConditions(patientUuid: string) {
  const { card } = useEMastercard(patientUuid, CLD_CARD_KEY);
  const { encounters } = useCardEncounters(patientUuid, CLD_FORMS.header);
  const header = encounters.find((e) => e.uuid === card?.initialEncounterUuid) ?? (encounters.length === 1 ? encounters[0] : null);
  return cldConditionsOf(header);
}
