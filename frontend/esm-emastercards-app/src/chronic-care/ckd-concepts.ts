import { type CardForm } from '../art/obs-diff';

/**
 * The Chronic Kidney Disease eMastercard's forms and the concepts they save, copied from
 * chronic-kidney-disease-emastercard.xml, -visit.xml, -quarterly-laboratory-tests.xml, -annual-laboratory-tests.xml,
 * -imaging-results.xml and -hospitalization-history.xml (UUIDs lower-cased, as REST returns them). Its patient and
 * guardian questions are the NCD headers' (shared/ncd.ts), and its hospitalisations save what the hypertension and
 * diabetes card's do.
 */

/** The eMastercards endpoint's key for this card */
export const CKD_CARD_KEY = 'ckd';

/** The paper card's version (the forms' "Version 1"), which the page names under its title */
export const CKD_CARD_VERSION = '1';

export type CkdForm = 'header' | 'visit' | 'quarterlyLabs' | 'annualLabs' | 'imaging' | 'hospitalisation';

export const CKD_FORMS: Record<CkdForm, CardForm> = {
  header: { encounterType: '0a3621e2-974e-11e8-9eb6-529269fb1459', form: 'ec0a340c-9751-11e8-9eb6-529269fb1459' },
  visit: { encounterType: '1ebe2272-974e-11e8-9eb6-529269fb1459', form: 'ec0a1fb2-9751-11e8-9eb6-529269fb1459' },
  quarterlyLabs: { encounterType: 'ec0a2232-9751-11e8-9eb6-529269fb1459', form: 'ec0a2a2a-9751-11e8-9eb6-529269fb1459' },
  annualLabs: { encounterType: 'ec0a17ba-9751-11e8-9eb6-529269fb1459', form: 'ec0a2cbe-9751-11e8-9eb6-529269fb1459' },
  imaging: { encounterType: 'c4948e2c-9adf-11e8-9eb6-529269fb1459', form: '1bb608b2-9fa8-11e8-98d0-529269fb1459' },
  hospitalisation: { encounterType: 'ec0a2f2a-9751-11e8-9eb6-529269fb1459', form: 'ec0a31a0-9751-11e8-9eb6-529269fb1459' },
};

const YES = '65576354-977f-11e1-8993-905e29aff6c1';
const NO = '6557646c-977f-11e1-8993-905e29aff6c1';
const UNKNOWN = '65576584-977f-11e1-8993-905e29aff6c1';
const HYPERTENSION = '654abfc8-977f-11e1-8993-905e29aff6c1';
const DIABETES = '6567426a-977f-11e1-8993-905e29aff6c1';
const TRACE = '6572cf72-977f-11e1-8993-905e29aff6c1';
const PLUS = '65598fb2-977f-11e1-8993-905e29aff6c1';
const PLUS_PLUS = '65597cde-977f-11e1-8993-905e29aff6c1';
const PLUS_PLUS_PLUS = '65598706-977f-11e1-8993-905e29aff6c1';

/** chronic-kidney-disease-emastercard.xml, the card header (CKD_INITIAL encounter) */
export const CKD_HEADER = {
  /** Coded, one obs per etiology ticked */
  etiology: '9868d4ee-3325-49a7-9eee-ebb8416e2728',
  etiologies: [
    { value: HYPERTENSION, label: 'Hypertension' },
    { value: DIABETES, label: 'Diabetes' },
    { value: '654a9598-977f-11e1-8993-905e29aff6c1', label: 'HIV' },
    { value: '65696f40-977f-11e1-8993-905e29aff6c1', label: 'Nephrotic' },
    { value: '657140f8-977f-11e1-8993-905e29aff6c1', label: 'Others' },
    { value: '6577bb7c-977f-11e1-8993-905e29aff6c1', label: 'Unknown' },
  ],
  /** Text: the drugs, and other etiologies, the form asks to specify */
  drugsEtiology: '0754f2f8-d797-11e8-9f8b-f2801f1b9fd1',
  otherEtiology: '65780d0c-977f-11e1-8993-905e29aff6c1',
  /** The etiology's date, on its own (not in a group) */
  etiologyDate: '65732bf2-977f-11e1-8993-905e29aff6c1',
  /** Each diagnosis ticked is its own group: the diagnosis and its date */
  diagnoses: [
    { key: 'chf', answer: '6566257e-977f-11e1-8993-905e29aff6c1', label: 'CHF' },
    { key: 'hypertension', answer: HYPERTENSION, label: 'Hypertension' },
    { key: 'diabetes', answer: DIABETES, label: 'Diabetes' },
    { key: 'other', answer: '656cce7e-977f-11e1-8993-905e29aff6c1', label: 'Other (Stroke, COPD)' },
  ],
  /** Text */
  dialysisHistory: '8dcb0708-feb4-44e8-bdb8-ed90be94c4d0',
  dialysisDate: '3b55eeb2-d56a-4aab-b5bf-f00668feee75',
  /** The TB diagnosis's date, which this card asks in place of the year */
  tbDate: '655dd8d8-977f-11e1-8993-905e29aff6c1',
};

/** chronic-kidney-disease-visit.xml (CKD_FOLLOWUP encounter) */
export const CKD_VISIT = {
  height: '6569c562-977f-11e1-8993-905e29aff6c1',
  weight: '6569c44a-977f-11e1-8993-905e29aff6c1',
  /** Text */
  weightChange: '1be55e42-9a11-11e8-9eb6-529269fb1459',
  systolicBp: '6569bffe-977f-11e1-8993-905e29aff6c1',
  diastolicBp: '6569c116-977f-11e1-8993-905e29aff6c1',
  /** Whole mL/min */
  gfr: 'a0d7e2b0-d69c-11e8-9f8b-f2801f1b9fd1',
  heartRate: '6569c224-977f-11e1-8993-905e29aff6c1',
  creatinine: '657170a0-977f-11e1-8993-905e29aff6c1',
  urineProtein: '65717366-977f-11e1-8993-905e29aff6c1',
  urineProteinAnswers: [
    { value: '654994c2-977f-11e1-8993-905e29aff6c1', label: 'No' },
    { value: TRACE, label: 'Trace' },
    { value: PLUS, label: '+' },
    { value: PLUS_PLUS, label: '++' },
    { value: PLUS_PLUS_PLUS, label: '+++' },
  ],
  /** Each asked Yes/No, in the form's order (conjunctiva and ascites follow) */
  symptoms: [
    { key: 'confusion', concept: '657592c0-977f-11e1-8993-905e29aff6c1', label: 'Confusion' },
    { key: 'fatigue', concept: '71195f66-a9c7-4c33-b6be-90ef9ff9535f', label: 'Fatigue' },
    { key: 'nausea', concept: '104cb8fb-8ff9-4ea4-b547-10fed3afdea2', label: 'Nausea' },
    { key: 'anorexia', concept: 'ac7a7aae-6f3a-4a04-a147-97019597886f', label: 'Anorexia' },
    { key: 'pruritus', concept: 'ca2cd277-cdfc-42b0-9958-3f1281480ad8', label: 'Pruritus' },
  ],
  conjunctiva: '6560c728-977f-11e1-8993-905e29aff6c1',
  conjunctivaAnswers: [
    { value: '65638ef4-977f-11e1-8993-905e29aff6c1', label: 'Pink' },
    { value: '6548a256-977f-11e1-8993-905e29aff6c1', label: 'Pale' },
  ],
  ascites: '2b0f959a-8877-434b-8cc4-430682e7c9f4',
  oedema: 'bd057502-c23b-4f80-b24c-b996e8a84dfc',
  oedemaAnswers: [
    { value: '6557987e-977f-11e1-8993-905e29aff6c1', label: 'No' },
    { value: TRACE, label: 'Trace' },
    { value: PLUS, label: '+' },
    { value: PLUS_PLUS, label: '++' },
    { value: PLUS_PLUS_PLUS, label: '+++' },
  ],
  /** Text */
  otherSymptoms: '654b3fac-977f-11e1-8993-905e29aff6c1',
  ckdStage: 'fd79ad7e-53ea-461a-b075-27beee44a6cc',
  ckdStages: [
    { value: 'd45b3164-bdb1-4411-9f22-d998c9af116c', label: '1-2' },
    { value: '358c0e8f-708a-48f3-ba2c-e7fe16a24cfd', label: '3' },
    { value: 'd0a884e6-8bb5-451c-a321-f63242d216b7', label: '4-5' },
  ],
  nsaidUse: '89a3d604-43f9-4d4e-95ad-8b8577f80108',
  tobacco: '655a4dc6-977f-11e1-8993-905e29aff6c1',
  alcohol: '655a4ed4-977f-11e1-8993-905e29aff6c1',
  useAnswers: [
    { value: '655a4cc2-977f-11e1-8993-905e29aff6c1', label: 'Current' },
    { value: '65577f4c-977f-11e1-8993-905e29aff6c1', label: 'Never' },
    { value: '655a4ab0-977f-11e1-8993-905e29aff6c1', label: 'Stopped' },
  ],
  /** In the form's order, each in a dispensing group as the other NCD visits' are */
  medications: [
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
    { key: 'other', drug: '657140f8-977f-11e1-8993-905e29aff6c1', label: 'Other', short: 'Other', name: 'Other', drugClass: 'other' },
  ],
  /** Text: what an Other medication was, which this card saves in place of the other cards' non-coded text */
  otherMedication: 'c8a4d207-0a73-4471-955c-c1f47cbbe2b5',
  tookMedsToday: '5f91e983-f825-4f41-81de-077288a5d860',
  diet: 'ccc842f5-c7ee-4b82-865c-be19053c4db3',
  diets: [
    { value: '5e7a1d78-aecc-4b47-bc81-d144dc91dda1', label: 'Low sodium' },
    { value: '0ddfbe32-04c3-4b03-a057-ca3b5524cbb5', label: 'Low potassium' },
    { value: 'f8770f87-1834-4331-a8f5-88df5e6f9573', label: 'Low protein' },
    { value: '3cfde72e-8626-4ee2-97e8-6f40172953f5', label: 'High calories' },
  ],
  nextAppointment: '6569cbd4-977f-11e1-8993-905e29aff6c1',
  yes: YES,
  no: NO,
};

/** chronic-kidney-disease-quarterly-laboratory-tests.xml */
export const CKD_QUARTERLY_LABS = {
  hivStatus: '6567ae62-977f-11e1-8993-905e29aff6c1',
  hivStatuses: [
    { value: '65587802-977f-11e1-8993-905e29aff6c1', label: 'Reactive' },
    { value: '6558791a-977f-11e1-8993-905e29aff6c1', label: 'Non-reactive' },
    { value: UNKNOWN, label: 'Unknown' },
  ],
  /** Whole g/dL */
  haemoglobin: '657a745c-977f-11e1-8993-905e29aff6c1',
};

/** chronic-kidney-disease-annual-laboratory-tests.xml */
export const CKD_ANNUAL_LABS = {
  randomBloodSugar: '654a98b8-977f-11e1-8993-905e29aff6c1',
  lipidProfile: 'f77f0ba3-8668-4537-9f96-7aad3403cff8',
  lipidAnswers: [
    { value: '6557a15c-977f-11e1-8993-905e29aff6c1', label: 'Normal' },
    { value: '6623242a-f374-46c1-83d7-d17551e48a79', label: 'High lipids' },
    { value: 'f7a42154-66d8-41a9-97cd-c16dde4c0f3b', label: 'High TGs' },
  ],
};

/** chronic-kidney-disease-imaging-results.xml: a text ultrasound result */
export const CKD_IMAGING = {
  ultrasoundResult: 'b822cbed-d108-4387-8876-b430179a5945',
};
