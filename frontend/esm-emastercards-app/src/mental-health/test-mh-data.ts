import { YES, NO } from '../art/art-concepts';
import { type ArtEncounter, type ArtObs } from '../art/art.resource';
import { EXPOSURE, MH_HEADER, MH_SCREENING, MH_VISIT, PAST } from './mh-concepts';

/** Synthetic mental health encounters, as useCardEncounters returns them, for tests */

let next = 0;
export function obs(concept: string, value: ArtObs['value'], groupMembers?: Array<ArtObs>, comment?: string): ArtObs {
  next += 1;
  return {
    uuid: `mh-obs-${next}`,
    concept,
    value,
    obsDatetime: '2026-01-01T09:00:00.000+0000',
    ...(groupMembers ? { groupMembers } : {}),
    ...(comment ? { comment } : {}),
  };
}

export function encounter(uuid: string, date: string, obsList: Array<ArtObs>): ArtEncounter {
  return {
    uuid,
    encounterDatetime: `${date}T09:00:00.000+0000`,
    location: { uuid: 'neno-dh', display: 'Neno District Hospital' },
    visit: { uuid: `visit-${uuid}` },
    form: null,
    obs: obsList,
  };
}

const dx = (key: string, date: string) => {
  const d = MH_HEADER.diagnoses.find((x) => x.key === key);
  return obs(MH_HEADER.diagnosisGroup, null, [obs(MH_HEADER.diagnosis, d.answer), obs(MH_HEADER.diagnosisDate, `${date}T00:00:00.000+0000`)]);
};

export const mhHeader = encounter('mh-header-1', '2025-03-12', [
  obs(MH_HEADER.agreesToFollowUp, YES),
  obs(MH_HEADER.guardianName, 'Test Guardian'),
  dx('schizophrenia', '2025-03-12'),
  obs(MH_HEADER.presentingFeatureGroup, null, [
    obs(MH_HEADER.presentingFeature, MH_HEADER.presentingFeatures[0].answer),
    obs(MH_HEADER.diagnosisDate, '2025-03-01T00:00:00.000+0000'),
  ]),
  obs(EXPOSURE.alcoholGroup, null, [obs(EXPOSURE.alcoholHistory, PAST)]),
]);

const drug = (key: string) => MH_VISIT.medications.find((m) => m.key === key).drug;
const unit = (label: string) => MH_VISIT.doseUnits.find((u) => u.label === label).value;
const frequency = (label: string) => MH_VISIT.frequencies.find((f) => f.label === label).value;

export function mhVisit(
  uuid: string,
  date: string,
  values: { stable?: boolean; suicide?: boolean; able?: boolean; present?: Array<string>; absent?: Array<string>; meds?: Array<[string, number, string]>; next?: string; hospitalised?: boolean },
) {
  const yesNo = (v: boolean) => (v ? YES : NO);
  return encounter(uuid, date, [
    obs(MH_VISIT.stable, yesNo(values.stable ?? true)),
    obs(MH_VISIT.suicideRisk, yesNo(values.suicide ?? false)),
    obs(MH_VISIT.dailyActivities, yesNo(values.able ?? true)),
    obs(MH_VISIT.hospitalised, yesNo(values.hospitalised ?? false)),
    obs(MH_VISIT.counselling, YES),
    ...(values.present ?? []).map((a) => obs(MH_VISIT.msePresent, a)),
    ...(values.absent ?? []).map((a) => obs(MH_VISIT.mseAbsent, a)),
    ...(values.meds ?? []).map(([key, dose, freq]) =>
      obs(MH_VISIT.dispensingGroup, null, [
        obs(MH_VISIT.medication, drug(key)),
        obs(MH_VISIT.dose, dose),
        obs(MH_VISIT.doseUnit, unit('mg')),
        obs(MH_VISIT.frequency, frequency(freq)),
      ]),
    ),
    obs(MH_VISIT.nextAppointment, `${values.next ?? '2026-11-04'}T00:00:00.000+0000`),
  ]);
}

export const mhScreening = (uuid: string, date: string) =>
  encounter(uuid, date, [
    obs(MH_SCREENING.diagnosis, MH_SCREENING.diagnoses[0].value),
    obs(MH_SCREENING.intervention, MH_SCREENING.interventions[0].value),
    obs(MH_SCREENING.session, MH_SCREENING.sessions[0].value),
    obs(MH_SCREENING.outcome, MH_SCREENING.outcomes[0].value),
    obs(MH_SCREENING.nextAppointment, '2026-12-01T00:00:00.000+0000'),
  ]);
