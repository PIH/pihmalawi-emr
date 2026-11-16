import { type ArtEncounter } from '../art/art.resource';
import { encounter, obs } from '../chronic-care/test-htn-data';
import { NCD_HEADER } from '../shared/ncd';
import { NO, YES } from './pdc-concepts';
import { HIE_LABS, HIE_VISIT, MODERATE_MALNUTRITION } from './hie-concepts';
import { CLEFT_HEADER, CLEFT_VISIT as V } from './cleft-concepts';

/** Synthetic cleft lip / palate encounters, as useCardEncounters returns them, for tests */

export const cleftHeader = encounter('cleft-header-1', '2026-03-12', [
  obs(NCD_HEADER.agreesToFollowUp, YES),
  obs(CLEFT_HEADER.facialGroup, null, [obs(CLEFT_HEADER.smallJaw, YES), obs(CLEFT_HEADER.other, NO)]),
]);

const ear = (key: string) => V.ear.find((x) => x.key === key).concept;

export function cleftVisit(uuid: string, date: string, { moderate = false, earPain = false, murmur = false, surgery = null as string | null } = {}): ArtEncounter {
  return encounter(uuid, date, [
    obs(HIE_VISIT.weight, 6.1),
    obs(HIE_VISIT.malnutrition, moderate ? MODERATE_MALNUTRITION : NO),
    obs(V.feedingProblems, YES),
    obs(V.heartMurmur, murmur ? YES : NO),
    obs(V.earGroup, null, [obs(ear('earPain'), earPain ? YES : NO)]),
    obs(V.earGroup, null, [obs(ear('earDischarge'), NO)]),
    ...(surgery ? [obs(V.surgeryGroup, null, [obs(V.surgeryScheduled, YES), obs(V.surgeryDate, surgery)])] : []),
    obs(V.planNotes, 'Review after repair'),
  ]);
}

export const cleftLabs = encounter('cleft-labs-1', '2026-10-08', [
  { ...obs(HIE_LABS.hb, 10.2), obsDatetime: '2026-10-01T00:00:00.000+0000' },
  obs(HIE_LABS.otherTestGroup, null, [obs(HIE_LABS.otherTestType, 'Echo')]),
]);
