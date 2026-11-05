import { type RuleResult } from '../art/art-rules';
import { type FieldValue } from '../art/obs-diff';
import { MH_HEADER } from './mh-concepts';

const ticked = (value: FieldValue) => value !== null && value !== undefined && value !== '';

/** validate_dx_fields.js: each ticked diagnosis needs its date, keyed by the date's field name */
export function checkDiagnosisDates(values: Record<string, FieldValue>): Record<string, RuleResult> {
  const errors: Record<string, RuleResult> = {};
  MH_HEADER.diagnoses.forEach((d) => {
    if (ticked(values[`dx_${d.key}`]) && !ticked(values[`dx_${d.key}Date`])) {
      errors[`dx_${d.key}Date`] = { level: 'error', message: 'Required' };
    }
  });
  return errors;
}

/** mastercard.js's ensureDiagnosisChecked: the card needs at least one diagnosis */
export function checkAtLeastOneDiagnosis(values: Record<string, FieldValue>): RuleResult {
  return MH_HEADER.diagnoses.some((d) => ticked(values[`dx_${d.key}`]))
    ? null
    : { level: 'error', message: 'Must enter at least one diagnosis!' };
}

const list = (value: FieldValue) => (Array.isArray(value) ? value : []);
const without = (value: FieldValue, answer: string) => list(value).filter((v) => v.toLowerCase() !== answer.toLowerCase());

/**
 * Records an MSE finding as present, absent or neither: as the visit form's script does, choosing one clears the
 * other
 */
export function setMse(
  values: Record<string, FieldValue>,
  answer: string,
  choice: 'present' | 'absent' | null,
): Record<string, FieldValue> {
  const present = without(values.msePresent, answer);
  const absent = without(values.mseAbsent, answer);
  return {
    ...values,
    msePresent: choice === 'present' ? [...present, answer] : present,
    mseAbsent: choice === 'absent' ? [...absent, answer] : absent,
  };
}

/** An MSE finding as recorded; an older visit may have both, and then it was present */
export function mseState(present: Array<string>, absent: Array<string>, answer: string): 'present' | 'absent' | null {
  const has = (l: Array<string>) => l.some((v) => v.toLowerCase() === answer.toLowerCase());
  return has(present) ? 'present' : has(absent) ? 'absent' : null;
}
