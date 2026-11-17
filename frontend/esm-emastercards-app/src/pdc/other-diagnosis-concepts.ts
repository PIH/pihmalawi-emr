import { type CardForm } from '../art/obs-diff';

/**
 * The PDC Other Diagnosis eMastercard's forms and the concepts they save, copied from
 * pdc-other-diagnosis-emastercard.xml, other-diagnosis-visit.xml and pdc-hb-and-other-laboratory-tests.xml (UUIDs
 * lower-cased). The questions it shares with the HIE / developmental delay visit (growth, treatment, the plan, MDAT,
 * referral out, the next appointment) save the same concepts.
 */

export const OTHER_DIAGNOSIS_CARD_KEY = 'pdc-other-diagnosis';

/** The paper card's version (the visit form's "Version 2"), which the page names under its title */
export const OTHER_DIAGNOSIS_CARD_VERSION = '2';

/**
 * By encounter type, as the other PDC condition cards are matched. The lab form, pdc-hb-and-other-laboratory-tests.xml,
 * is the cleft lip / palate card's too: as on the legacy cards, a lab test recorded on either shows on both.
 */
export const OTHER_DIAGNOSIS_FORMS: Record<'header' | 'visit' | 'labs', CardForm> = {
  header: { encounterType: '0a2f1f74-2400-4cfd-8a9e-d2141622c6d8', form: '0a2f1f74-2400-4cfd-8a9e-d2141622c6d8' },
  visit: { encounterType: '60bfcb32-486a-11ec-81d3-0242ac130003', form: '9dcf3c16-486e-11ec-81d3-0242ac130003' },
  labs: { encounterType: '366e8c89-2ad0-4fdc-a8fe-e39435b11331', form: '5a58b99f-b57e-45ed-b6f1-5b4d1e3a37e4' },
};

/** other-diagnosis-visit.xml's questions the HIE / developmental delay visit doesn't ask (PDC_OTHER_DIAGNOSIS_FOLLOWUP encounter) */
export const OTHER_DIAGNOSIS_VISIT = {
  /** Numeric, whole numbers */
  ageAdjusted: '655e54a2-977f-11e1-8993-905e29aff6c1',
  ageNonAdjusted: '6566247a-977f-11e1-8993-905e29aff6c1',
  complicationsSinceLastVisit: 'e384a58c-4a73-11ec-81d3-0242ac130003',
  /** cm, whole numbers */
  headCircumference: '656b0c38-977f-11e1-8993-905e29aff6c1',
  /** Any convulsions since the last visit */
  convulsionsSinceLastVisit: 'a2d8ba82-cbc5-4fbb-983a-48f46b1b2936',
  /** Feeding concerns, each Yes/No */
  feedingConcerns: [
    { key: 'poorSuck', concept: '7e63f69b-b515-4cef-bd64-4a2056e1dc5d', label: 'Poor suck' },
    { key: 'refusesToFeed', concept: '6019736c-9e55-49a2-8a37-7a2985fb03a5', label: 'Refuses to feed' },
    { key: 'feedsLess', concept: 'd6dd0f8c-2a90-41d7-8e53-9b36f0a758ee', label: 'Feeds less' },
  ],
  groupCounselling: 'cef3471e-eb0a-4b14-b402-9b24742e3869',
  /** Text: the visit's plan (the form's Comments) */
  planNotes: '655928e2-977f-11e1-8993-905e29aff6c1',
};
