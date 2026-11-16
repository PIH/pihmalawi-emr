import { type ArtEncounter } from '../art/art.resource';
import { encounter, obs } from '../chronic-care/test-htn-data';
import { NCD_HEADER } from '../shared/ncd';
import { HIE_HEADER, HIE_LABS, HIE_VISIT, SEVERE_MALNUTRITION } from './hie-concepts';
import { YES, NO } from './pdc-concepts';

/** Synthetic HIE / developmental delay encounters, as useCardEncounters returns them, for tests */

export const hieHeader = encounter('hie-header-1', '2026-03-12', [
  obs(NCD_HEADER.agreesToFollowUp, YES),
  obs(NCD_HEADER.guardianName, 'Guardian Name'),
  obs(HIE_HEADER.geneticSyndromeGroup, null, [obs(HIE_HEADER.suspected, YES)]),
  obs(HIE_HEADER.geneticSyndromeGroup, null, [obs(HIE_HEADER.confirmed, NO)]),
]);

const tone = (key: string) => HIE_VISIT.tone.find((x) => x.key === key).concept;
const plan = (key: string) => HIE_VISIT.plan.find((x) => x.key === key).concept;

export function hieVisit(
  uuid: string,
  date: string,
  {
    weight = null as number | null,
    wfa = null as number | null,
    severe = false,
    hypo = false,
    physiotherapy = false,
    referredTo = null as string | null,
    next = null as string | null,
  } = {},
): ArtEncounter {
  return encounter(uuid, date, [
    ...(weight !== null ? [obs(HIE_VISIT.weight, weight)] : []),
    ...(wfa !== null ? [obs(HIE_VISIT.weightForAgeGroup, null, [obs(HIE_VISIT.numericValue, wfa)])] : []),
    obs(HIE_VISIT.malnutrition, severe ? SEVERE_MALNUTRITION : NO),
    obs(HIE_VISIT.mdatSummary, NO),
    obs(HIE_VISIT.toneGroup, null, [obs(tone('toneNormal'), hypo ? NO : YES)]),
    obs(HIE_VISIT.toneGroup, null, [obs(tone('toneHypo'), hypo ? YES : NO)]),
    obs(HIE_VISIT.signsOfCerebralPalsy, NO),
    ...(physiotherapy ? [obs(plan('physiotherapy'), YES)] : []),
    ...(referredTo
      ? [
          obs(HIE_VISIT.referredOutGroup, null, [obs(HIE_VISIT.referredOut, YES)]),
          obs(HIE_VISIT.referredToGroup, null, [obs(HIE_VISIT.referredOut, referredTo)]),
        ]
      : []),
    ...(next ? [obs(HIE_VISIT.nextAppointment, `${next}T00:00:00.000+0000`)] : []),
  ]);
}

export const hieLabs = encounter('hie-labs-1', '2026-10-08', [
  { ...obs(HIE_LABS.hb, 10.4), obsDatetime: '2026-10-01T00:00:00.000+0000' },
  obs(HIE_LABS.tshGroup, null, [obs(HIE_LABS.tshDone, YES), obs(HIE_LABS.tshNormal, YES)]),
  obs(HIE_LABS.otherTestGroup, null, [obs(HIE_LABS.otherTestType, 'Blood glucose'), obs(HIE_LABS.otherTestResult, '4.2 mmol/L')]),
]);
