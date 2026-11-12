import { encounter, obs } from '../chronic-care/test-htn-data';
import { CNS_INFECTION, PDC_CONDITIONS, PDC_HEADER as H, WEEKS, YES } from './pdc-concepts';

/** A synthetic PDC card header, as useCardEncounters returns it, for tests */

const condition = (key: string) => PDC_CONDITIONS.find((c) => c.key === key).value;

export const pdcHeader = encounter('pdc-header-1', '2026-03-12', [
  obs(H.agreesToFollowUp, YES),
  obs(H.guardianName, 'Guardian Name'),
  obs(H.relationToPatient, 'Mother'),
  obs(H.ageAtIntakeGroup, null, [obs(H.timeUnits, WEEKS), obs(H.ageOfChild, 52)]),
  obs(H.sourceOfReferralGroup, null, [obs(H.sourceOfReferral, H.sourcesOfReferral[2].value)]),
  obs(H.reasonForReferralGroup, null, [obs(H.reasonForReferral, condition('hie'))]),
  obs(H.reasonForReferralGroup, null, [{ ...obs(H.reasonForReferral, CNS_INFECTION), comment: 'meningitis' }]),
  obs(H.motherHivGroup, null, [obs(H.hivStatus, H.hivStatuses[1].value)]),
  obs(H.diagnosis, condition('hie')),
  obs(H.diagnosis, condition('lowBirthWeight')),
  obs(H.feedGroup, null, [obs(H.typeOfFeed, H.typesOfFeed[0].value), obs(H.typeOfFeed, H.typesOfFeed[3].value)]),
  obs(H.enrolledInPdc, YES),
  obs(H.dateOfEnrollment, '2026-03-12'),
]);
