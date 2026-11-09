import { type CardForm } from '../art/obs-diff';

/**
 * The Chronic Lung Disease eMastercard's forms and the concepts they save, copied from
 * chronic-lung-disease-emastercard.xml, -visit.xml, -peak-flow.xml and -hospitalization.xml (UUIDs lower-cased, as
 * REST returns them). Its patient and guardian, HIV and TB questions are the NCD headers' (shared/ncd.ts), and its
 * hospitalisations save what the hypertension and diabetes card's do.
 */

/** The eMastercards endpoint's key for this card */
export const CLD_CARD_KEY = 'asthma';

/** The paper card's version (the header form's "Version 1"), which the page names under its title */
export const CLD_CARD_VERSION = '1';

export type CldForm = 'header' | 'visit' | 'peakFlow' | 'hospitalisation';

export const CLD_FORMS: Record<CldForm, CardForm> = {
  header: { encounterType: 'a95dc43f-925c-11e5-a1de-e82aea237783', form: '08f273c2-8c38-11e5-80a3-c0430f805837' },
  visit: { encounterType: 'f4596df5-925c-11e5-a1de-e82aea237783', form: 'fcf29c1a-8c45-11e5-80a3-c0430f805837' },
  peakFlow: { encounterType: '46028b88-c538-11e5-9912-ba0be0483c18', form: '460293bc-c538-11e5-9912-ba0be0483c18' },
  hospitalisation: { encounterType: '2478c35b-9a71-4bd5-86b6-e8cce594e934', form: '46ca88e9-f0ab-4b07-9ea9-291fd1f45a3e' },
};

const POSITIVE = '6549be7a-977f-11e1-8993-905e29aff6c1';
const NEGATIVE = '654994c2-977f-11e1-8993-905e29aff6c1';
const UNKNOWN = '65576584-977f-11e1-8993-905e29aff6c1';
export const ASTHMA = '65459124-977f-11e1-8993-905e29aff6c1';
export const COPD = '65673e96-977f-11e1-8993-905e29aff6c1';

/** chronic-lung-disease-emastercard.xml, the card header (ASTHMA_INITIAL encounter) */
export const CLD_HEADER = {
  diagnoses: [
    { key: 'asthma', answer: ASTHMA, label: 'Asthma' },
    { key: 'copd', answer: COPD, label: 'COPD' },
  ],
  /** The form's family history answers, labelled Y, N and UNK */
  familyHistoryAnswers: [
    { value: POSITIVE, label: 'Yes' },
    { value: NEGATIVE, label: 'No' },
    { value: UNKNOWN, label: 'Unknown' },
  ],
  familyAsthma: '37519f36-8c2e-11e5-80a3-c0430f805837',
  familyCopd: '41afdae4-8c31-11e5-80a3-c0430f805837',
  /** Ticked as the symptom present: chronic dry cough */
  symptom: '6558d3ba-977f-11e1-8993-905e29aff6c1',
  dryCough: '655d587c-977f-11e1-8993-905e29aff6c1',
  /** Months, with decimals */
  coughDuration: '655dc348-977f-11e1-8993-905e29aff6c1',
  ageAtOnset: '6df61adc-8c31-11e5-80a3-c0430f805837',
  /** Each exposure ticked is its own group: the exposure and its date */
  exposureGroup: '5f52124a-cf63-11e5-ab30-625662870761',
  exposure: '7057db5e-c5dd-11e5-9912-ba0be0483c18',
  exposureDate: '5f521038-cf63-11e5-ab30-625662870761',
  exposures: [
    { key: 'tbContact', answer: '655d5d7c-977f-11e1-8993-905e29aff6c1', label: 'TB contact' },
    { key: 'secondHandSmoke', answer: 'e51be8fa-8c34-11e5-80a3-c0430f805837', label: 'Second hand smoking' },
    { key: 'occupational', answer: '6780fd96-8c33-11e5-80a3-c0430f805837', label: 'Occupational exposure' },
  ],
  /** Coded, one obs per answer ticked */
  cooking: '94498de6-6ea7-441f-8d79-d2ef3c3df30f',
  indoors: '655f3dcc-977f-11e1-8993-905e29aff6c1',
  outdoors: '655f3ed0-977f-11e1-8993-905e29aff6c1',
  /** Ticked as "in the past": the patient has smoked */
  smokingHistory: '655a4dc6-977f-11e1-8993-905e29aff6c1',
  smokedInPast: '655a4ab0-977f-11e1-8993-905e29aff6c1',
  lastSmoked: 'af397d66-8c33-11e5-80a3-c0430f805837',
  /** Main activity, whose answers the form offers from the concept */
  occupation: '6558df36-977f-11e1-8993-905e29aff6c1',
  occupations: [
    { value: '6557987e-977f-11e1-8993-905e29aff6c1', label: 'None' },
    { value: '6558e378-977f-11e1-8993-905e29aff6c1', label: 'Trading' },
    { value: '6558e166-977f-11e1-8993-905e29aff6c1', label: 'Farmer' },
    { value: '6558e26a-977f-11e1-8993-905e29aff6c1', label: 'Student' },
    { value: '6558e47c-977f-11e1-8993-905e29aff6c1', label: 'Unemployed' },
    { value: '6558f606-977f-11e1-8993-905e29aff6c1', label: 'Manual laborer' },
    { value: '655b1f6c-977f-11e1-8993-905e29aff6c1', label: 'Shepherd' },
    { value: '655b2066-977f-11e1-8993-905e29aff6c1', label: 'Brewer' },
    { value: '655b216a-977f-11e1-8993-905e29aff6c1', label: 'Shop owner' },
    { value: '655b1e5e-977f-11e1-8993-905e29aff6c1', label: 'Fruit or vegetable seller' },
    { value: '655b1c56-977f-11e1-8993-905e29aff6c1', label: 'Miner' },
    { value: '655b1d5a-977f-11e1-8993-905e29aff6c1', label: 'Factory worker' },
    { value: '65596e42-977f-11e1-8993-905e29aff6c1', label: 'Housework' },
    { value: '655f4600-977f-11e1-8993-905e29aff6c1', label: 'Housework/fieldwork' },
    { value: '655f470e-977f-11e1-8993-905e29aff6c1', label: 'Retired' },
    { value: '656414a0-977f-11e1-8993-905e29aff6c1', label: 'Too sick to work' },
    { value: '65641298-977f-11e1-8993-905e29aff6c1', label: 'School age but not in school' },
    { value: '6564139c-977f-11e1-8993-905e29aff6c1', label: 'Driver' },
    { value: '65659190-977f-11e1-8993-905e29aff6c1', label: 'Professional' },
    { value: '65659082-977f-11e1-8993-905e29aff6c1', label: 'Employed' },
    { value: '656cce7e-977f-11e1-8993-905e29aff6c1', label: 'Other' },
    { value: UNKNOWN, label: 'Unknown' },
  ],
};

/** chronic-lung-disease-visit.xml (ASTHMA_FOLLOWUP encounter) */
export const CLD_VISIT = {
  /** Boolean */
  plannedVisit: '6558913e-977f-11e1-8993-905e29aff6c1',
  height: '6569c562-977f-11e1-8993-905e29aff6c1',
  weight: '6569c44a-977f-11e1-8993-905e29aff6c1',
  /** Times a week */
  daySymptoms: '257fb56c-8c34-11e5-80a3-c0430f805837',
  nightSymptoms: '53e5e188-8c34-11e5-80a3-c0430f805837',
  /** Beta-agonist inhaler use, by how often it is counted */
  inhalerPerDay: '79a37b88-8c34-11e5-80a3-c0430f805837',
  inhalerPerWeek: 'baf99a7c-8c34-11e5-80a3-c0430f805837',
  inhalerPerMonth: 'b60d8d98-8c34-11e5-80a3-c0430f805837',
  inhalerPerYear: 'af73fa84-8c35-11e5-80a3-c0430f805837',
  steroidDaily: '359808c6-8c36-11e5-80a3-c0430f805837',
  /** Cigarettes a day */
  cigarettes: '656fe064-977f-11e1-8993-905e29aff6c1',
  passiveSmoking: 'e51be8fa-8c34-11e5-80a3-c0430f805837',
  /** The form's Indoor cooking: Indoors saved for Yes, Outdoors for No */
  cooking: '94498de6-6ea7-441f-8d79-d2ef3c3df30f',
  indoorCookingAnswers: [
    { value: '655f3dcc-977f-11e1-8993-905e29aff6c1', label: 'Yes' },
    { value: '655f3ed0-977f-11e1-8993-905e29aff6c1', label: 'No' },
  ],
  exacerbation: '2198f6d8-8c35-11e5-80a3-c0430f805837',
  asthmaSeverity: 'e31e65ff-8523-4d49-a5b0-276a0760966f',
  severities: [
    { value: 'dcbd27b0-4ca2-4a93-9d8a-89f1cbe761ed', label: 'Intermittent' },
    { value: 'e865c314-a0cf-4431-ba73-aa9280e2fa71', label: 'Mild persistent' },
    { value: '5fd72021-54af-4630-b72b-829421d2d65b', label: 'Moderate persistent' },
    { value: 'ac3d4d70-4145-4dec-a4bb-ea8136dff4e6', label: 'Severe persistent' },
    { value: 'a863ffd7-2806-4b2d-8d7c-d6709d106488', label: 'Severe uncontrolled' },
  ],
  /** Ticked as the visit's diagnosis, COPD */
  diagnosis: '65671c9a-977f-11e1-8993-905e29aff6c1',
  /** Text */
  otherDiagnosis: '65780d0c-977f-11e1-8993-905e29aff6c1',
  /** The dose units the form offers, puffs first */
  doseUnits: [
    { value: '162372aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'puff(s)' },
    { value: '161553aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'mg' },
    { value: '162263aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'mL' },
    { value: '6569265c-977f-11e1-8993-905e29aff6c1', label: 'capsule' },
    { value: '656921d4-977f-11e1-8993-905e29aff6c1', label: 'tablet' },
  ],
  /** In the form's order, each in a dispensing group as the other NCD visits' are; "Other" is named in free text */
  medications: [
    {
      key: 'betaAgonist',
      drug: '60ae316c-c15f-11e5-9912-ba0be0483c18',
      label: 'Inhaled B-agonist',
      short: 'B-agonist',
      name: 'Inhaled beta-agonist',
    },
    { key: 'inhaledSteroid', drug: '60ae3554-c15f-11e5-9912-ba0be0483c18', label: 'Inhaled steroid', short: 'Inh steroid', name: 'Inhaled steroid' },
    { key: 'oralSteroid', drug: '60ae373e-c15f-11e5-9912-ba0be0483c18', label: 'Oral steroid', short: 'Oral steroid', name: 'Oral steroid' },
    { key: 'other', drug: '657140f8-977f-11e1-8993-905e29aff6c1', label: 'Other', short: 'Other', name: 'Other' },
  ],
  comments: '655928e2-977f-11e1-8993-905e29aff6c1',
  nextAppointment: '6569cbd4-977f-11e1-8993-905e29aff6c1',
};

/** chronic-lung-disease-peak-flow.xml */
export const CLD_PEAK_FLOW = {
  /** Numeric, whole */
  result: '65795c2a-977f-11e1-8993-905e29aff6c1',
};
