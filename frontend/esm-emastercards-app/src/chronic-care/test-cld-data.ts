import { YES } from '../art/art-concepts';
import { type ArtEncounter } from '../art/art.resource';
import { MH_VISIT } from '../mental-health/mh-concepts';
import { NCD_HEADER } from '../shared/ncd';
import { ASTHMA, CLD_HEADER, CLD_PEAK_FLOW, CLD_VISIT, COPD } from './cld-concepts';
import { encounter, obs } from './test-htn-data';

/** Synthetic chronic lung disease encounters, as useCardEncounters returns them, for tests */

const diagnosis = (answer: string, date: string) =>
  obs(NCD_HEADER.diagnosisGroup, null, [obs(NCD_HEADER.diagnosis, answer), obs(NCD_HEADER.diagnosisDate, `${date}T00:00:00.000+0000`)]);

export const cldHeader = encounter('cld-header-1', '2025-04-02', [
  obs(NCD_HEADER.agreesToFollowUp, YES),
  diagnosis(ASTHMA, '2025-03-01'),
  obs(CLD_HEADER.symptom, CLD_HEADER.dryCough),
  obs(CLD_HEADER.coughDuration, 6),
  obs(CLD_HEADER.exposureGroup, null, [
    obs(CLD_HEADER.exposure, CLD_HEADER.exposures[0].answer),
    obs(CLD_HEADER.exposureDate, '2024-01-10T00:00:00.000+0000'),
  ]),
  obs(CLD_HEADER.cooking, CLD_HEADER.indoors),
]);

export const copdOnlyHeader = encounter('cld-header-2', '2025-04-02', [obs(NCD_HEADER.agreesToFollowUp, YES), diagnosis(COPD, '2025-03-01')]);

export function cldVisit(
  uuid: string,
  date: string,
  {
    daySymptoms = null as number | null,
    nightSymptoms = null as number | null,
    perWeek = null as number | null,
    exacerbation = false,
    severity = null as number | null,
    meds = [] as Array<[string, number, string, 'OD' | 'BID']>,
    next = null as string | null,
  } = {},
): ArtEncounter {
  return encounter(uuid, date, [
    ...(daySymptoms !== null ? [obs(CLD_VISIT.daySymptoms, daySymptoms)] : []),
    ...(nightSymptoms !== null ? [obs(CLD_VISIT.nightSymptoms, nightSymptoms)] : []),
    ...(perWeek !== null ? [obs(CLD_VISIT.inhalerPerWeek, perWeek)] : []),
    obs(CLD_VISIT.exacerbation, exacerbation ? YES : '6557646c-977f-11e1-8993-905e29aff6c1'),
    ...(severity !== null ? [obs(CLD_VISIT.asthmaSeverity, CLD_VISIT.severities[severity].value)] : []),
    ...meds.map(([key, dose, unit, freq]) =>
      obs(MH_VISIT.dispensingGroup, null, [
        obs(MH_VISIT.medication, CLD_VISIT.medications.find((m) => m.key === key).drug),
        obs(MH_VISIT.dose, dose),
        obs(MH_VISIT.doseUnit, CLD_VISIT.doseUnits.find((u) => u.label === unit).value),
        obs(MH_VISIT.frequency, MH_VISIT.frequencies.find((f) => f.label === freq).value),
      ]),
    ),
    ...(next ? [obs(CLD_VISIT.nextAppointment, `${next}T00:00:00.000+0000`)] : []),
  ]);
}

export const peakFlow = encounter('cld-pf-1', '2026-09-15', [obs(CLD_PEAK_FLOW.result, 320)]);
