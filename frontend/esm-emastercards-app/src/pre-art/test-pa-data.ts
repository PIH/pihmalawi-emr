import { type ArtEncounter } from '../art/art.resource';
import { encounter, obs } from '../chronic-care/test-htn-data';
import { PA_HEADER, PA_VISIT, YES } from './pa-concepts';

/** Synthetic Pre-ART encounters, as useCardEncounters returns them, for tests */

export const paHeader = encounter('pa-header-1', '2015-03-02', [
  obs(PA_HEADER.guardianName, 'Guardian Name'),
  obs(PA_HEADER.agreesToFollowUp, YES),
  obs(PA_HEADER.testSite, 'Neno HTC 123'),
  obs(PA_HEADER.testDate, '2015-02-20T00:00:00.000+0000'),
  obs(PA_HEADER.testType, PA_HEADER.testTypes[0].value),
  obs(PA_HEADER.whoStage, PA_HEADER.whoStages[1].value),
  obs(PA_HEADER.age, 34),
]);

export function paVisit(
  uuid: string,
  date: string,
  { stage = 0, wasting = 0, cd4 = null as number | null, sideEffects = [] as Array<number>, next = null as string | null } = {},
): ArtEncounter {
  return encounter(uuid, date, [
    obs(PA_VISIT.weight, 60),
    obs(PA_VISIT.wasting, PA_VISIT.wastingAnswers[wasting].value),
    obs(PA_VISIT.tbStatus, PA_VISIT.tbStatuses[0].value),
    obs(PA_VISIT.whoStage, PA_VISIT.whoStages[stage].value),
    ...(cd4 !== null ? [obs(PA_VISIT.cd4SampleTaken, YES), obs(PA_VISIT.cd4, cd4)] : []),
    ...sideEffects.map((i) => obs(PA_VISIT.sideEffects, PA_VISIT.sideEffectAnswers[i].value)),
    ...(next ? [obs(PA_VISIT.nextAppointment, `${next}T00:00:00.000+0000`)] : []),
  ]);
}
