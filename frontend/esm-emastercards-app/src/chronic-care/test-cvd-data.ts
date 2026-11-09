import { YES } from '../art/art-concepts';
import { type ArtEncounter } from '../art/art.resource';
import { MH_VISIT } from '../mental-health/mh-concepts';
import { NCD_HEADER } from '../shared/ncd';
import { CVD_ECHO, CVD_HEADER, CVD_VISIT, OTHER } from './cvd-concepts';
import { encounter, obs } from './test-htn-data';

/** Synthetic cardiac and vascular disease encounters, as useCardEncounters returns them, for tests */

const diagnosis = (key: string) => CVD_HEADER.diagnoses.find((d) => d.key === key).answer;

export const cvdHeader = encounter('cvd-header-1', '2025-02-10', [
  obs(NCD_HEADER.agreesToFollowUp, YES),
  obs(NCD_HEADER.diagnosisGroup, null, [
    obs(NCD_HEADER.diagnosis, diagnosis('cardiomyopathy')),
    obs(NCD_HEADER.diagnosisDate, '2025-01-15T00:00:00.000+0000'),
  ]),
  obs(CVD_HEADER.comorbidity, CVD_HEADER.comorbidities[2].value),
  { ...obs(CVD_HEADER.familyPlanning, OTHER), comment: 'Implant' },
  obs(CVD_HEADER.echoGroup, null, [obs(CVD_HEADER.imagingDate, '2025-01-20T00:00:00.000+0000'), obs(CVD_HEADER.echoResult, 'Dilated LV')]),
]);

export function cvdVisit(
  uuid: string,
  date: string,
  {
    bp = null as [number, number] | null,
    nyha = null as number | null,
    hospitalised = false,
    meds = [] as Array<[string, number, 'OD' | 'BID']>,
    next = null as string | null,
  } = {},
): ArtEncounter {
  return encounter(uuid, date, [
    ...(bp ? [obs(CVD_VISIT.systolicBp, bp[0]), obs(CVD_VISIT.diastolicBp, bp[1])] : []),
    ...(nyha !== null ? [obs(CVD_VISIT.nyha, CVD_VISIT.nyhaClasses[nyha].value)] : []),
    obs(CVD_VISIT.hospitalised, hospitalised ? YES : CVD_VISIT.no),
    ...meds.map(([key, dose, freq]) =>
      obs(MH_VISIT.dispensingGroup, null, [
        obs(MH_VISIT.medication, CVD_VISIT.medications.find((m) => m.key === key).drug),
        obs(MH_VISIT.dose, dose),
        obs(MH_VISIT.doseUnit, MH_VISIT.doseUnits[0].value),
        obs(MH_VISIT.frequency, MH_VISIT.frequencies.find((f) => f.label === freq).value),
      ]),
    ),
    ...(next ? [obs(CVD_VISIT.nextAppointment, `${next}T00:00:00.000+0000`)] : []),
  ]);
}

export const echo = encounter('cvd-echo-1', '2026-08-02', [
  obs(CVD_ECHO.lvsf, CVD_ECHO.lvsfAnswers[1].value),
  obs(CVD_ECHO.pericardialEffusion, CVD_ECHO.pericardialEffusionAnswers[0].value),
]);
