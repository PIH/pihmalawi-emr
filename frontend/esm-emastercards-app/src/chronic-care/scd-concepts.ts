import { type CardForm } from '../art/obs-diff';

/**
 * The Sickle Cell Disease eMastercard's forms and the concepts they save, copied from sickle-cell-disease-emastercard.xml,
 * -visit.xml, -quarterly-screening.xml, -annual-monitoring.xml and -hospitalization-history.xml (UUIDs lower-cased, as
 * REST returns them). Its patient and guardian questions are the NCD headers' (shared/ncd.ts), and its hospitalisations
 * save what the hypertension and diabetes card's do.
 */

/** The eMastercards endpoint's key for this card */
export const SCD_CARD_KEY = 'scd';

/** The paper card's version (the forms' "Version 1"), which the page names under its title */
export const SCD_CARD_VERSION = '1';

export type ScdForm = 'header' | 'visit' | 'quarterlyScreening' | 'annualMonitoring' | 'hospitalisation';

export const SCD_FORMS: Record<ScdForm, CardForm> = {
  header: { encounterType: '56c2d952-db11-4b47-b248-79c1b2a88e88', form: '7afec71b-15d3-4e2d-8c42-d8cb2b75bc54' },
  visit: { encounterType: 'd4073eb7-60b1-4586-b062-13fce4cbc9e8', form: 'e68275d4-c300-46b0-8754-4c2cf2598b78' },
  quarterlyScreening: { encounterType: '119a7061-abc7-4759-88bf-086adc8ebb80', form: '66cb607a-85a3-4939-897e-8b3473abe674' },
  annualMonitoring: { encounterType: '0c0cfad6-0f92-4b19-8b6a-675005be7f86', form: '37744503-6e86-4f2c-9941-f9944ab6f69d' },
  hospitalisation: { encounterType: 'ad864eb5-7042-4080-ae81-e0a4cf8ced43', form: '9fd4b1d3-fffb-4a4a-b626-976be1ee0519' },
};

const YES = '65576354-977f-11e1-8993-905e29aff6c1';
const NO = '6557646c-977f-11e1-8993-905e29aff6c1';
const UNKNOWN = '65576584-977f-11e1-8993-905e29aff6c1';

/** sickle-cell-disease-emastercard.xml, the card header (SICKLE_CELL_DISEASE_INITIAL encounter) */
export const SCD_HEADER = {
  /** Saved with every card, as the form's hidden checkbox does: the card's diagnosis, sickle cell disease, and its date */
  diagnosisGroup: '6db168f1-0f38-42d9-9f0e-90946a3d8e72',
  diagnosis: '65671c9a-977f-11e1-8993-905e29aff6c1',
  sickleCellDisease: '65774b06-977f-11e1-8993-905e29aff6c1',
  diagnosisDate: '65732bf2-977f-11e1-8993-905e29aff6c1',
  /** Each asked Yes/No, with its date, in the form's order */
  tests: [
    { key: 'microscopy', concept: 'd91e1b96-c342-4d0a-9e4c-91226987e22b', date: 'a90b4936-1d2d-464e-a1d4-aed11c822956', label: 'Microscopy' },
    { key: 'rapidTest', concept: 'cfccd5fb-f9dd-48b6-ab0c-c4ee78b4341d', date: '84d09dae-f6a8-4117-adae-4fb3b0c1d352', label: 'Rapid test' },
    {
      key: 'hbElectrophoresis',
      concept: 'fe8ce76a-021b-4ffa-a993-4362734be411',
      date: '2f7d5eef-9857-4f61-98af-1a928d2586d5',
      label: 'Hb electrophoresis',
    },
  ],
  /** Family history, each asked Yes/No/Unknown */
  parent: 'adfee692-442e-4e36-8fac-b6ca4249c6b8',
  sibling: '76bfbe9a-9f7c-44aa-85af-d2d5f08e4baa',
  /** The reasons for referral: In-patient, IC3 and OPD on their own, Other in a group with what it was */
  referral: '98b17e13-659f-41e7-8459-b370fdbffe0f',
  referrals: [
    { value: '656fc048-977f-11e1-8993-905e29aff6c1', label: 'In-patient' },
    { value: '3064bcf8-56f7-43c9-a8cf-d90d42eef739', label: 'IC3' },
    { value: '6578c9f4-977f-11e1-8993-905e29aff6c1', label: 'OPD' },
  ],
  referralGroup: '7a37ec7b-2804-46c8-be48-4707959192be',
  otherReferral: 'da88696b-bf1d-4a31-b49d-997326e4a777',
  /** Free text, what an Other referral was */
  nonCodedText: 'd57e3a20-5802-11e6-8b77-86f30ca893d3',
  yes: YES,
  no: NO,
  unknown: UNKNOWN,
};

/** sickle-cell-disease-visit.xml (SICKLE_CELL_DISEASE_FOLLOWUP encounter); its weight change and GFR are commented out */
export const SCD_VISIT = {
  height: '6569c562-977f-11e1-8993-905e29aff6c1',
  weight: '6569c44a-977f-11e1-8993-905e29aff6c1',
  /** Numeric: BMI or MUAC */
  bmiMuac: '655d615a-977f-11e1-8993-905e29aff6c1',
  systolicBp: '6569bffe-977f-11e1-8993-905e29aff6c1',
  diastolicBp: '6569c116-977f-11e1-8993-905e29aff6c1',
  heartRate: '6569c224-977f-11e1-8993-905e29aff6c1',
  /** Whole g/dL */
  haemoglobin: '657a745c-977f-11e1-8993-905e29aff6c1',
  spo2: '6569c792-977f-11e1-8993-905e29aff6c1',
  temperature: '6569c33c-977f-11e1-8993-905e29aff6c1',
  /** Each asked Yes/No, in the form's order and with its labels (its Medication Rx saves the Malaria concept) */
  findings: [
    { key: 'hospitalised', concept: '655b3dc6-977f-11e1-8993-905e29aff6c1', label: 'Hospitalised since last visit for SCD' },
    { key: 'schoolAbsence', concept: '839054d3-4faf-4e66-88e0-cfbafaf48131', label: 'Absence from school' },
    { key: 'pain', concept: 'e26e1f17-0bf5-4600-801c-16e23180d60e', label: 'Pain' },
    { key: 'fever', concept: '65637fa4-977f-11e1-8993-905e29aff6c1', label: 'Fever' },
    { key: 'malariaRx', concept: '65461b8a-977f-11e1-8993-905e29aff6c1', label: 'Medication Rx' },
    { key: 'antibioticsRx', concept: '6575888e-977f-11e1-8993-905e29aff6c1', label: 'Antibiotics Rx' },
    { key: 'sideEffects', concept: 'd046e48d-7eda-4a6f-b583-c13281d9640e', label: 'Medication side effects' },
    { key: 'jaundice', concept: '6546d462-977f-11e1-8993-905e29aff6c1', label: 'Jaundice' },
    { key: 'irregularConjunctiva', concept: '1ecf325d-a9ce-4a68-9f00-393ba47fa2e9', label: 'Irregular conjunctiva' },
    { key: 'abnormalLungs', concept: '65639304-977f-11e1-8993-905e29aff6c1', label: 'Abnormal lungs exam' },
    { key: 'ascites', concept: '6548e7fc-977f-11e1-8993-905e29aff6c1', label: 'Ascites' },
    { key: 'enlargedSpleen', concept: '96c94222-94fa-4514-b952-adf429643c2e', label: 'Enlarged spleen' },
    { key: 'enlargedLiver', concept: '5c05bcc5-a25e-4e36-98ef-579060c4c460', label: 'Enlarged liver' },
  ],
  /** In the form's order, each in a dispensing group as the other NCD visits' are */
  medications: [
    { key: 'sp', drug: '65478970-977f-11e1-8993-905e29aff6c1', label: 'Malaria prophylaxis (SP)', short: 'SP', name: 'Sulfalene and pyrimethamine' },
    { key: 'folicAcid', drug: '6547162a-977f-11e1-8993-905e29aff6c1', label: 'Folic acid (FCD)', short: 'FCD', name: 'Folic acid' },
    { key: 'hydroxyurea', drug: 'e1742ab7-b110-4378-8718-50933c4cfd7c', label: 'Hydroxyurea (HYD)', short: 'HYD', name: 'Hydroxyurea' },
    {
      key: 'benzathinePcn',
      drug: '656930ac-977f-11e1-8993-905e29aff6c1',
      label: 'Benzathine penicillin (BZN)',
      short: 'BZN',
      name: 'Benzathine penicillin',
    },
    { key: 'other', drug: '657140f8-977f-11e1-8993-905e29aff6c1', label: 'Other', short: 'Other', name: 'Other' },
  ],
  /** Text: what an Other medication was, in the visit's Other medication concept as the kidney visit's is */
  otherMedication: 'c8a4d207-0a73-4471-955c-c1f47cbbe2b5',
  nextAppointment: '6569cbd4-977f-11e1-8993-905e29aff6c1',
  yes: YES,
  no: NO,
};

/** sickle-cell-disease-quarterly-screening.xml */
export const SCD_QUARTERLY_SCREENING = {
  hivStatus: '6567ae62-977f-11e1-8993-905e29aff6c1',
  hivStatuses: [
    { value: '65587802-977f-11e1-8993-905e29aff6c1', label: 'Reactive' },
    { value: '6558791a-977f-11e1-8993-905e29aff6c1', label: 'Non-reactive' },
    { value: UNKNOWN, label: 'Unknown' },
  ],
  /** The FBC, as the form labels its answers (haemoglobin, white blood cells and ESR) */
  fbc: '65475504-977f-11e1-8993-905e29aff6c1',
  fbcAnswers: [
    { value: '657a745c-977f-11e1-8993-905e29aff6c1', label: 'Wbc' },
    { value: '6549a3b8-977f-11e1-8993-905e29aff6c1', label: 'Plt' },
    { value: '65659f28-977f-11e1-8993-905e29aff6c1', label: 'Rates' },
  ],
};

/** sickle-cell-disease-annual-monitoring.xml */
export const SCD_ANNUAL_MONITORING = {
  creatinine: '657170a0-977f-11e1-8993-905e29aff6c1',
  alt: '65497014-977f-11e1-8993-905e29aff6c1',
  ast: '6549656a-977f-11e1-8993-905e29aff6c1',
  /** Whole mg/dL */
  totalBilirubin: '65497942-977f-11e1-8993-905e29aff6c1',
  directBilirubin: '6566eb12-977f-11e1-8993-905e29aff6c1',
  indirectBilirubin: '7aa2e05d-d9f4-49ab-b340-11ebb1f48120',
};
