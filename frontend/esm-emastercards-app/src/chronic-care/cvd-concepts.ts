import { type CardForm } from '../art/obs-diff';

/**
 * The Cardiac and Vascular Disease eMastercard's forms and the concepts they save, copied from
 * cardiac-and-vascular-disease-emastercard.xml, -visit.xml, -quarterly-laboratory-tests.xml,
 * -frequency-per-protocol-laboratory-tests.xml, -hospitalization-history.xml and the echocardiogram, EKG and chest X-ray
 * imaging forms (UUIDs lower-cased, as REST returns them). Its patient and guardian, HIV and TB questions are the NCD
 * headers' (shared/ncd.ts), and its hospitalisations save what the hypertension and diabetes card's do.
 */

/** The eMastercards endpoint's key for this card */
export const CVD_CARD_KEY = 'chf';

/** The paper card's version (the forms' "Version 3"), which the page names under its title */
export const CVD_CARD_VERSION = '3';

export type CvdForm = 'header' | 'visit' | 'echo' | 'ekg' | 'chestXray' | 'quarterlyLabs' | 'protocolLabs' | 'hospitalisation';

export const CVD_FORMS: Record<CvdForm, CardForm> = {
  header: { encounterType: 'cb337ef3-f5cb-4e10-af8d-8d717a3a139f', form: '40c59f30-794e-11e8-adc0-fa7ae01bbebc' },
  visit: { encounterType: '1f6ad830-6e94-4819-b1fd-8c4146e77280', form: '4a5c17b8-794e-11e8-adc0-fa7ae01bbebc' },
  echo: { encounterType: '0b6fb2fd-7aa3-4d90-be33-52096abd66db', form: '518f9ef4-4e31-4c38-848f-2461cff16043' },
  ekg: { encounterType: 'd4350f89-a421-486f-92eb-4ab713df122b', form: '34cc6dbd-371e-4526-8c7d-48aacee68f78' },
  chestXray: { encounterType: '833cd694-7a98-4659-a487-ae25fd445d32', form: '8315ccb3-65e2-4572-a433-411b132b09bf' },
  quarterlyLabs: { encounterType: 'df5389a8-7715-462b-a41e-e8b1946c8c60', form: '6c88df60-794e-11e8-adc0-fa7ae01bbebc' },
  protocolLabs: { encounterType: 'dbab9217-29ec-477d-8d11-161cd4fd2b34', form: '5e3363e6-594e-4b03-98c6-152616b955b1' },
  hospitalisation: { encounterType: '0d3f097f-206c-4c31-9fcb-2ba61145b69f', form: '74fcc9a4-794e-11e8-adc0-fa7ae01bbebc' },
};

const YES = '65576354-977f-11e1-8993-905e29aff6c1';
const NO = '6557646c-977f-11e1-8993-905e29aff6c1';
const UNKNOWN = '65576584-977f-11e1-8993-905e29aff6c1';
const NONE = '6557987e-977f-11e1-8993-905e29aff6c1';
const NORMAL = '6557a15c-977f-11e1-8993-905e29aff6c1';
const NOT_WELL_VISUALISED = '656827b6-977f-11e1-8993-905e29aff6c1';
const DILATED = '6563e778-977f-11e1-8993-905e29aff6c1';
/** "Other", the answer of an Other diagnosis or medication */
export const OTHER = '656cce7e-977f-11e1-8993-905e29aff6c1';

/** cardiac-and-vascular-disease-emastercard.xml, the card header (CHF_INITIAL encounter) */
export const CVD_HEADER = {
  /** In the form's order and with its labels; Other names the diagnosis in its group's text */
  diagnoses: [
    { key: 'cardiomyopathy', answer: '6569659a-977f-11e1-8993-905e29aff6c1', label: 'Cardiomyopathy' },
    { key: 'dilated', answer: '65703154-977f-11e1-8993-905e29aff6c1', label: 'Dilated' },
    { key: 'cad', answer: '86c2fd36-e7f1-11e8-9f32-f2801f1b9fd1', label: 'CAD' },
    { key: 'afib', answer: '65680bfa-977f-11e1-8993-905e29aff6c1', label: 'Afib' },
    { key: 'restrictive', answer: '57476df7-e885-4444-b151-152cfcdac05b', label: 'Restrictive' },
    { key: 'pe', answer: '657179a6-977f-11e1-8993-905e29aff6c1', label: 'PE' },
    { key: 'rheumatic', answer: '6546dad4-977f-11e1-8993-905e29aff6c1', label: 'Rheumatic (RHD)' },
    { key: 'stroke', answer: '65714e68-977f-11e1-8993-905e29aff6c1', label: 'Stroke' },
    { key: 'dvt', answer: '65717898-977f-11e1-8993-905e29aff6c1', label: 'DVT' },
    { key: 'valvular', answer: '6578972c-977f-11e1-8993-905e29aff6c1', label: 'Valvular' },
    { key: 'rightVentricularFailure', answer: '6577e034-977f-11e1-8993-905e29aff6c1', label: 'Right ventricular failure' },
    { key: 'congenital', answer: '6562dcd4-977f-11e1-8993-905e29aff6c1', label: 'Congenital' },
    { key: 'hypertensiveHeartDisease', answer: '656298fa-977f-11e1-8993-905e29aff6c1', label: 'Hypertensive heart disease' },
    { key: 'unknown', answer: UNKNOWN, label: 'Unknown' },
    { key: 'pericardial', answer: '6563e930-977f-11e1-8993-905e29aff6c1', label: 'Pericardial disease' },
    { key: 'ischemicHeartDisease', answer: '65717dca-977f-11e1-8993-905e29aff6c1', label: 'Ischemic heart disease' },
    { key: 'other', answer: OTHER, label: 'Other' },
  ],
  /** Text: the Other diagnosis, in its group, and the other comorbidity, on its own */
  otherDiagnosis: '65780d0c-977f-11e1-8993-905e29aff6c1',
  /** Coded, one obs per comorbidity ticked */
  comorbidity: '655a8d90-977f-11e1-8993-905e29aff6c1',
  comorbidities: [
    { value: '6577c7a2-977f-11e1-8993-905e29aff6c1', label: 'Chronic kidney disease' },
    { value: '6567426a-977f-11e1-8993-905e29aff6c1', label: 'Diabetes' },
    { value: '654abfc8-977f-11e1-8993-905e29aff6c1', label: 'Hypertension' },
  ],
  /** Coded, one obs per method ticked; an Other method is specified in its comment */
  familyPlanning: '6547ac8e-977f-11e1-8993-905e29aff6c1',
  familyPlanningMethods: [
    { value: '654a1eb0-977f-11e1-8993-905e29aff6c1', label: 'OC (pills)' },
    { value: '654acd88-977f-11e1-8993-905e29aff6c1', label: 'Depo (injection)' },
    { value: NONE, label: 'None' },
    { value: OTHER, label: 'Other' },
  ],
  /** The imaging results of the card: an ECHO and an ECG, each a group of its date and result */
  echoGroup: '6563e3ea-977f-11e1-8993-905e29aff6c1',
  echoResult: '1995a751-6f80-49f5-bc89-5cc6ae767eff',
  ecgGroup: '656598f2-977f-11e1-8993-905e29aff6c1',
  ecgResult: '656597e4-977f-11e1-8993-905e29aff6c1',
  imagingDate: '6563e098-977f-11e1-8993-905e29aff6c1',
  /** The ECG diagnoses the concept answers with, which the form offers */
  ecgResults: [
    { value: NORMAL, label: 'Normal' },
    { value: '6548a026-977f-11e1-8993-905e29aff6c1', label: 'Abnormal' },
    { value: '65659b04-977f-11e1-8993-905e29aff6c1', label: 'Infarction' },
    { value: '6563362a-977f-11e1-8993-905e29aff6c1', label: 'Atrial fibrillation' },
    { value: '65656184-977f-11e1-8993-905e29aff6c1', label: 'Bradycardia' },
    { value: '65659a00-977f-11e1-8993-905e29aff6c1', label: 'Sinus rhythm' },
    { value: '65662790-977f-11e1-8993-905e29aff6c1', label: 'Left ventricular hypertrophy' },
    { value: '6567e468-977f-11e1-8993-905e29aff6c1', label: 'Complete heart block' },
    { value: '6567e56c-977f-11e1-8993-905e29aff6c1', label: 'Right bundle branch block' },
    { value: '6567e670-977f-11e1-8993-905e29aff6c1', label: 'Left bundle branch block' },
    { value: '6567eea4-977f-11e1-8993-905e29aff6c1', label: 'Sinus bradycardia' },
    { value: '6567e882-977f-11e1-8993-905e29aff6c1', label: 'Sinus tachycardia' },
    { value: '6567e15c-977f-11e1-8993-905e29aff6c1', label: 'Supraventricular tachycardia' },
    { value: '6567f1ba-977f-11e1-8993-905e29aff6c1', label: 'Multifocal atrial tachycardia' },
    { value: '6567e77e-977f-11e1-8993-905e29aff6c1', label: 'Atrial tachycardia' },
    { value: '6567e364-977f-11e1-8993-905e29aff6c1', label: 'Second degree atrioventricular block' },
    { value: '6567fade-977f-11e1-8993-905e29aff6c1', label: 'Lateral myocardial infarction' },
    { value: '6567f9a8-977f-11e1-8993-905e29aff6c1', label: 'Anterior myocardial infarction' },
    { value: '6567f8a4-977f-11e1-8993-905e29aff6c1', label: 'Inferior myocardial infarction' },
    { value: OTHER, label: 'Other' },
  ],
};

/** How a symptom changed since the last visit, as the visit asks it */
const LEVELS = [
  { value: '65779f0c-977f-11e1-8993-905e29aff6c1', label: 'Increase' },
  { value: '6566289e-977f-11e1-8993-905e29aff6c1', label: 'Decrease' },
  { value: '655e3b84-977f-11e1-8993-905e29aff6c1', label: 'Same' },
  { value: NONE, label: 'None' },
];

/** cardiac-and-vascular-disease-visit.xml (CHF_FOLLOWUP encounter) */
export const CVD_VISIT = {
  height: '6569c562-977f-11e1-8993-905e29aff6c1',
  weight: '6569c44a-977f-11e1-8993-905e29aff6c1',
  /** Text */
  weightChange: '1be55e42-9a11-11e8-9eb6-529269fb1459',
  systolicBp: '6569bffe-977f-11e1-8993-905e29aff6c1',
  diastolicBp: '6569c116-977f-11e1-8993-905e29aff6c1',
  heartRate: '6569c224-977f-11e1-8993-905e29aff6c1',
  spo2: '6569c792-977f-11e1-8993-905e29aff6c1',
  levels: LEVELS,
  /** In the form's order */
  symptoms: [
    { key: 'orthopnea', concept: '91329a35-1f77-4cef-8870-1db5c5ceaf72', label: 'Orthopnea' },
    { key: 'dyspneaOnExertion', concept: 'a02a2c07-521e-44e0-b83c-5b6a9302f8d6', label: 'Dyspnea on exertion' },
    { key: 'dryCough', concept: 'd3e06bb8-97e2-40cf-a72b-3d9672ff6366', label: 'Dry cough' },
    { key: 'fatigue', concept: 'b97edeb3-ab9d-4577-8b90-6dcd942aa8b3', label: 'Fatigue' },
  ],
  hospitalised: 'ef3c5476-a0e2-44eb-be62-dab5631af36d',
  oedema: 'bd057502-c23b-4f80-b24c-b996e8a84dfc',
  oedemaAnswers: [
    { value: NONE, label: 'None' },
    { value: '6558864e-977f-11e1-8993-905e29aff6c1', label: 'Lower extremities' },
    { value: '65748bbe-977f-11e1-8993-905e29aff6c1', label: 'General' },
  ],
  crackles: 'e3ed7b54-5fcb-453f-9058-605f443bf78d',
  jvpElevated: 'dc277a10-f5dd-461c-b936-8bcdeb808b8b',
  volumeStatus: '6563ba78-977f-11e1-8993-905e29aff6c1',
  volumeStatuses: [
    { value: '6563bd84-977f-11e1-8993-905e29aff6c1', label: 'Hypovolemic' },
    { value: '6563bc80-977f-11e1-8993-905e29aff6c1', label: 'Euvolemic' },
    { value: '6563bb7c-977f-11e1-8993-905e29aff6c1', label: 'Hypervolemic' },
  ],
  nyha: '6562e508-977f-11e1-8993-905e29aff6c1',
  nyhaClasses: [
    { value: '6562e0ee-977f-11e1-8993-905e29aff6c1', label: 'I' },
    { value: '6562e1f2-977f-11e1-8993-905e29aff6c1', label: 'II' },
    { value: '6562e300-977f-11e1-8993-905e29aff6c1', label: 'III' },
    { value: '6562e404-977f-11e1-8993-905e29aff6c1', label: 'IV' },
  ],
  alcohol: '655a4ed4-977f-11e1-8993-905e29aff6c1',
  tobacco: '655a4dc6-977f-11e1-8993-905e29aff6c1',
  useAnswers: [
    { value: '655a4cc2-977f-11e1-8993-905e29aff6c1', label: 'Current' },
    { value: '65577f4c-977f-11e1-8993-905e29aff6c1', label: 'Never' },
    { value: '655a4ab0-977f-11e1-8993-905e29aff6c1', label: 'Stopped' },
  ],
  saltFluidRestricted: 'e513cb96-6782-4a2f-bc8e-e4f9ebaf0286',
  depressionConcern: '95b1429a-34fd-4209-9cf9-20c66abc0348',
  /** In the form's order, each in a dispensing group as the other NCD visits' are; "Other" is named in free text */
  medications: [
    { key: 'aspirin', drug: '6545efde-977f-11e1-8993-905e29aff6c1', label: 'Aspirin (ASP)', short: 'ASP', name: 'Aspirin', drugClass: 'aspirin' },
    {
      key: 'hctz',
      drug: '65588df6-977f-11e1-8993-905e29aff6c1',
      label: 'Hydrochlorothiazide (HCTZ)',
      short: 'HCTZ',
      name: 'Hydrochlorothiazide',
      drugClass: 'diuretic',
    },
    {
      key: 'furosemide',
      drug: '6546003c-977f-11e1-8993-905e29aff6c1',
      label: 'Furosemide (FURO)',
      short: 'FURO',
      name: 'Furosemide',
      drugClass: 'diuretic',
    },
    {
      key: 'spironolactone',
      drug: '65694c36-977f-11e1-8993-905e29aff6c1',
      label: 'Spironolactone (SPIRO)',
      short: 'SPIRO',
      name: 'Spironolactone',
      drugClass: 'diuretic',
    },
    {
      key: 'enalapril',
      drug: '65588cde-977f-11e1-8993-905e29aff6c1',
      label: 'Enalapril (ENAL)',
      short: 'ENAL',
      name: 'Enalapril',
      drugClass: 'aceI',
    },
    {
      key: 'captopril',
      drug: '6563597a-977f-11e1-8993-905e29aff6c1',
      label: 'Captopril (CAPT)',
      short: 'CAPT',
      name: 'Captopril',
      drugClass: 'aceI',
    },
    {
      key: 'lisinopril',
      drug: '65635a74-977f-11e1-8993-905e29aff6c1',
      label: 'Lisinopril (LISIN)',
      short: 'LISIN',
      name: 'Lisinopril',
      drugClass: 'aceI',
    },
    {
      key: 'atenolol',
      drug: '65635d58-977f-11e1-8993-905e29aff6c1',
      label: 'Atenolol (ATEN)',
      short: 'ATEN',
      name: 'Atenolol',
      drugClass: 'betaBlocker',
    },
    {
      key: 'bisoprolol',
      drug: '72247aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      label: 'Bisoprolol (BIS)',
      short: 'BIS',
      name: 'Bisoprolol',
      drugClass: 'betaBlocker',
    },
    {
      key: 'propranolol',
      drug: '65470f18-977f-11e1-8993-905e29aff6c1',
      label: 'Propranolol (PROP)',
      short: 'PROP',
      name: 'Propranolol',
      drugClass: 'betaBlocker',
    },
    {
      key: 'amlodipine',
      drug: '65635ef2-977f-11e1-8993-905e29aff6c1',
      label: 'Amlodipine (AML)',
      short: 'AML',
      name: 'Amlodipine',
      drugClass: 'ccb',
    },
    {
      key: 'nifedipine',
      drug: '654704dc-977f-11e1-8993-905e29aff6c1',
      label: 'Nifedipine MR (NIF)',
      short: 'NIF',
      name: 'Nifedipine modified release',
      drugClass: 'ccb',
    },
    {
      key: 'simvastatin',
      drug: '83936aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      label: 'Simvastatin',
      short: 'SIMVA',
      name: 'Simvastatin',
      drugClass: 'statin',
    },
    {
      key: 'pravastatin',
      drug: '82411aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      label: 'Pravastatin',
      short: 'PRAVA',
      name: 'Pravastatin',
      drugClass: 'statin',
    },
    {
      key: 'atorvastatin',
      drug: '657aefc2-977f-11e1-8993-905e29aff6c1',
      label: 'Atorvastatin',
      short: 'ATORVA',
      name: 'Atorvastatin',
      drugClass: 'statin',
    },
    {
      key: 'benzathinePcn',
      drug: '656930ac-977f-11e1-8993-905e29aff6c1',
      label: 'Benzathine PCN',
      short: 'BPG',
      name: 'Benzathine penicillin',
      drugClass: 'benzathine',
    },
    { key: 'other', drug: '657140f8-977f-11e1-8993-905e29aff6c1', label: 'Other', short: 'Other', name: 'Other', drugClass: 'other' },
  ],
  tookMedsToday: '5f91e983-f825-4f41-81de-077288a5d860',
  saltDiet: '65730a00-977f-11e1-8993-905e29aff6c1',
  mentalHealthReferral: '3790bbe2-13b3-45b4-94d1-a9719f5ac51d',
  palliativeReferral: 'd69886ae-5eda-40ab-b2df-6ea9794a30d5',
  /** The visit's Request CHW F/U, saved as the follow-up agreement */
  chwFollowUp: '655fc526-977f-11e1-8993-905e29aff6c1',
  nextAppointment: '6569cbd4-977f-11e1-8993-905e29aff6c1',
  yes: YES,
  no: NO,
};

/** echocardiogram-ultrasound-imaging-results.xml */
export const CVD_ECHO = {
  lvsf: '65681a32-977f-11e1-8993-905e29aff6c1',
  lvsfAnswers: [
    { value: NORMAL, label: 'Normal' },
    { value: '65681726-977f-11e1-8993-905e29aff6c1', label: 'Reduced' },
    { value: '6568192e-977f-11e1-8993-905e29aff6c1', label: 'Severely reduced' },
    { value: NOT_WELL_VISUALISED, label: 'Not well visualized' },
  ],
  rightVentricle: '4c5236cf-412f-4ed2-ab20-869c42f09e3e',
  rightVentricleAnswers: [
    { value: NORMAL, label: 'Normal' },
    { value: DILATED, label: 'Dilated' },
    { value: NOT_WELL_VISUALISED, label: 'Not well visualized' },
  ],
  mitralValve: '6565fc20-977f-11e1-8993-905e29aff6c1',
  mitralValveAnswers: [
    { value: '6567b75e-977f-11e1-8993-905e29aff6c1', label: 'No stenosis' },
    { value: '65682c98-977f-11e1-8993-905e29aff6c1', label: 'Very thickened walls' },
    { value: '65685358-977f-11e1-8993-905e29aff6c1', label: 'Moderate / severe stenosis' },
    { value: '6567fcaa-977f-11e1-8993-905e29aff6c1', label: 'Regurgitation' },
    { value: NOT_WELL_VISUALISED, label: 'Not well visualized' },
  ],
  pericardialEffusion: '6573dff2-977f-11e1-8993-905e29aff6c1',
  pericardialEffusionAnswers: [
    { value: 'ed61396e-0835-4237-bc3d-93e990f64d1d', label: 'No effusion' },
    { value: NOT_WELL_VISUALISED, label: 'Not well visualized' },
    { value: '656593b6-977f-11e1-8993-905e29aff6c1', label: 'Small (< 1 cm)' },
    { value: '655c243e-977f-11e1-8993-905e29aff6c1', label: 'Moderate (1 - 2 cm)' },
    { value: '655c28b2-977f-11e1-8993-905e29aff6c1', label: 'Severe (> 2 cm)' },
  ],
  inferiorVenaCava: '6568bd8e-977f-11e1-8993-905e29aff6c1',
  inferiorVenaCavaAnswers: [
    { value: NORMAL, label: 'Normal' },
    { value: DILATED, label: 'Dilated (> 2 cm)' },
    { value: NOT_WELL_VISUALISED, label: 'Not well visualized' },
  ],
};

/** The EKG and chest X-ray forms: each a text result */
export const CVD_IMAGING = {
  ekgResult: 'd3a49fe2-819b-491a-941f-e0b8a0f76c38',
  chestXrayResult: '50fd8ee2-8e27-4811-991e-42011829cf37',
};

/** cardiac-and-vascular-disease-quarterly-laboratory-tests.xml */
export const CVD_QUARTERLY_LABS = {
  hivStatus: '6567ae62-977f-11e1-8993-905e29aff6c1',
  hivStatuses: [
    { value: '65587802-977f-11e1-8993-905e29aff6c1', label: 'Reactive' },
    { value: '6558791a-977f-11e1-8993-905e29aff6c1', label: 'Non-reactive' },
    { value: UNKNOWN, label: 'Unknown' },
  ],
};

/** cardiac-and-vascular-disease-frequency-per-protocol-laboratory-tests.xml */
export const CVD_PROTOCOL_LABS = {
  proteinuria: '65717366-977f-11e1-8993-905e29aff6c1',
  proteinuriaAnswers: [
    { value: '654994c2-977f-11e1-8993-905e29aff6c1', label: 'Negative' },
    { value: '6572cf72-977f-11e1-8993-905e29aff6c1', label: 'Trace' },
    { value: '65598fb2-977f-11e1-8993-905e29aff6c1', label: '1+' },
    { value: '65597cde-977f-11e1-8993-905e29aff6c1', label: '2+' },
    { value: '65598706-977f-11e1-8993-905e29aff6c1', label: '3+' },
    { value: 'e1b2af76-4b69-4ba4-9ddc-d801649bc212', label: '4+' },
  ],
  creatinine: '657170a0-977f-11e1-8993-905e29aff6c1',
  egfr: '6214728c-e515-4287-a869-bcde209f888b',
  potassium: '6557b566-977f-11e1-8993-905e29aff6c1',
  randomBloodSugar: '654a98b8-977f-11e1-8993-905e29aff6c1',
  lipidProfile: 'f77f0ba3-8668-4537-9f96-7aad3403cff8',
  lipidAnswers: [
    { value: NORMAL, label: 'Normal' },
    { value: '6623242a-f374-46c1-83d7-d17551e48a79', label: 'High lipids' },
    { value: 'f7a42154-66d8-41a9-97cd-c16dde4c0f3b', label: 'High TGs' },
  ],
};
