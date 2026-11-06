import { type CardForm } from '../art/obs-diff';

/**
 * The Mental Health eMastercard's forms and the concepts they save, copied from mental-health-emastercard.xml,
 * mental-health-visit.xml and mental-health-screening.xml (UUIDs lower-cased, as REST returns them)
 */

/** The eMastercards endpoint's key for this card */
export const MH_CARD_KEY = 'mental-health';

/** The paper card's version, which the page names under its title */
export const MH_CARD_VERSION = '1.4';

export const MH_FORMS: { header: CardForm; visit: CardForm; screening: CardForm } = {
  header: { encounterType: '3f94849c-f245-4593-bcc8-879eaea29168', form: '38a60208-3227-4ce7-ab2a-5802f8866bd4' },
  visit: { encounterType: 'd51f45f8-0eea-4231-a7e9-c45d57f1cba1', form: 'f374493e-8038-4f81-ae3d-79d2d0ec4d1c' },
  screening: { encounterType: '1ec34eeb-0776-4f58-871e-fe0026fda111', form: '8bb404f3-f224-40dd-b0c4-76e1b8a119e4' },
};

export const UNKNOWN = '65576584-977f-11e1-8993-905e29aff6c1';
export const CURRENT = '655a4cc2-977f-11e1-8993-905e29aff6c1';
export const PAST = '655a4ab0-977f-11e1-8993-905e29aff6c1';
export const NEVER = '65577f4c-977f-11e1-8993-905e29aff6c1';
/** "Other non-coded", the answer of an "Other" diagnosis, presenting feature or MSE finding */
export const OTHER_NON_CODED = '656cce7e-977f-11e1-8993-905e29aff6c1';
/** Free text, e.g. the name of an "Other" diagnosis or drug */
export const NON_CODED_TEXT = 'd57e3a20-5802-11e6-8b77-86f30ca893d3';

/** Findings recorded both as presenting features on the header and in the visit's mental status examination */
export const FINDINGS = {
  hallucinations: '139146aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  delusions: '142600aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  disruptive: '118905aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  disorganisedSpeech: '159538aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  depressive: '142563aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  elevatedMood: '138045aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  lacksInsight: '6fc0a5c4-9492-11e7-abc4-cec278b6b50a',
};

/** The exposure groups, which the header and the visit share */
export const EXPOSURE = {
  alcoholGroup: '655e1cbc-977f-11e1-8993-905e29aff6c1',
  chambaGroup: '59d876a4-5444-11e6-beb8-9e71128cae77',
  otherDrugsGroup: '625b029c-5377-11e6-beb8-9e71128cae77',
  tradMedsGroup: '625b081e-5377-11e6-beb8-9e71128cae77',
  /** Current, past or never, in the alcohol group */
  alcoholHistory: '655a4ed4-977f-11e1-8993-905e29aff6c1',
  /** Current, past or never, in the other groups */
  history: '625afe8c-5377-11e6-beb8-9e71128cae77',
  years: '655e1bae-977f-11e1-8993-905e29aff6c1',
  lastUse: '5f521038-cf63-11e5-ab30-625662870761',
};

export const MH_HEADER = {
  transferInDate: '6559bc30-977f-11e1-8993-905e29aff6c1',
  /** Numeric, as the concept's datatype is */
  patientPhone: '6559ba14-977f-11e1-8993-905e29aff6c1',
  guardianName: '655bbc74-977f-11e1-8993-905e29aff6c1',
  guardianPhone: '65600cd4-977f-11e1-8993-905e29aff6c1',
  relationToPatient: '6558fd0e-977f-11e1-8993-905e29aff6c1',
  agreesToFollowUp: '655fc526-977f-11e1-8993-905e29aff6c1',
  chwRelationshipType: 'eb567be2-fda1-4746-9d51-833de8a7e81f',
  diagnosisGroup: '6db168f1-0f38-42d9-9f0e-90946a3d8e72',
  diagnosis: '65671c9a-977f-11e1-8993-905e29aff6c1',
  diagnosisDate: '65732bf2-977f-11e1-8993-905e29aff6c1',
  /** In the form's order: schizophrenia, its repeat of 18, then the two "Other" diagnoses */
  diagnoses: [
    { key: 'schizophrenia', answer: '654860c0-977f-11e1-8993-905e29aff6c1', label: 'Schizophrenia' },
    { key: 'manic', answer: '115924aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Mood affective disorder (manic)' },
    { key: 'depression', answer: '6546cbd4-977f-11e1-8993-905e29aff6c1', label: 'Mood affective disorder (depression)' },
    { key: 'bipolar', answer: 'a0d3ad80-f290-437c-8be3-7440dfdb7299', label: 'Mood Affective Disorder (Bipolar)' },
    { key: 'acutePsychotic', answer: '93e9be37-1369-11e4-a125-54ee7513a7ff', label: 'Acute & transient psychotic disorder' },
    { key: 'schizoaffective', answer: '127132aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Schizoaffective Disorder' },
    { key: 'anxiety', answer: '6560bf08-977f-11e1-8993-905e29aff6c1', label: 'Anxiety disorder' },
    { key: 'organicAcute', answer: '7057d712-c5dd-11e5-9912-ba0be0483c18', label: 'Organic mental disorder (acute)' },
    { key: 'organicChronic', answer: '7057d8b6-c5dd-11e5-9912-ba0be0483c18', label: 'Organic mental disorder (chronic)' },
    { key: 'drugUse', answer: '90ec5559-3ba2-4fc3-abc1-614727b17141', label: 'Drug use mental disorder' },
    { key: 'alcoholUse', answer: '121716aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Alcohol use mental disorder' },
    { key: 'stressReaction', answer: '3ac86541-7c6a-4e94-96dd-66942ced3cdb', label: 'Stress Reaction Adjustment Disorder' },
    { key: 'dissociative', answer: 'c119657d-f96c-48d5-9dbe-0c24486eadf5', label: 'Dissociative Conversion Disorder' },
    { key: 'puerperal', answer: '304b2b8c-db9c-4dc1-8f3a-7c2e6ea7a97a', label: 'Puerperal Mental Disorder' },
    { key: 'somatoform', answer: '112874aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Somatoform Disorder' },
    { key: 'personality', answer: '114193aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Personality/Behavioural Disorder' },
    { key: 'retardation', answer: '115809aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Mental Retardation' },
    { key: 'psychDev', answer: '159238aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Psychological Developmental Disorder' },
    { key: 'adhd', answer: 'cba37f2a-2058-454f-b291-f992af755a20', label: 'Hyperkinetic Conductal Disorder (ADHD)' },
    { key: 'other1', answer: 'aad4c0e9-1369-11e4-a125-54ee7513a7ff', label: 'Other', named: true },
    { key: 'other2', answer: 'f97271c0-63ed-11e6-8b77-86f30ca893d3', label: 'Other', named: true },
  ] as Array<{ key: string; answer: string; label: string; named?: boolean }>,
  familyHistory: {
    epilepsy: '152450aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    mentalIllness: '7057d000-c5dd-11e5-9912-ba0be0483c18',
    behaviour: '7057d3ac-c5dd-11e5-9912-ba0be0483c18',
  },
  hivStatus: '6567ae62-977f-11e1-8993-905e29aff6c1',
  hivStatusAnswers: { reactive: '65587802-977f-11e1-8993-905e29aff6c1', nonReactive: '6558791a-977f-11e1-8993-905e29aff6c1' },
  hivTestDate: '655bc9da-977f-11e1-8993-905e29aff6c1',
  artStartDate: '655f9eb6-977f-11e1-8993-905e29aff6c1',
  tbStatus: '65770db2-977f-11e1-8993-905e29aff6c1',
  tbStatusAnswers: {
    smearPositive: '655ddc20-977f-11e1-8993-905e29aff6c1',
    smearNegative: '655ddd24-977f-11e1-8993-905e29aff6c1',
    eptb: '655a49ac-977f-11e1-8993-905e29aff6c1',
  },
  tbYear: '3237c2a0-ada3-11e5-bf7f-feff819cdc9f',
  presentingFeatureGroup: '0b78965e-43bb-11e6-beb8-9e71128cae77',
  presentingFeature: '0b7892bc-43bb-11e6-beb8-9e71128cae77',
  /** In the form's order; "Other" is specified in the feature obs's comment */
  presentingFeatures: [
    { key: 'hallucinations', answer: FINDINGS.hallucinations, label: 'Hallucinations' },
    { key: 'delusions', answer: FINDINGS.delusions, label: 'Delusions' },
    { key: 'disruptive', answer: FINDINGS.disruptive, label: 'Disorganised/disruptive behaviour' },
    { key: 'disorganisedSpeech', answer: FINDINGS.disorganisedSpeech, label: 'Disorganised speech' },
    { key: 'depressive', answer: FINDINGS.depressive, label: 'Depressive symptoms' },
    { key: 'other', answer: OTHER_NON_CODED, label: 'Other' },
  ],
};

export const MH_VISIT = {
  height: '6569c562-977f-11e1-8993-905e29aff6c1',
  weight: '6569c44a-977f-11e1-8993-905e29aff6c1',
  phq9Score: 'e1bc7567-aec8-48b6-987e-b4a53d15787b',
  msePresent: '0b7892bc-43bb-11e6-beb8-9e71128cae77',
  mseAbsent: '6fc0a984-9492-11e7-abc4-cec278b6b50a',
  stable: '1855aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  dailyActivities: 'b36bce1e-8288-11e7-bb31-be2e44b06b34',
  pregnant: '656fbd28-977f-11e1-8993-905e29aff6c1',
  familyPlanning: '656ad7c2-977f-11e1-8993-905e29aff6c1',
  suicideRisk: '112411aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  /** Boolean, asked Yes/No */
  sideEffects: '655d762c-977f-11e1-8993-905e29aff6c1',
  hospitalised: 'b36bc9d2-8288-11e7-bb31-be2e44b06b34',
  counselling: 'cef3471e-eb0a-4b14-b402-9b24742e3869',
  dispensingGroup: '3269f65b-1a28-42ee-8578-b9658387aa00',
  medication: '65585192-977f-11e1-8993-905e29aff6c1',
  dose: '160856aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  doseUnit: '162384aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  doseUnits: [
    { value: '161553aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'mg' },
    { value: '162263aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'mL' },
    { value: '6569265c-977f-11e1-8993-905e29aff6c1', label: 'capsule' },
    { value: '656921d4-977f-11e1-8993-905e29aff6c1', label: 'tablet' },
  ],
  route: 'b08011b8-b1c7-4fd0-b48d-65a475397639',
  routes: [
    { value: '65640244-977f-11e1-8993-905e29aff6c1', label: 'Oral' },
    { value: '65640348-977f-11e1-8993-905e29aff6c1', label: 'IV' },
  ],
  frequency: '6563fb14-977f-11e1-8993-905e29aff6c1',
  frequencies: [
    { value: '6563fc18-977f-11e1-8993-905e29aff6c1', label: 'OD', words: 'once daily' },
    { value: '6563fd26-977f-11e1-8993-905e29aff6c1', label: 'BID', words: 'twice daily' },
    { value: '6563fe2a-977f-11e1-8993-905e29aff6c1', label: 'TID', words: 'three times daily' },
    { value: '656f969a-977f-11e1-8993-905e29aff6c1', label: 'QID', words: 'four times daily' },
    { value: '655a9a10-977f-11e1-8993-905e29aff6c1', label: 'STAT', words: 'immediately' },
    { value: '160857aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'PRN', words: 'as needed' },
    { value: '657140f8-977f-11e1-8993-905e29aff6c1', label: 'other', words: 'other' },
  ],
  duration: '159368aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  durationUnit: 'f1904502-319d-4681-9030-e642111e7ce2',
  durationUnits: [
    { value: 'e0d31892-690e-4063-9570-73d103c8efb0', label: 'Hours' },
    { value: '65576b10-977f-11e1-8993-905e29aff6c1', label: 'Days' },
    { value: '65576c32-977f-11e1-8993-905e29aff6c1', label: 'Weeks' },
    { value: '65576d4a-977f-11e1-8993-905e29aff6c1', label: 'Months' },
  ],
  /** In the form's order; "Other" is named in the group's free text */
  medications: [
    { key: 'cpz', drug: '654b00aa-977f-11e1-8993-905e29aff6c1', label: 'Chloropromazine (CPZ)', short: 'CPZ', name: 'Chlorpromazine' },
    { key: 'hlp', drug: '65693df4-977f-11e1-8993-905e29aff6c1', label: 'Haloperidol (HLP)', short: 'HLP', name: 'Haloperidol' },
    { key: 'fpz', drug: '654b0eb0-977f-11e1-8993-905e29aff6c1', label: 'Fluphenazine (FPZ)', short: 'FPZ', name: 'Fluphenazine' },
    { key: 'cbz', drug: '654b0726-977f-11e1-8993-905e29aff6c1', label: 'Carbamazepine (CBZ)', short: 'CBZ', name: 'Carbamazepine' },
    { key: 'sv', drug: '65694b32-977f-11e1-8993-905e29aff6c1', label: 'Sodium Valproate (SV)', short: 'SV', name: 'Sodium valproate' },
    { key: 'ris', drug: '83405aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Risperidone (RIS)', short: 'RIS', name: 'Risperidone' },
    { key: 'flx', drug: '65693bec-977f-11e1-8993-905e29aff6c1', label: 'Fluoxetine (FLX)', short: 'FLX', name: 'Fluoxetine' },
    { key: 'olanzapine', drug: 'dae4e2e4-659e-11e6-8b77-86f30ca893d3', label: 'Olanzapine', short: 'Olanzapine', name: 'Olanzapine' },
    { key: 'clozapine', drug: 'dae4e5e6-659e-11e6-8b77-86f30ca893d3', label: 'Clozapine', short: 'Clozapine', name: 'Clozapine' },
    { key: 'trifluoperazine', drug: '657b0bba-977f-11e1-8993-905e29aff6c1', label: 'Trifluoperazine', short: 'Trifluoperazine', name: 'Trifluoperazine' },
    { key: 'clopixol', drug: 'dae4eb4a-659e-11e6-8b77-86f30ca893d3', label: 'Clopixol', short: 'Clopixol', name: 'Clopixol' },
    { key: 'amt', drug: '654b12fc-977f-11e1-8993-905e29aff6c1', label: 'Amitriptyline (AMT)', short: 'AMT', name: 'Amitriptyline' },
    { key: 'other', drug: '657140f8-977f-11e1-8993-905e29aff6c1', label: 'Other', short: 'Other', name: 'Other' },
  ],
  comments: '655928e2-977f-11e1-8993-905e29aff6c1',
  nextAppointment: '6569cbd4-977f-11e1-8993-905e29aff6c1',
};

export const MH_SCREENING = {
  diagnosis: '656292d8-977f-11e1-8993-905e29aff6c1',
  diagnoses: [
    { value: '6546cbd4-977f-11e1-8993-905e29aff6c1', label: 'Depression' },
    { value: 'c6c218ce-614d-4072-b013-69cd0dd83c79', label: 'Stress and anxiety' },
    { value: '432fe366-c230-4168-a755-ee521241601a', label: 'Grief and loss' },
    { value: '5ea979aa-1369-11e4-a125-54ee7513a7ff', label: 'Substance and Drug' },
    { value: '112411aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Suicide' },
    { value: '2a50bd91-5275-49ed-8969-911035bcc918', label: 'Trauma/PTSD' },
    { value: 'd4fa0c9e-6bea-4b96-943f-63df2360f8a8', label: 'GBV' },
    { value: 'f2fbb381-99aa-4dce-8ff8-097dfdec2a5f', label: 'High Viral Load' },
  ],
  otherDiagnosisGroup: 'd8467734-8ef7-4cb3-ab3f-e24ca9665472',
  intervention: '05d28bcb-ac69-4688-bb9e-480b8ca4f3bd',
  interventions: [
    { value: '96cc4b8f-27b5-49a0-8804-18501ffac704', label: 'PM +' },
    { value: '4d09847f-0754-4119-aacc-32567fa0cd26', label: 'PFA' },
    { value: '79d4d4ee-cbcf-4ccb-989d-b3307324cfd8', label: 'psych education' },
    { value: '229c4e57-5b7e-4b9e-842f-0da4e472d0fe', label: 'Supportive counselling' },
    { value: '5e756bfd-3182-4b0e-a090-0061d3a7c07c', label: 'Cognitive behavioral therapy' },
    { value: '13c3af4c-cfd2-46b3-b607-060ac8e0bd8c', label: 'Interpersonal therapy' },
    { value: '8a7c2eb4-fb88-4be7-b6e7-e926ca266225', label: 'Case management' },
    { value: 'ec294ee2-9a69-4598-923c-67840bde5960', label: 'Couple/Family counselling' },
  ],
  otherInterventionGroup: '8fe2cbb9-78b8-47a6-956a-bbbc5751749f',
  /** The answer of an "Other" diagnosis or intervention */
  other: '8797110a-d38e-427f-a08f-260300c8c896',
  session: '95de19f6-46e7-4377-860e-69ceec4011cf',
  sessions: [
    { value: '697e9461-f2d6-4ab1-a140-48f768ce002a', label: 'Session 1' },
    { value: '11c0f708-6950-4e94-b080-5c76174a4947', label: 'Session 2' },
    { value: '224e3d57-f6d1-4244-bbe2-b81a574ba7aa', label: 'Session 3' },
  ],
  sessionNotes: '49317520-079f-4ccc-a5e3-e0018aa644c7',
  outcome: '6571d95a-977f-11e1-8993-905e29aff6c1',
  outcomes: [
    { value: '6566dba4-977f-11e1-8993-905e29aff6c1', label: 'Discharged' },
    { value: 'a6ce9b02-f58b-45c5-b325-317e5535605a', label: 'Missed appointment' },
    { value: '65736928-977f-11e1-8993-905e29aff6c1', label: 'Defaulter' },
    { value: '43151b7f-6083-4f68-891d-56ad7af5de49', label: 'Relocation' },
    { value: '655b5e46-977f-11e1-8993-905e29aff6c1', label: 'Died' },
    { value: '655a6acc-977f-11e1-8993-905e29aff6c1', label: 'Stopped' },
  ],
  outcomeDate: '3597ed63-5627-4522-8cff-2d5d2393bada',
  comments: '655928e2-977f-11e1-8993-905e29aff6c1',
  nextAppointment: '6569cbd4-977f-11e1-8993-905e29aff6c1',
};
