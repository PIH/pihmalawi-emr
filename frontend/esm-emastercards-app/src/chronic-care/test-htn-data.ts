import { YES } from '../art/art-concepts';
import { type ArtEncounter, type ArtObs } from '../art/art.resource';
import { MH_VISIT } from '../mental-health/mh-concepts';
import { HTN_ANNUAL_LABS, HTN_HEADER, HTN_HOSPITALISATION, HTN_QUARTERLY_LABS, HTN_VISIT } from './htn-concepts';

/** Synthetic hypertension and diabetes encounters, as useCardEncounters returns them, for tests */

let next = 0;
export function obs(concept: string, value: ArtObs['value'], groupMembers?: Array<ArtObs>): ArtObs {
  next += 1;
  return {
    uuid: `htn-obs-${next}`,
    concept,
    value,
    obsDatetime: '2026-01-01T09:00:00.000+0000',
    ...(groupMembers ? { groupMembers } : {}),
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

const diagnosis = (key: string) => HTN_HEADER.diagnoses.find((d) => d.key === key).answer;

export const htnHeader = encounter('htn-header-1', '2025-06-02', [
  obs(HTN_HEADER.agreesToFollowUp, YES),
  obs(HTN_HEADER.guardianName, 'Test Guardian'),
  obs(HTN_HEADER.diagnosisGroup, null, [obs(HTN_HEADER.diagnosis, diagnosis('htn')), obs(HTN_HEADER.diagnosisDate, '2025-05-20T00:00:00.000+0000')]),
  obs(HTN_HEADER.diagnosisGroup, null, [obs(HTN_HEADER.diagnosis, diagnosis('dm2')), obs(HTN_HEADER.diagnosisDate, '2024-02-01T00:00:00.000+0000')]),
  obs(HTN_HEADER.familyHypertension, YES),
  obs(HTN_HEADER.complicationGroup, null, [
    obs(HTN_HEADER.complication, HTN_HEADER.complications[0].answer),
    obs(HTN_HEADER.diagnosisDate, '2023-08-10T00:00:00.000+0000'),
  ]),
]);

type Med = [string, number, 'OD' | 'BID'];

export function htnVisit(
  uuid: string,
  date: string,
  {
    bp = null as [number, number] | null,
    hbA1c = null as number | null,
    meds = [] as Array<Med>,
    next: nextAppointment = null as string | null,
    ulcers = false,
  } = {},
): ArtEncounter {
  const medObs = meds.map(([key, dose, freq]) =>
    obs(MH_VISIT.dispensingGroup, null, [
      obs(MH_VISIT.medication, HTN_VISIT.medications.find((m) => m.key === key).drug),
      obs(MH_VISIT.dose, dose),
      obs(MH_VISIT.doseUnit, MH_VISIT.doseUnits[0].value),
      obs(MH_VISIT.frequency, MH_VISIT.frequencies.find((f) => f.label === freq).value),
    ]),
  );
  return encounter(uuid, date, [
    ...(bp ? [obs(HTN_VISIT.systolicBp, bp[0]), obs(HTN_VISIT.diastolicBp, bp[1])] : []),
    ...(hbA1c !== null ? [obs(HTN_VISIT.hbA1c, hbA1c)] : []),
    ...(ulcers ? [obs(HTN_VISIT.footChecks[2].concept, YES)] : []),
    ...medObs,
    ...(nextAppointment ? [obs(HTN_VISIT.nextAppointment, `${nextAppointment}T00:00:00.000+0000`)] : []),
  ]);
}

export const quarterlyLab = encounter('htn-q1', '2026-09-10', [
  obs(HTN_QUARTERLY_LABS.proteinuria, HTN_QUARTERLY_LABS.proteinuriaAnswers[1].value),
  obs(HTN_QUARTERLY_LABS.hivTestGroup, null, [
    obs(HTN_QUARTERLY_LABS.hivResult, HTN_QUARTERLY_LABS.hivResults[1].value),
    obs(HTN_QUARTERLY_LABS.hivSampleDate, '2026-09-10T00:00:00.000+0000'),
  ]),
]);

export const annualLab = encounter('htn-a1', '2026-03-04', [
  obs(HTN_ANNUAL_LABS.ecg, 'Sinus rhythm'),
  obs(HTN_ANNUAL_LABS.lipidProfile, HTN_ANNUAL_LABS.lipidAnswers[1].value),
]);

export const hospitalisation = encounter('htn-h1', '2026-07-21', [
  obs(HTN_HOSPITALISATION.lengthOfStay, 5),
  obs(HTN_HOSPITALISATION.admissionReason, 'Hyperglycaemia'),
]);
