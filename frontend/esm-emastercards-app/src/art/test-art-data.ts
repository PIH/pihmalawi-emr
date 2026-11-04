import { ART_INITIAL, ART_VISIT, FOLLOW_UP_TESTING, REGIMENS, VIRAL_LOAD, YES } from './art-concepts';
import { type ArtEncounter, type ArtObs } from './art.resource';

/** Synthetic ART encounters, as useArtEncounters returns them, for tests */

export const regimen = (label: string) => REGIMENS.find((r) => r.label === label).uuid;

let next = 0;
function obs(concept: string, value: ArtObs['value'], obsDatetime: string, groupMembers?: Array<ArtObs>): ArtObs {
  next += 1;
  return { uuid: `obs-${next}`, concept, value, obsDatetime, ...(groupMembers ? { groupMembers } : {}) };
}

export function encounter(uuid: string, date: string, obsList: Array<ArtObs>, overrides: Partial<ArtEncounter> = {}): ArtEncounter {
  return {
    uuid,
    encounterDatetime: `${date}T09:00:00.000+0000`,
    location: { uuid: 'neno-dh', display: 'Neno District Hospital' },
    visit: { uuid: `visit-${uuid}` },
    form: null,
    obs: obsList,
    ...overrides,
  };
}

export function artVisit(uuid: string, date: string, values: { regimen: string; tablets?: number; next?: string; tb?: string; weight?: number; pills?: number; ctx?: number }) {
  const at = `${date}T09:00:00.000+0000`;
  const list = [
    obs(ART_VISIT.artRegimen, regimen(values.regimen), at),
    obs(ART_VISIT.numArvsGiven, values.tablets ?? 90, at),
    obs(ART_VISIT.arvsGivenTo, false, at),
    obs(ART_VISIT.nextAppointment, `${values.next ?? '2027-02-03'}T00:00:00.000+0000`, at),
    obs(ART_VISIT.tbStatus, values.tb ?? ART_VISIT.tbStatusAnswers.notSuspected, at),
    obs(ART_VISIT.sideEffects, ART_VISIT.sideEffectAnswers.no, at),
  ];
  if (values.weight) {
    list.push(obs(ART_VISIT.weight, values.weight, at));
  }
  if (values.pills !== undefined) {
    list.push(obs(ART_VISIT.pillCount, values.pills, at));
  }
  if (values.ctx) {
    list.push(
      obs(ART_VISIT.preventiveTherapyGroup, null, at, [
        obs(ART_VISIT.preventiveTherapyStatus, ART_VISIT.preventiveTherapies.ctx, at),
        obs(ART_VISIT.preventiveTherapyPills, values.ctx, at),
      ]),
    );
  }
  return encounter(uuid, date, list);
}

export const visits = [
  artVisit('v3', '2026-08-05', { regimen: '13A', next: '2026-11-04', weight: 60, pills: 4, ctx: 90 }),
  artVisit('v2', '2026-05-06', { regimen: '13A', next: '2026-08-05' }),
  artVisit('v1', '2022-01-10', { regimen: '5A', next: '2022-04-10', tb: ART_VISIT.tbStatusAnswers.suspected }),
];

const initialAt = '2019-02-18T00:00:00.000+0000';
export const initial = encounter('initial-1', '2019-02-18', [
  obs(ART_INITIAL.whoStage, ART_INITIAL.whoStageAnswers.stage2, initialAt),
  obs(ART_INITIAL.hivRelatedDiseases, 'Herpes zoster', initialAt),
  obs(ART_INITIAL.cd4Count, 312, initialAt),
  obs(ART_INITIAL.ageAtInitiation, 26, initialAt),
  obs(ART_INITIAL.confirmatoryTestType, ART_INITIAL.confirmatoryTestTypeAnswers.rapid, initialAt),
  obs(ART_INITIAL.confirmatoryTestLocation, 'Neno District Hospital', initialAt),
  obs(ART_INITIAL.guardianName, 'Test Guardian', initialAt),
  obs(ART_INITIAL.guardianRelation, 'Sister', initialAt),
  obs(ART_INITIAL.agreesToFollowUp, YES, initialAt),
  obs(ART_INITIAL.regimens[0].regimen, regimen('5A'), initialAt),
  obs(ART_INITIAL.regimens[0].startDate, '2019-02-18T00:00:00.000+0000', initialAt),
]);

const vlAt = (date: string) => `${date}T09:00:00.000+0000`;
export const viralLoad = (uuid: string, date: string, result: { numeric?: number; lessThan?: number; ldl?: boolean }) =>
  encounter(uuid, date, [
    obs(VIRAL_LOAD.group, null, vlAt(date), [
      obs(VIRAL_LOAD.sampleTaken, true, vlAt(date)),
      ...(result.numeric !== undefined ? [obs(VIRAL_LOAD.result, result.numeric, vlAt(date))] : []),
      ...(result.lessThan !== undefined ? [obs(VIRAL_LOAD.lessThanLimit, result.lessThan, vlAt(date))] : []),
      ...(result.ldl ? [obs(VIRAL_LOAD.ldl, true, vlAt(date))] : []),
    ]),
  ]);

export const followUpTests = [
  encounter('fu-1', '2025-09-02', [obs(FOLLOW_UP_TESTING.cd4Count, 540, vlAt('2025-09-02'))]),
];
