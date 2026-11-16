import { type ArtEncounter } from '../art/art.resource';
import { encounter, obs } from '../chronic-care/test-htn-data';
import { NCD_HEADER } from '../shared/ncd';
import { NO, YES } from './pdc-concepts';
import { TRISOMY_HEADER, TRISOMY_LABS, TRISOMY_MODERATE_MALNUTRITION, TRISOMY_VISIT as V } from './trisomy-concepts';

/** Synthetic trisomy 21 encounters, as useCardEncounters returns them, for tests */

export const trisomyHeader = encounter('trisomy-header-1', '2026-03-12', [obs(NCD_HEADER.agreesToFollowUp, YES), obs(TRISOMY_HEADER.meconiumDelayed, YES)]);

const concept = (list: Array<{ key: string; concept: string }>, key: string) => list.find((x) => x.key === key).concept;

export function trisomyVisit(uuid: string, date: string, { moderate = false, apnoea = false, earPain = false } = {}): ArtEncounter {
  return encounter(uuid, date, [
    obs(V.weight, 8.4),
    obs(V.malnutrition, moderate ? TRISOMY_MODERATE_MALNUTRITION : NO),
    obs(V.sleepGroup, null, [obs(concept(V.sleep, 'apnoea'), apnoea ? YES : NO)]),
    obs(V.sleepGroup, null, [obs(concept(V.sleep, 'choking'), NO)]),
    obs(V.earGroup, null, [obs(concept(V.ear, 'earPain'), earPain ? YES : NO)]),
    obs(V.extremitiesGroup, null, [obs(concept(V.extremities, 'extremitiesPain'), NO)]),
  ]);
}

export const trisomyLabs = encounter('trisomy-labs-1', '2026-10-08', [
  obs(TRISOMY_LABS.wbc, 6.2),
  obs(TRISOMY_LABS.hb, 11.4),
  { ...obs(TRISOMY_LABS.tsh, 3), obsDatetime: '2026-10-02T00:00:00.000+0000' },
]);
