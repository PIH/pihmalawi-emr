/**
 * The concepts, answers, encounter types and forms of the ART patient card, copied from its HTML forms
 * (content/configuration/backend_configuration/htmlforms: art-visit.xml, art-emastercard.xml, viral-load-tests.xml
 * and art-follow-up-testing.xml). O3 saves exactly what those forms save, so these must stay in step with them.
 */

/** The encounter type and form each ART card form saves its encounter with */
export const ART_FORMS = {
  visit: { encounterType: '664b8650-977f-11e1-8993-905e29aff6c1', form: '64db7fd5-c28d-4b85-87c4-d01e92ae004a' },
  initial: { encounterType: '664b8574-977f-11e1-8993-905e29aff6c1', form: 'a3cbdf5f-8c15-41b4-b97d-903ba3bd0532' },
  viralLoad: { encounterType: '9959a261-2122-4ae1-a89d-1ca444b712ea', form: 'badbb502-9718-11e7-8999-ad34fd5ac8df' },
  followUpTesting: {
    encounterType: '4104867f-8f40-4273-bc42-a67958e599eb',
    form: '1caa998f-2f21-4568-b319-0618f6733284',
  },
};

export type ArtFormKind = keyof typeof ART_FORMS;

/**
 * The provider the HTML forms record: their hidden encounterProvider default is the person
 * c4f0fc3c-2695-102d-b4c2-001d929acb54, whose provider UnknownProviderInitializer creates with this fixed uuid
 */
export const DEFAULT_PROVIDER = 'provfc3c-2695-102d-b4c2-001d929acb54';

/** The encounter role the HTML forms record that provider with, "Unknown" (checked by art-data-shape.spec.ts) */
export const ENCOUNTER_ROLE = 'a0b03050-c99b-11e0-9572-0800200c9a66';

export const YES = '65576354-977f-11e1-8993-905e29aff6c1';
export const NO = '6557646c-977f-11e1-8993-905e29aff6c1';
export const POSITIVE = '6549be7a-977f-11e1-8993-905e29aff6c1';
export const NEGATIVE = '654994c2-977f-11e1-8993-905e29aff6c1';
export const CURRENTLY_PREGNANT = '655b6bac-977f-11e1-8993-905e29aff6c1';
export const CURRENTLY_LACTATING = '656cdab8-977f-11e1-8993-905e29aff6c1';

/** The ART regimens, in the forms' order, with their card labels */
export const REGIMENS: Array<{ uuid: string; label: string }> = [
  { uuid: 'd5930c3a-cb57-11e5-9956-625662870761', label: '0A' },
  { uuid: 'd59315a4-cb57-11e5-9956-625662870761', label: '0P' },
  { uuid: '657ab1ba-977f-11e1-8993-905e29aff6c1', label: '1A' },
  { uuid: '657ab372-977f-11e1-8993-905e29aff6c1', label: '1P' },
  { uuid: '657ab520-977f-11e1-8993-905e29aff6c1', label: '2A' },
  { uuid: '657ab6d8-977f-11e1-8993-905e29aff6c1', label: '2P' },
  { uuid: '657ab886-977f-11e1-8993-905e29aff6c1', label: '3A' },
  { uuid: '657aba3e-977f-11e1-8993-905e29aff6c1', label: '3P' },
  { uuid: '657abd9a-977f-11e1-8993-905e29aff6c1', label: '4A' },
  { uuid: '657abf48-977f-11e1-8993-905e29aff6c1', label: '4P' },
  { uuid: '1fb83022-491b-4a0b-bd81-a1a48cfc082f', label: '4PP' },
  { uuid: '0c812dc8-cb40-4e2e-926e-ebd9fb3376ff', label: '4PA' },
  { uuid: '657ac056-977f-11e1-8993-905e29aff6c1', label: '5A' },
  { uuid: '657ac164-977f-11e1-8993-905e29aff6c1', label: '6A' },
  { uuid: '657ac268-977f-11e1-8993-905e29aff6c1', label: '7A' },
  { uuid: '657ac36c-977f-11e1-8993-905e29aff6c1', label: '8A' },
  { uuid: '8a795372-ba39-11e6-91a8-5622a9e78e10', label: '9A' },
  { uuid: '657ac470-977f-11e1-8993-905e29aff6c1', label: '9P' },
  { uuid: '84e96887-5963-4cc9-8feb-b2ccd1447465', label: '9PP' },
  { uuid: 'e9478866-c8ce-4ca7-a593-03e8ba0166d7', label: '9PA' },
  { uuid: '7ebc782a-baa2-11e6-91a8-5622a9e78e10', label: '10A' },
  { uuid: '8bb7294e-baa2-11e6-91a8-5622a9e78e10', label: '11A' },
  { uuid: '91bcdad2-baa2-11e6-91a8-5622a9e78e10', label: '11P' },
  { uuid: '98ec6848-15bf-41ef-b844-5a16d7dbb0f8', label: '11PP' },
  { uuid: 'ec5edf44-a088-4117-8a05-b23b018ec075', label: '11PA' },
  { uuid: '43b86ce6-dc3f-11e8-9f8b-f2801f1b9fd1', label: '12A' },
  { uuid: '3b861411-5818-430a-8a90-2deabf89f328', label: '12PP' },
  { uuid: '007f685d-bb78-4f16-91c4-073aa8107943', label: '12PA' },
  { uuid: '53009e3a-dc3f-11e8-9f8b-f2801f1b9fd1', label: '13A' },
  { uuid: '5e16f0b2-dc3f-11e8-9f8b-f2801f1b9fd1', label: '14A' },
  { uuid: 'cf770b14-4c9d-11ea-b77f-2e728ce88125', label: '14P' },
  { uuid: '8fe981ba-2349-41e4-99d8-2d6051f24718', label: '14PP' },
  { uuid: 'e901ec7c-f45c-413f-a186-4c779227ac08', label: '14PA' },
  { uuid: '6764fc5e-dc3f-11e8-9f8b-f2801f1b9fd1', label: '15A' },
  { uuid: 'e2ec7c88-4c9d-11ea-b77f-2e728ce88125', label: '15P' },
  { uuid: 'e58595c7-8354-48ea-a2b8-f75584bdf594', label: '15PP' },
  { uuid: 'fb26bc7f-ae9c-4655-9823-ce0066d8081a', label: '15PA' },
  { uuid: 'e2ec805c-4c9d-11ea-b77f-2e728ce88125', label: '16A' },
  { uuid: 'e2ec82b4-4c9d-11ea-b77f-2e728ce88125', label: '16P' },
  { uuid: 'e2ec871e-4c9d-11ea-b77f-2e728ce88125', label: '17A' },
  { uuid: 'e2ec899e-4c9d-11ea-b77f-2e728ce88125', label: '17P' },
  { uuid: 'e13a8993-5604-40c9-90ea-8217d7d047f0', label: '17PP' },
  { uuid: 'fd5521f9-00e1-42dc-98cf-103c44e64bc1', label: '17PA' },
  { uuid: '826b65ba-dc53-11e8-9f8b-f2801f1b9fd1', label: 'Non Standard' },
];

/** art-visit.xml */
export const ART_VISIT = {
  height: '6569c562-977f-11e1-8993-905e29aff6c1',
  weight: '6569c44a-977f-11e1-8993-905e29aff6c1',
  systolicBp: '6569bffe-977f-11e1-8993-905e29aff6c1',
  diastolicBp: '6569c116-977f-11e1-8993-905e29aff6c1',
  pregnantLactating: '657a1c3c-977f-11e1-8993-905e29aff6c1',
  tbStatus: '65770db2-977f-11e1-8993-905e29aff6c1',
  tbStatusAnswers: {
    notSuspected: '6577084e-977f-11e1-8993-905e29aff6c1',
    suspected: '65770966-977f-11e1-8993-905e29aff6c1',
    confirmedNoRx: '65770a7e-977f-11e1-8993-905e29aff6c1',
    confirmedRx: '65770ca4-977f-11e1-8993-905e29aff6c1',
  },
  sideEffects: '65789d4e-977f-11e1-8993-905e29aff6c1',
  sideEffectAnswers: {
    no: NO,
    pn: '654a4ade-977f-11e1-8993-905e29aff6c1',
    hp: '6545b33e-977f-11e1-8993-905e29aff6c1',
    sk: '65489e00-977f-11e1-8993-905e29aff6c1',
    lip: '655d81f8-977f-11e1-8993-905e29aff6c1',
    other: '657140f8-977f-11e1-8993-905e29aff6c1',
  },
  pillCount: '655fb892-977f-11e1-8993-905e29aff6c1',
  dosesMissed: '656226ea-977f-11e1-8993-905e29aff6c1',
  artRegimen: '657ac57e-977f-11e1-8993-905e29aff6c1',
  numArvsGiven: '6561fa3a-977f-11e1-8993-905e29aff6c1',
  /** Boolean: false is the patient (P), true the guardian (G) */
  arvsGivenTo: '655d5246-977f-11e1-8993-905e29aff6c1',
  preventiveTherapyGroup: 'e87bb1c5-b6da-43dd-988b-50def171fa9f',
  preventiveTherapyStatus: 'fef29061-1ad7-4cf3-87e8-6bf0b03b3332',
  preventiveTherapyPills: '65614392-977f-11e1-8993-905e29aff6c1',
  /** The CPT/IPT drugs, in the form's order; each is one obs group */
  preventiveTherapies: {
    ctx: '654b02da-977f-11e1-8993-905e29aff6c1',
    inh: '65498bbc-977f-11e1-8993-905e29aff6c1',
    rfp: 'af85c07d-adce-4a5d-a8d9-fa640f41e82d',
    threeHp: '0f233aab-1c6b-4135-883f-47bd95f62432',
    pyridoxine: '654a0e20-977f-11e1-8993-905e29aff6c1',
  },
  nextAppointment: '6569cbd4-977f-11e1-8993-905e29aff6c1',
};

/** art-emastercard.xml, the card header (ART initial encounter) */
export const ART_INITIAL = {
  transferInDate: '6559bc30-977f-11e1-8993-905e29aff6c1',
  childHccNumber: '48964d18-ba37-11e6-91a8-5622a9e78e10',
  patientPhone: '65700e2c-977f-11e1-8993-905e29aff6c1',
  guardianName: '655bbc74-977f-11e1-8993-905e29aff6c1',
  guardianPhone: '6563d2c4-977f-11e1-8993-905e29aff6c1',
  /** The form's "Guardian relation to patient" (its relationToPatient macro) */
  guardianRelation: '6558fd0e-977f-11e1-8993-905e29aff6c1',
  agreesToFollowUp: '655fc526-977f-11e1-8993-905e29aff6c1',
  hivRelatedDiseases: '657a53d2-977f-11e1-8993-905e29aff6c1',
  urineLamCrag: 'a047e2ec-f07e-47a6-8849-7c5150550e9e',
  whoStage: '65778170-977f-11e1-8993-905e29aff6c1',
  whoStageAnswers: {
    stage1: '657499f6-977f-11e1-8993-905e29aff6c1',
    stage2: '65749afa-977f-11e1-8993-905e29aff6c1',
    stage3: '65749bfe-977f-11e1-8993-905e29aff6c1',
    stage4: '65749d02-977f-11e1-8993-905e29aff6c1',
  },
  /** Coded; ticked is the answer yes */
  presumedSevereHiv: '657494e2-977f-11e1-8993-905e29aff6c1',
  /** Boolean */
  ks: '6566c006-977f-11e1-8993-905e29aff6c1',
  tbStatus: '655a5f5a-977f-11e1-8993-905e29aff6c1',
  tbStatusAnswers: {
    never: '65576584-977f-11e1-8993-905e29aff6c1',
    last: '655b3ccc-977f-11e1-8993-905e29aff6c1',
    current: '6559c054-977f-11e1-8993-905e29aff6c1',
  },
  pregnantLactating: '657a1c3c-977f-11e1-8993-905e29aff6c1',
  cd4Count: '656c327a-977f-11e1-8993-905e29aff6c1',
  cd4Percent: '6549db44-977f-11e1-8993-905e29aff6c1',
  cd4Date: '65661dc2-977f-11e1-8993-905e29aff6c1',
  height: '6569c562-977f-11e1-8993-905e29aff6c1',
  weight: '6569c44a-977f-11e1-8993-905e29aff6c1',
  everTakenArvs: '65789c4a-977f-11e1-8993-905e29aff6c1',
  ageAtInitiation: '6566247a-977f-11e1-8993-905e29aff6c1',
  lastArvsTaken: '65789b46-977f-11e1-8993-905e29aff6c1',
  lastArvsDate: '65789934-977f-11e1-8993-905e29aff6c1',
  confirmatoryTestLocation: '65792e58-977f-11e1-8993-905e29aff6c1',
  linkId: 'b9e98a62-8437-4807-9df8-37f0046fd0e8',
  confirmatoryTestDate: '655f9d08-977f-11e1-8993-905e29aff6c1',
  confirmatoryTestType: '6574552c-977f-11e1-8993-905e29aff6c1',
  confirmatoryTestTypeAnswers: {
    rapid: '654b983a-977f-11e1-8993-905e29aff6c1',
    pcr: '654a6960-977f-11e1-8993-905e29aff6c1',
  },
  artEducationDone: '655a6270-977f-11e1-8993-905e29aff6c1',
  artEducationDate: '657a1d40-977f-11e1-8993-905e29aff6c1',
  tbRegistrationNumber: '65796184-977f-11e1-8993-905e29aff6c1',
  tbTreatmentStartDate: '65579f22-977f-11e1-8993-905e29aff6c1',
  /** First line, alternative first line and second line, with their start dates */
  regimens: [
    { regimen: '657ac678-977f-11e1-8993-905e29aff6c1', startDate: '656fbe36-977f-11e1-8993-905e29aff6c1' },
    { regimen: '657ac7c2-977f-11e1-8993-905e29aff6c1', startDate: '655fabfe-977f-11e1-8993-905e29aff6c1' },
    { regimen: '657ac8d0-977f-11e1-8993-905e29aff6c1', startDate: '655fad02-977f-11e1-8993-905e29aff6c1' },
  ],
  /** The relationship type whose person A is the patient's community health worker */
  chwRelationshipType: 'eb567be2-fda1-4746-9d51-833de8a7e81f',
};

/** viral-load-tests.xml */
export const VIRAL_LOAD = {
  group: '83931c6d-0e5a-4302-b8ce-a31175b6475e',
  /** Boolean, "Bled" */
  sampleTaken: 'f792f2f9-9c24-4d6e-98fd-caffa8f2383f',
  testingReason: '164126aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  testingReasonAnswers: {
    routine: 'e0821812-955d-11e7-abc4-cec278b6b50a',
    confirmed: '65590f06-977f-11e1-8993-905e29aff6c1',
    targeted: 'e0821df8-955d-11e7-abc4-cec278b6b50a',
  },
  /** Coded, answered from the concept's own answers */
  labLocation: '6fc0ab50-9492-11e7-abc4-cec278b6b50a',
  labId: '4a3cd51e-f542-4638-aad1-0c19b742c31e',
  sampleId: 'a8a56930-6b16-11ea-b6dd-8f1bd7e7fd41',
  result: '654a7694-977f-11e1-8993-905e29aff6c1',
  lessThanLimit: '69e87644-5562-11e9-8647-d663bd873d93',
  /** Boolean */
  ldl: 'e97b36a2-16f5-11e6-b6ba-3e1d05defe78',
  noResultReason: '656fa450-977f-11e1-8993-905e29aff6c1',
  noResultReasonAnswers: {
    contaminated: '65597a5e-977f-11e1-8993-905e29aff6c1',
    missing: 'e0822140-955d-11e7-abc4-cec278b6b50a',
    rejected: '656fa55e-977f-11e1-8993-905e29aff6c1',
    equipmentFailure: '165179aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    inappropriateContainer: '165181aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    suppliesNotAvailable: '165183aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    other: '656cce7e-977f-11e1-8993-905e29aff6c1',
  },
};

/** art-follow-up-testing.xml */
export const FOLLOW_UP_TESTING = {
  phq9Score: 'e1bc7567-aec8-48b6-987e-b4a53d15787b',
  cd4Count: '656c327a-977f-11e1-8993-905e29aff6c1',
  cd4Percent: '6549db44-977f-11e1-8993-905e29aff6c1',
  glucoseGroup: '655dfa20-977f-11e1-8993-905e29aff6c1',
  serumGlucose: '654a98b8-977f-11e1-8993-905e29aff6c1',
  glucoseTestType: '65711e3e-977f-11e1-8993-905e29aff6c1',
  glucoseTestTypeAnswers: {
    fasting: '65711c2c-977f-11e1-8993-905e29aff6c1',
    random: '65711d3a-977f-11e1-8993-905e29aff6c1',
  },
};
