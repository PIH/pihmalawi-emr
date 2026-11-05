import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type ArtField } from '../art/art-fields';
import { type ArtEncounter, artSwrKey, encounterRep, type RestObs, toArtObs } from '../art/art.resource';
import { type FieldValue } from '../art/obs-diff';
import { type EMastercardCard, useEMastercards } from '../emastercards.resource';

/** The patient and guardian questions every eMastercard header asks, by the field name the O3 panels give them */
export type PatientGuardianRole = 'patientPhone' | 'guardianName' | 'guardianPhone' | 'guardianRelation' | 'agreesToFollowUp';

/**
 * The concepts the card headers save each question under. The ART and Pre-ART cards keep their phone numbers under
 * different concepts from the other cards, so a question is matched by its role, not its concept.
 */
export const PATIENT_GUARDIAN_CONCEPTS: Record<PatientGuardianRole, Array<string>> = {
  patientPhone: ['65700e2c-977f-11e1-8993-905e29aff6c1', '6559ba14-977f-11e1-8993-905e29aff6c1'],
  guardianName: ['655bbc74-977f-11e1-8993-905e29aff6c1'],
  guardianPhone: ['6563d2c4-977f-11e1-8993-905e29aff6c1', '65600cd4-977f-11e1-8993-905e29aff6c1'],
  guardianRelation: ['6558fd0e-977f-11e1-8993-905e29aff6c1'],
  agreesToFollowUp: ['655fc526-977f-11e1-8993-905e29aff6c1'],
};

const ROLES = Object.keys(PATIENT_GUARDIAN_CONCEPTS) as Array<PatientGuardianRole>;

export type CarriedValues = Partial<Record<PatientGuardianRole, { value: FieldValue; from: string }>>;

/**
 * The patient and guardian answers of the patient's other eMastercard headers, so a new card starts with them: for
 * each question, the answer on the most recently started card that has one
 */
export function pickPatientGuardian(headers: Array<{ card: string; encounter: ArtEncounter }>): CarriedValues {
  const carried: CarriedValues = {};
  const newestFirst = [...headers].sort(
    (a, b) => new Date(b.encounter.encounterDatetime).getTime() - new Date(a.encounter.encounterDatetime).getTime(),
  );
  ROLES.forEach((role) => {
    const concepts = PATIENT_GUARDIAN_CONCEPTS[role].map((c) => c.toLowerCase());
    for (const { card, encounter } of newestFirst) {
      const obs = encounter.obs.find((o) => concepts.includes(o.concept) && !o.groupMembers && o.value !== null && o.value !== '');
      if (obs) {
        carried[role] = { value: obs.value as FieldValue, from: card };
        break;
      }
    }
  });
  return carried;
}

/** The headers of the patient's other eMastercards with patient and guardian answers to carry over */
export function useCarriedPatientGuardian(patientUuid: string, cardKey: string) {
  const { cards, isLoading: loadingCards } = useEMastercards(patientUuid);
  const others = cards.filter((c: EMastercardCard) => c.key !== cardKey && c.initialEncounterUuid);
  const uuids = others.map((c) => c.initialEncounterUuid);
  const { data, isLoading } = useSWR(
    patientUuid && !loadingCards && uuids.length ? [artSwrKey(patientUuid), 'patient-guardian', ...uuids] : null,
    () =>
      Promise.all(
        others.map(async (c) => {
          const res = await openmrsFetch<Omit<ArtEncounter, 'obs'> & { obs: Array<RestObs> }>(
            `${restBaseUrl}/encounter/${c.initialEncounterUuid}?v=${encounterRep}`,
          );
          return { card: c.label, encounter: { ...res.data, obs: (res.data?.obs ?? []).map(toArtObs) } as ArtEncounter };
        }),
      ),
  );
  return { carried: data ? pickPatientGuardian(data) : {}, isLoading: loadingCards || (uuids.length > 0 && isLoading) };
}

/** A carried answer as the field takes it: phone numbers stay digits where the card's concept is numeric */
function asFieldValue(field: ArtField, value: FieldValue): FieldValue {
  if (field.kind === 'number') {
    const digits = String(value).replace(/\D/g, '');
    return digits ? Number(digits) : null;
  }
  if (field.kind === 'coded') {
    return field.options?.some((o) => o.value.toLowerCase() === String(value).toLowerCase()) ? String(value) : null;
  }
  return String(value);
}

/**
 * Fills the patient and guardian fields this card has no answer for with the other cards' answers
 *
 * @return the values with those answers, the fields filled and the cards they came from
 */
export function carryOver(
  fields: Array<ArtField>,
  values: Record<string, FieldValue>,
  carried: CarriedValues,
): { values: Record<string, FieldValue>; filled: Array<ArtField>; from: Array<string> } {
  const next = { ...values };
  const filled: Array<ArtField> = [];
  const from = new Set<string>();
  fields.forEach((f) => {
    const answer = carried[f.name as PatientGuardianRole];
    const current = values[f.name];
    if (!answer || (current !== null && current !== undefined && current !== '')) {
      return;
    }
    const value = asFieldValue(f, answer.value);
    if (value !== null) {
      next[f.name] = value;
      filled.push(f);
      from.add(answer.from);
    }
  });
  return { values: next, filled, from: [...from] };
}
