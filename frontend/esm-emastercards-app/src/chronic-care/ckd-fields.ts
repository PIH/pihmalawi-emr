import { type ArtField } from '../art/art-fields';
import { medicationFields } from '../mental-health/mh-fields';
import { datedGroups, NCD_HEADER, NCD_PATIENT_GUARDIAN_FIELDS, question, showsTbYear, YES_NO } from '../shared/ncd';
import { CKD_ANNUAL_LABS, CKD_HEADER, CKD_IMAGING, CKD_QUARTERLY_LABS, CKD_VISIT } from './ckd-concepts';
import { HTN_HOSPITALISATION_FIELDS } from './htn-fields';

/** The header's sections, each shown in its own card on the page and edited in its own panel */
export type CkdHeaderSection = 'patientGuardian' | 'etiology' | 'diagnoses' | 'history';

/** chronic-kidney-disease-emastercard.xml's questions, by the card on the page that shows and edits them; it refuses future dates */
export const CKD_HEADER_SECTIONS: Record<CkdHeaderSection, { title: string; fields: Array<ArtField> }> = {
  patientGuardian: { title: 'Patient and Guardian Details', fields: NCD_PATIENT_GUARDIAN_FIELDS },
  etiology: {
    title: 'Presumed Etiology',
    fields: [
      { name: 'etiology', concept: CKD_HEADER.etiology, kind: 'multi', label: 'Presumed etiology', options: CKD_HEADER.etiologies },
      { name: 'drugsEtiology', concept: CKD_HEADER.drugsEtiology, kind: 'text', label: 'Drugs (specify)' },
      { name: 'otherEtiology', concept: CKD_HEADER.otherEtiology, kind: 'text', label: 'Others (specify)' },
      { name: 'etiologyDate', concept: CKD_HEADER.etiologyDate, kind: 'date', label: 'Etiology: date' },
    ],
  },
  diagnoses: {
    title: 'Diagnoses',
    fields: datedGroups('diagnosis', NCD_HEADER.diagnosisGroup, NCD_HEADER.diagnosis, NCD_HEADER.diagnosisDate, CKD_HEADER.diagnoses),
  },
  history: {
    title: 'Patient History',
    fields: [
      question('hivStatus', NCD_HEADER.hivStatus, 'HIV status', [
        { value: NCD_HEADER.reactive, label: 'Reactive' },
        { value: NCD_HEADER.nonReactive, label: 'Non-reactive' },
      ]),
      { name: 'hivTestDate', concept: NCD_HEADER.hivTestDate, kind: 'date', label: 'HIV test date' },
      { name: 'artStartDate', concept: NCD_HEADER.artStartDate, kind: 'date', label: 'ART start date' },
      { name: 'dialysisHistory', concept: CKD_HEADER.dialysisHistory, kind: 'text', label: 'History of dialysis' },
      { name: 'dialysisDate', concept: CKD_HEADER.dialysisDate, kind: 'date', label: 'Dialysis: date' },
      question('tbStatus', NCD_HEADER.tbStatus, 'TB', NCD_HEADER.tbStatuses),
      // the TB diagnosis's date, not asked of a patient who never had TB
      { name: 'tbDate', concept: CKD_HEADER.tbDate, kind: 'date', label: 'TB: date', shownWhen: showsTbYear },
    ],
  },
};

/** The visit's drug classes, as the form heads its medication rows */
export type CkdDrugClass = (typeof CKD_VISIT.medications)[number]['drugClass'];

export const CKD_DRUG_CLASSES: Array<{ key: CkdDrugClass; title: string }> = [
  { key: 'diuretic', title: 'Diuretics' },
  { key: 'aceI', title: 'ACE inhibitors' },
  { key: 'betaBlocker', title: 'Beta blockers' },
  { key: 'ccb', title: 'Calcium channel blockers' },
  { key: 'other', title: 'Other medications' },
];

export const CKD_MEDICATIONS = CKD_VISIT.medications;

/** The visit's medications, as the other NCD visits ask them, an Other one named in this card's own text concept */
const ckdMedicationFields = (m: (typeof CKD_MEDICATIONS)[number]): Array<ArtField> =>
  medicationFields(m).map((f) => (f.name === 'med_otherName' ? { ...f, concept: CKD_VISIT.otherMedication } : f));

export const ckdMedicationFieldsOf = (drugClass: CkdDrugClass): Array<ArtField> =>
  CKD_MEDICATIONS.filter((m) => m.drugClass === drugClass).flatMap(ckdMedicationFields);

export const CKD_MEDICATION_FIELDS: Array<ArtField> = CKD_MEDICATIONS.flatMap(ckdMedicationFields);

const yesNo = (name: string, concept: string, label: string): ArtField => question(name, concept, label, YES_NO);

/**
 * chronic-kidney-disease-visit.xml's questions, in its order (medications are CKD_MEDICATION_FIELDS). Its height,
 * weight, blood pressure and creatinine are obsreference fields: a value recorded the same day in another encounter
 * is shown instead.
 */
export const CKD_VISIT_FIELDS: Record<string, ArtField> = {
  height: { name: 'height', concept: CKD_VISIT.height, kind: 'number', label: 'Height', unit: 'cm', reference: 'readonly' },
  weight: { name: 'weight', concept: CKD_VISIT.weight, kind: 'number', label: 'Weight', unit: 'kg', reference: 'readonly' },
  weightChange: { name: 'weightChange', concept: CKD_VISIT.weightChange, kind: 'text', label: 'Weight change' },
  systolicBp: { name: 'systolicBp', concept: CKD_VISIT.systolicBp, kind: 'number', label: 'Systolic BP', unit: 'mmHg', reference: 'readonly' },
  diastolicBp: { name: 'diastolicBp', concept: CKD_VISIT.diastolicBp, kind: 'number', label: 'Diastolic BP', unit: 'mmHg', reference: 'readonly' },
  gfr: { name: 'gfr', concept: CKD_VISIT.gfr, kind: 'number', label: 'GFR', unit: 'mL/min' },
  pulse: { name: 'pulse', concept: CKD_VISIT.heartRate, kind: 'number', label: 'Heart rate', unit: '/min' },
  creatinine: { name: 'creatinine', concept: CKD_VISIT.creatinine, kind: 'number', label: 'Creatinine', unit: 'mg/dL', reference: 'readonly' },
  urineProtein: question('urineProtein', CKD_VISIT.urineProtein, 'Urine protein', CKD_VISIT.urineProteinAnswers),
  ...Object.fromEntries(CKD_VISIT.symptoms.map((s) => [s.key, yesNo(s.key, s.concept, s.label)])),
  conjunctiva: question('conjunctiva', CKD_VISIT.conjunctiva, 'Conjunctiva', CKD_VISIT.conjunctivaAnswers),
  ascites: yesNo('ascites', CKD_VISIT.ascites, 'Ascites'),
  oedema: question('oedema', CKD_VISIT.oedema, 'Oedema', CKD_VISIT.oedemaAnswers),
  otherSymptoms: { name: 'otherSymptoms', concept: CKD_VISIT.otherSymptoms, kind: 'text', label: 'Other symptoms' },
  ckdStage: question('ckdStage', CKD_VISIT.ckdStage, 'CKD stage', CKD_VISIT.ckdStages),
  nsaidUse: yesNo('nsaidUse', CKD_VISIT.nsaidUse, 'NSAID use'),
  tobacco: question('tobacco', CKD_VISIT.tobacco, 'Tobacco', CKD_VISIT.useAnswers),
  alcohol: question('alcohol', CKD_VISIT.alcohol, 'Alcohol', CKD_VISIT.useAnswers),
  tookMedsToday: yesNo('tookMedsToday', CKD_VISIT.tookMedsToday, 'Took medication today'),
  diet: question('diet', CKD_VISIT.diet, 'Diet recommendations', CKD_VISIT.diets),
  nextAppointment: { name: 'nextAppointment', concept: CKD_VISIT.nextAppointment, kind: 'date', label: 'Next appointment', future: true },
};

export const CKD_SYMPTOM_FIELDS = CKD_VISIT.symptoms.map((s) => CKD_VISIT_FIELDS[s.key]);

/** chronic-kidney-disease-quarterly-laboratory-tests.xml */
export const CKD_QUARTERLY_LAB_FIELDS: Array<ArtField> = [
  question('hivStatus', CKD_QUARTERLY_LABS.hivStatus, 'HIV', CKD_QUARTERLY_LABS.hivStatuses),
  { name: 'haemoglobin', concept: CKD_QUARTERLY_LABS.haemoglobin, kind: 'number', label: 'Haemoglobin', unit: 'g/dL' },
];

/** chronic-kidney-disease-annual-laboratory-tests.xml */
export const CKD_ANNUAL_LAB_FIELDS: Array<ArtField> = [
  { name: 'randomBloodSugar', concept: CKD_ANNUAL_LABS.randomBloodSugar, kind: 'number', label: 'RBS', unit: 'mg/dL' },
  {
    name: 'lipidProfile',
    concept: CKD_ANNUAL_LABS.lipidProfile,
    kind: 'coded',
    label: 'Lipid profile',
    options: CKD_ANNUAL_LABS.lipidAnswers,
    select: true,
  },
];

/** chronic-kidney-disease-imaging-results.xml */
export const CKD_IMAGING_FIELDS: Array<ArtField> = [
  { name: 'ultrasoundResult', concept: CKD_IMAGING.ultrasoundResult, kind: 'text', label: 'Ultrasound result' },
];

/** chronic-kidney-disease-hospitalization-history.xml, which asks what the hypertension and diabetes one does */
export const CKD_HOSPITALISATION_FIELDS = HTN_HOSPITALISATION_FIELDS;
