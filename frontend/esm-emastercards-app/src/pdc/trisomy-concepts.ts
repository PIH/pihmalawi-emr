import { type Option } from '../art/art-fields';
import { type CardForm } from '../art/obs-diff';
import { NO } from './pdc-concepts';
import { HIE_LABS, HIE_VISIT, NORMAL, SEVERE_MALNUTRITION } from './hie-concepts';

/**
 * The Trisomy 21 eMastercard's forms and the concepts they save, copied from pdc-trisomy-emastercard.xml,
 * pdc-trisomy-21-visit.xml and trisomy-21-laboratory-tests.xml (UUIDs lower-cased). The questions it shares with the
 * HIE / developmental delay visit (growth, treatment, the plan, referral out) save the same concepts.
 */

export const TRISOMY_CARD_KEY = 'pdc-trisomy';

/** The paper card's version (the visit form's "Version 2"), which the page names under its title */
export const TRISOMY_CARD_VERSION = '2';

/** By encounter type, as the other PDC condition cards are matched; this visit's form UUID is its encounter type's */
export const TRISOMY_FORMS: Record<'header' | 'visit' | 'labs', CardForm> = {
  header: { encounterType: '6ed701a4-152f-11ec-82a8-0242ac130003', form: 'c655dafd-9efa-491d-89a7-32e665b3ac85' },
  visit: { encounterType: 'f770abb3-8470-4c63-a5c6-188ab384f8df', form: 'f770abb3-8470-4c63-a5c6-188ab384f8df' },
  labs: { encounterType: 'b1da5916-faef-4a8c-a799-949c0bc8d2c6', form: '9a346fd7-6a40-4fe8-a6f8-2f974bfd4a21' },
};

/** pdc-trisomy-emastercard.xml's Patient Overview */
export const TRISOMY_HEADER = {
  meconiumDelayed: '9af02405-2861-4c98-87b0-6b92a4606a7d',
};

/** This form's moderate malnutrition, another concept than the HIE visit's */
export const TRISOMY_MODERATE_MALNUTRITION = '655c243e-977f-11e1-8993-905e29aff6c1';

const PAIN = 'e26e1f17-0bf5-4600-801c-16e23180d60e';

/** pdc-trisomy-21-visit.xml (PDC_TRISOMY21_FOLLOWUP encounter) */
export const TRISOMY_VISIT = {
  ...HIE_VISIT,
  malnutritionAnswers: [
    { value: NO, label: 'No' },
    { value: TRISOMY_MODERATE_MALNUTRITION, label: 'Moderate' },
    { value: SEVERE_MALNUTRITION, label: 'Severe' },
  ] as Array<Option>,
  vomiting: 'fcb7b0f5-7190-4554-9b4d-8358af84dac6',
  /** Each question asked Yes/No in a group of its own, groups of one set told apart by the question they hold */
  stoolGroup: 'f6b86b98-b054-43b4-87aa-772e5be53620',
  stool: [
    { key: 'passageNormal', concept: NORMAL, label: 'Passage normal' },
    { key: 'diarrhoeaPersistent', concept: '91bd457a-b7a8-4424-a4fa-9c4a2bae35bd', label: 'Diarrhoea persistent' },
  ],
  earGroup: '99fd40e3-b255-455a-ad7b-70b64bea4a3f',
  ear: [
    { key: 'earPain', concept: PAIN, label: 'Ear pain' },
    { key: 'earDischarge', concept: 'a9fb94ba-b3a9-4d2a-98e4-53bf19dff3d5', label: 'Ear discharge' },
  ],
  sleepGroup: '85cab2be-8d95-44b8-b7ea-f1620ac05217',
  sleep: [
    { key: 'apnoea', concept: 'd62a989c-055c-4fbe-bc3b-2fcc8357263c', label: 'Apnoea' },
    { key: 'choking', concept: 'f6f6e463-4178-44c2-a647-1d7f699808a9', label: 'Choking' },
  ],
  extremitiesGroup: '851e95dc-463c-497b-a4ad-6f64aac570e6',
  extremities: [
    { key: 'extremitiesPain', concept: PAIN, label: 'Extremities pain' },
    { key: 'weakness', concept: '64af04b8-81bb-4cea-8334-a07b1072e3ef', label: 'Weakness' },
  ],
};

/** trisomy-21-laboratory-tests.xml: the full blood count, TSH on its own date, and another test */
export const TRISOMY_LABS = {
  wbc: '6549a3b8-977f-11e1-8993-905e29aff6c1',
  rbc: '6549a4d0-977f-11e1-8993-905e29aff6c1',
  hb: HIE_LABS.hb,
  mcv: '654a70f4-977f-11e1-8993-905e29aff6c1',
  platelets: '6549da2c-977f-11e1-8993-905e29aff6c1',
  /** Text */
  differential: '23618f38-cb43-4eee-9aa0-916a9e96d9f8',
  tsh: '655a9f42-977f-11e1-8993-905e29aff6c1',
  otherTestGroup: HIE_LABS.otherTestGroup,
  otherTestDate: HIE_LABS.otherTestDate,
  otherTestType: HIE_LABS.otherTestType,
  otherTestResult: HIE_LABS.otherTestResult,
};
