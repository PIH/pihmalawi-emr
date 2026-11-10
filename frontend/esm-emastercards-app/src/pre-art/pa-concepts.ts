import { type CardForm } from '../art/obs-diff';

/**
 * The Pre-ART eMastercard's forms and the concepts they save, copied from pre-art-emastercard.xml and
 * pre-art-visit.xml (UUIDs lower-cased, as REST returns them). The program has been retired: the card is only viewed.
 */

/** The eMastercards endpoint's key for this card */
export const PA_CARD_KEY = 'pre-art';

/** The paper card's version (the header form's "Version 1"), which the page names under its title */
export const PA_CARD_VERSION = '1';

export type PaForm = 'header' | 'visit';

/** PART_INITIAL and PART_FOLLOWUP; encounters are listed by type, so those of the older Pre-ART forms show too */
export const PA_FORMS: Record<PaForm, CardForm> = {
  header: { encounterType: '664b8736-977f-11e1-8993-905e29aff6c1', form: 'cd78175b-e390-4378-9903-df1aaa5da02e' },
  visit: { encounterType: '664b8812-977f-11e1-8993-905e29aff6c1', form: '468a01c2-c39d-4dc2-b142-04052a09e869' },
};

export const YES = '65576354-977f-11e1-8993-905e29aff6c1';
export const NO = '6557646c-977f-11e1-8993-905e29aff6c1';
export const YES_NO = [
  { value: NO, label: 'No' },
  { value: YES, label: 'Yes' },
];

const STAGE_1 = '657499f6-977f-11e1-8993-905e29aff6c1';
const STAGE_2 = '65749afa-977f-11e1-8993-905e29aff6c1';
const STAGE_3 = '65749bfe-977f-11e1-8993-905e29aff6c1';
const STAGE_4 = '65749d02-977f-11e1-8993-905e29aff6c1';

/** pre-art-emastercard.xml, the card header (PART_INITIAL encounter) */
export const PA_HEADER = {
  /** Text */
  guardianName: '655bbc74-977f-11e1-8993-905e29aff6c1',
  guardianPhone: '6563d2c4-977f-11e1-8993-905e29aff6c1',
  patientPhone: '65700e2c-977f-11e1-8993-905e29aff6c1',
  agreesToFollowUp: '655fc526-977f-11e1-8993-905e29aff6c1',
  guardianRelation: '6558fd0e-977f-11e1-8993-905e29aff6c1',
  chwName: '941bc17e-8c33-11e5-80a3-c0430f805837',
  /** Text: the testing site / HTC serial number */
  testSite: '65792e58-977f-11e1-8993-905e29aff6c1',
  testDate: '65792f5c-977f-11e1-8993-905e29aff6c1',
  testType: '65792d4a-977f-11e1-8993-905e29aff6c1',
  testTypes: [
    { value: '654b983a-977f-11e1-8993-905e29aff6c1', label: 'Rapid' },
    { value: '654a6960-977f-11e1-8993-905e29aff6c1', label: 'PCR' },
  ],
  /** Text */
  clinicalConditions: '657a53d2-977f-11e1-8993-905e29aff6c1',
  whoStage: '65778170-977f-11e1-8993-905e29aff6c1',
  whoStages: [
    { value: STAGE_1, label: '1' },
    { value: STAGE_2, label: '2' },
  ],
  /** In years */
  age: '6566247a-977f-11e1-8993-905e29aff6c1',
  everIpt: '657a1f52-977f-11e1-8993-905e29aff6c1',
  iptDate: '657a2060-977f-11e1-8993-905e29aff6c1',
  everTbTreatment: '657904fa-977f-11e1-8993-905e29aff6c1',
  tbStartDate: '65579f22-977f-11e1-8993-905e29aff6c1',
  /** Text */
  tbRegistrationNumber: '65796184-977f-11e1-8993-905e29aff6c1',
  everArvs: '65789c4a-977f-11e1-8993-905e29aff6c1',
  lastArvsDate: '65789934-977f-11e1-8993-905e29aff6c1',
  /** Text */
  lastArvsTaken: '65789b46-977f-11e1-8993-905e29aff6c1',
};

/** pre-art-visit.xml (PART_FOLLOWUP encounter) */
export const PA_VISIT = {
  height: '6569c562-977f-11e1-8993-905e29aff6c1',
  weight: '6569c44a-977f-11e1-8993-905e29aff6c1',
  wasting: '657a2268-977f-11e1-8993-905e29aff6c1',
  /** The form's No, Mod, Sev */
  wastingAnswers: [
    { value: NO, label: 'No' },
    { value: '655c243e-977f-11e1-8993-905e29aff6c1', label: 'Moderate' },
    { value: '655c28b2-977f-11e1-8993-905e29aff6c1', label: 'Severe' },
  ],
  tbStatus: '65770db2-977f-11e1-8993-905e29aff6c1',
  /** The form's N, Y, C, Rx */
  tbStatuses: [
    { value: '6577084e-977f-11e1-8993-905e29aff6c1', label: 'TB not suspected' },
    { value: '65770966-977f-11e1-8993-905e29aff6c1', label: 'TB suspected' },
    { value: '65770a7e-977f-11e1-8993-905e29aff6c1', label: 'Confirmed TB, not on Rx' },
    { value: '65770ca4-977f-11e1-8993-905e29aff6c1', label: 'Confirmed TB, on Rx' },
  ],
  whoStage: '65778170-977f-11e1-8993-905e29aff6c1',
  whoStages: [
    { value: STAGE_1, label: '1' },
    { value: STAGE_2, label: '2' },
    { value: STAGE_3, label: '3' },
    { value: STAGE_4, label: '4' },
  ],
  /** Coded, Yes when ticked: the form's Bled */
  cd4SampleTaken: '5ff3ca52-0651-11e6-b512-3e1d05defe78',
  cd4: '6565b94a-977f-11e1-8993-905e29aff6c1',
  pregnant: '656fbd28-977f-11e1-8993-905e29aff6c1',
  /** Tablets dispensed */
  ipt: '657a2164-977f-11e1-8993-905e29aff6c1',
  cpt: '6570b82c-977f-11e1-8993-905e29aff6c1',
  /** Coded, Yes when ticked */
  depoGiven: '657a1e44-977f-11e1-8993-905e29aff6c1',
  condoms: '657a52ce-977f-11e1-8993-905e29aff6c1',
  sideEffects: '65789d4e-977f-11e1-8993-905e29aff6c1',
  /** The form's No, PN, HP, SK, Oth */
  sideEffectAnswers: [
    { value: NO, label: 'No' },
    { value: '654a4ade-977f-11e1-8993-905e29aff6c1', label: 'Peripheral neuropathy' },
    { value: '6545b33e-977f-11e1-8993-905e29aff6c1', label: 'Hepatitis' },
    { value: '65489e00-977f-11e1-8993-905e29aff6c1', label: 'Skin rash' },
    { value: '657140f8-977f-11e1-8993-905e29aff6c1', label: 'Other' },
  ],
  nextAppointment: '6569cbd4-977f-11e1-8993-905e29aff6c1',
};
