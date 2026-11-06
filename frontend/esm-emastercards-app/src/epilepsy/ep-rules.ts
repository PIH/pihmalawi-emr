import dayjs from 'dayjs';
import { type RuleResult } from '../art/art-rules';
import { type FieldValue } from '../art/obs-diff';

const error = (message: string): RuleResult => ({ level: 'error', message });
const given = (value: FieldValue) => value !== null && value !== undefined && value !== '';

/** The date of onset, which the form asks as mm / yyyy: a month from 1 to 12 and a year not in the future */
export function checkOnset(values: Record<string, FieldValue>, today = dayjs()): Record<string, RuleResult> {
  const rules: Record<string, RuleResult> = {};
  const month = Number(values.onsetMonth);
  const year = Number(values.onsetYear);
  if (given(values.onsetMonth) && (!Number.isInteger(month) || month < 1 || month > 12)) {
    rules.onsetMonth = error('Must be a month from 1 to 12');
  }
  if (given(values.onsetYear) && (!Number.isInteger(year) || year < 1900 || year > today.year())) {
    rules.onsetYear = error('Must be a year, not in the future');
  }
  return rules;
}

/** The number of seizures is only asked when there were seizures since the last visit */
export function checkSeizureCount(values: Record<string, FieldValue>, yes: string): RuleResult {
  const count = values.numberOfSeizures;
  if (given(count) && Number(count) < 0) {
    return error('Cannot be negative');
  }
  if (given(count) && Number(count) > 0 && given(values.anySeizures) && String(values.anySeizures).toLowerCase() !== yes.toLowerCase()) {
    return { level: 'warning', message: 'Seizures since last visit is not Yes' };
  }
  return null;
}
