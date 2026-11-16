import { type ArtField, type Option } from '../art/art-fields';
import { type CardForm } from '../art/obs-diff';
import { question } from '../shared/ncd';
import { YES_NO } from './pdc-concepts';

/**
 * The forms every PDC condition card (HIE / developmental delay, trisomy 21, cleft lip / palate, other diagnosis)
 * shares, as EMastercardRegistry's PDC_COMMON_FLOWSHEETS lists them: pdc-hospitalization-history.xml,
 * pdc-complications.xml, vision-test.xml, pdc-hearing-test.xml and pdc-radiology-screening.xml (UUIDs lower-cased).
 * Each is the patient's, not one card's: every condition card shows the same encounters.
 */

export type PdcSharedForm = 'hospitalisation' | 'complications' | 'vision' | 'hearing' | 'radiology';

export const PDC_SHARED_FORMS: Record<PdcSharedForm, CardForm> = {
  hospitalisation: { encounterType: '1b78a770-4d28-11ec-81d3-0242ac130003', form: '7fe38b76-4d28-11ec-81d3-0242ac130003' },
  complications: { encounterType: '98f13fb0-5024-11ec-bf63-0242ac130002', form: '1a92f8a6-51f1-11ec-bf63-0242ac130002' },
  vision: { encounterType: '5595afb1-93fb-4620-bd6d-9f509acfddde', form: '913d57e8-8530-444e-92f0-651d3c90a37c' },
  hearing: { encounterType: '4dae2743-e48e-4232-bf4e-d6c7ed7fad81', form: 'fd447c8b-3039-497a-b238-6755e7107064' },
  radiology: { encounterType: '5e46e6fa-1d33-44f7-88f5-38d4d8dbe0c2', form: '5ef02404-3cb2-445e-8ce1-dac5c3ab42f8' },
};

const PASS_FAIL: Array<Option> = [
  { value: '20f6787b-3f0e-4c98-91c2-ee34f771f3ff', label: 'Pass' },
  { value: 'a2a69a69-ecc7-450f-952e-bc8830aaabe7', label: 'Fail' },
];

export const PDC_SHARED = {
  /** Hospitalisation: its encounter date is the date of admission */
  dischargeDate: '6567df54-977f-11e1-8993-905e29aff6c1',
  /** Shown by the old flowsheet, never asked by the form */
  lengthOfStay: '656170f6-977f-11e1-8993-905e29aff6c1',
  admissionReason: '162879aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  dischargeDiagnosis: '0ed9abe4-b982-11e5-9912-ba0be0483c18',
  dischargeMedications: '316bc014-ba1f-11e5-9912-ba0be0483c18',
  complicationDate: '5f5213e4-cf63-11e5-ab30-625662870761',
  selfReportedComplication: 'e384a58c-4a73-11ec-81d3-0242ac130003',
  complicationDetails: '86eacb84-51ea-11ec-bf63-0242ac130002',
  visionResult: '522849a5-be77-41b2-98e4-a755096df7ed',
  /** Referred out, Yes/No, in a Referred Out set group */
  referredOutGroup: 'a4dfe545-8a85-41ca-ac47-b372b681391f',
  referredOut: 'da88696b-bf1d-4a31-b49d-997326e4a777',
  leftEar: '44ed8c4c-abfd-4527-819b-457cb3b5c76a',
  rightEar: '65d881c2-4e5d-4837-959e-0f097fcb93e7',
  /** Text */
  echoResult: '1995a751-6f80-49f5-bc89-5cc6ae767eff',
  otherResults: '655dfc32-977f-11e1-8993-905e29aff6c1',
  passFail: PASS_FAIL,
};

const S = PDC_SHARED;

/** Each form's questions, as its data entry view asks them; dates refuse the future unless the form allows it */
export const PDC_SHARED_FIELDS: Record<PdcSharedForm, Array<ArtField>> = {
  hospitalisation: [
    { name: 'dischargeDate', concept: S.dischargeDate, kind: 'date', label: 'Date of discharge', future: true },
    { name: 'admissionReason', concept: S.admissionReason, kind: 'text', label: 'Reason for admission' },
    { name: 'dischargeDiagnosis', concept: S.dischargeDiagnosis, kind: 'text', label: 'Discharge diagnosis' },
    { name: 'dischargeMedications', concept: S.dischargeMedications, kind: 'text', label: 'Discharge medications' },
  ],
  complications: [
    { name: 'complicationDate', concept: S.complicationDate, kind: 'date', label: 'Date of complication' },
    question('selfReportedComplication', S.selfReportedComplication, 'Self-reported complication', YES_NO),
    { name: 'complicationDetails', concept: S.complicationDetails, kind: 'text', label: 'Details of complication' },
  ],
  vision: [
    question('visionResult', S.visionResult, 'Test result', PASS_FAIL),
    { ...question('referredOut', S.referredOut, 'Referred out', YES_NO), group: { concept: S.referredOutGroup } },
  ],
  hearing: [question('leftEar', S.leftEar, 'Left ear', PASS_FAIL), question('rightEar', S.rightEar, 'Right ear', PASS_FAIL)],
  radiology: [
    { name: 'echoResult', concept: S.echoResult, kind: 'text', label: 'Echo results' },
    { name: 'otherResults', concept: S.otherResults, kind: 'text', label: 'Other results' },
  ],
};

/** The length of stay older hospitalisations may hold: shown in the table, never asked (so never voided) */
export const LENGTH_OF_STAY: ArtField = { name: 'lengthOfStay', concept: S.lengthOfStay, kind: 'number', label: 'Length of stay', unit: 'days' };

/** Each form's title, and the label of its encounter date */
export const PDC_SHARED_TITLES: Record<PdcSharedForm, { title: string; date: string; record: string; edit: string }> = {
  hospitalisation: { title: 'Hospitalisation History', date: 'Date of admission', record: 'Record hospitalisation', edit: 'Edit hospitalisation' },
  complications: { title: 'Complications', date: 'Visit date', record: 'Record complication', edit: 'Edit complication' },
  vision: { title: 'Vision Test', date: 'Date', record: 'Record vision test', edit: 'Edit vision test' },
  hearing: { title: 'Hearing Test', date: 'Date', record: 'Record hearing test', edit: 'Edit hearing test' },
  radiology: { title: 'Radiology Screening', date: 'Date', record: 'Record radiology screening', edit: 'Edit radiology screening' },
};

export const PDC_SHARED_FORM_KEYS = Object.keys(PDC_SHARED_FORMS) as Array<PdcSharedForm>;

/** The shared form an encounter was saved by, by its encounter type; else null */
export function pdcSharedFormOf(encounter: { encounterType?: { uuid: string } | null }): PdcSharedForm | null {
  const type = encounter.encounterType?.uuid?.toLowerCase();
  return PDC_SHARED_FORM_KEYS.find((k) => PDC_SHARED_FORMS[k].encounterType === type) ?? null;
}
