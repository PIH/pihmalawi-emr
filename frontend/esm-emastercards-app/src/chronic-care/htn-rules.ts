import dayjs from 'dayjs';
import { type ArtField } from '../art/art-fields';
import { encounterValues, type ArtEncounter } from '../art/art.resource';
import { type FieldValue } from '../art/obs-diff';
import { checkNcdHeader, checkRange, clearUnasked, LIMITS, rangeRules, showsTbYear } from '../shared/ncd';
import { HTN_VISIT } from './htn-concepts';
import { type Condition, DIAGNOSIS_CONDITIONS, HTN_HEADER_SECTIONS } from './htn-fields';

const empty = (value: FieldValue) => value === null || value === undefined || value === '';

export { checkRange, LIMITS, rangeRules, showsTbYear };

const DIAGNOSES = HTN_HEADER_SECTIONS.diagnoses.fields.filter((f) => f.checkbox).map((f) => f.name);

/**
 * The header's rules, as the form and its validate_dx_fields.js apply them: the NCD headers' rules (required answers,
 * dated diagnoses and complications, no future dates, concept limits, at least one diagnosis) and one type of diabetes
 */
export function checkHeader(fields: Array<ArtField>, values: Record<string, FieldValue>, today = dayjs().format('YYYY-MM-DD')) {
  const rules = checkNcdHeader(fields, values, { diagnoses: DIAGNOSES, today });
  if (values.diagnosis_dm1 && values.diagnosis_dm2) {
    rules.diagnosis_dm2 = { level: 'error', message: 'A patient cannot have both Type 1 and Type 2 DM' };
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
  return clearUnasked(HTN_HEADER_SECTIONS.history.fields, out);
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
