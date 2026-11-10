import { type ArtEncounter } from '../art/art.resource';
import { encounter, obs } from '../chronic-care/test-htn-data';
import { EC_EID, EC_HEADER, EC_VISIT, WEEKS, YES } from './ec-concepts';

/** Synthetic exposed child encounters, as useCardEncounters returns them, for tests */

export const ecHeader = encounter('ec-header-1', '2026-03-02', [
  obs(EC_HEADER.agreesToFollowUp, YES),
  obs(EC_HEADER.guardianName, 'Mother Name'),
  obs(EC_HEADER.guardianRelation, 'Mother'),
  obs(EC_HEADER.motherStatus.concept, EC_HEADER.motherStatus.answers[1].value),
  obs(EC_HEADER.enrolmentAge, 6),
  obs(EC_HEADER.nvpStartGroup, null, [obs(EC_HEADER.nvpStartAge, 0), obs(EC_HEADER.nvpStartAgeUnit, WEEKS)]),
  obs(EC_HEADER.birthWeight, 3.1),
]);

export function ecVisit(
  uuid: string,
  date: string,
  { status = null as number | null, wasting = 0, sick = false, cpt = null as number | null, next = null as string | null } = {},
): ArtEncounter {
  return encounter(uuid, date, [
    obs(EC_VISIT.wasting, EC_VISIT.wastingAnswers[wasting].value),
    obs(EC_VISIT.clinicalMonitoring, EC_VISIT.clinicalMonitoringAnswers[sick ? 1 : 0].value),
    ...(status !== null ? [obs(EC_VISIT.childHivStatus, EC_VISIT.childHivStatuses[status].value)] : []),
    ...(cpt !== null ? [obs(EC_VISIT.cpt, cpt)] : []),
    ...(next ? [obs(EC_VISIT.nextAppointment, `${next}T00:00:00.000+0000`)] : []),
  ]);
}

export function eidTest(uuid: string, date: string, result: number): ArtEncounter {
  return encounter(uuid, date, [
    obs(EC_EID.testGroup, null, [
      obs(EC_EID.testType, EC_EID.testTypes[0].value),
      obs(EC_EID.result, EC_EID.results[result].value),
      obs(EC_EID.sampleId, 'S-123'),
    ]),
  ]);
}
