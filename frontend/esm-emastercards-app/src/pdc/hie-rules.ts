import dayjs from 'dayjs';
import { type ArtField } from '../art/art-fields';
import { type RuleResult } from '../art/art-rules';
import { type FieldValue } from '../art/obs-diff';
import { checkNcdHeader } from '../shared/ncd';
import { MODERATE_MALNUTRITION, SEVERE_MALNUTRITION } from './hie-concepts';

/** The header's rules: the NCD headers' (the follow-up agreement it requires, no future dates, concept limits) */
export const checkHieHeader = (fields: Array<ArtField>, values: Record<string, FieldValue>) => checkNcdHeader(fields, values);

/** Whether the child is malnourished, moderately or severely, as the card flags it in red */
export const malnourished = (value: FieldValue) =>
  [MODERATE_MALNUTRITION, SEVERE_MALNUTRITION].includes(String(value ?? '').toLowerCase());

/** A PDC form's dates: each refuses the future unless the form allows it, a result's own date (e.g. HB's) included */
export function checkPdcDates(fields: Array<ArtField>, values: Record<string, FieldValue>, today = dayjs().format('YYYY-MM-DD')) {
  const rules: Record<string, RuleResult> = {};
  const dates = [
    ...fields.filter((f) => f.kind === 'date' && !f.future).map((f) => f.name),
    ...fields.filter((f) => f.obsDate).map((f) => f.obsDate),
  ];
  dates.forEach((name) => {
    const value = values[name];
    rules[name] = value && String(value).slice(0, 10) > today ? { level: 'error', message: 'Cannot be in the future' } : null;
  });
  return rules;
}

/** The lab tests' rules: the form refuses a future date, its HB result's included */
export const checkHieLabs = (fields: Array<ArtField>, values: Record<string, FieldValue>, today?: string) => checkPdcDates(fields, values, today);
