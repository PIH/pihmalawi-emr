import { type ArtEncounter } from '../art/art.resource';
import { encounter, obs } from '../chronic-care/test-htn-data';
import { NCD_HEADER } from '../shared/ncd';
import { NO, YES } from './pdc-concepts';
import { HIE_LABS, HIE_VISIT } from './hie-concepts';
import { TRISOMY_MODERATE_MALNUTRITION } from './trisomy-concepts';
import { OTHER_DIAGNOSIS_VISIT as V } from './other-diagnosis-concepts';

/** Synthetic other diagnosis encounters, as useCardEncounters returns them, for tests */

export const otherDiagnosisHeader = encounter('od-header-1', '2026-03-12', [obs(NCD_HEADER.agreesToFollowUp, YES)]);

const concern = (key: string) => V.feedingConcerns.find((x) => x.key === key).concept;

export function otherDiagnosisVisit(uuid: string, date: string, { moderate = false, convulsions = false, poorSuck = false } = {}): ArtEncounter {
  return encounter(uuid, date, [
    obs(V.ageAdjusted, 18),
    obs(HIE_VISIT.weight, 9.4),
    obs(V.headCircumference, 46),
    obs(HIE_VISIT.malnutrition, moderate ? TRISOMY_MODERATE_MALNUTRITION : NO),
    obs(V.convulsionsSinceLastVisit, convulsions ? YES : NO),
    obs(HIE_VISIT.anticonvulsants, convulsions ? YES : NO),
    ...(convulsions ? [obs(HIE_VISIT.medicationDispensed, 'Phenobarbitone 15 mg BD'), obs(HIE_VISIT.doseAdjusted, YES)] : []),
    obs(concern('poorSuck'), poorSuck ? YES : NO),
    obs(concern('refusesToFeed'), YES),
    obs(V.groupCounselling, YES),
    obs(V.planNotes, 'Review in 3 months'),
  ]);
}

export const otherDiagnosisLabs = encounter('od-labs-1', '2026-10-08', [
  { ...obs(HIE_LABS.hb, 11.4), obsDatetime: '2026-10-02T00:00:00.000+0000' },
  obs(HIE_LABS.otherTestGroup, null, [obs(HIE_LABS.otherTestType, 'Blood culture')]),
]);
