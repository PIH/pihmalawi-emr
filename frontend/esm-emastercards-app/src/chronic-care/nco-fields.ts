import { type ArtField } from '../art/art-fields';
import { datedGroups, NCD_HEADER, NCD_PATIENT_GUARDIAN_FIELDS, question, showsTbYear } from '../shared/ncd';
import { CVD_HEADER_SECTIONS } from './cvd-fields';
import { HTN_HOSPITALISATION_FIELDS } from './htn-fields';
import { NCO_ANNUAL_LABS, NCO_HEADER, NCO_QUARTERLY_LABS, NCO_VISIT } from './nco-concepts';

/** The header's sections, each shown in its own card on the page and edited in its own panel */
export type NcoHeaderSection = 'patientGuardian' | 'diagnoses' | 'history' | 'imaging';

/** The diagnoses, each in its own dated group (the form allows future dates); Other with what it was, in its group */
const diagnosisFields: Array<ArtField> = datedGroups(
  'diagnosis',
  NCD_HEADER.diagnosisGroup,
  NCD_HEADER.diagnosis,
  NCD_HEADER.diagnosisDate,
  NCO_HEADER.diagnoses,
  {
    future: true,
  },
).flatMap((f) =>
  f.name === 'diagnosis_other'
    ? [
        f,
        { name: 'diagnosis_otherName', concept: NCO_HEADER.otherDiagnosis, kind: 'text' as const, label: 'Other diagnosis: specify', group: f.group },
      ]
    : [f],
);

/** ncd-other-emastercard.xml's questions, by the card on the page that shows and edits them */
export const NCO_HEADER_SECTIONS: Record<NcoHeaderSection, { title: string; fields: Array<ArtField> }> = {
  patientGuardian: { title: 'Patient and Guardian Details', fields: NCD_PATIENT_GUARDIAN_FIELDS },
  diagnoses: {
    title: 'Diagnoses and Comorbidities',
    fields: [
      ...diagnosisFields,
      { name: 'comorbidities', concept: NCO_HEADER.comorbidity, kind: 'multi', label: 'Comorbidities', options: NCO_HEADER.comorbidities },
      { name: 'otherComorbidity', concept: NCO_HEADER.otherDiagnosis, kind: 'text', label: 'Other comorbidity' },
    ],
  },
  history: {
    title: 'Patient History',
    fields: [
      question('hivStatus', NCD_HEADER.hivStatus, 'HIV status', [
        { value: NCD_HEADER.reactive, label: 'Reactive' },
        { value: NCD_HEADER.nonReactive, label: 'Non-reactive' },
      ]),
      { name: 'hivTestDate', concept: NCD_HEADER.hivTestDate, kind: 'date', label: 'HIV test date', future: true },
      { name: 'artStartDate', concept: NCD_HEADER.artStartDate, kind: 'date', label: 'ART start date', future: true },
      question('tbStatus', NCD_HEADER.tbStatus, 'TB', NCD_HEADER.tbStatuses),
      // the TB diagnosis's date, not asked of a patient who never had TB
      { name: 'tbDate', concept: NCO_HEADER.tbDate, kind: 'date', label: 'TB: date', future: true, shownWhen: showsTbYear },
    ],
  },
  // the ECHO and ECG the cardiac and vascular disease header asks, in the same groups
  imaging: { title: 'Imaging Results', fields: CVD_HEADER_SECTIONS.imaging.fields },
};

export const NCO_DIAGNOSES = diagnosisFields.filter((f) => f.checkbox).map((f) => f.name);

/**
 * ncd-other-visit.xml's questions, in its order. Its height, weight and blood pressure are obsreference fields: a value
 * recorded the same day in another encounter, such as vitals, is shown instead. Its medications are written out.
 */
export const NCO_VISIT_FIELDS: Record<string, ArtField> = {
  height: { name: 'height', concept: NCO_VISIT.height, kind: 'number', label: 'Height', unit: 'cm', reference: 'readonly' },
  weight: { name: 'weight', concept: NCO_VISIT.weight, kind: 'number', label: 'Weight', unit: 'kg', reference: 'readonly' },
  weightChange: { name: 'weightChange', concept: NCO_VISIT.weightChange, kind: 'text', label: 'Weight change' },
  systolicBp: { name: 'systolicBp', concept: NCO_VISIT.systolicBp, kind: 'number', label: 'Systolic BP', unit: 'mmHg', reference: 'readonly' },
  diastolicBp: { name: 'diastolicBp', concept: NCO_VISIT.diastolicBp, kind: 'number', label: 'Diastolic BP', unit: 'mmHg', reference: 'readonly' },
  pulse: { name: 'pulse', concept: NCO_VISIT.heartRate, kind: 'number', label: 'Heart rate', unit: '/min' },
  spo2: { name: 'spo2', concept: NCO_VISIT.spo2, kind: 'number', label: 'SpO2', unit: '%' },
  tobacco: question('tobacco', NCO_VISIT.tobacco, 'Tobacco', NCO_VISIT.useAnswers),
  alcohol: question('alcohol', NCO_VISIT.alcohol, 'Alcohol', NCO_VISIT.useAnswers),
  fruitVegetables: { name: 'fruitVegetables', concept: NCO_VISIT.fruitVegetables, kind: 'number', label: 'Fruit and vegetable portions per day' },
  exercise: { name: 'exercise', concept: NCO_VISIT.exercise, kind: 'number', label: 'Days per week with 30 minutes of exercise' },
  hospitalised: question('hospitalised', NCO_VISIT.hospitalised, 'Hospitalised since last visit for NCD', NCO_VISIT.noYes),
  medications: { name: 'medications', concept: NCO_VISIT.medications, kind: 'text', label: 'Medications' },
  medicationsChanged: question('medicationsChanged', NCO_VISIT.medicationsChanged, 'Medications changed', NCO_VISIT.noYes),
  comments: { name: 'comments', concept: NCO_VISIT.comments, kind: 'text', label: 'Comments' },
  nextAppointment: { name: 'nextAppointment', concept: NCO_VISIT.nextAppointment, kind: 'date', label: 'Next appointment', future: true },
  nextAppointmentLocation: question(
    'nextAppointmentLocation',
    NCO_VISIT.nextAppointmentLocation,
    'Next appointment location',
    NCO_VISIT.nextAppointmentLocations,
  ),
};

/** ncd-other-quarterly-laboratory-tests.xml; its HbA1c is an obsreference field */
export const NCO_QUARTERLY_LAB_FIELDS: Array<ArtField> = [
  { name: 'hbA1c', concept: NCO_QUARTERLY_LABS.hbA1c, kind: 'number', label: 'HbA1c', unit: '%', reference: 'readonly' },
  question('hivStatus', NCO_QUARTERLY_LABS.hivStatus, 'HIV test', NCO_QUARTERLY_LABS.hivStatuses),
];

/** ncd-other-annual-laboratory-tests.xml; its creatinine is an obsreference field */
export const NCO_ANNUAL_LAB_FIELDS: Array<ArtField> = [
  question('proteinuria', NCO_ANNUAL_LABS.proteinuria, 'Proteinuria', NCO_ANNUAL_LABS.proteinuriaAnswers),
  { name: 'creatinine', concept: NCO_ANNUAL_LABS.creatinine, kind: 'number', label: 'Creatinine', unit: 'mg/dL', reference: 'readonly' },
  { name: 'potassium', concept: NCO_ANNUAL_LABS.potassium, kind: 'number', label: 'K+', unit: 'mEq/L' },
  { name: 'randomBloodSugar', concept: NCO_ANNUAL_LABS.randomBloodSugar, kind: 'number', label: 'RBS', unit: 'mg/dL' },
  {
    name: 'lipidProfile',
    concept: NCO_ANNUAL_LABS.lipidProfile,
    kind: 'coded',
    label: 'Lipid profile',
    options: NCO_ANNUAL_LABS.lipidAnswers,
    select: true,
  },
];

/** ncd-other-hospitalization-history.xml, which asks what the hypertension and diabetes one does */
export const NCO_HOSPITALISATION_FIELDS = HTN_HOSPITALISATION_FIELDS;
