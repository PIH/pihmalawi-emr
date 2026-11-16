import { type Option } from '../art/art-fields';
import { type CardForm } from '../art/obs-diff';
import { NO, YES } from './pdc-concepts';

/**
 * The HIE / Developmental Delay eMastercard's forms and the concepts they save, copied from
 * pdc-developmental-delay-emastercard.xml, developmental-delay-visit.xml and hie-developmental-delay-lab-tests.xml
 * (UUIDs lower-cased, as the other cards keep them). Its patient and guardian questions are the NCD headers'
 * (shared/ncd.ts).
 */

/** The eMastercards endpoint's key for this card */
export const HIE_CARD_KEY = 'pdc-developmental-delay';

/** The paper card's version (the visit form's "Version 2"), which the page names under its title */
export const HIE_CARD_VERSION = '2';

export type HieForm = 'header' | 'visit' | 'labs';

/**
 * Matched to native panels by encounter type: the cleft lip / palate visit form's UUID is this visit's encounter
 * type's, so a form UUID can't tell them apart
 */
export const HIE_FORMS: Record<HieForm, CardForm> = {
  header: { encounterType: '3aa5f5fa-a0aa-49bc-b715-1c1dd68e72d4', form: '40917486-dd3d-4bd7-a87d-7d5cd5964519' },
  visit: { encounterType: '64148b3f-f732-4809-9a23-8b8ebe11279a', form: '77c15a12-2809-4abd-8755-5b7cfcad1f25' },
  labs: { encounterType: '89cd6ba9-cb92-416c-bc7e-446764344aa1', form: '5b72263d-ce02-4857-86e2-945754d0a8a8' },
};

/** pdc-developmental-delay-emastercard.xml's Patient Overview: Suspected and Confirmed, each in a Genetic Syndrome group of its own */
export const HIE_HEADER = {
  geneticSyndromeGroup: '77f4ecbc-b6bd-4caf-b956-15f01f613a1c',
  suspected: '7667e58e-4332-4e83-bd85-0490bcb394fb',
  confirmed: 'd6e34dbf-55e9-49a3-bf00-dbd9c9048609',
};

export const NORMAL = 'd34cf0b3-073c-4f4e-ac4c-1c1e8e4c9165';
export const MODERATE_MALNUTRITION = '65731d74-977f-11e1-8993-905e29aff6c1';
export const SEVERE_MALNUTRITION = 'a94e5963-f6b1-4c91-b676-48dfb370a1f8';

/** developmental-delay-visit.xml (PDC_DEVELOPMENTAL_DELAY_FOLLOWUP encounter) */
export const HIE_VISIT = {
  height: '6569c562-977f-11e1-8993-905e29aff6c1',
  weight: '6569c44a-977f-11e1-8993-905e29aff6c1',
  muac: '6558d09a-977f-11e1-8993-905e29aff6c1',
  /** Weight against age and weight against height: each a whole number in a group of its own */
  weightForAgeGroup: 'e3d43e73-c831-421a-bf77-7e35bd11678a',
  weightForHeightGroup: 'eaf64a61-4526-47b3-b8e2-be402c8568f2',
  numericValue: '7ba4b6f9-f99e-4c1f-9beb-a6ccaf04a8ca',
  malnutrition: '657a2268-977f-11e1-8993-905e29aff6c1',
  malnutritionAnswers: [
    { value: NO, label: 'No' },
    { value: MODERATE_MALNUTRITION, label: 'Moderate' },
    { value: SEVERE_MALNUTRITION, label: 'Severe' },
  ] as Array<Option>,
  /** The Malawi Developmental Assessment Tool's summary: whether it is normal */
  mdatSummary: '99c7a129-5d96-4825-b8ef-eff5fa6e7727',
  /** Normal, Hypo and Hyper, each asked Yes/No in a Tone set group of its own */
  toneGroup: '26ddb016-ae2f-43ed-a177-f0c26dd40392',
  tone: [
    { key: 'toneNormal', concept: NORMAL, label: 'Normal' },
    { key: 'toneHypo', concept: '4bdff377-bec0-444c-b3de-00dbe4ba4b45', label: 'Hypo' },
    { key: 'toneHyper', concept: '2a500878-8f72-4527-a165-339b4548e9d4', label: 'Hyper' },
  ],
  /** Sucking, cup and tube, each asked Yes/No in a Feeding set group of its own */
  feedingGroup: '5af3740e-c1a1-4e86-a87e-280817bbde0b',
  feeding: [
    { key: 'feedingSucking', concept: '657a289e-977f-11e1-8993-905e29aff6c1', label: 'Sucking' },
    { key: 'feedingCup', concept: '4f3e0805-3059-4226-abcd-6100cddd9543', label: 'Cup' },
    { key: 'feedingTube', concept: 'fe7d2795-3cfe-47fa-933c-cb8e9b1c42d5', label: 'Tube' },
  ],
  signsOfCerebralPalsy: '06debeb7-4dcd-4eb0-a954-1d4a18760559',
  underMentalHealthCare: '3790bbe2-13b3-45b4-94d1-a9719f5ac51d',
  anticonvulsants: '5c0cda83-99c2-4d33-8e70-74d4b95b1265',
  /** Text: the drug and dose */
  medicationDispensed: '65617506-977f-11e1-8993-905e29aff6c1',
  doseAdjusted: '9ad80dac-4656-4315-8045-bb4ec92373f2',
  /** The plan, each asked Yes/No, in the form's order */
  plan: [
    { key: 'continueFollowUp', concept: '696c6ade-1f06-40d1-aadd-4c2b257167db', label: 'Continue follow-up' },
    { key: 'physiotherapy', concept: 'dcc54588-806f-4bb9-b281-25215b07053d', label: 'Physiotherapy' },
    { key: 'individualCounselling', concept: '480e00e5-d428-45f1-b819-413fe5faeac0', label: 'Individual counselling' },
    { key: 'feedingCounselling', concept: 'f17754f9-c3f8-40d0-a9aa-903737a98f86', label: 'Feeding counselling' },
    { key: 'playTherapy', concept: '47729d48-1ab6-4c27-86fe-4700d734909d', label: 'Play therapy and group counselling' },
    { key: 'referredToPoser', concept: '977c1d68-6ffa-46d5-ae89-00404e8b5904', label: 'Referred to POSER support' },
  ],
  /** Referred out (Yes/No) and what for, in a Referred Out set group */
  referredOutGroup: 'a4dfe545-8a85-41ca-ac47-b372b681391f',
  referredOut: 'da88696b-bf1d-4a31-b49d-997326e4a777',
  /** Text, in both referral groups */
  otherText: 'd57e3a20-5802-11e6-8b77-86f30ca893d3',
  /** Where to (the same Referred out concept, answered Tertiary or Palliative care) and any other, in a Source of Referral set group */
  referredToGroup: 'b5346c8a-246c-46aa-bce5-17a77534bc30',
  referredToAnswers: [
    { value: 'be50b470-9744-4f04-b9a8-bad7b4b239ea', label: 'Tertiary care' },
    { value: 'd69886ae-5eda-40ab-b2df-6ea9794a30d5', label: 'Palliative care' },
  ] as Array<Option>,
  nextAppointment: '6569cbd4-977f-11e1-8993-905e29aff6c1',
  yes: YES,
  no: NO,
};

/** hie-developmental-delay-lab-tests.xml */
export const HIE_LABS = {
  /** g/dL, on the date the form asks with it */
  hb: '6545ab32-977f-11e1-8993-905e29aff6c1',
  /** The TSH result construct: its date, whether it was done and whether the result was normal */
  tshGroup: '4e062c22-bb8d-4684-ba1e-a1f8e476a4e2',
  tshDate: '656fa234-977f-11e1-8993-905e29aff6c1',
  tshDone: '584fbc24-9eda-4db4-93d2-30b77067a5c6',
  tshNormal: NORMAL,
  /** The other lab test construct: its date, the test and the result, as text */
  otherTestGroup: '655dfa20-977f-11e1-8993-905e29aff6c1',
  otherTestDate: '6563b668-977f-11e1-8993-905e29aff6c1',
  otherTestType: '655dfb24-977f-11e1-8993-905e29aff6c1',
  otherTestResult: '655dfc32-977f-11e1-8993-905e29aff6c1',
};
