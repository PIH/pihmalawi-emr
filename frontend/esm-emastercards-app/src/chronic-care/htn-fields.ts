import { NO, YES } from '../art/art-concepts';
import { type ArtField, type Option } from '../art/art-fields';
import { medicationFields } from '../mental-health/mh-fields';
import { type DrugClass, HTN_ANNUAL_LABS, HTN_HEADER, HTN_HOSPITALISATION, HTN_QUARTERLY_LABS, HTN_VISIT, UNKNOWN } from './htn-concepts';

const YES_NO: Array<Option> = [
  { value: YES, label: 'Yes' },
  { value: NO, label: 'No' },
];
const YES_NO_UNKNOWN: Array<Option> = [...YES_NO, { value: UNKNOWN, label: 'Unknown' }];

/** The header's sections, each shown in its own card on the page and edited in its own panel */
export type HtnHeaderSection = 'patientGuardian' | 'diagnoses' | 'history';

const question = (name: string, concept: string, label: string, options: Array<Option>): ArtField => ({
  name,
  concept,
  kind: 'coded',
  label,
  options,
});

/**
 * A checkbox per answer, each with its date, in its own obs group, as the form's diagnoses and complications are; the
 * form requires the date of each one ticked and refuses a future one
 */
function datedGroups(
  prefix: string,
  groupConcept: string,
  answerConcept: string,
  answers: Array<{ key: string; answer: string; label: string }>,
): Array<ArtField> {
  return answers.flatMap((a) => {
    const group = {
      concept: groupConcept,
      match: { concept: answerConcept, value: a.answer },
    };
    const name = `${prefix}_${a.key}`;
    return [
      {
        name,
        concept: answerConcept,
        kind: 'coded' as const,
        label: a.label,
        checkbox: true,
        options: [{ value: a.answer, label: a.label }],
        group,
      },
      {
        name: `${name}Date`,
        concept: HTN_HEADER.diagnosisDate,
        kind: 'date' as const,
        label: `${a.label}: date`,
        group,
      },
    ];
  });
}

/** hypertension-and-diabetes-emastercard.xml's questions, by the card on the page that shows and edits them */
export const HTN_HEADER_SECTIONS: Record<HtnHeaderSection, { title: string; fields: Array<ArtField> }> = {
  patientGuardian: {
    title: 'Patient and Guardian Details',
    fields: [
      {
        name: 'transferInDate',
        concept: HTN_HEADER.transferInDate,
        kind: 'date',
        label: 'Transfer-in date',
        future: true,
      },
      {
        name: 'patientPhone',
        concept: HTN_HEADER.patientPhone,
        kind: 'number',
        label: 'Patient phone',
      },
      {
        name: 'guardianName',
        concept: HTN_HEADER.guardianName,
        kind: 'text',
        label: 'Guardian name',
      },
      {
        name: 'guardianPhone',
        concept: HTN_HEADER.guardianPhone,
        kind: 'text',
        label: 'Guardian phone',
      },
      {
        name: 'guardianRelation',
        concept: HTN_HEADER.relationToPatient,
        kind: 'text',
        label: 'Guardian relation to patient',
      },
      {
        name: 'agreesToFollowUp',
        concept: HTN_HEADER.agreesToFollowUp,
        kind: 'coded',
        label: 'Agrees to follow-up',
        required: true,
        options: [
          { value: NO, label: 'No' },
          { value: YES, label: 'Yes' },
        ],
      },
    ],
  },
  diagnoses: {
    title: 'Diagnoses and Family History',
    fields: [
      ...datedGroups('diagnosis', HTN_HEADER.diagnosisGroup, HTN_HEADER.diagnosis, HTN_HEADER.diagnoses),
      question('familyDiabetes', HTN_HEADER.familyDiabetes, 'Family history: diabetes', YES_NO_UNKNOWN),
      question('familyHypertension', HTN_HEADER.familyHypertension, 'Family history: hypertension', YES_NO_UNKNOWN),
    ],
  },
  history: {
    title: 'Patient History and Complications',
    fields: [
      question('hivStatus', HTN_HEADER.hivStatus, 'HIV status', [
        { value: HTN_HEADER.reactive, label: 'Reactive' },
        { value: HTN_HEADER.nonReactive, label: 'Non-reactive' },
        { value: UNKNOWN, label: 'Unknown' },
      ]),
      {
        name: 'hivTestDate',
        concept: HTN_HEADER.hivTestDate,
        kind: 'date',
        label: 'HIV test date',
        future: true,
      },
      {
        name: 'artStartDate',
        concept: HTN_HEADER.artStartDate,
        kind: 'date',
        label: 'ART start date',
        future: true,
      },
      question('tbStatus', HTN_HEADER.tbStatus, 'TB', HTN_HEADER.tbStatuses),
      {
        name: 'tbYear',
        concept: HTN_HEADER.tbYear,
        kind: 'number',
        label: 'TB year',
      },
      // headed Complications, as the TB and HIV questions are by their labels
      ...datedGroups('complication', HTN_HEADER.complicationGroup, HTN_HEADER.complication, HTN_HEADER.complications).map((f, i) =>
        i === 0 ? { ...f, heading: 'Complications' } : f,
      ),
    ],
  },
};

/**
 * What the card is started with: the patient and guardian details, which hold what the legacy form requires on its
 * first save (the follow-up agreement), and the diagnoses the card is for
 */
export const HTN_START_FIELDS: Array<ArtField> = [...HTN_HEADER_SECTIONS.patientGuardian.fields, ...HTN_HEADER_SECTIONS.diagnoses.fields];

export const HTN_MEDICATIONS = HTN_VISIT.medications;

/** The visit's drug classes, as the form heads its medication rows */
export const DRUG_CLASSES: Array<{
  key: DrugClass;
  title: string;
  condition?: Condition;
}> = [
  { key: 'diabetes', title: 'Diabetes medications', condition: 'diabetes' },
  { key: 'diuretic', title: 'Diuretics', condition: 'hypertension' },
  { key: 'ccb', title: 'Calcium channel blockers', condition: 'hypertension' },
  { key: 'aceI', title: 'ACE inhibitors', condition: 'hypertension' },
  { key: 'betaBlocker', title: 'Beta blockers', condition: 'hypertension' },
  { key: 'aspirin', title: 'Aspirin' },
  { key: 'statin', title: 'Statins' },
  { key: 'other', title: 'Other' },
];

/**
 * The conditions the card is for: what is asked only for one of them (glucose and diabetes medications for
 * diabetes, antihypertensives for hypertension) is shown only when it is diagnosed
 */
export type Condition = 'diabetes' | 'hypertension';

export const DIAGNOSIS_CONDITIONS: Record<string, Condition> = {
  dm1: 'diabetes',
  dm2: 'diabetes',
  htn: 'hypertension',
};

export const medicationFieldsOf = (drugClass: DrugClass): Array<ArtField> =>
  HTN_MEDICATIONS.filter((m) => m.drugClass === drugClass).flatMap(medicationFields);

export const HTN_MEDICATION_FIELDS: Array<ArtField> = HTN_MEDICATIONS.flatMap(medicationFields);

const footCheck = (c: (typeof HTN_VISIT.footChecks)[number]): ArtField => question(`foot_${c.key}`, c.concept, `Foot check: ${c.label}`, YES_NO);

/**
 * hypertension-and-diabetes-visit.xml's questions, in its order (medications are medicationFields). Its height,
 * weight, blood pressure, pulse and glucose are obsreference fields: a value recorded the same day in another
 * encounter, such as vitals, is shown instead.
 */
export const HTN_VISIT_FIELDS: Record<string, ArtField> = {
  height: {
    name: 'height',
    concept: HTN_VISIT.height,
    kind: 'number',
    label: 'Height',
    unit: 'cm',
    reference: 'readonly',
  },
  weight: {
    name: 'weight',
    concept: HTN_VISIT.weight,
    kind: 'number',
    label: 'Weight',
    unit: 'kg',
    reference: 'readonly',
  },
  bmi: {
    name: 'bmi',
    concept: HTN_VISIT.bmi,
    kind: 'coded',
    label: 'BMI',
    options: HTN_VISIT.bmiAnswers,
  },
  systolicBp: {
    name: 'systolicBp',
    concept: HTN_VISIT.systolicBp,
    kind: 'number',
    label: 'Systolic BP',
    unit: 'mmHg',
    reference: 'readonly',
  },
  diastolicBp: {
    name: 'diastolicBp',
    concept: HTN_VISIT.diastolicBp,
    kind: 'number',
    label: 'Diastolic BP',
    unit: 'mmHg',
    reference: 'readonly',
  },
  pulse: {
    name: 'pulse',
    concept: HTN_VISIT.pulse,
    kind: 'number',
    label: 'Pulse rate',
    unit: '/min',
    reference: 'readonly',
  },
  hbA1c: {
    name: 'hbA1c',
    concept: HTN_VISIT.hbA1c,
    kind: 'number',
    label: 'HbA1c',
    unit: '%',
    reference: 'readonly',
  },
  glucose: {
    name: 'glucose',
    concept: HTN_VISIT.glucose,
    kind: 'number',
    label: 'Blood sugar',
    unit: 'mg/dL',
    reference: 'readonly',
  },
  glucoseTestType: {
    name: 'glucoseTestType',
    concept: HTN_VISIT.glucoseTestType,
    kind: 'coded',
    label: 'Blood sugar test',
    options: HTN_VISIT.glucoseTestTypes,
    reference: 'readonly',
  },
  tobacco: question('tobacco', HTN_VISIT.tobacco, 'Tobacco', HTN_VISIT.useAnswers),
  alcohol: question('alcohol', HTN_VISIT.alcohol, 'Alcohol', HTN_VISIT.useAnswers),
  fruitVegetables: {
    name: 'fruitVegetables',
    concept: HTN_VISIT.fruitVegetables,
    kind: 'number',
    label: 'Fruit and vegetable portions per day',
  },
  exercise: {
    name: 'exercise',
    concept: HTN_VISIT.exercise,
    kind: 'number',
    label: 'Days per week with 30 minutes of exercise',
  },
  cvRisk: {
    name: 'cvRisk',
    concept: HTN_VISIT.cvRisk,
    kind: 'number',
    label: 'Cardiovascular risk',
    unit: '%',
  },
  visualAcuity: {
    name: 'visualAcuity',
    concept: HTN_VISIT.visualAcuity,
    kind: 'text',
    label: 'Visual acuity',
  },
  ...Object.fromEntries(HTN_VISIT.footChecks.map((c) => [`foot_${c.key}`, footCheck(c)])),
  hospitalised: {
    name: 'hospitalised',
    concept: HTN_VISIT.hospitalised,
    kind: 'coded',
    label: 'Hospitalised since last visit',
    checkbox: true,
    options: [{ value: YES, label: 'Yes' }],
  },
  nextAppointment: {
    name: 'nextAppointment',
    concept: HTN_VISIT.nextAppointment,
    kind: 'date',
    label: 'Next appointment',
    future: true,
  },
};

export const FOOT_CHECK_FIELDS = HTN_VISIT.footChecks.map((c) => HTN_VISIT_FIELDS[`foot_${c.key}`]);

/** The visit's values shown from other encounters of the same day, as obsreference does */
export const HTN_REFERENCE_FIELDS = Object.values(HTN_VISIT_FIELDS).filter((f) => f.reference);

/**
 * hypertension-and-diabetes-quarterly-laboratory-tests.xml. The HIV sample date isn't asked: the form sets it to the
 * test's date when a result is chosen.
 */
export const HTN_QUARTERLY_LAB_FIELDS: Array<ArtField> = [
  {
    name: 'proteinuria',
    concept: HTN_QUARTERLY_LABS.proteinuria,
    kind: 'coded',
    label: 'Proteinuria',
    options: HTN_QUARTERLY_LABS.proteinuriaAnswers,
  },
  {
    name: 'hivResult',
    concept: HTN_QUARTERLY_LABS.hivResult,
    kind: 'coded',
    label: 'HIV test result',
    options: HTN_QUARTERLY_LABS.hivResults,
    group: { concept: HTN_QUARTERLY_LABS.hivTestGroup },
  },
  {
    name: 'hivSampleDate',
    concept: HTN_QUARTERLY_LABS.hivSampleDate,
    kind: 'date',
    label: 'HIV sample date',
    future: true,
    hidden: true,
    group: { concept: HTN_QUARTERLY_LABS.hivTestGroup },
  },
];

/** hypertension-and-diabetes-annual-laboratory-tests.xml */
export const HTN_ANNUAL_LAB_FIELDS: Array<ArtField> = [
  { name: 'ecg', concept: HTN_ANNUAL_LABS.ecg, kind: 'text', label: 'ECG' },
  {
    name: 'creatinine',
    concept: HTN_ANNUAL_LABS.creatinine,
    kind: 'number',
    label: 'Creatinine',
    unit: 'mg/dL',
    reference: 'readonly',
  },
  {
    name: 'lipidProfile',
    concept: HTN_ANNUAL_LABS.lipidProfile,
    kind: 'multi',
    label: 'Lipid profile',
    options: HTN_ANNUAL_LABS.lipidAnswers,
  },
  {
    name: 'fundoscopy',
    concept: HTN_ANNUAL_LABS.fundoscopy,
    kind: 'text',
    label: 'Fundoscopy',
  },
];

/** hypertension-and-diabetes-hospitalization-history.xml */
export const HTN_HOSPITALISATION_FIELDS: Array<ArtField> = [
  {
    name: 'lengthOfStay',
    concept: HTN_HOSPITALISATION.lengthOfStay,
    kind: 'number',
    label: 'Length of stay',
    unit: 'days',
  },
  {
    name: 'admissionReason',
    concept: HTN_HOSPITALISATION.admissionReason,
    kind: 'text',
    label: 'Reason for admission',
  },
  {
    name: 'dischargeDiagnosis',
    concept: HTN_HOSPITALISATION.dischargeDiagnosis,
    kind: 'text',
    label: 'Discharge diagnosis',
  },
  {
    name: 'dischargeMedications',
    concept: HTN_HOSPITALISATION.dischargeMedications,
    kind: 'text',
    label: 'Discharge medications',
  },
];
