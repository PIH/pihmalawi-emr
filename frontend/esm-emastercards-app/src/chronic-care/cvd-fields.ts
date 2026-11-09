import { type ArtField, type Option } from '../art/art-fields';
import { medicationFields } from '../mental-health/mh-fields';
import { datedGroups, NCD_HEADER, NCD_HIV_TB_FIELDS, NCD_PATIENT_GUARDIAN_FIELDS, question, YES_NO } from '../shared/ncd';
import { CVD_ECHO, CVD_HEADER, CVD_IMAGING, CVD_PROTOCOL_LABS, CVD_QUARTERLY_LABS, CVD_VISIT, OTHER } from './cvd-concepts';
import { HTN_HOSPITALISATION_FIELDS } from './htn-fields';

/** The header's sections, each shown in its own card on the page and edited in its own panel */
export type CvdHeaderSection = 'patientGuardian' | 'diagnoses' | 'history' | 'imaging';

/** The diagnoses, each in its own dated group (the form allows future dates); Other with what it was, in its group */
const diagnosisFields: Array<ArtField> = datedGroups(
  'diagnosis',
  NCD_HEADER.diagnosisGroup,
  NCD_HEADER.diagnosis,
  NCD_HEADER.diagnosisDate,
  CVD_HEADER.diagnoses,
  {
    future: true,
  },
).flatMap((f) =>
  f.name === 'diagnosis_other'
    ? [
        f,
        { name: 'diagnosis_otherName', concept: CVD_HEADER.otherDiagnosis, kind: 'text' as const, label: 'Other diagnosis: specify', group: f.group },
      ]
    : [f],
);

/** The form's HIV question offers Reactive and Non-reactive only */
const HIV_TB_FIELDS: Array<ArtField> = NCD_HIV_TB_FIELDS.map((f) =>
  f.name === 'hivStatus' ? { ...f, options: f.options.filter((o: Option) => o.label !== 'Unknown') } : f,
);

/** cardiac-and-vascular-disease-emastercard.xml's questions, by the card on the page that shows and edits them */
export const CVD_HEADER_SECTIONS: Record<CvdHeaderSection, { title: string; fields: Array<ArtField> }> = {
  patientGuardian: { title: 'Patient and Guardian Details', fields: NCD_PATIENT_GUARDIAN_FIELDS },
  diagnoses: { title: 'Diagnoses', fields: diagnosisFields },
  history: {
    title: 'Patient History and Exposures',
    fields: [
      ...HIV_TB_FIELDS,
      { name: 'comorbidities', concept: CVD_HEADER.comorbidity, kind: 'multi', label: 'Comorbidities', options: CVD_HEADER.comorbidities },
      { name: 'otherComorbidity', concept: CVD_HEADER.otherDiagnosis, kind: 'text', label: 'Other comorbidity' },
      {
        name: 'familyPlanning',
        concept: CVD_HEADER.familyPlanning,
        kind: 'multi',
        label: 'Family planning',
        options: CVD_HEADER.familyPlanningMethods,
        comment: 'familyPlanningOther',
        commentAnswer: OTHER,
      },
    ],
  },
  imaging: {
    title: 'Imaging Results',
    fields: [
      {
        name: 'echoDate',
        concept: CVD_HEADER.imagingDate,
        kind: 'date',
        label: 'ECHO: date',
        future: true,
        group: { concept: CVD_HEADER.echoGroup },
      },
      { name: 'echoResult', concept: CVD_HEADER.echoResult, kind: 'text', label: 'ECHO: result', group: { concept: CVD_HEADER.echoGroup } },
      { name: 'ecgDate', concept: CVD_HEADER.imagingDate, kind: 'date', label: 'ECG: date', future: true, group: { concept: CVD_HEADER.ecgGroup } },
      {
        name: 'ecgResult',
        concept: CVD_HEADER.ecgResult,
        kind: 'coded',
        label: 'ECG: result',
        options: CVD_HEADER.ecgResults,
        select: true,
        group: { concept: CVD_HEADER.ecgGroup },
      },
    ],
  },
};

export const CVD_DIAGNOSES = diagnosisFields.filter((f) => f.checkbox).map((f) => f.name);

/** The visit's drug classes, as the form heads its medication rows */
export type CvdDrugClass = (typeof CVD_VISIT.medications)[number]['drugClass'];

export const CVD_DRUG_CLASSES: Array<{ key: CvdDrugClass; title: string }> = [
  { key: 'aspirin', title: 'Aspirin' },
  { key: 'diuretic', title: 'Diuretics' },
  { key: 'aceI', title: 'ACE inhibitors' },
  { key: 'betaBlocker', title: 'Beta blockers' },
  { key: 'ccb', title: 'Calcium channel blockers' },
  { key: 'statin', title: 'Statins' },
  { key: 'benzathine', title: 'Benzathine PCN' },
  { key: 'other', title: 'Other medications' },
];

export const CVD_MEDICATIONS = CVD_VISIT.medications;

export const cvdMedicationFieldsOf = (drugClass: CvdDrugClass): Array<ArtField> =>
  CVD_MEDICATIONS.filter((m) => m.drugClass === drugClass).flatMap((m) => medicationFields(m));

export const CVD_MEDICATION_FIELDS: Array<ArtField> = CVD_MEDICATIONS.flatMap((m) => medicationFields(m));

const yesNo = (name: string, concept: string, label: string): ArtField => question(name, concept, label, YES_NO);

/**
 * cardiac-and-vascular-disease-visit.xml's questions, in its order (medications are CVD_MEDICATION_FIELDS). Its height,
 * weight and blood pressure are obsreference fields: a value recorded the same day in another encounter, such as
 * vitals, is shown instead.
 */
export const CVD_VISIT_FIELDS: Record<string, ArtField> = {
  height: { name: 'height', concept: CVD_VISIT.height, kind: 'number', label: 'Height', unit: 'cm', reference: 'readonly' },
  weight: { name: 'weight', concept: CVD_VISIT.weight, kind: 'number', label: 'Weight', unit: 'kg', reference: 'readonly' },
  weightChange: { name: 'weightChange', concept: CVD_VISIT.weightChange, kind: 'text', label: 'Weight change' },
  systolicBp: { name: 'systolicBp', concept: CVD_VISIT.systolicBp, kind: 'number', label: 'Systolic BP', unit: 'mmHg', reference: 'readonly' },
  diastolicBp: { name: 'diastolicBp', concept: CVD_VISIT.diastolicBp, kind: 'number', label: 'Diastolic BP', unit: 'mmHg', reference: 'readonly' },
  pulse: { name: 'pulse', concept: CVD_VISIT.heartRate, kind: 'number', label: 'Heart rate', unit: '/min' },
  spo2: { name: 'spo2', concept: CVD_VISIT.spo2, kind: 'number', label: 'SpO2', unit: '%' },
  ...Object.fromEntries(CVD_VISIT.symptoms.map((s) => [s.key, question(s.key, s.concept, s.label, CVD_VISIT.levels)])),
  hospitalised: yesNo('hospitalised', CVD_VISIT.hospitalised, 'Hospitalised since last visit for NCD'),
  oedema: question('oedema', CVD_VISIT.oedema, 'Oedema', CVD_VISIT.oedemaAnswers),
  crackles: yesNo('crackles', CVD_VISIT.crackles, 'Bibasilar crackles'),
  jvpElevated: yesNo('jvpElevated', CVD_VISIT.jvpElevated, 'JVP elevated'),
  volumeStatus: question('volumeStatus', CVD_VISIT.volumeStatus, 'Volume status', CVD_VISIT.volumeStatuses),
  nyha: question('nyha', CVD_VISIT.nyha, 'NYHA class', CVD_VISIT.nyhaClasses),
  alcohol: question('alcohol', CVD_VISIT.alcohol, 'Alcohol', CVD_VISIT.useAnswers),
  tobacco: question('tobacco', CVD_VISIT.tobacco, 'Tobacco', CVD_VISIT.useAnswers),
  saltFluidRestricted: yesNo('saltFluidRestricted', CVD_VISIT.saltFluidRestricted, 'Salt or fluid restricted'),
  depressionConcern: yesNo('depressionConcern', CVD_VISIT.depressionConcern, 'Concern for depression or anxiety'),
  tookMedsToday: yesNo('tookMedsToday', CVD_VISIT.tookMedsToday, 'Took medication today'),
  saltDiet: yesNo('saltDiet', CVD_VISIT.saltDiet, 'Diet: salt or fluid'),
  mentalHealthReferral: yesNo('mentalHealthReferral', CVD_VISIT.mentalHealthReferral, 'Mental health referral'),
  palliativeReferral: yesNo('palliativeReferral', CVD_VISIT.palliativeReferral, 'Palliative referral'),
  chwFollowUp: yesNo('chwFollowUp', CVD_VISIT.chwFollowUp, 'Request CHW follow-up'),
  nextAppointment: { name: 'nextAppointment', concept: CVD_VISIT.nextAppointment, kind: 'date', label: 'Next appointment', future: true },
};

export const CVD_SYMPTOM_FIELDS = CVD_VISIT.symptoms.map((s) => CVD_VISIT_FIELDS[s.key]);

/** echocardiogram-ultrasound-imaging-results.xml */
export const CVD_ECHO_FIELDS: Array<ArtField> = [
  question('lvsf', CVD_ECHO.lvsf, 'Left ventricular systolic function (LVSF)', CVD_ECHO.lvsfAnswers),
  question('rightVentricle', CVD_ECHO.rightVentricle, 'Right ventricle (RV)', CVD_ECHO.rightVentricleAnswers),
  question('mitralValve', CVD_ECHO.mitralValve, 'Mitral valve', CVD_ECHO.mitralValveAnswers),
  question('pericardialEffusion', CVD_ECHO.pericardialEffusion, 'Pericardial effusion (PE)', CVD_ECHO.pericardialEffusionAnswers),
  question('inferiorVenaCava', CVD_ECHO.inferiorVenaCava, 'Inferior vena cava (IVC)', CVD_ECHO.inferiorVenaCavaAnswers),
];

/** electrocardiographic-ekg-imaging-results.xml */
export const CVD_EKG_FIELDS: Array<ArtField> = [{ name: 'ekgResult', concept: CVD_IMAGING.ekgResult, kind: 'text', label: 'Results' }];

/** chest-x-ray-cxr-imaging-results.xml */
export const CVD_CHEST_XRAY_FIELDS: Array<ArtField> = [
  { name: 'chestXrayResult', concept: CVD_IMAGING.chestXrayResult, kind: 'text', label: 'Results' },
];

/** cardiac-and-vascular-disease-quarterly-laboratory-tests.xml */
export const CVD_QUARTERLY_LAB_FIELDS: Array<ArtField> = [question('hivStatus', CVD_QUARTERLY_LABS.hivStatus, 'HIV', CVD_QUARTERLY_LABS.hivStatuses)];

/** cardiac-and-vascular-disease-frequency-per-protocol-laboratory-tests.xml; its creatinine is an obsreference field */
export const CVD_PROTOCOL_LAB_FIELDS: Array<ArtField> = [
  question('proteinuria', CVD_PROTOCOL_LABS.proteinuria, 'Proteinuria', CVD_PROTOCOL_LABS.proteinuriaAnswers),
  { name: 'creatinine', concept: CVD_PROTOCOL_LABS.creatinine, kind: 'number', label: 'Creatinine', unit: 'mg/dL', reference: 'readonly' },
  { name: 'egfr', concept: CVD_PROTOCOL_LABS.egfr, kind: 'number', label: 'eGFR', unit: 'mL/min' },
  { name: 'potassium', concept: CVD_PROTOCOL_LABS.potassium, kind: 'number', label: 'K+', unit: 'mEq/L' },
  { name: 'randomBloodSugar', concept: CVD_PROTOCOL_LABS.randomBloodSugar, kind: 'number', label: 'RBS', unit: 'mg/dL' },
  {
    name: 'lipidProfile',
    concept: CVD_PROTOCOL_LABS.lipidProfile,
    kind: 'coded',
    label: 'Lipid profile',
    options: CVD_PROTOCOL_LABS.lipidAnswers,
    select: true,
  },
];

/** cardiac-and-vascular-disease-hospitalization-history.xml, which asks what the hypertension and diabetes one does */
export const CVD_HOSPITALISATION_FIELDS = HTN_HOSPITALISATION_FIELDS;
