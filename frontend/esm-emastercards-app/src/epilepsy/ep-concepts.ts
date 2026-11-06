import { type CardForm } from '../art/obs-diff';

/**
 * The Epilepsy eMastercard's forms and the concepts they save, copied from epilepsy-emastercard.xml and
 * epilepsy-visit.xml (UUIDs lower-cased, as REST returns them)
 */

/** The eMastercards endpoint's key for this card */
export const EP_CARD_KEY = 'epilepsy';

/** The paper card's version (epilepsy-emastercard.xml's Version 1), which the page names under its title */
export const EP_CARD_VERSION = '1';

export const EP_FORMS: { header: CardForm; visit: CardForm } = {
  header: { encounterType: 'd8cbf1b9-ec74-4858-8764-2350e2a9925b', form: '7b54fbee-240f-430c-b751-d5ed5dea6e5e' },
  visit: { encounterType: '1eedd2f6-ef28-4409-8e8c-f4fec0746e72', form: '11ff7e89-bcb4-4947-bdf0-5aba4a963e85' },
};

export const UNKNOWN = '65576584-977f-11e1-8993-905e29aff6c1';
/** "Other", the answer of an Other exposure, complication or medication */
export const OTHER = '657140f8-977f-11e1-8993-905e29aff6c1';
/** Free text, the name of an Other medication */
export const NON_CODED_TEXT = 'd57e3a20-5802-11e6-8b77-86f30ca893d3';
export const REACTIVE = '65587802-977f-11e1-8993-905e29aff6c1';
export const NON_REACTIVE = '6558791a-977f-11e1-8993-905e29aff6c1';

/** Seizure triggers, asked Yes/No/Unknown on the header and ticked on the visit */
export const TRIGGERS = [
  { key: 'alcohol', answer: '7e8ab286-cf5c-11e5-ab30-625662870761', label: 'Alcohol' },
  { key: 'sleep', answer: '7e8abdbc-cf5c-11e5-ab30-625662870761', label: 'Sleep deprivation' },
  { key: 'missedMeds', answer: '7e8abefc-cf5c-11e5-ab30-625662870761', label: 'Missed medication' },
  { key: 'sound', answer: '7e8ab740-cf5c-11e5-ab30-625662870761', label: 'Sound, light, touch' },
  { key: 'fever', answer: '7e8ab5b0-cf5c-11e5-ab30-625662870761', label: 'Fever' },
  { key: 'stress', answer: '7e8abbdc-cf5c-11e5-ab30-625662870761', label: 'Emotional stress, anger, boredom' },
  { key: 'menstruation', answer: '7e8abfd8-cf5c-11e5-ab30-625662870761', label: 'Menstruation' },
];

/** epilepsy-emastercard.xml, the card header (EPILEPSY_INITIAL encounter) */
export const EP_HEADER = {
  /** Saved with every card, as the form's hidden checkbox does: the card's diagnosis, epilepsy */
  diagnosisGroup: '6db168f1-0f38-42d9-9f0e-90946a3d8e72',
  diagnosis: '65671c9a-977f-11e1-8993-905e29aff6c1',
  epilepsy: '6546938a-977f-11e1-8993-905e29aff6c1',
  transferInDate: '6559bc30-977f-11e1-8993-905e29aff6c1',
  /** Numeric, as the concept's datatype is */
  patientPhone: '6559ba14-977f-11e1-8993-905e29aff6c1',
  guardianName: '655bbc74-977f-11e1-8993-905e29aff6c1',
  guardianPhone: '65600cd4-977f-11e1-8993-905e29aff6c1',
  relationToPatient: '6558fd0e-977f-11e1-8993-905e29aff6c1',
  agreesToFollowUp: '655fc526-977f-11e1-8993-905e29aff6c1',
  chwRelationshipType: 'eb567be2-fda1-4746-9d51-833de8a7e81f',
  /** Each asked Yes/No, in the form's order */
  seizureTypes: [
    { key: 'tonicClonic', concept: '6574dea2-977f-11e1-8993-905e29aff6c1', label: 'Tonic clonic' },
    { key: 'clonic', concept: '145044aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Clonic' },
    { key: 'simple', concept: 'b2faee68-ce9f-11e5-ab30-625662870761', label: 'Simple partial' },
    { key: 'absence', concept: '150525aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Absence' },
    { key: 'tonic', concept: '112356aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Tonic' },
    { key: 'complex', concept: 'b2faf2c8-ce9f-11e5-ab30-625662870761', label: 'Complex partial' },
    { key: 'myoclonic', concept: '115424aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Myoclonic' },
    { key: 'atonic', concept: '148223aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Atonic' },
    { key: 'unclassified', concept: '123826aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Unclassified' },
  ],
  familyHistory: {
    epilepsy: '152450aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    mentalIllness: '7057d000-c5dd-11e5-9912-ba0be0483c18',
    behaviour: '7057d3ac-c5dd-11e5-9912-ba0be0483c18',
  },
  hivStatus: '6567ae62-977f-11e1-8993-905e29aff6c1',
  hivTestDate: '655bc9da-977f-11e1-8993-905e29aff6c1',
  artStartDate: '655f9eb6-977f-11e1-8993-905e29aff6c1',
  vdrl: '654753ec-977f-11e1-8993-905e29aff6c1',
  onsetMonth: 'b2fafb7e-ce9f-11e5-ab30-625662870761',
  onsetYear: 'b2faf9a8-ce9f-11e5-ab30-625662870761',
  ageAtOnset: '60cc004f-ab6a-4bd7-836a-4683856c0d11',
  maritalStatus: '6557571a-977f-11e1-8993-905e29aff6c1',
  maritalStatuses: [
    { value: '656c71b8-977f-11e1-8993-905e29aff6c1', label: 'Married' },
    { value: '65575a76-977f-11e1-8993-905e29aff6c1', label: 'Never married' },
    { value: '65575dc8-977f-11e1-8993-905e29aff6c1', label: 'Living with partner' },
    { value: '65575954-977f-11e1-8993-905e29aff6c1', label: 'Separated' },
    { value: '65575b98-977f-11e1-8993-905e29aff6c1', label: 'Divorced' },
    { value: '65575cb0-977f-11e1-8993-905e29aff6c1', label: 'Widowed' },
    { value: '656416a8-977f-11e1-8993-905e29aff6c1', label: 'Single or a child' },
    { value: '656fc57a-977f-11e1-8993-905e29aff6c1', label: 'Orphan' },
    { value: '6566ddac-977f-11e1-8993-905e29aff6c1', label: 'Celibate' },
    { value: '656415a4-977f-11e1-8993-905e29aff6c1', label: 'Partner in prison' },
    { value: '656cce7e-977f-11e1-8993-905e29aff6c1', label: 'Other non-coded' },
    { value: '65576584-977f-11e1-8993-905e29aff6c1', label: 'Unknown' },
  ],
  occupation: '6558df36-977f-11e1-8993-905e29aff6c1',
  occupations: [
    { value: '6558e166-977f-11e1-8993-905e29aff6c1', label: 'Farmer' },
    { value: '6558e378-977f-11e1-8993-905e29aff6c1', label: 'Trading' },
    { value: '6558e26a-977f-11e1-8993-905e29aff6c1', label: 'Student' },
    { value: '65659082-977f-11e1-8993-905e29aff6c1', label: 'Employed' },
    { value: '65659190-977f-11e1-8993-905e29aff6c1', label: 'Professional' },
    { value: '6558f606-977f-11e1-8993-905e29aff6c1', label: 'Manual laborer' },
    { value: '6564139c-977f-11e1-8993-905e29aff6c1', label: 'Driver' },
    { value: '655b216a-977f-11e1-8993-905e29aff6c1', label: 'Shop owner' },
    { value: '655b1e5e-977f-11e1-8993-905e29aff6c1', label: 'Fruit or vegetable seller' },
    { value: '655b1d5a-977f-11e1-8993-905e29aff6c1', label: 'Factory worker' },
    { value: '655b1c56-977f-11e1-8993-905e29aff6c1', label: 'Miner' },
    { value: '655b1f6c-977f-11e1-8993-905e29aff6c1', label: 'Shepherd' },
    { value: '655b2066-977f-11e1-8993-905e29aff6c1', label: 'Brewer' },
    { value: '65596e42-977f-11e1-8993-905e29aff6c1', label: 'Housework' },
    { value: '655f4600-977f-11e1-8993-905e29aff6c1', label: 'Housework/fieldwork' },
    { value: '6558e47c-977f-11e1-8993-905e29aff6c1', label: 'Unemployed' },
    { value: '656414a0-977f-11e1-8993-905e29aff6c1', label: 'Too sick to work' },
    { value: '655f470e-977f-11e1-8993-905e29aff6c1', label: 'Retired' },
    { value: '65641298-977f-11e1-8993-905e29aff6c1', label: 'School age but NOT in school' },
    { value: '656fc476-977f-11e1-8993-905e29aff6c1', label: 'Small child (under 5)' },
    { value: '6557987e-977f-11e1-8993-905e29aff6c1', label: 'None' },
    { value: '655f4d30-977f-11e1-8993-905e29aff6c1', label: 'Main activity, non-coded' },
    { value: '656cce7e-977f-11e1-8993-905e29aff6c1', label: 'Other non-coded' },
    { value: '65576584-977f-11e1-8993-905e29aff6c1', label: 'Unknown' },
  ],
  education: '655b226e-977f-11e1-8993-905e29aff6c1',
  educationLevels: [
    { value: '6557987e-977f-11e1-8993-905e29aff6c1', label: 'None' },
    { value: '6562076e-977f-11e1-8993-905e29aff6c1', label: 'Some primary education' },
    { value: '65620872-977f-11e1-8993-905e29aff6c1', label: 'Primary education complete' },
    { value: '65620976-977f-11e1-8993-905e29aff6c1', label: 'Some secondary education' },
    { value: '65620a7a-977f-11e1-8993-905e29aff6c1', label: 'Secondary education complete' },
    { value: '65620b7e-977f-11e1-8993-905e29aff6c1', label: 'Some university education' },
    { value: '65620c82-977f-11e1-8993-905e29aff6c1', label: 'University education complete' },
    { value: '655f2828-977f-11e1-8993-905e29aff6c1', label: 'Did NOT answer' },
    { value: '65576584-977f-11e1-8993-905e29aff6c1', label: 'Unknown' },
  ],
  /** Text */
  medicationHistory: 'b2fafcfa-ce9f-11e5-ab30-625662870761',
  /** Each asked Yes/No/Unknown, in the form's order */
  medicalHistory: [
    { key: 'headTrauma', concept: 'b2fb002e-ce9f-11e5-ab30-625662870761', label: 'Head injury, trauma, surgery' },
    { key: 'seizureHistory', concept: 'b2fb01f0-ce9f-11e5-ab30-625662870761', label: 'History of seizure' },
    { key: 'birthComplications', concept: 'b2fb06dc-ce9f-11e5-ab30-625662870761', label: 'Complications at birth' },
    { key: 'neonatalInfection', concept: '82b4827e-cf4d-11e5-ab30-625662870761', label: 'Neonatal infection, cerebral malaria, meningitis' },
    { key: 'delayedMilestones', concept: '656ef938-977f-11e1-8993-905e29aff6c1', label: 'Delayed milestones' },
  ],
  preIctalWarning: '82b48d50-cf4d-11e5-ab30-625662870761',
  /** Each asked Yes/No/Unknown, in the form's order */
  postIctalFeatures: [
    { key: 'paralysis', concept: '82b495d4-cf4d-11e5-ab30-625662870761', label: 'Paralysis' },
    { key: 'headache', concept: '82b48f4e-cf4d-11e5-ab30-625662870761', label: 'Headache' },
    { key: 'disorientation', concept: '82b49b7e-cf4d-11e5-ab30-625662870761', label: 'Disorientation' },
    { key: 'drowsiness', concept: '82b49106-cf4d-11e5-ab30-625662870761', label: 'Drowsiness' },
    { key: 'nausea', concept: '82b49d4a-cf4d-11e5-ab30-625662870761', label: 'Nausea' },
    { key: 'poorConcentration', concept: '82b4926e-cf4d-11e5-ab30-625662870761', label: 'Poor concentration' },
    { key: 'memoryLoss', concept: '7e8aa840-cf5c-11e5-ab30-625662870761', label: 'Memory loss' },
    { key: 'poorVerbal', concept: '82b4944e-cf4d-11e5-ab30-625662870761', label: 'Poor verbal or cognitive skill' },
    { key: 'hyperactivity', concept: '7e8aabb0-cf5c-11e5-ab30-625662870761', label: 'Hyperactivity' },
  ],
  /** One group per exposure ticked, with its date; Other is specified in the answer obs's comment */
  exposureGroup: '5f52124a-cf63-11e5-ab30-625662870761',
  exposure: '7057db5e-c5dd-11e5-9912-ba0be0483c18',
  exposureDate: '5f521038-cf63-11e5-ab30-625662870761',
  exposures: [
    { key: 'smoking', answer: '7057de06-c5dd-11e5-9912-ba0be0483c18', label: 'Smoking' },
    { key: 'alcohol', answer: '65743a88-977f-11e1-8993-905e29aff6c1', label: 'Alcohol' },
    { key: 'pork', answer: '65671452-977f-11e1-8993-905e29aff6c1', label: 'Pigs/pork' },
    { key: 'tradMeds', answer: '7057e27a-c5dd-11e5-9912-ba0be0483c18', label: 'Traditional medicine' },
    { key: 'other', answer: OTHER, label: 'Other' },
  ],
  /** One group per complication ticked, with its date; Other is specified in the answer obs's comment */
  complicationGroup: '5f52156a-cf63-11e5-ab30-625662870761',
  complication: 'b2fafe94-ce9f-11e5-ab30-625662870761',
  complicationDate: '5f5213e4-cf63-11e5-ab30-625662870761',
  complications: [
    { key: 'injuries', answer: '65465eba-977f-11e1-8993-905e29aff6c1', label: 'Injuries' },
    { key: 'burns', answer: '65463124-977f-11e1-8993-905e29aff6c1', label: 'Burns' },
    { key: 'statusEpilepticus', answer: '657849fc-977f-11e1-8993-905e29aff6c1', label: 'Status epilepticus' },
    { key: 'psychosis', answer: '6546d8ae-977f-11e1-8993-905e29aff6c1', label: 'Psychosis' },
    { key: 'drugRelated', answer: '655a6cde-977f-11e1-8993-905e29aff6c1', label: 'Drug related' },
    { key: 'other', answer: OTHER, label: 'Other' },
  ],
};

/** epilepsy-visit.xml */
export const EP_VISIT = {
  height: '6569c562-977f-11e1-8993-905e29aff6c1',
  weight: '6569c44a-977f-11e1-8993-905e29aff6c1',
  bmi: '484499f2-b58b-11e5-9f22-ba0be0483c18',
  bmiAnswers: [
    { value: '6567eb98-977f-11e1-8993-905e29aff6c1', label: 'Below 19' },
    { value: '6557a15c-977f-11e1-8993-905e29aff6c1', label: '19-24.9' },
    { value: '158204aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Above 25' },
  ],
  anySeizures: '655033a8-ad14-409a-a79f-4d5aa2a03900',
  numberOfSeizures: '65795b26-977f-11e1-8993-905e29aff6c1',
  anyTriggers: 'da1fc8af-fc15-4ac0-b980-eb8b0ffc95cd',
  /** Coded, one obs per trigger ticked */
  trigger: '5f51fecc-cf63-11e5-ab30-625662870761',
  /** Coded, one obs per marker ticked */
  silentMarker: '159502aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  silentMarkers: [
    { value: '159506aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Tongue biting' },
    { value: '117211aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Incontinence' },
  ],
  hospitalised: '655b3dc6-977f-11e1-8993-905e29aff6c1',
  pregnant: '656fbd28-977f-11e1-8993-905e29aff6c1',
  familyPlanning: '656ad7c2-977f-11e1-8993-905e29aff6c1',
  /** The dispensing groups, as on the mental health visit */
  medications: [
    { key: 'cbz', drug: '654b0726-977f-11e1-8993-905e29aff6c1', label: 'Carbamazepine (CBZ)', short: 'CBZ', name: 'Carbamazepine' },
    { key: 'pb', drug: '6546f3c0-977f-11e1-8993-905e29aff6c1', label: 'Phenobarbitone (PB)', short: 'PB', name: 'Phenobarbitone' },
    { key: 'pht', drug: '65473768-977f-11e1-8993-905e29aff6c1', label: 'Phenytoin (PHT)', short: 'PHT', name: 'Phenytoin' },
    { key: 'sv', drug: '65694b32-977f-11e1-8993-905e29aff6c1', label: 'Sodium Valproate (SV)', short: 'SV', name: 'Sodium valproate' },
    { key: 'other', drug: OTHER, label: 'Other', short: 'Other', name: 'Other' },
  ],
  /** Text, the visit's "Comment" */
  comments: '655928e2-977f-11e1-8993-905e29aff6c1',
  nextAppointment: '6569cbd4-977f-11e1-8993-905e29aff6c1',
};
