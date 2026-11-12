import { type Option } from '../art/art-fields';
import { type CardForm } from '../art/obs-diff';

/**
 * The PDC eMastercard's form and the concepts it saves, copied from pdc-emastercard.xml (UUIDs lower-cased, as the
 * other cards keep them)
 */

/** The eMastercards endpoint's key for this card */
export const PDC_CARD_KEY = 'pdc';

/** The paper card's version (the form's "Version 2"), which the page names under its title */
export const PDC_CARD_VERSION = '2';

/** The PDC eMastercard is its header alone (PDC_INITIAL): the condition cards hold the visits */
export const PDC_FORMS: Record<'header', CardForm> = {
  header: { encounterType: 'cb6be652-c5ee-447d-9d94-1100ffb26aa8', form: 'c9f43a39-c1ad-400c-bc77-fc2e37608dce' },
};

export const YES = '65576354-977f-11e1-8993-905e29aff6c1';
export const NO = '6557646c-977f-11e1-8993-905e29aff6c1';
const UNKNOWN = '65576584-977f-11e1-8993-905e29aff6c1';
export const WEEKS = '65576c32-977f-11e1-8993-905e29aff6c1';
export const MONTHS = '65576d4a-977f-11e1-8993-905e29aff6c1';

export const YES_NO: Array<Option> = [
  { value: YES, label: 'Yes' },
  { value: NO, label: 'No' },
];

const HOSPITAL = '655d1772-977f-11e1-8993-905e29aff6c1';
const HEALTH_CENTER = '6566905e-977f-11e1-8993-905e29aff6c1';
const HOME = '29eb5e06-9815-42d8-a3b1-37a5fe88b4f8';

const HIV_STATUSES: Array<Option> = [
  { value: '65587802-977f-11e1-8993-905e29aff6c1', label: 'Reactive' },
  { value: '6558791a-977f-11e1-8993-905e29aff6c1', label: 'Non-reactive' },
  { value: UNKNOWN, label: 'Unknown' },
];
const ART_STATUSES: Array<Option> = [
  { value: '657a279a-977f-11e1-8993-905e29aff6c1', label: 'On ART' },
  { value: '657a268c-977f-11e1-8993-905e29aff6c1', label: 'No ART' },
];

export const CNS_INFECTION = '657169d4-977f-11e1-8993-905e29aff6c1';
export const OTHER_DIAGNOSIS = '6562c316-977f-11e1-8993-905e29aff6c1';

/** The conditions the form lists both as reasons for referral and as conditions at enrolment, in its order */
export const PDC_CONDITIONS: Array<Option & { key: string }> = [
  { key: 'prematureBirth', value: 'f541084c-84c7-48a6-b502-d9ddbb3bb3b9', label: 'Premature birth' },
  { key: 'hie', value: '76e0ba08-d931-4baf-9651-9946543cc623', label: 'HIE' },
  { key: 'lowBirthWeight', value: '6575742a-977f-11e1-8993-905e29aff6c1', label: 'Low birth weight' },
  { key: 'developmentalDelay', value: '1be62437-3093-4530-b4ab-1cd4626b9704', label: 'Developmental delay' },
  { key: 'hydrocephalus', value: '26071668-6ad4-4d30-b661-a7a07cece1ac', label: 'Hydrocephalus' },
  { key: 'cleftLip', value: 'c415db67-75e8-4077-a0f2-ba2864ae52b1', label: 'Cleft lip' },
  { key: 'cnsInfection', value: CNS_INFECTION, label: 'CNS infection' },
  { key: 'trisomy21', value: 'fc4bf95c-b445-44e3-959b-435145e79f01', label: 'Trisomy 21' },
  { key: 'cleftPalate', value: 'abe71d88-3f2c-4380-854b-c49b74946a01', label: 'Cleft palate' },
  { key: 'severeMalnutrition', value: 'a94e5963-f6b1-4c91-b676-48dfb370a1f8', label: 'Severe malnutrition' },
  { key: 'epilepsy', value: '6546938a-977f-11e1-8993-905e29aff6c1', label: 'Epilepsy' },
  { key: 'other', value: OTHER_DIAGNOSIS, label: 'Other' },
];

/** pdc-emastercard.xml, the card header (PDC_INITIAL encounter) */
export const PDC_HEADER = {
  transferInDate: '6559bc30-977f-11e1-8993-905e29aff6c1',
  /** Numeric, as the concept's datatype is */
  patientPhone: '6559ba14-977f-11e1-8993-905e29aff6c1',
  guardianName: '655bbc74-977f-11e1-8993-905e29aff6c1',
  guardianPhone: '65600cd4-977f-11e1-8993-905e29aff6c1',
  relationToPatient: '6558fd0e-977f-11e1-8993-905e29aff6c1',
  agreesToFollowUp: '655fc526-977f-11e1-8993-905e29aff6c1',

  /** The child's age at intake: a group of the unit ticked (weeks or months) and the number, one group per unit */
  ageAtIntakeGroup: 'e1f83aa4-fafe-4150-9aa5-c13b0602b985',
  timeUnits: 'f1904502-319d-4681-9030-e642111e7ce2',
  ageOfChild: '655e54a2-977f-11e1-8993-905e29aff6c1',

  ageOfGuardian: 'fa7a921c-bd5f-4d5d-8e4f-4dc5060e37b7',
  maritalStatus: '6557571a-977f-11e1-8993-905e29aff6c1',
  maritalStatuses: [
    { value: '656c71b8-977f-11e1-8993-905e29aff6c1', label: 'Married' },
    { value: '656416a8-977f-11e1-8993-905e29aff6c1', label: 'Single' },
    { value: '65575b98-977f-11e1-8993-905e29aff6c1', label: 'Divorced' },
    { value: '65575cb0-977f-11e1-8993-905e29aff6c1', label: 'Widowed' },
  ],
  educationLevel: '655b226e-977f-11e1-8993-905e29aff6c1',
  /** The form labels University "Tertiary" */
  educationLevels: [
    { value: '6557987e-977f-11e1-8993-905e29aff6c1', label: 'None' },
    { value: '65620872-977f-11e1-8993-905e29aff6c1', label: 'Primary' },
    { value: '65620a7a-977f-11e1-8993-905e29aff6c1', label: 'Secondary' },
    { value: '65620c82-977f-11e1-8993-905e29aff6c1', label: 'Tertiary' },
  ],
  numberOfChildren: '656056da-977f-11e1-8993-905e29aff6c1',
  /** Text */
  incomeSource: 'de85f47e-0830-4840-b393-e7adcd641064',

  sourceOfReferralGroup: 'b5346c8a-246c-46aa-bce5-17a77534bc30',
  sourceOfReferral: 'eb76915e-104d-4500-b56e-726f3e2a75f9',
  sourcesOfReferral: [
    { value: 'be50b470-9744-4f04-b9a8-bad7b4b239ea', label: 'Tertiary' },
    { value: HOSPITAL, label: 'District hospital' },
    { value: HEALTH_CENTER, label: 'Health center' },
    { value: HOME, label: 'Home' },
    { value: '390c74d3-216b-4573-b38a-68503cc4e69e', label: 'Community' },
  ],
  referralFormFilled: '8f985039-f018-4542-a531-f693fca2906b',
  eligibleForPoser: '5b49fbf4-2645-4ab2-974e-4e6c961162b1',
  /** Each reason ticked is its own group; CNS infection and Other are specified in the reason's comment */
  reasonForReferralGroup: '7a37ec7b-2804-46c8-be48-4707959192be',
  reasonForReferral: '98b17e13-659f-41e7-8459-b370fdbffe0f',

  /** The mother's HIV status and ART, in one group; the child's in another, of the same concepts */
  motherHivGroup: '655fa384-977f-11e1-8993-905e29aff6c1',
  childHivGroup: '5f52124a-cf63-11e5-ab30-625662870761',
  hivStatus: '6567ae62-977f-11e1-8993-905e29aff6c1',
  hivStatuses: HIV_STATUSES,
  motherArt: '657a2588-977f-11e1-8993-905e29aff6c1',
  childArt: '656b0058-977f-11e1-8993-905e29aff6c1',
  artStatuses: ART_STATUSES,

  siteOfBirth: '6566635e-977f-11e1-8993-905e29aff6c1',
  sitesOfBirth: [
    { value: HOSPITAL, label: 'Hospital' },
    { value: HEALTH_CENTER, label: 'Health center' },
    { value: HOME, label: 'Home' },
    { value: '50fe5939-7380-4a01-abe4-6a7806280bdb', label: 'Enroute' },
  ],
  /** Each ticked as its own obs, as the form's checkboxes are; APGAR and BWT are answers, without their values */
  modeOfDelivery: '656cd888-977f-11e1-8993-905e29aff6c1',
  modesOfDelivery: [
    { value: '6558384c-977f-11e1-8993-905e29aff6c1', label: 'SVD' },
    { value: '65583964-977f-11e1-8993-905e29aff6c1', label: 'C/S' },
    { value: '687a622a-302b-49c9-87a7-2f7558549548', label: 'APGAR' },
    { value: '656e797c-977f-11e1-8993-905e29aff6c1', label: 'BWT' },
  ],
  perinatalInfectionGroup: '60227263-6073-44be-a6d8-c41f18b453a4',
  perinatalInfection: '5c1f2ade-4224-46c3-99f5-7236aab13f13',
  /** Text, under the concept the form uses for it in several groups */
  otherText: 'd57e3a20-5802-11e6-8b77-86f30ca893d3',
  antibioticsGroup: 'e2a64391-76c0-4f4b-b946-f51b05495c17',
  antibiotics: '6575888e-977f-11e1-8993-905e29aff6c1',
  antibioticsDuration: '89562b1e-9b39-4bdf-b57e-cf0e2448d815',
  antibioticsDurations: [
    { value: 'ecdd9e50-ce94-49f4-a400-55421da645ab', label: '48 hours or less' },
    { value: '50300b30-0a03-4806-85f7-9a5c0239321c', label: '7 days' },
    { value: '7340a0aa-b965-4cc6-81e8-9a48236d1096', label: 'More than 7 days' },
  ],
  /** The types of feed ticked, all in one group */
  feedGroup: '38725750-df54-477a-a9b0-42527f94b709',
  typeOfFeed: '7f5c591e-8b74-4fa9-8bbf-f4154a0d92d3',
  typesOfFeed: [
    { value: 'ba528fcf-d9ee-43c3-af15-c169adcec937', label: 'Breast milk' },
    { value: '656ac570-977f-11e1-8993-905e29aff6c1', label: 'Infant formula' },
    { value: '656f5c2a-977f-11e1-8993-905e29aff6c1', label: 'Mixed feeding' },
    { value: '77d019b9-3f20-4af5-be8a-df9a7f075c51', label: 'Solids' },
  ],
  feedingMethod: '6557e504-977f-11e1-8993-905e29aff6c1',
  feedingMethods: [
    { value: '657a289e-977f-11e1-8993-905e29aff6c1', label: 'Breastfeeding' },
    { value: '4f3e0805-3059-4226-abcd-6100cddd9543', label: 'Cup' },
    { value: 'fe7d2795-3cfe-47fa-933c-cb8e9b1c42d5', label: 'OGT' },
  ],
  /** The other feeding method, as text in its own group */
  otherFeedingGroup: '5af3740e-c1a1-4e86-a87e-280817bbde0b',

  /** The conditions at enrolment, each ticked as its own obs; CNS infection and Other are specified in its comment */
  diagnosis: '656292d8-977f-11e1-8993-905e29aff6c1',
  currentMedication: '65585192-977f-11e1-8993-905e29aff6c1',
  /** Text */
  drugs: '0754f2f8-d797-11e8-9f8b-f2801f1b9fd1',

  enrolledInPdc: '92148ae3-642c-47f5-ae7c-2c4efa9796e8',
  dateOfEnrollment: '71c441a7-08ef-4b4c-90dc-0ea36751556b',
  /** Text */
  notes: '655928e2-977f-11e1-8993-905e29aff6c1',
  careLinked: '0d52f232-8d34-45d4-9006-dd592bc7bf24',
  /** The care the child was linked to, each ticked as its own obs */
  linkedTo: '24c2f817-c37b-4746-a052-18c4e0c2d93e',
  linkedToAnswers: [
    { value: '6566b8c2-977f-11e1-8993-905e29aff6c1', label: 'Clinical care' },
    { value: 'f0bb3ac5-0e84-487a-8a2d-59b96378a797', label: 'NRU' },
    { value: '3064bcf8-56f7-43c9-a8cf-d90d42eef739', label: 'IC3' },
    { value: '2bc82b28-e84f-11e8-9f32-f2801f1b9fd1', label: 'Advanced NCD' },
    { value: '9ca705d5-5daa-40e8-8b69-f3f7c0b29e95', label: 'Mental health' },
    { value: 'bb020202-552b-4253-b442-e2b7153e587c', label: 'Palliative' },
    { value: '394b1f7b-7ad8-4038-af3a-5b673bd4f42a', label: 'Physiotherapy' },
  ],
  /** Text */
  otherSupport: '6562c208-977f-11e1-8993-905e29aff6c1',
};
