import { type CardForm } from '../art/obs-diff';

/**
 * The Cleft Lip / Palate eMastercard's forms and the concepts they save, copied from
 * pdc-cleft-lip-palate-emastercard.xml, cleft-lip-palate-visit.xml and pdc-hb-and-other-laboratory-tests.xml (UUIDs
 * lower-cased). The questions it shares with the HIE / developmental delay visit (growth, MDAT, referral out, the next
 * appointment) save the same concepts; its plan's do not all (see CLEFT_VISIT).
 */

export const CLEFT_CARD_KEY = 'pdc-cleft-lip-palate';

/** The paper card's version (the visit form's "Version 2"), which the page names under its title */
export const CLEFT_CARD_VERSION = '2';

/**
 * By encounter type, as the other PDC condition cards are matched: this visit's form UUID is the HIE visit's
 * encounter type's. The lab form, pdc-hb-and-other-laboratory-tests.xml, is the other diagnosis card's too.
 */
export const CLEFT_FORMS: Record<'header' | 'visit' | 'labs', CardForm> = {
  header: { encounterType: 'dbfc3984-6466-4ce0-a53f-fa646d74c41f', form: '74f4b94e-855a-4154-abb7-75256aefb00f' },
  visit: { encounterType: 'cfca0af9-86c9-4717-83b7-74e61f1a7bbf', form: '64148b3f-f732-4809-9a23-8b8ebe11279a' },
  labs: { encounterType: '366e8c89-2ad0-4fdc-a8fe-e39435b11331', form: '5a58b99f-b57e-45ed-b6f1-5b4d1e3a37e4' },
};

/** pdc-cleft-lip-palate-emastercard.xml's Patient Overview: facial abnormalities, in one Facial set group */
export const CLEFT_HEADER = {
  facialGroup: 'a4f0ade3-6f74-4e2d-8f96-9383dcf1b858',
  smallJaw: '7a138236-764e-479e-9723-1a0bf01dadce',
  other: '8797110a-d38e-427f-a08f-260300c8c896',
  /** Text */
  otherSpecify: 'd57e3a20-5802-11e6-8b77-86f30ca893d3',
};

/** cleft-lip-palate-visit.xml (PDC_CLEFT_CLIP_PALLET_FOLLOWUP encounter) */
export const CLEFT_VISIT = {
  feedingProblems: 'd7ce3c38-2844-4f46-9dfe-395738b056aa',
  difficultBreathing: '49ab956b-ef54-427a-b0bb-440c47164012',
  heartMurmur: 'aec2dff8-9e02-4962-802b-af3cd03e1d96',
  /** Ear pain and discharge, each in an Ear set group of its own (as the trisomy 21 visit saves them) */
  earGroup: '99fd40e3-b255-455a-ad7b-70b64bea4a3f',
  ear: [
    { key: 'earPain', concept: 'e26e1f17-0bf5-4600-801c-16e23180d60e', label: 'Ear pain' },
    { key: 'earDischarge', concept: 'a9fb94ba-b3a9-4d2a-98e4-53bf19dff3d5', label: 'Ear discharge' },
  ],
  /** Another problem, Yes/No (not the header's Other) */
  other: '58e9b7e1-8e7b-4ece-823f-903bf66d7bf6',
  /** Whether surgery is scheduled, and its date, which may be in the future, in a Surgery set group */
  surgeryGroup: '1e225eaa-d88e-41d6-b032-fc2c3c7c7ee6',
  surgeryScheduled: '09270f6c-9bf3-4715-8d36-d5a985fbc301',
  surgeryDate: '65634228-977f-11e1-8993-905e29aff6c1',
  /**
   * The recommendations and plans, each Yes/No, in the form's order. Its Feeding counselling saves the concept the HIE
   * visit's Individual counselling does, its Food supplement the HIE visit's Feeding counselling, and its Individual
   * counselling and POSER concepts of their own
   */
  plan: [
    { key: 'continueFollowUp', concept: '696c6ade-1f06-40d1-aadd-4c2b257167db', label: 'Continue follow-up' },
    { key: 'groupTherapy', concept: '5ccb82d9-1d0e-4331-a9cc-0a6d6f51322a', label: 'Group therapy' },
    { key: 'foodSupplement', concept: 'f17754f9-c3f8-40d0-a9aa-903737a98f86', label: 'Food supplement' },
    { key: 'individualCounselling', concept: 'cef3471e-eb0a-4b14-b402-9b24742e3869', label: 'Individual counselling' },
    { key: 'feedingCounselling', concept: '480e00e5-d428-45f1-b819-413fe5faeac0', label: 'Feeding counselling' },
  ],
  poser: '5b49fbf4-2645-4ab2-974e-4e6c961162b1',
  /** Text: the visit's plan */
  planNotes: '655928e2-977f-11e1-8993-905e29aff6c1',
};
