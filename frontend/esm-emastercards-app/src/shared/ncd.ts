import dayjs from 'dayjs';
import { NO, YES } from '../art/art-concepts';
import { type ArtField, type Option } from '../art/art-fields';
import { type RuleResult } from '../art/art-rules';
import { type FieldValue } from '../art/obs-diff';
import { leaderOf } from '../mental-health/grouped-fields';

/**
 * What the NCD eMastercards (hypertension and diabetes, chronic lung disease, ...) have in common: their headers'
 * patient and guardian, HIV and TB questions, their diagnoses and exposures each in a dated obs group, and their rules
 */

export const UNKNOWN = '65576584-977f-11e1-8993-905e29aff6c1';

export const YES_NO: Array<Option> = [
  { value: YES, label: 'Yes' },
  { value: NO, label: 'No' },
];
export const YES_NO_UNKNOWN: Array<Option> = [...YES_NO, { value: UNKNOWN, label: 'Unknown' }];

export const question = (name: string, concept: string, label: string, options: Array<Option>): ArtField => ({
  name,
  concept,
  kind: 'coded',
  label,
  options,
});

/** The NCD headers' shared concepts */
export const NCD_HEADER = {
  transferInDate: '6559bc30-977f-11e1-8993-905e29aff6c1',
  /** Numeric, as the concept's datatype is */
  patientPhone: '6559ba14-977f-11e1-8993-905e29aff6c1',
  guardianName: '655bbc74-977f-11e1-8993-905e29aff6c1',
  guardianPhone: '65600cd4-977f-11e1-8993-905e29aff6c1',
  relationToPatient: '6558fd0e-977f-11e1-8993-905e29aff6c1',
  agreesToFollowUp: '655fc526-977f-11e1-8993-905e29aff6c1',
  chwRelationshipType: 'eb567be2-fda1-4746-9d51-833de8a7e81f',
  /** Each diagnosis ticked is its own group: the diagnosis and its date */
  diagnosisGroup: '6db168f1-0f38-42d9-9f0e-90946a3d8e72',
  diagnosis: '65671c9a-977f-11e1-8993-905e29aff6c1',
  diagnosisDate: '65732bf2-977f-11e1-8993-905e29aff6c1',
  hivStatus: '6567ae62-977f-11e1-8993-905e29aff6c1',
  reactive: '65587802-977f-11e1-8993-905e29aff6c1',
  nonReactive: '6558791a-977f-11e1-8993-905e29aff6c1',
  hivTestDate: '655bc9da-977f-11e1-8993-905e29aff6c1',
  artStartDate: '655f9eb6-977f-11e1-8993-905e29aff6c1',
  tbStatus: '65770db2-977f-11e1-8993-905e29aff6c1',
  /** The forms' answers and labels; their Unknown is labelled "never had TB" */
  tbStatuses: [
    { value: '655ddc20-977f-11e1-8993-905e29aff6c1', label: 'Smear positive' },
    { value: '655ddd24-977f-11e1-8993-905e29aff6c1', label: 'Smear negative' },
    { value: '655a49ac-977f-11e1-8993-905e29aff6c1', label: 'EPTB' },
    { value: UNKNOWN, label: 'Never had TB' },
  ],
  tbYear: '3237c2a0-ada3-11e5-bf7f-feff819cdc9f',
};

/** The Patient / Guardian Details every NCD header asks; the follow-up agreement is what the forms require */
export const NCD_PATIENT_GUARDIAN_FIELDS: Array<ArtField> = [
  { name: 'transferInDate', concept: NCD_HEADER.transferInDate, kind: 'date', label: 'Transfer-in date', future: true },
  { name: 'patientPhone', concept: NCD_HEADER.patientPhone, kind: 'number', label: 'Patient phone' },
  { name: 'guardianName', concept: NCD_HEADER.guardianName, kind: 'text', label: 'Guardian name' },
  { name: 'guardianPhone', concept: NCD_HEADER.guardianPhone, kind: 'text', label: 'Guardian phone' },
  { name: 'guardianRelation', concept: NCD_HEADER.relationToPatient, kind: 'text', label: 'Guardian relation to patient' },
  {
    name: 'agreesToFollowUp',
    concept: NCD_HEADER.agreesToFollowUp,
    kind: 'coded',
    label: 'Agrees to follow-up',
    required: true,
    options: [
      { value: NO, label: 'No' },
      { value: YES, label: 'Yes' },
    ],
  },
];

/** Whether the header shows the TB year: not for a patient who never had TB */
export const showsTbYear = (values: Record<string, FieldValue>) => String(values.tbStatus ?? '').toLowerCase() !== UNKNOWN;

/** The HIV and TB history every NCD header asks; the TB year only for a patient who has had TB */
export const NCD_HIV_TB_FIELDS: Array<ArtField> = [
  question('hivStatus', NCD_HEADER.hivStatus, 'HIV status', [
    { value: NCD_HEADER.reactive, label: 'Reactive' },
    { value: NCD_HEADER.nonReactive, label: 'Non-reactive' },
    { value: UNKNOWN, label: 'Unknown' },
  ]),
  { name: 'hivTestDate', concept: NCD_HEADER.hivTestDate, kind: 'date', label: 'HIV test date', future: true },
  { name: 'artStartDate', concept: NCD_HEADER.artStartDate, kind: 'date', label: 'ART start date', future: true },
  question('tbStatus', NCD_HEADER.tbStatus, 'TB', NCD_HEADER.tbStatuses),
  { name: 'tbYear', concept: NCD_HEADER.tbYear, kind: 'number', label: 'TB year', shownWhen: showsTbYear },
];

/**
 * A checkbox per answer, each with its date, in its own obs group, as the forms' diagnoses, complications and
 * exposures are; the forms require the date of each one ticked and, unless they allow it, refuse a future one
 */
export function datedGroups(
  prefix: string,
  groupConcept: string,
  answerConcept: string,
  dateConcept: string,
  answers: Array<{ key: string; answer: string; label: string }>,
  { future = false, heading }: { future?: boolean; heading?: string } = {},
): Array<ArtField> {
  return answers.flatMap((a, i) => {
    const group = { concept: groupConcept, match: { concept: answerConcept, value: a.answer } };
    const name = `${prefix}_${a.key}`;
    return [
      {
        name,
        concept: answerConcept,
        kind: 'coded' as const,
        label: a.label,
        checkbox: true,
        options: [{ value: a.answer, label: a.label }],
        group,
        ...(heading && i === 0 ? { heading } : {}),
      },
      { name: `${name}Date`, concept: dateConcept, kind: 'date' as const, label: `${a.label}: date`, future, group },
    ];
  });
}

const empty = (value: FieldValue) => value === null || value === undefined || value === '';

/**
 * The concepts' absolute limits (concepts.csv's absolute high and low), which the forms refuse a number outside of,
 * and whether they allow decimals, by the field name the NCD panels give them
 */
export const LIMITS: Record<string, { min?: number; max?: number; whole?: boolean }> = {
  height: { min: 10, max: 228 },
  weight: { min: 0, max: 250 },
  systolicBp: { min: 20, max: 250, whole: true },
  diastolicBp: { min: 0, max: 150, whole: true },
  pulse: { min: 0, max: 230, whole: true },
  spo2: { min: 30, max: 100, whole: true },
  hbA1c: { min: 2, max: 16 },
  fruitVegetables: { min: 0, whole: true },
  exercise: { min: 0, max: 7, whole: true },
  cvRisk: { min: 0, max: 100, whole: true },
  tbYear: { min: 1950, max: 2050, whole: true },
  daySymptoms: { whole: true },
  nightSymptoms: { whole: true },
  inhalerPerDay: { whole: true },
  inhalerPerWeek: { whole: true },
  inhalerPerMonth: { whole: true },
  inhalerPerYear: { whole: true },
  cigarettes: { whole: true },
  ageAtOnset: { whole: true },
  peakFlow: { whole: true },
  gfr: { whole: true },
  temperature: { min: 25, max: 43 },
  enrolmentAge: { whole: true },
  nvpStartAge: { whole: true },
  nvpDuration: { whole: true },
  cpt: { whole: true },
  birthWeight: { min: 0, max: 10000 },
  bmiMuac: { min: 0 },
  totalBilirubin: { whole: true },
  directBilirubin: { whole: true },
  indirectBilirubin: { whole: true },
  haemoglobin: { whole: true },
};

/** A number outside its concept's limits, or with decimals the concept doesn't allow */
export function checkRange(name: string, value: FieldValue): RuleResult {
  const limit = LIMITS[name];
  if (!limit || empty(value)) {
    return null;
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return { level: 'error', message: 'Must be a number' };
  }
  if (limit.whole && !Number.isInteger(n)) {
    return { level: 'error', message: 'Must be a whole number' };
  }
  const { min, max } = limit;
  if ((min !== undefined && n < min) || (max !== undefined && n > max)) {
    if (min !== undefined && max !== undefined) {
      return { level: 'error', message: `Must be between ${min} and ${max}` };
    }
    return { level: 'error', message: min !== undefined ? `Must be at least ${min}` : `Must be at most ${max}` };
  }
  return null;
}

/** Each named field's limit, as a panel shows it while the number is typed */
export const rangeRules = (values: Record<string, FieldValue>, names: Array<string>): Record<string, RuleResult> =>
  Object.fromEntries(names.map((n) => [n, checkRange(n, values[n])]));

/** Whether a field is asked, given the other answers: once its checkbox is ticked, and when its condition holds */
export function isAsked(field: ArtField, fields: Array<ArtField>, values: Record<string, FieldValue>) {
  const leader = leaderOf(field, fields);
  return (!leader || !!values[leader.name]) && (!field.shownWhen || field.shownWhen(values));
}

/** The answers with those of questions no longer asked cleared, e.g. the TB year of a patient who never had TB */
export function clearUnasked(fields: Array<ArtField>, values: Record<string, FieldValue>): Record<string, FieldValue> {
  const out = { ...values };
  fields.filter((f) => f.shownWhen && !f.shownWhen(out)).forEach((f) => (out[f.name] = null));
  return out;
}

/**
 * An NCD header's rules, as the forms and validate_dx_fields.js apply them: the required answers, a date for every
 * diagnosis, complication or exposure ticked, no future date unless the form allows one, each number within its
 * concept's limits, and, where the diagnoses are asked, at least one of them
 */
export function checkNcdHeader(
  fields: Array<ArtField>,
  values: Record<string, FieldValue>,
  { diagnoses = [], today = dayjs().format('YYYY-MM-DD') }: { diagnoses?: Array<string>; today?: string } = {},
) {
  const rules: Record<string, RuleResult> = {};
  fields.forEach((f) => {
    if (!isAsked(f, fields, values)) {
      return;
    }
    const value = values[f.name];
    const leader = leaderOf(f, fields);
    if ((f.required || (leader && f.kind === 'date')) && empty(value)) {
      rules[f.name] = { level: 'error', message: 'Required' };
    } else if (f.kind === 'date' && !f.future && value && String(value).slice(0, 10) > today) {
      rules[f.name] = { level: 'error', message: 'Cannot be in the future' };
    } else {
      rules[f.name] = checkRange(f.name, value);
    }
  });
  // the card is for at least one of its conditions: it cannot be saved without a diagnosis
  const asked = fields.filter((f) => diagnoses.includes(f.name));
  if (asked.length && !asked.some((f) => values[f.name])) {
    rules.diagnosis = { level: 'error', message: 'Tick at least one diagnosis' };
  }
  return rules;
}
