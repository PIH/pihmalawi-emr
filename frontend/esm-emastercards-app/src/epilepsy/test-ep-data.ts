import { NO, YES } from '../art/art-concepts';
import { type ArtEncounter, type ArtObs } from '../art/art.resource';
import { MH_VISIT } from '../mental-health/mh-concepts';
import { EP_HEADER, EP_VISIT, TRIGGERS } from './ep-concepts';

/** Synthetic epilepsy encounters, as useCardEncounters returns them, for tests */

let next = 0;
export function obs(concept: string, value: ArtObs['value'], groupMembers?: Array<ArtObs>, comment?: string): ArtObs {
  next += 1;
  return {
    uuid: `ep-obs-${next}`,
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

const seizureType = (key: string) => EP_HEADER.seizureTypes.find((s) => s.key === key).concept;
const exposure = (key: string) => EP_HEADER.exposures.find((e) => e.key === key).answer;

export const epHeader = encounter('ep-header-1', '2026-01-09', [
  obs(EP_HEADER.diagnosisGroup, null, [obs(EP_HEADER.diagnosis, EP_HEADER.epilepsy)]),
  obs(EP_HEADER.agreesToFollowUp, YES),
  obs(EP_HEADER.guardianName, 'Test Guardian'),
  obs(seizureType('tonicClonic'), YES),
  obs(seizureType('absence'), NO),
  obs(EP_HEADER.onsetMonth, 3),
  obs(EP_HEADER.onsetYear, 2019),
  obs(EP_HEADER.exposureGroup, null, [obs(EP_HEADER.exposure, exposure('alcohol')), obs(EP_HEADER.exposureDate, '2018-06-01T00:00:00.000+0000')]),
  obs(EP_HEADER.exposureGroup, null, [obs(EP_HEADER.exposure, exposure('other'), undefined, 'Glue')]),
]);

type Med = [string, number, 'OD' | 'BID'];

export function epVisit(
  uuid: string,
  date: string,
  {
    seizures = false,
    count = null as number | null,
    triggers = [] as Array<string>,
    hospitalised = false,
    meds = [] as Array<Med>,
    next: nextAppointment = null as string | null,
  } = {},
): ArtEncounter {
  const medObs = meds.map(([key, dose, freq]) => {
    const med = EP_VISIT.medications.find((m) => m.key === key);
    return obs(MH_VISIT.dispensingGroup, null, [
      obs(MH_VISIT.medication, med.drug),
      obs(MH_VISIT.dose, dose),
      obs(MH_VISIT.doseUnit, MH_VISIT.doseUnits[0].value),
      obs(MH_VISIT.frequency, MH_VISIT.frequencies.find((f) => f.label === freq).value),
    ]);
  });
  return encounter(uuid, date, [
    obs(EP_VISIT.anySeizures, seizures ? YES : NO),
    ...(count !== null ? [obs(EP_VISIT.numberOfSeizures, count)] : []),
    obs(EP_VISIT.anyTriggers, triggers.length ? YES : NO),
    ...triggers.map((key) => obs(EP_VISIT.trigger, TRIGGERS.find((tr) => tr.key === key).answer)),
    obs(EP_VISIT.hospitalised, hospitalised ? YES : NO),
    ...medObs,
    ...(nextAppointment ? [obs(EP_VISIT.nextAppointment, `${nextAppointment}T00:00:00.000+0000`)] : []),
  ]);
}
