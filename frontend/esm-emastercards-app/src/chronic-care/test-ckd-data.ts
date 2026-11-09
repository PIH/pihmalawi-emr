import { YES } from '../art/art-concepts';
import { type ArtEncounter } from '../art/art.resource';
import { MH_VISIT } from '../mental-health/mh-concepts';
import { NCD_HEADER } from '../shared/ncd';
import { CKD_HEADER, CKD_IMAGING, CKD_VISIT } from './ckd-concepts';
import { encounter, obs } from './test-htn-data';

/** Synthetic chronic kidney disease encounters, as useCardEncounters returns them, for tests */

export const ckdHeader = encounter('ckd-header-1', '2025-03-03', [
  obs(NCD_HEADER.agreesToFollowUp, YES),
  obs(CKD_HEADER.etiology, CKD_HEADER.etiologies[0].value),
  obs(CKD_HEADER.etiology, CKD_HEADER.etiologies[1].value),
  obs(CKD_HEADER.drugsEtiology, 'NSAIDs'),
  obs(NCD_HEADER.diagnosisGroup, null, [
    obs(NCD_HEADER.diagnosis, CKD_HEADER.diagnoses[1].answer),
    obs(NCD_HEADER.diagnosisDate, '2024-06-01T00:00:00.000+0000'),
  ]),
  obs(NCD_HEADER.tbStatus, NCD_HEADER.tbStatuses[0].value),
  obs(CKD_HEADER.tbDate, '2019-04-01T00:00:00.000+0000'),
]);

export function ckdVisit(
  uuid: string,
  date: string,
  {
    gfr = null as number | null,
    stage = null as number | null,
    confusion = false,
    meds = [] as Array<[string, number, 'OD' | 'BID', string?]>,
    next = null as string | null,
  } = {},
): ArtEncounter {
  return encounter(uuid, date, [
    ...(gfr !== null ? [obs(CKD_VISIT.gfr, gfr)] : []),
    ...(stage !== null ? [obs(CKD_VISIT.ckdStage, CKD_VISIT.ckdStages[stage].value)] : []),
    obs(CKD_VISIT.symptoms[0].concept, confusion ? YES : CKD_VISIT.no),
    ...meds.map(([key, dose, freq, otherName]) =>
      obs(MH_VISIT.dispensingGroup, null, [
        obs(MH_VISIT.medication, CKD_VISIT.medications.find((m) => m.key === key).drug),
        ...(otherName ? [obs(CKD_VISIT.otherMedication, otherName)] : []),
        obs(MH_VISIT.dose, dose),
        obs(MH_VISIT.doseUnit, MH_VISIT.doseUnits[0].value),
        obs(MH_VISIT.frequency, MH_VISIT.frequencies.find((f) => f.label === freq).value),
      ]),
    ),
    ...(next ? [obs(CKD_VISIT.nextAppointment, `${next}T00:00:00.000+0000`)] : []),
  ]);
}

export const ultrasound = encounter('ckd-uss-1', '2026-07-01', [obs(CKD_IMAGING.ultrasoundResult, 'Small echogenic kidneys')]);
