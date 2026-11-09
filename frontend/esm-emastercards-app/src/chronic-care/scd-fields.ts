import { YES } from '../art/art-concepts';
import { type ArtField } from '../art/art-fields';
import { medicationFields } from '../mental-health/mh-fields';
import { NCD_HEADER, NCD_PATIENT_GUARDIAN_FIELDS, question, YES_NO, YES_NO_UNKNOWN } from '../shared/ncd';
import { SCD_ANNUAL_MONITORING, SCD_HEADER, SCD_QUARTERLY_SCREENING, SCD_VISIT } from './scd-concepts';
import { HTN_HOSPITALISATION_FIELDS } from './htn-fields';

/** The header's sections, each shown in its own card on the page and edited in its own panel */
export type ScdHeaderSection = 'patientGuardian' | 'diagnosis' | 'history' | 'referral';

const diagnosisGroup = { concept: SCD_HEADER.diagnosisGroup };
const otherReferralGroup = { concept: SCD_HEADER.referralGroup, match: { concept: SCD_HEADER.referral, value: SCD_HEADER.otherReferral } };

/** sickle-cell-disease-emastercard.xml's questions, by the card on the page that shows and edits them; it refuses future dates */
export const SCD_HEADER_SECTIONS: Record<ScdHeaderSection, { title: string; fields: Array<ArtField> }> = {
  patientGuardian: { title: 'Patient and Guardian Details', fields: NCD_PATIENT_GUARDIAN_FIELDS },
  diagnosis: {
    title: 'Diagnosis and Tests',
    fields: [
      // the card's diagnosis, sickle cell disease, which the form saves in a hidden checkbox, with its required date
      {
        name: 'diagnosis',
        concept: SCD_HEADER.diagnosis,
        kind: 'coded',
        label: 'Diagnosis',
        options: [{ value: SCD_HEADER.sickleCellDisease, label: 'Sickle cell disease' }],
        hidden: true,
        group: diagnosisGroup,
      },
      { name: 'diagnosisDate', concept: SCD_HEADER.diagnosisDate, kind: 'date', label: 'Date of diagnosis', required: true, group: diagnosisGroup },
      ...SCD_HEADER.tests.flatMap((test): Array<ArtField> => [
        question(test.key, test.concept, test.label, YES_NO),
        // the test's date, asked once the test is answered Yes
        {
          name: `${test.key}Date`,
          concept: test.date,
          kind: 'date',
          label: `${test.label}: date`,
          shownWhen: (values) => String(values[test.key] ?? '').toLowerCase() === YES,
        },
      ]),
    ],
  },
  history: {
    title: 'HIV and Family History',
    fields: [
      question('hivStatus', NCD_HEADER.hivStatus, 'HIV status', [
        { value: NCD_HEADER.reactive, label: 'Reactive' },
        { value: NCD_HEADER.nonReactive, label: 'Non-reactive' },
      ]),
      { name: 'artStartDate', concept: NCD_HEADER.artStartDate, kind: 'date', label: 'ART start date' },
      { name: 'hivTestDate', concept: NCD_HEADER.hivTestDate, kind: 'date', label: 'HIV test date' },
      question('familyParent', SCD_HEADER.parent, 'Family history: parent', YES_NO_UNKNOWN),
      question('familySibling', SCD_HEADER.sibling, 'Family history: sibling', YES_NO_UNKNOWN),
    ],
  },
  referral: {
    title: 'Reasons for Referral',
    fields: [
      { name: 'referral', concept: SCD_HEADER.referral, kind: 'multi', label: 'Reasons for referral', options: SCD_HEADER.referrals },
      {
        name: 'otherReferral',
        concept: SCD_HEADER.referral,
        kind: 'coded',
        label: 'Other',
        checkbox: true,
        options: [{ value: SCD_HEADER.otherReferral, label: 'Other' }],
        group: otherReferralGroup,
      },
      { name: 'otherReferralName', concept: SCD_HEADER.nonCodedText, kind: 'text', label: 'Other reason: specify', group: otherReferralGroup },
    ],
  },
};

/** The card's diagnosis, saved with the header whenever its diagnosis section is, as the form's hidden checkbox is */
export const SCD_FIXED_VALUES = { diagnosis: SCD_HEADER.sickleCellDisease };

export const SCD_MEDICATIONS = SCD_VISIT.medications;

/** The visit's medications, as the other NCD visits ask them, an Other one named in the visit's Other medication concept */
export const SCD_MEDICATION_FIELDS: Array<ArtField> = SCD_MEDICATIONS.flatMap((m) =>
  medicationFields(m).map((f) => (f.name === 'med_otherName' ? { ...f, concept: SCD_VISIT.otherMedication } : f)),
);

/**
 * sickle-cell-disease-visit.xml's questions, in its order (medications are SCD_MEDICATION_FIELDS). Its height, weight
 * and blood pressure are obsreference fields: a value recorded the same day in another encounter, such as vitals, is
 * shown instead.
 */
export const SCD_VISIT_FIELDS: Record<string, ArtField> = {
  height: { name: 'height', concept: SCD_VISIT.height, kind: 'number', label: 'Height', unit: 'cm', reference: 'readonly' },
  weight: { name: 'weight', concept: SCD_VISIT.weight, kind: 'number', label: 'Weight', unit: 'kg', reference: 'readonly' },
  bmiMuac: { name: 'bmiMuac', concept: SCD_VISIT.bmiMuac, kind: 'number', label: 'BMI/MUAC' },
  systolicBp: { name: 'systolicBp', concept: SCD_VISIT.systolicBp, kind: 'number', label: 'Systolic BP', unit: 'mmHg', reference: 'readonly' },
  diastolicBp: { name: 'diastolicBp', concept: SCD_VISIT.diastolicBp, kind: 'number', label: 'Diastolic BP', unit: 'mmHg', reference: 'readonly' },
  pulse: { name: 'pulse', concept: SCD_VISIT.heartRate, kind: 'number', label: 'Heart rate', unit: '/min' },
  haemoglobin: { name: 'haemoglobin', concept: SCD_VISIT.haemoglobin, kind: 'number', label: 'Hb', unit: 'g/dL' },
  spo2: { name: 'spo2', concept: SCD_VISIT.spo2, kind: 'number', label: 'SpO2', unit: '%' },
  temperature: { name: 'temperature', concept: SCD_VISIT.temperature, kind: 'number', label: 'Temperature', unit: '°C' },
  ...Object.fromEntries(SCD_VISIT.findings.map((f) => [f.key, question(f.key, f.concept, f.label, YES_NO)])),
  nextAppointment: { name: 'nextAppointment', concept: SCD_VISIT.nextAppointment, kind: 'date', label: 'Next appointment', future: true },
};

export const SCD_FINDING_FIELDS = SCD_VISIT.findings.map((f) => SCD_VISIT_FIELDS[f.key]);

/** sickle-cell-disease-quarterly-screening.xml */
export const SCD_QUARTERLY_SCREENING_FIELDS: Array<ArtField> = [
  question('hivStatus', SCD_QUARTERLY_SCREENING.hivStatus, 'HIV', SCD_QUARTERLY_SCREENING.hivStatuses),
  question('fbc', SCD_QUARTERLY_SCREENING.fbc, 'FBC', SCD_QUARTERLY_SCREENING.fbcAnswers),
];

/** sickle-cell-disease-annual-monitoring.xml */
export const SCD_ANNUAL_MONITORING_FIELDS: Array<ArtField> = [
  { name: 'creatinine', concept: SCD_ANNUAL_MONITORING.creatinine, kind: 'number', label: 'Creatinine', unit: 'mg/dL' },
  { name: 'alt', concept: SCD_ANNUAL_MONITORING.alt, kind: 'number', label: 'ALT', unit: 'U/L' },
  { name: 'ast', concept: SCD_ANNUAL_MONITORING.ast, kind: 'number', label: 'AST', unit: 'U/L' },
  { name: 'totalBilirubin', concept: SCD_ANNUAL_MONITORING.totalBilirubin, kind: 'number', label: 'Bilirubin', unit: 'mg/dL' },
  { name: 'directBilirubin', concept: SCD_ANNUAL_MONITORING.directBilirubin, kind: 'number', label: 'Direct bilirubin', unit: 'mg/dL' },
  { name: 'indirectBilirubin', concept: SCD_ANNUAL_MONITORING.indirectBilirubin, kind: 'number', label: 'Indirect bilirubin', unit: 'mg/dL' },
];

/** sickle-cell-disease-hospitalization-history.xml, which asks what the hypertension and diabetes one does */
export const SCD_HOSPITALISATION_FIELDS = HTN_HOSPITALISATION_FIELDS;
