import { type CardForm } from '../art/obs-diff';

/**
 * The Teen Club eMastercard's forms and the concepts they save, copied from teen-club-emastercard.xml,
 * teen-club-visit.xml and teen-club-intake-survey.xml (UUIDs lower-cased, as REST returns them)
 */

/** The eMastercards endpoint's key for this card */
export const TC_CARD_KEY = 'teen-club';

/** The paper card's version (the header form's "Version 2"), which the page names under its title */
export const TC_CARD_VERSION = '2';

export type TcForm = 'header' | 'visit' | 'survey';

export const TC_FORMS: Record<TcForm, CardForm> = {
  header: { encounterType: '49085c00-9ea8-481d-a5c5-fb685822d5ab', form: 'dcb073dd-0e55-4c1b-a892-a2bf4ad0ce0f' },
  visit: { encounterType: 'a8cf446d-0fa4-4d44-af46-1811f73be65a', form: '0cfe9daa-c1d2-4c9f-b21c-1d7dfa038317' },
  survey: { encounterType: '76ae6337-13e7-4522-bbeb-9fcf68bedf87', form: '395a62a9-2cbd-4cb9-9ae5-eea4f4770fcf' },
};

export const YES = '65576354-977f-11e1-8993-905e29aff6c1';
export const NO = '6557646c-977f-11e1-8993-905e29aff6c1';
const POSITIVE = '6549be7a-977f-11e1-8993-905e29aff6c1';
const NEGATIVE = '654994c2-977f-11e1-8993-905e29aff6c1';

/** teen-club-emastercard.xml, the card header (TEEN_CLUB_INITIAL encounter): the intake / referral form */
export const TC_HEADER = {
  transferInDate: '6559bc30-977f-11e1-8993-905e29aff6c1',
  /** The age at intake, in weeks or in months: each its own group of the unit and the number */
  ageAtIntakeGroup: 'e1f83aa4-fafe-4150-9aa5-c13b0602b985',
  timeUnit: 'f1904502-319d-4681-9030-e642111e7ce2',
  weeks: '65576c32-977f-11e1-8993-905e29aff6c1',
  months: '65576d4a-977f-11e1-8993-905e29aff6c1',
  age: '655e54a2-977f-11e1-8993-905e29aff6c1',
  /** Numeric, as the concept's datatype is */
  patientPhone: '6559ba14-977f-11e1-8993-905e29aff6c1',
  relationToPatient: '6558fd0e-977f-11e1-8993-905e29aff6c1',
  agreesToFollowUp: '655fc526-977f-11e1-8993-905e29aff6c1',
};

/** teen-club-visit.xml (TEEN_CLUB_FOLLOWUP encounter) */
export const TC_VISIT = {
  height: '6569c562-977f-11e1-8993-905e29aff6c1',
  weight: '6569c44a-977f-11e1-8993-905e29aff6c1',
  /** Numeric: MUAC or BMI */
  muacBmi: '655d615a-977f-11e1-8993-905e29aff6c1',
  tbStatus: '65770db2-977f-11e1-8993-905e29aff6c1',
  /** The form's answers and labels */
  tbStatuses: [
    { value: '6577084e-977f-11e1-8993-905e29aff6c1', label: 'No' },
    { value: '65770966-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
    { value: '65770a7e-977f-11e1-8993-905e29aff6c1', label: 'noRx' },
    { value: '65770ca4-977f-11e1-8993-905e29aff6c1', label: 'Rx' },
  ],
  tbScreeningOutcome: '73c40559-32aa-4609-a322-bde569196bd2',
  sputumCollected: '165252aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  muacNormal: '0929a831-8b0d-4fef-8738-a72f950a0566',
  nutritionReferral: '85f19f2e-ec7d-4f54-9c01-eb960af2b315',
  mentalHealthScreened: '0382c74d-22f9-4b74-9d8f-d8560b0f8514',
  mentalHealthReferred: '08dcd9cc-e729-450c-ac18-001d6c0149d5',
  mentalHealthRegistered: '09454ecc-7b29-468b-9963-90867d4f09c6',
  stiScreeningOutcome: 'b5983f8d-7253-4a37-8b70-514b7ad17bd0',
  stiReferral: 'cf05e412-2707-4850-87b0-08e117b66009',
  /**
   * Patient hospitalized since last visit. The legacy form saved its Hospitalised? under the sputum's Sample collected
   * concept, a mistake in its macros; this card saves it under the hospitalised concept, as the form now does too.
   */
  hospitalised: '655b3dc6-977f-11e1-8993-905e29aff6c1',
  nextAppointment: '6569cbd4-977f-11e1-8993-905e29aff6c1',
  outcomes: [
    { value: POSITIVE, label: '+' },
    { value: NEGATIVE, label: '-' },
  ],
};

/** teen-club-intake-survey.xml: its interview date, which the page lists the surveys by */
export const TC_SURVEY = {
  interviewDate: '655ff71c-977f-11e1-8993-905e29aff6c1',
};
