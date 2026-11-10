import { type ArtField } from '../art/art-fields';
import { NCD_PATIENT_GUARDIAN_FIELDS, question } from '../shared/ncd';
import { EC_EID, EC_HEADER, EC_VISIT } from './ec-concepts';

/** The header's sections, each shown in its own card on the page and edited in its own panel */
export type EcHeaderSection = 'patientGuardian' | 'status';

const nvpStart = { concept: EC_HEADER.nvpStartGroup };
const nvpDuration = { concept: EC_HEADER.nvpDurationGroup };

/** exposed-child-emastercard.xml's questions, by the card on the page that shows and edits them */
export const EC_HEADER_SECTIONS: Record<EcHeaderSection, { title: string; fields: Array<ArtField> }> = {
  patientGuardian: {
    title: 'Child and Guardian Details',
    fields: [
      NCD_PATIENT_GUARDIAN_FIELDS.find((f) => f.name === 'transferInDate'),
      { name: 'guardianName', concept: EC_HEADER.guardianName, kind: 'text', label: 'Guardian name' },
      { name: 'guardianPhone', concept: EC_HEADER.guardianPhone, kind: 'text', label: 'Guardian phone' },
      { name: 'guardianRelation', concept: EC_HEADER.guardianRelation, kind: 'text', label: 'Guardian relation' },
      NCD_PATIENT_GUARDIAN_FIELDS.find((f) => f.name === 'agreesToFollowUp'),
    ],
  },
  status: {
    title: 'Status at Enrolment',
    fields: [
      question('motherStatus', EC_HEADER.motherStatus.concept, 'Mother: status', EC_HEADER.motherStatus.answers),
      { name: 'motherArtNumber', concept: EC_HEADER.motherArtNumber, kind: 'text', label: 'Mother: ART registration number' },
      { name: 'motherArtStartDate', concept: EC_HEADER.motherArtStartDate, kind: 'date', label: 'Mother: ART start date', future: true },
      { name: 'enrolmentAge', concept: EC_HEADER.enrolmentAge, kind: 'number', label: 'Child: age at enrolment', unit: 'weeks' },
      // each its own group of the number and its unit, weeks unless months is chosen
      { name: 'nvpStartAge', concept: EC_HEADER.nvpStartAge, kind: 'number', label: 'Child: age when starting NVP', group: nvpStart },
      { ...question('nvpStartAgeUnit', EC_HEADER.nvpStartAgeUnit, 'Age when starting NVP: unit', EC_HEADER.timeUnits), group: nvpStart },
      { name: 'nvpDuration', concept: EC_HEADER.nvpDuration, kind: 'number', label: 'Child: NVP duration', group: nvpDuration },
      { ...question('nvpDurationUnit', EC_HEADER.nvpDurationUnit, 'NVP duration: unit', EC_HEADER.timeUnits), group: nvpDuration },
      { name: 'birthWeight', concept: EC_HEADER.birthWeight, kind: 'number', label: 'Birth weight', unit: 'kg' },
    ],
  },
};

/**
 * exposed-child-visit.xml's questions, in its order. Its height, weight, MUAC and breastfeeding are obsreference
 * fields: a value recorded the same day in another encounter, such as vitals, is shown instead.
 */
export const EC_VISIT_FIELDS: Record<string, ArtField> = {
  height: { name: 'height', concept: EC_VISIT.height, kind: 'number', label: 'Height', unit: 'cm', reference: 'readonly' },
  weight: { name: 'weight', concept: EC_VISIT.weight, kind: 'number', label: 'Weight', unit: 'kg', reference: 'readonly' },
  muac: { name: 'muac', concept: EC_VISIT.muac, kind: 'number', label: 'MUAC', unit: 'cm', reference: 'readonly' },
  wasting: question('wasting', EC_VISIT.wasting, 'Wasting/malnutrition', EC_VISIT.wastingAnswers),
  breastfeeding: { ...question('breastfeeding', EC_VISIT.breastfeeding, 'Breastfeeding', EC_VISIT.breastfeedingAnswers), reference: 'readonly' },
  motherStatus: question('motherStatus', EC_VISIT.motherStatus.concept, 'Mother status', EC_VISIT.motherStatus.answers),
  clinicalMonitoring: question('clinicalMonitoring', EC_VISIT.clinicalMonitoring, 'Clinical monitoring', EC_VISIT.clinicalMonitoringAnswers),
  childHivStatus: question('childHivStatus', EC_VISIT.childHivStatus, 'HIV infection', EC_VISIT.childHivStatuses),
  cpt: { name: 'cpt', concept: EC_VISIT.cpt, kind: 'number', label: 'CPT', unit: 'tablets' },
  nextAppointment: { name: 'nextAppointment', concept: EC_VISIT.nextAppointment, kind: 'date', label: 'Next appointment', future: true },
};

const eid = { concept: EC_EID.testGroup };

/** eid-test-results.xml's questions, all in the test's group; the lab locations are the concept's answers */
export const EC_EID_FIELDS: Array<ArtField> = [
  { ...question('testingReason', EC_EID.testingReason, 'Reason for testing', EC_EID.testingReasons), select: true, group: eid },
  { name: 'labLocation', concept: EC_EID.labLocation, kind: 'coded', label: 'Lab location', options: [], select: true, group: eid },
  { ...question('testType', EC_EID.testType, 'Test type', EC_EID.testTypes), group: eid },
  { name: 'sampleId', concept: EC_EID.sampleId, kind: 'text', label: 'Sample ID', group: eid },
  { ...question('result', EC_EID.result, 'HIV result', EC_EID.results), group: eid },
  { name: 'resultDate', concept: EC_EID.resultDate, kind: 'date', label: 'Result date', future: true, group: eid },
];
