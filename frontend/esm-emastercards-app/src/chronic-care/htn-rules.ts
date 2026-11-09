import dayjs from 'dayjs';
import { type ArtField } from '../art/art-fields';
import { type RuleResult } from '../art/art-rules';
import { encounterValues, type ArtEncounter } from '../art/art.resource';
import { type FieldValue } from '../art/obs-diff';
import { leaderOf } from '../mental-health/grouped-fields';
import { HTN_VISIT, UNKNOWN } from './htn-concepts';
import { type Condition, DIAGNOSIS_CONDITIONS, HTN_HEADER_SECTIONS } from './htn-fields';

const empty = (value: FieldValue) => value === null || value === undefined || value === '';

/**
 * The concepts' absolute limits (concepts.csv's absolute high and low), which the forms refuse a number outside of,
 * and whether they allow decimals
 */
export const LIMITS: Record<string, { min?: number; max?: number; whole?: boolean }> = {
  height: { min: 10, max: 228 },
  weight: { min: 0, max: 250 },
  systolicBp: { min: 20, max: 250, whole: true },
  diastolicBp: { min: 0, max: 150, whole: true },
  pulse: { min: 0, max: 230, whole: true },
  hbA1c: { min: 2, max: 16 },
  fruitVegetables: { min: 0, whole: true },
  exercise: { min: 0, max: 7, whole: true },
  cvRisk: { min: 0, max: 100, whole: true },
  tbYear: { min: 1950, max: 2050, whole: true },
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
    return {
      level: 'error',
      message: min !== undefined ? `Must be at least ${min}` : `Must be at most ${max}`,
    };
  }
  return null;
}

/** Each named field's limit, as the panel shows it while the number is typed */
export const rangeRules = (values: Record<string, FieldValue>, names: Array<string>): Record<string, RuleResult> =>
  Object.fromEntries(names.map((n) => [n, checkRange(n, values[n])]));

/** Whether the header shows the TB year: not for a patient who never had TB */
export const showsTbYear = (values: Record<string, FieldValue>) => String(values.tbStatus ?? '').toLowerCase() !== UNKNOWN;

/**
 * The header's rules, as the form and its validate_dx_fields.js apply them: the required answers, a date for every
 * diagnosis and complication ticked, no future date unless the form allows one, one type of diabetes, and each number
 * within its concept's limits
 */
export function checkHeader(fields: Array<ArtField>, values: Record<string, FieldValue>, today = dayjs().format('YYYY-MM-DD')) {
  const rules: Record<string, RuleResult> = {};
  fields.forEach((f) => {
    const value = values[f.name];
    const leader = leaderOf(f, fields);
    if ((leader && !values[leader.name]) || (f.name === 'tbYear' && !showsTbYear(values))) {
      return;
    }
    if ((f.required || (leader && f.kind === 'date')) && empty(value)) {
      rules[f.name] = { level: 'error', message: 'Required' };
    } else if (f.kind === 'date' && !f.future && value && String(value).slice(0, 10) > today) {
      rules[f.name] = { level: 'error', message: 'Cannot be in the future' };
    } else {
      rules[f.name] = checkRange(f.name, value);
    }
  });
  // the card is for at least one of its conditions: it cannot be saved without a diagnosis
  const diagnoses = fields.filter((f) => f.checkbox && f.name.replace('diagnosis_', '') in DIAGNOSIS_CONDITIONS);
  if (diagnoses.length && !diagnoses.some((f) => values[f.name])) {
    rules.diagnosis = { level: 'error', message: 'Tick at least one diagnosis' };
  }
  if (values.diagnosis_dm1 && values.diagnosis_dm2) {
    rules.diagnosis_dm2 = {
      level: 'error',
      message: 'A patient cannot have both Type 1 and Type 2 DM',
    };
  }
  return rules;
}

/**
 * The header's answers after a change: ticking one type of diabetes unticks the other, and a patient who never had
 * TB has no TB year
 */
export function applyHeaderChange(previous: Record<string, FieldValue>, next: Record<string, FieldValue>): Record<string, FieldValue> {
  const out = { ...next };
  if (out.diagnosis_dm1 && !previous.diagnosis_dm1) {
    out.diagnosis_dm2 = null;
    out.diagnosis_dm2Date = null;
  }
  if (out.diagnosis_dm2 && !previous.diagnosis_dm2) {
    out.diagnosis_dm1 = null;
    out.diagnosis_dm1Date = null;
  }
  if (!showsTbYear(out)) {
    out.tbYear = null;
  }
  return out;
}

/**
 * The conditions a card header diagnoses: diabetes (type 1 or 2) and hypertension. A card with neither ticked, e.g.
 * one started on paper, shows both.
 */
export function conditionsOf(header: ArtEncounter | null | undefined): Record<Condition, boolean> {
  const fields = HTN_HEADER_SECTIONS.diagnoses.fields.filter((f) => f.checkbox);
  const values = encounterValues(fields, header);
  const diagnosed = { diabetes: false, hypertension: false };
  fields.forEach((f) => {
    if (values[f.name]) {
      diagnosed[DIAGNOSIS_CONDITIONS[f.name.replace('diagnosis_', '')]] = true;
    }
  });
  return diagnosed.diabetes || diagnosed.hypertension ? diagnosed : { diabetes: true, hypertension: true };
}

/** Whether a blood pressure is raised, at or above 140/90, as the card flags it in red */
export function bpRaised(systolic: FieldValue, diastolic: FieldValue): boolean {
  return (!empty(systolic) && Number(systolic) >= 140) || (!empty(diastolic) && Number(diastolic) >= 90);
}

/**
 * Whether blood sugar is raised, as the card flags it in red: HbA1c at or above 6.5 %, a fasting blood sugar at or
 * above 126 mg/dL, or another (random) one at or above 200 mg/dL, the thresholds at which diabetes is diagnosed
 */
export function sugarRaised({ hbA1c, glucose, testType }: { hbA1c?: FieldValue; glucose?: FieldValue; testType?: FieldValue }): boolean {
  const fasting = String(testType ?? '').toLowerCase() === HTN_VISIT.glucoseTestTypes[0].value;
  return (!empty(hbA1c) && Number(hbA1c) >= 6.5) || (!empty(glucose) && Number(glucose) >= (fasting ? 126 : 200));
}
