import { type CardForm } from '../art/obs-diff';

/**
 * The Hypertension and Diabetes eMastercard's forms and the concepts they save, copied from
 * hypertension-and-diabetes-emastercard.xml, -visit.xml, -quarterly-laboratory-tests.xml,
 * -annual-laboratory-tests.xml and -hospitalization-history.xml (UUIDs lower-cased, as REST returns them)
 */

/** The eMastercards endpoint's key for this card */
export const HTN_CARD_KEY = 'htn-dm';

/** The paper card's version (the forms' "Version 1"), which the page names under its title */
export const HTN_CARD_VERSION = '1';

export type HtnForm = 'header' | 'visit' | 'quarterlyLabs' | 'annualLabs' | 'hospitalisation';

export const HTN_FORMS: Record<HtnForm, CardForm> = {
  header: {
    encounterType: '664b9442-977f-11e1-8993-905e29aff6c1',
    form: '8cfee016-cacb-11e5-9956-625662870761',
  },
  visit: {
    encounterType: '66079de4-a8df-11e5-bf7f-feff819cdc9f',
    form: '8cfedcc4-cacb-11e5-9956-625662870761',
  },
  quarterlyLabs: {
    encounterType: '6607a082-a8df-11e5-bf7f-feff819cdc9f',
    form: '618e01cc-b96f-11e5-9912-ba0be0483c18',
  },
  annualLabs: {
    encounterType: '76f2759c-d729-11e6-8072-dce9fc320581',
    form: '76f2759c-d729-11e6-8072-dce9fc320581',
  },
  hospitalisation: {
    encounterType: '6607a186-a8df-11e5-bf7f-feff819cdc9f',
    form: '0ed9a7b6-b982-11e5-9912-ba0be0483c18',
  },
};

export const UNKNOWN = '65576584-977f-11e1-8993-905e29aff6c1';
export const NORMAL = '6557a15c-977f-11e1-8993-905e29aff6c1';

/** hypertension-and-diabetes-emastercard.xml, the card header (DIABETES HYPERTENSION INITIAL VISIT encounter) */
export const HTN_HEADER = {
  transferInDate: '6559bc30-977f-11e1-8993-905e29aff6c1',
  /** Numeric, as the concept's datatype is */
  patientPhone: '6559ba14-977f-11e1-8993-905e29aff6c1',
  guardianName: '655bbc74-977f-11e1-8993-905e29aff6c1',
  guardianPhone: '65600cd4-977f-11e1-8993-905e29aff6c1',
  relationToPatient: '6558fd0e-977f-11e1-8993-905e29aff6c1',
  agreesToFollowUp: '655fc526-977f-11e1-8993-905e29aff6c1',
  chwRelationshipType: 'eb567be2-fda1-4746-9d51-833de8a7e81f',
  /** Each diagnosis ticked is its own group: the diagnosis and its date */
  diagnosisGroup: '6db168f1-0f38-42d9-9f0e-90946a3d8e72',
  diagnosis: '65671c9a-977f-11e1-8993-905e29aff6c1',
  diagnosisDate: '65732bf2-977f-11e1-8993-905e29aff6c1',
  diagnoses: [
    {
      key: 'dm1',
      answer: '65714206-977f-11e1-8993-905e29aff6c1',
      label: 'Type 1 DM',
    },
    {
      key: 'dm2',
      answer: '65714314-977f-11e1-8993-905e29aff6c1',
      label: 'Type 2 DM',
    },
    {
      key: 'htn',
      answer: '654abfc8-977f-11e1-8993-905e29aff6c1',
      label: 'Hypertension',
    },
  ],
  familyDiabetes: '657308fc-977f-11e1-8993-905e29aff6c1',
  familyHypertension: '53377d8e-ada7-11e5-bf7f-feff819cdc9f',
  hivStatus: '6567ae62-977f-11e1-8993-905e29aff6c1',
  reactive: '65587802-977f-11e1-8993-905e29aff6c1',
  nonReactive: '6558791a-977f-11e1-8993-905e29aff6c1',
  hivTestDate: '655bc9da-977f-11e1-8993-905e29aff6c1',
  artStartDate: '655f9eb6-977f-11e1-8993-905e29aff6c1',
  tbStatus: '65770db2-977f-11e1-8993-905e29aff6c1',
  /** The form's answers and labels; its Unknown is labelled "never had TB" */
  tbStatuses: [
    { value: '655ddc20-977f-11e1-8993-905e29aff6c1', label: 'Smear positive' },
    { value: '655ddd24-977f-11e1-8993-905e29aff6c1', label: 'Smear negative' },
    { value: '655a49ac-977f-11e1-8993-905e29aff6c1', label: 'EPTB' },
    { value: UNKNOWN, label: 'Never had TB' },
  ],
  tbYear: '3237c2a0-ada3-11e5-bf7f-feff819cdc9f',
  /** Each complication ticked is its own group: the complication and its date */
  complicationGroup: '4cb5e127-c437-4514-8618-fdc27310148e',
  complication: '1628aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  complications: [
    {
      key: 'stroke',
      answer: '0e47b44c-a9b9-11e5-bf7f-feff819cdc9f',
      label: 'Stroke/TIA',
    },
    {
      key: 'cardio',
      answer: '654b5c58-977f-11e1-8993-905e29aff6c1',
      label: 'Cardiovascular disease',
    },
    {
      key: 'pvd',
      answer: '6577a218-977f-11e1-8993-905e29aff6c1',
      label: 'PVD',
    },
    {
      key: 'retinopathy',
      answer: '113257aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      label: 'Retinopathy',
    },
    {
      key: 'neuropathy',
      answer: '115268aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      label: 'Neuropathy',
    },
    {
      key: 'renal',
      answer: '656f1eea-977f-11e1-8993-905e29aff6c1',
      label: 'Renal disease',
    },
    {
      key: 'sexualDysfunction',
      answer: '126580aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      label: 'Sexual dysfunction',
    },
  ],
};

/** The drug classes of the visit's medications, in the form's order */
export type DrugClass = 'diabetes' | 'diuretic' | 'ccb' | 'aceI' | 'betaBlocker' | 'aspirin' | 'statin' | 'other';

/** hypertension-and-diabetes-visit.xml (DIABETES HYPERTENSION FOLLOWUP encounter) */
export const HTN_VISIT = {
  height: '6569c562-977f-11e1-8993-905e29aff6c1',
  weight: '6569c44a-977f-11e1-8993-905e29aff6c1',
  bmi: '484499f2-b58b-11e5-9f22-ba0be0483c18',
  bmiAnswers: [
    { value: '6567eb98-977f-11e1-8993-905e29aff6c1', label: 'Below 19' },
    { value: NORMAL, label: '19-24.9' },
    { value: '158204aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Above 25' },
  ],
  systolicBp: '6569bffe-977f-11e1-8993-905e29aff6c1',
  diastolicBp: '6569c116-977f-11e1-8993-905e29aff6c1',
  pulse: '6569c224-977f-11e1-8993-905e29aff6c1',
  hbA1c: '65714f76-977f-11e1-8993-905e29aff6c1',
  glucose: '654a98b8-977f-11e1-8993-905e29aff6c1',
  glucoseTestType: '65711e3e-977f-11e1-8993-905e29aff6c1',
  glucoseTestTypes: [
    { value: '65711c2c-977f-11e1-8993-905e29aff6c1', label: 'Fasting' },
    { value: '65711d3a-977f-11e1-8993-905e29aff6c1', label: 'Random' },
  ],
  tobacco: '655a4dc6-977f-11e1-8993-905e29aff6c1',
  alcohol: '655a4ed4-977f-11e1-8993-905e29aff6c1',
  useAnswers: [
    { value: '655a4cc2-977f-11e1-8993-905e29aff6c1', label: 'Current' },
    { value: '65577f4c-977f-11e1-8993-905e29aff6c1', label: 'Never' },
    { value: '655a4ab0-977f-11e1-8993-905e29aff6c1', label: 'Stopped' },
  ],
  fruitVegetables: 'c65523dd-0c6b-41f6-a59f-a16fe544b22d',
  exercise: '161261aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  cvRisk: '163214aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  visualAcuity: '48449ca4-b58b-11e5-9f22-ba0be0483c18',
  /** The foot check, each asked Yes/No */
  footChecks: [
    {
      key: 'neuropathyPvd',
      concept: '3237c804-ada3-11e5-bf7f-feff819cdc9f',
      label: 'Neuropathy/PVD',
    },
    {
      key: 'deformities',
      concept: '142677aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      label: 'Deformities',
    },
    {
      key: 'ulcers',
      concept: '6571f8b8-977f-11e1-8993-905e29aff6c1',
      label: 'Ulcers',
    },
  ],
  hospitalised: '655b3dc6-977f-11e1-8993-905e29aff6c1',
  /** In the form's order, each in a dispensing group as the mental health and epilepsy visits' are */
  medications: [
    {
      key: 'insulinLong',
      drug: '6573132e-977f-11e1-8993-905e29aff6c1',
      label: 'Long acting insulin',
      short: 'L',
      name: 'Long acting insulin',
      drugClass: 'diabetes',
    },
    {
      key: 'insulinShort',
      drug: '6547414a-977f-11e1-8993-905e29aff6c1',
      label: 'Short acting insulin',
      short: 'S',
      name: 'Short acting insulin',
      drugClass: 'diabetes',
    },
    {
      key: 'metformin',
      drug: '65694308-977f-11e1-8993-905e29aff6c1',
      label: 'Metformin (MET)',
      short: 'MET',
      name: 'Metformin',
      drugClass: 'diabetes',
    },
    {
      key: 'glibenclamide',
      drug: '65693cf0-977f-11e1-8993-905e29aff6c1',
      label: 'Glibenclamide (GLIB)',
      short: 'GLIB',
      name: 'Glibenclamide',
      drugClass: 'diabetes',
    },
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
      label: 'Furosemide (FURP)',
      short: 'FURP',
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
      key: 'aspirin',
      drug: '6545efde-977f-11e1-8993-905e29aff6c1',
      label: 'Aspirin (ASP)',
      short: 'ASP',
      name: 'Aspirin',
      drugClass: 'aspirin',
    },
    {
      key: 'simvastatin',
      drug: '83936aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      label: 'Simvastatin (SIMVA)',
      short: 'SIMVA',
      name: 'Simvastatin',
      drugClass: 'statin',
    },
    {
      key: 'pravastatin',
      drug: '82411aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      label: 'Pravastatin (PRAVA)',
      short: 'PRAVA',
      name: 'Pravastatin',
      drugClass: 'statin',
    },
    {
      key: 'atorvastatin',
      drug: '657aefc2-977f-11e1-8993-905e29aff6c1',
      label: 'Atorvastatin (ATORVA)',
      short: 'ATORVA',
      name: 'Atorvastatin',
      drugClass: 'statin',
    },
    {
      key: 'hydralazine',
      drug: '654b10d6-977f-11e1-8993-905e29aff6c1',
      label: 'Hydralazine (HYD)',
      short: 'HYD',
      name: 'Hydralazine',
      drugClass: 'other',
    },
    {
      key: 'isosorbide',
      drug: '6574f45a-977f-11e1-8993-905e29aff6c1',
      label: 'Isosorbide mononitrate (ISSMN)',
      short: 'ISSMN',
      name: 'Isosorbide mononitrate',
      drugClass: 'other',
    },
  ] as Array<{
    key: string;
    drug: string;
    label: string;
    short: string;
    name: string;
    drugClass: DrugClass;
  }>,
  nextAppointment: '6569cbd4-977f-11e1-8993-905e29aff6c1',
};

/** hypertension-and-diabetes-quarterly-laboratory-tests.xml */
export const HTN_QUARTERLY_LABS = {
  proteinuria: '65717366-977f-11e1-8993-905e29aff6c1',
  proteinuriaAnswers: [
    { value: '654994c2-977f-11e1-8993-905e29aff6c1', label: 'Negative' },
    { value: '6572cf72-977f-11e1-8993-905e29aff6c1', label: 'Trace' },
    { value: '65598fb2-977f-11e1-8993-905e29aff6c1', label: '1+' },
    { value: '65597cde-977f-11e1-8993-905e29aff6c1', label: '2+' },
    { value: '65598706-977f-11e1-8993-905e29aff6c1', label: '3+' },
  ],
  /** The HIV test's group: its result and, set to the test's date, its sample date */
  hivTestGroup: '655dca78-977f-11e1-8993-905e29aff6c1',
  hivResult: '655dcb7c-977f-11e1-8993-905e29aff6c1',
  hivResults: [
    { value: '6549be7a-977f-11e1-8993-905e29aff6c1', label: 'Reactive' },
    { value: '654994c2-977f-11e1-8993-905e29aff6c1', label: 'Non-reactive' },
    { value: '6557a4ae-977f-11e1-8993-905e29aff6c1', label: 'Not done' },
  ],
  hivSampleDate: '656f9ed8-977f-11e1-8993-905e29aff6c1',
};

/** hypertension-and-diabetes-annual-laboratory-tests.xml */
export const HTN_ANNUAL_LABS = {
  /** Text */
  ecg: '6572b4ec-977f-11e1-8993-905e29aff6c1',
  creatinine: '657170a0-977f-11e1-8993-905e29aff6c1',
  /** Coded, one obs per answer ticked */
  lipidProfile: 'f77f0ba3-8668-4537-9f96-7aad3403cff8',
  lipidAnswers: [
    { value: NORMAL, label: 'Normal' },
    { value: '6623242a-f374-46c1-83d7-d17551e48a79', label: 'High lipids' },
    { value: 'f7a42154-66d8-41a9-97cd-c16dde4c0f3b', label: 'High TGs' },
  ],
  /** Text */
  fundoscopy: '65717578-977f-11e1-8993-905e29aff6c1',
};

/** hypertension-and-diabetes-hospitalization-history.xml; its encounter date is the date of discharge */
export const HTN_HOSPITALISATION = {
  lengthOfStay: '656170f6-977f-11e1-8993-905e29aff6c1',
  admissionReason: '162879aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  dischargeDiagnosis: '0ed9abe4-b982-11e5-9912-ba0be0483c18',
  dischargeMedications: '316bc014-ba1f-11e5-9912-ba0be0483c18',
};
