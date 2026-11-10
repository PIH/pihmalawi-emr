import { type CardForm } from '../art/obs-diff';

/**
 * The Exposed Child eMastercard's forms and the concepts they save, copied from exposed-child-emastercard.xml,
 * exposed-child-visit.xml and eid-test-results.xml (UUIDs lower-cased, as REST returns them)
 */

/** The eMastercards endpoint's key for this card */
export const EC_CARD_KEY = 'exposed-child';

/** The paper card's version (the header form's "Version 1"), which the page names under its title */
export const EC_CARD_VERSION = '1';

export type EcForm = 'header' | 'visit' | 'eid';

export const EC_FORMS: Record<EcForm, CardForm> = {
  header: { encounterType: '664bcbb0-977f-11e1-8993-905e29aff6c1', form: 'f341dc7a-f06f-4d0c-b9d5-fddf147ae1ed' },
  visit: { encounterType: '664bcc8c-977f-11e1-8993-905e29aff6c1', form: '37a9cde8-4909-4821-b760-aa19dbce6b28' },
  eid: { encounterType: '8383de35-5145-4953-a018-34876b797f3e', form: 'c811d39c-946a-11e7-9ae7-d567856360b8' },
};

export const YES = '65576354-977f-11e1-8993-905e29aff6c1';
export const NO = '6557646c-977f-11e1-8993-905e29aff6c1';
const UNKNOWN = '65576584-977f-11e1-8993-905e29aff6c1';
export const WEEKS = '65576c32-977f-11e1-8993-905e29aff6c1';
const MONTHS = '65576d4a-977f-11e1-8993-905e29aff6c1';
const TIME_UNITS = [
  { value: WEEKS, label: 'Weeks' },
  { value: MONTHS, label: 'Months' },
];

/** The mother's status, which the header and the visit ask with the same answers */
const MOTHER_STATUS = {
  concept: '657a2588-977f-11e1-8993-905e29aff6c1',
  answers: [
    { value: '657a268c-977f-11e1-8993-905e29aff6c1', label: 'No ART' },
    { value: '657a279a-977f-11e1-8993-905e29aff6c1', label: 'On ART' },
    { value: '655b5e46-977f-11e1-8993-905e29aff6c1', label: 'Died' },
    { value: '65576002-977f-11e1-8993-905e29aff6c1', label: 'Unknown' },
  ],
};

/** exposed-child-emastercard.xml, the card header (EXPOSED_CHILD_INITIAL encounter) */
export const EC_HEADER = {
  transferInDate: '6559bc30-977f-11e1-8993-905e29aff6c1',
  guardianName: '655bbc74-977f-11e1-8993-905e29aff6c1',
  /** Text: the guardian's phone and relationship, under the concepts this card uses for them */
  guardianPhone: '6563d2c4-977f-11e1-8993-905e29aff6c1',
  guardianRelation: '655bbe86-977f-11e1-8993-905e29aff6c1',
  agreesToFollowUp: '655fc526-977f-11e1-8993-905e29aff6c1',
  motherStatus: MOTHER_STATUS,
  /** Text */
  motherArtNumber: '657a2fce-977f-11e1-8993-905e29aff6c1',
  motherArtStartDate: '6566aeb8-977f-11e1-8993-905e29aff6c1',
  /** The child's age at enrolment, in weeks */
  enrolmentAge: '6566247a-977f-11e1-8993-905e29aff6c1',
  /** The child's age when starting NVP: a group of the number and its unit, weeks by default */
  nvpStartGroup: 'fd9f79ec-0a23-11e6-b512-3e1d05defe78',
  nvpStartAge: '27baf9f0-eae3-4d98-a1ad-258e82b91285',
  nvpStartAgeUnit: '655e55b0-977f-11e1-8993-905e29aff6c1',
  /** How long NVP was given: a group of the number and its unit, weeks by default */
  nvpDurationGroup: 'fd9f7d52-0a23-11e6-b512-3e1d05defe78',
  nvpDuration: '159368aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  nvpDurationUnit: 'f1904502-319d-4681-9030-e642111e7ce2',
  timeUnits: TIME_UNITS,
  birthWeight: '656e797c-977f-11e1-8993-905e29aff6c1',
};

/** exposed-child-visit.xml (EXPOSED_CHILD_FOLLOWUP encounter) */
export const EC_VISIT = {
  height: '6569c562-977f-11e1-8993-905e29aff6c1',
  weight: '6569c44a-977f-11e1-8993-905e29aff6c1',
  muac: '6558d09a-977f-11e1-8993-905e29aff6c1',
  wasting: '657a2268-977f-11e1-8993-905e29aff6c1',
  /** The form's No, Mod, Sev */
  wastingAnswers: [
    { value: '6557a15c-977f-11e1-8993-905e29aff6c1', label: 'No' },
    { value: '655c243e-977f-11e1-8993-905e29aff6c1', label: 'Moderate' },
    { value: '655c28b2-977f-11e1-8993-905e29aff6c1', label: 'Severe' },
  ],
  breastfeeding: '657a289e-977f-11e1-8993-905e29aff6c1',
  /** The form's Exc, M, C, <6, 6+ (weeks since breastfeeding stopped) */
  breastfeedingAnswers: [
    { value: '656c5264-977f-11e1-8993-905e29aff6c1', label: 'Exclusive' },
    { value: '656f5c2a-977f-11e1-8993-905e29aff6c1', label: 'Mixed' },
    { value: '657a29a2-977f-11e1-8993-905e29aff6c1', label: 'Complementary' },
    { value: '657a2aa6-977f-11e1-8993-905e29aff6c1', label: 'Stopped in the last 6 weeks' },
    { value: '657a2bb4-977f-11e1-8993-905e29aff6c1', label: 'Stopped over 6 weeks ago' },
  ],
  motherStatus: MOTHER_STATUS,
  clinicalMonitoring: '657a247a-977f-11e1-8993-905e29aff6c1',
  /** The form's NAD, Sick */
  clinicalMonitoringAnswers: [
    { value: '657956e4-977f-11e1-8993-905e29aff6c1', label: 'NAD' },
    { value: '657a2376-977f-11e1-8993-905e29aff6c1', label: 'Sick' },
  ],
  childHivStatus: '656b0058-977f-11e1-8993-905e29aff6c1',
  /** The form's A, B, C, D, with what each stands for */
  childHivStatuses: [
    { value: '657a2cb8-977f-11e1-8993-905e29aff6c1', label: 'A: Not infected' },
    { value: '65583734-977f-11e1-8993-905e29aff6c1', label: 'B: Infected' },
    { value: '657a2dbc-977f-11e1-8993-905e29aff6c1', label: 'C: Not ART eligible' },
    { value: '657494e2-977f-11e1-8993-905e29aff6c1', label: 'D: Presumed severe HIV disease' },
  ],
  /** Tablets dispensed */
  cpt: '6570b82c-977f-11e1-8993-905e29aff6c1',
  nextAppointment: '6569cbd4-977f-11e1-8993-905e29aff6c1',
};

/** eid-test-results.xml: each test a group; the encounter's date is the sample's */
export const EC_EID = {
  testGroup: '655dca78-977f-11e1-8993-905e29aff6c1',
  testingReason: '164126aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  testingReasons: [
    { value: 'e0821812-955d-11e7-abc4-cec278b6b50a', label: 'Routine' },
    { value: '65590f06-977f-11e1-8993-905e29aff6c1', label: 'Confirmed' },
    { value: 'e0821df8-955d-11e7-abc4-cec278b6b50a', label: 'Target' },
    { value: '654a4bf6-977f-11e1-8993-905e29aff6c1', label: 'Exposure to HIV' },
    { value: '655915f0-977f-11e1-8993-905e29aff6c1', label: 'Presumed' },
    { value: UNKNOWN, label: 'Unknown' },
  ],
  /** Coded, its answers the concept's (the lab locations), as the viral load test's */
  labLocation: '6fc0ab50-9492-11e7-abc4-cec278b6b50a',
  testType: '655bee06-977f-11e1-8993-905e29aff6c1',
  testTypes: [
    { value: '654a6960-977f-11e1-8993-905e29aff6c1', label: 'DBS' },
    { value: '654b983a-977f-11e1-8993-905e29aff6c1', label: 'RT' },
  ],
  /** Text */
  sampleId: '65668e56-977f-11e1-8993-905e29aff6c1',
  result: '655dcb7c-977f-11e1-8993-905e29aff6c1',
  results: [
    { value: '654994c2-977f-11e1-8993-905e29aff6c1', label: 'Negative' },
    { value: '6549be7a-977f-11e1-8993-905e29aff6c1', label: 'Positive' },
    { value: '6557baa2-977f-11e1-8993-905e29aff6c1', label: 'Inconclusive' },
    { value: '6557a4ae-977f-11e1-8993-905e29aff6c1', label: 'Not done' },
  ],
  resultDate: '656fa234-977f-11e1-8993-905e29aff6c1',
};
