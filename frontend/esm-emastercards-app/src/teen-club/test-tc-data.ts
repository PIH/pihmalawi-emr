import { type ArtEncounter } from '../art/art.resource';
import { encounter, obs } from '../chronic-care/test-htn-data';
import { TC_HEADER, TC_SURVEY, TC_VISIT, YES, NO } from './tc-concepts';

/** Synthetic teen club encounters, as useCardEncounters returns them, for tests */

export const tcHeader = encounter('tc-header-1', '2024-02-05', [
  obs(TC_HEADER.agreesToFollowUp, YES),
  obs(TC_HEADER.relationToPatient, 'Aunt'),
  obs(TC_HEADER.ageAtIntakeGroup, null, [obs(TC_HEADER.timeUnit, TC_HEADER.months), obs(TC_HEADER.age, 170)]),
]);

export function tcVisit(
  uuid: string,
  date: string,
  { sti = null as '+' | '-' | null, muacNormal = true, hospitalised = false, next = null as string | null } = {},
): ArtEncounter {
  const outcome = (o: '+' | '-') => TC_VISIT.outcomes.find((x) => x.label === o).value;
  return encounter(uuid, date, [
    obs(TC_VISIT.tbStatus, TC_VISIT.tbStatuses[0].value),
    obs(TC_VISIT.muacNormal, muacNormal ? YES : NO),
    obs(TC_VISIT.mentalHealthScreened, YES),
    ...(sti ? [obs(TC_VISIT.stiScreeningOutcome, outcome(sti))] : []),
    obs(TC_VISIT.hospitalised, hospitalised ? YES : NO),
    ...(next ? [obs(TC_VISIT.nextAppointment, `${next}T00:00:00.000+0000`)] : []),
  ]);
}

export const survey = encounter('tc-survey-1', '2024-02-05', [obs(TC_SURVEY.interviewDate, '2024-02-01T00:00:00.000+0000')]);
