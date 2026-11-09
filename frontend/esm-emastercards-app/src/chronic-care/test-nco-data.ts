import { YES } from '../art/art-concepts';
import { type ArtEncounter } from '../art/art.resource';
import { NCD_HEADER } from '../shared/ncd';
import { NCO_ANNUAL_LABS, NCO_HEADER, NCO_VISIT } from './nco-concepts';
import { encounter, obs } from './test-htn-data';

/** Synthetic NCD other encounters, as useCardEncounters returns them, for tests */

export const ncoHeader = encounter('nco-header-1', '2025-01-07', [
  obs(NCD_HEADER.agreesToFollowUp, YES),
  obs(NCD_HEADER.diagnosisGroup, null, [
    obs(NCD_HEADER.diagnosis, NCO_HEADER.diagnoses[1].answer),
    obs(NCD_HEADER.diagnosisDate, '2024-12-01T00:00:00.000+0000'),
  ]),
  obs(NCD_HEADER.diagnosisGroup, null, [
    obs(NCD_HEADER.diagnosis, NCO_HEADER.diagnoses[4].answer),
    obs(NCO_HEADER.otherDiagnosis, 'Lupus'),
    obs(NCD_HEADER.diagnosisDate, '2023-03-01T00:00:00.000+0000'),
  ]),
  obs(NCO_HEADER.comorbidity, NCO_HEADER.comorbidities[0].value),
  obs(NCD_HEADER.tbStatus, NCD_HEADER.tbStatuses[1].value),
  obs(NCO_HEADER.tbDate, '2018-02-01T00:00:00.000+0000'),
]);

export function ncoVisit(
  uuid: string,
  date: string,
  { medications = null as string | null, changed = false, hospitalised = false, next = null as string | null } = {},
): ArtEncounter {
  return encounter(uuid, date, [
    ...(medications ? [obs(NCO_VISIT.medications, medications)] : []),
    obs(NCO_VISIT.medicationsChanged, changed ? YES : NCO_VISIT.no),
    obs(NCO_VISIT.hospitalised, hospitalised ? YES : NCO_VISIT.no),
    ...(next
      ? [
          obs(NCO_VISIT.nextAppointment, `${next}T00:00:00.000+0000`),
          obs(NCO_VISIT.nextAppointmentLocation, NCO_VISIT.nextAppointmentLocations[1].value),
        ]
      : []),
  ]);
}

export const annualLab = encounter('nco-annual-1', '2026-05-02', [
  obs(NCO_ANNUAL_LABS.potassium, 4.2),
  obs(NCO_ANNUAL_LABS.proteinuria, NCO_ANNUAL_LABS.proteinuriaAnswers[1].value),
]);
