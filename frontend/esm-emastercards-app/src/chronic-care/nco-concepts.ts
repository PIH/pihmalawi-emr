import { type CardForm } from '../art/obs-diff';

/**
 * The NCD Other eMastercard's forms and the concepts they save, copied from ncd-other-emastercard.xml, -visit.xml,
 * -quarterly-laboratory-tests.xml, -annual-laboratory-tests.xml and -hospitalization-history.xml (UUIDs lower-cased, as
 * REST returns them). Its patient and guardian questions are the NCD headers' (shared/ncd.ts), its imaging results the
 * cardiac and vascular disease card's, and its hospitalisations save what the hypertension and diabetes card's do.
 */

/** The eMastercards endpoint's key for this card */
export const NCO_CARD_KEY = 'ncd-other';

/** The paper card's version (the forms' "Version 1"), which the page names under its title */
export const NCO_CARD_VERSION = '1';

export type NcoForm = 'header' | 'visit' | 'quarterlyLabs' | 'annualLabs' | 'hospitalisation';

export const NCO_FORMS: Record<NcoForm, CardForm> = {
  header: { encounterType: 'b562295c-e335-11e8-9f32-f2801f1b9fd1', form: '766c92e8-e35b-11e8-9f32-f2801f1b9fd1' },
  visit: { encounterType: 'b5622bf0-e335-11e8-9f32-f2801f1b9fd1', form: '766c8c30-e35b-11e8-9f32-f2801f1b9fd1' },
  quarterlyLabs: { encounterType: 'b5622d4e-e335-11e8-9f32-f2801f1b9fd1', form: '766c9554-e35b-11e8-9f32-f2801f1b9fd1' },
  annualLabs: { encounterType: 'b5623082-e335-11e8-9f32-f2801f1b9fd1', form: '998068ae-e35b-11e8-9f32-f2801f1b9fd1' },
  hospitalisation: { encounterType: 'b56231e0-e335-11e8-9f32-f2801f1b9fd1', form: '766c941e-e35b-11e8-9f32-f2801f1b9fd1' },
};

const YES = '65576354-977f-11e1-8993-905e29aff6c1';
const NO = '6557646c-977f-11e1-8993-905e29aff6c1';
const UNKNOWN = '65576584-977f-11e1-8993-905e29aff6c1';

/** ncd-other-emastercard.xml, the card header (NCD_OTHER_INITIAL encounter) */
export const NCO_HEADER = {
  /** Each diagnosis ticked is its own group: the diagnosis and its date; Other names the diagnosis in its group's text */
  diagnoses: [
    { key: 'rheumatoidArthritis', answer: '6546c670-977f-11e1-8993-905e29aff6c1', label: 'Rheumatoid arthritis' },
    { key: 'cirrhosis', answer: '65673cac-977f-11e1-8993-905e29aff6c1', label: 'Cirrhosis' },
    { key: 'dvtPe', answer: '65717898-977f-11e1-8993-905e29aff6c1', label: 'DVT / PE' },
    { key: 'sickleCell', answer: '65774b06-977f-11e1-8993-905e29aff6c1', label: 'Sickle cell disease' },
    { key: 'other', answer: '656cce7e-977f-11e1-8993-905e29aff6c1', label: 'Other' },
  ],
  /** Text: the Other diagnosis, in its group, and the other comorbidity, on its own */
  otherDiagnosis: '65780d0c-977f-11e1-8993-905e29aff6c1',
  /** Coded, one obs per comorbidity ticked */
  comorbidity: '655a8d90-977f-11e1-8993-905e29aff6c1',
  comorbidities: [
    { value: '654abfc8-977f-11e1-8993-905e29aff6c1', label: 'Hypertension' },
    { value: '6567426a-977f-11e1-8993-905e29aff6c1', label: 'Diabetes' },
    { value: '6577c7a2-977f-11e1-8993-905e29aff6c1', label: 'Chronic kidney disease' },
  ],
  /** The TB diagnosis's date, which this card asks in place of the year */
  tbDate: '655dd8d8-977f-11e1-8993-905e29aff6c1',
};

/** ncd-other-visit.xml (NCD_OTHER_FOLLOWUP encounter) */
export const NCO_VISIT = {
  height: '6569c562-977f-11e1-8993-905e29aff6c1',
  weight: '6569c44a-977f-11e1-8993-905e29aff6c1',
  /** Text */
  weightChange: '1be55e42-9a11-11e8-9eb6-529269fb1459',
  systolicBp: '6569bffe-977f-11e1-8993-905e29aff6c1',
  diastolicBp: '6569c116-977f-11e1-8993-905e29aff6c1',
  heartRate: '6569c224-977f-11e1-8993-905e29aff6c1',
  spo2: '6569c792-977f-11e1-8993-905e29aff6c1',
  tobacco: '655a4dc6-977f-11e1-8993-905e29aff6c1',
  alcohol: '655a4ed4-977f-11e1-8993-905e29aff6c1',
  useAnswers: [
    { value: '655a4cc2-977f-11e1-8993-905e29aff6c1', label: 'Current' },
    { value: '65577f4c-977f-11e1-8993-905e29aff6c1', label: 'Never' },
    { value: '655a4ab0-977f-11e1-8993-905e29aff6c1', label: 'Stopped' },
  ],
  fruitVegetables: 'c65523dd-0c6b-41f6-a59f-a16fe544b22d',
  exercise: '161261aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  hospitalised: '655b3dc6-977f-11e1-8993-905e29aff6c1',
  /** Text: the medications dispensed, which this card writes out rather than ticks */
  medications: '65617506-977f-11e1-8993-905e29aff6c1',
  medicationsChanged: '655e8076-977f-11e1-8993-905e29aff6c1',
  /** Text */
  comments: '65710548-977f-11e1-8993-905e29aff6c1',
  nextAppointment: '6569cbd4-977f-11e1-8993-905e29aff6c1',
  nextAppointmentLocation: '9f262c0e-e850-11e8-9f32-f2801f1b9fd1',
  nextAppointmentLocations: [
    { value: '2bc82b28-e84f-11e8-9f32-f2801f1b9fd1', label: 'Advanced' },
    { value: '3064bcf8-56f7-43c9-a8cf-d90d42eef739', label: 'IC3' },
  ],
  /** The form's No, Yes answers, in its order */
  noYes: [
    { value: NO, label: 'No' },
    { value: YES, label: 'Yes' },
  ],
  yes: YES,
  no: NO,
};

/** ncd-other-quarterly-laboratory-tests.xml */
export const NCO_QUARTERLY_LABS = {
  hbA1c: '65714f76-977f-11e1-8993-905e29aff6c1',
  hivStatus: '6567ae62-977f-11e1-8993-905e29aff6c1',
  hivStatuses: [
    { value: '65587802-977f-11e1-8993-905e29aff6c1', label: 'Reactive' },
    { value: '6558791a-977f-11e1-8993-905e29aff6c1', label: 'Non-reactive' },
    { value: UNKNOWN, label: 'Unknown' },
  ],
};

/** ncd-other-annual-laboratory-tests.xml */
export const NCO_ANNUAL_LABS = {
  proteinuria: '65717366-977f-11e1-8993-905e29aff6c1',
  proteinuriaAnswers: [
    { value: '654994c2-977f-11e1-8993-905e29aff6c1', label: 'Negative' },
    { value: '6572cf72-977f-11e1-8993-905e29aff6c1', label: 'Trace' },
    { value: '65598fb2-977f-11e1-8993-905e29aff6c1', label: '1+' },
    { value: '65597cde-977f-11e1-8993-905e29aff6c1', label: '2+' },
    { value: '65598706-977f-11e1-8993-905e29aff6c1', label: '3+' },
  ],
  creatinine: '657170a0-977f-11e1-8993-905e29aff6c1',
  potassium: '6557b566-977f-11e1-8993-905e29aff6c1',
  randomBloodSugar: '654a98b8-977f-11e1-8993-905e29aff6c1',
  lipidProfile: 'f77f0ba3-8668-4537-9f96-7aad3403cff8',
  lipidAnswers: [
    { value: '6557a15c-977f-11e1-8993-905e29aff6c1', label: 'Normal' },
    { value: '6623242a-f374-46c1-83d7-d17551e48a79', label: 'High lipids' },
    { value: 'f7a42154-66d8-41a9-97cd-c16dde4c0f3b', label: 'High TGs' },
  ],
};
