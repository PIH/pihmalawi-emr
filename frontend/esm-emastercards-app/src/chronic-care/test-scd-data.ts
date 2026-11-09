import { YES } from '../art/art-concepts';
import { type ArtEncounter } from '../art/art.resource';
import { MH_VISIT } from '../mental-health/mh-concepts';
import { NCD_HEADER } from '../shared/ncd';
import { SCD_ANNUAL_MONITORING, SCD_HEADER, SCD_VISIT } from './scd-concepts';
import { encounter, obs } from './test-htn-data';

/** Synthetic sickle cell disease encounters, as useCardEncounters returns them, for tests */

export const scdHeader = encounter('scd-header-1', '2024-05-06', [
  obs(NCD_HEADER.agreesToFollowUp, YES),
  obs(SCD_HEADER.diagnosisGroup, null, [
    obs(SCD_HEADER.diagnosis, SCD_HEADER.sickleCellDisease),
    obs(SCD_HEADER.diagnosisDate, '2024-04-20T00:00:00.000+0000'),
  ]),
  obs(SCD_HEADER.tests[2].concept, YES),
  obs(SCD_HEADER.tests[2].date, '2024-04-18T00:00:00.000+0000'),
  obs(SCD_HEADER.referral, SCD_HEADER.referrals[2].value),
  obs(SCD_HEADER.referralGroup, null, [obs(SCD_HEADER.referral, SCD_HEADER.otherReferral), obs(SCD_HEADER.nonCodedText, 'School nurse')]),
]);

const finding = (key: string) => SCD_VISIT.findings.find((f) => f.key === key).concept;

export function scdVisit(
  uuid: string,
  date: string,
  {
    hb = null as number | null,
    pain = false,
    hospitalised = false,
    meds = [] as Array<[string, number, 'OD' | 'BID']>,
    next = null as string | null,
  } = {},
): ArtEncounter {
  return encounter(uuid, date, [
    ...(hb !== null ? [obs(SCD_VISIT.haemoglobin, hb)] : []),
    obs(finding('pain'), pain ? YES : SCD_VISIT.no),
    obs(finding('hospitalised'), hospitalised ? YES : SCD_VISIT.no),
    ...meds.map(([key, dose, freq]) =>
      obs(MH_VISIT.dispensingGroup, null, [
        obs(MH_VISIT.medication, SCD_VISIT.medications.find((m) => m.key === key).drug),
        obs(MH_VISIT.dose, dose),
        obs(MH_VISIT.doseUnit, MH_VISIT.doseUnits[0].value),
        obs(MH_VISIT.frequency, MH_VISIT.frequencies.find((f) => f.label === freq).value),
      ]),
    ),
    ...(next ? [obs(SCD_VISIT.nextAppointment, `${next}T00:00:00.000+0000`)] : []),
  ]);
}

export const annualMonitoring = encounter('scd-annual-1', '2026-06-01', [
  obs(SCD_ANNUAL_MONITORING.alt, 42),
  obs(SCD_ANNUAL_MONITORING.totalBilirubin, 3),
]);
