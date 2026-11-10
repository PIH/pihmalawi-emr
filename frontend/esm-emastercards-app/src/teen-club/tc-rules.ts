import { type ArtField } from '../art/art-fields';
import { type FieldValue } from '../art/obs-diff';
import { checkNcdHeader } from '../shared/ncd';

/** The header's rules: the NCD headers' (the follow-up agreement it requires, no future dates but the transfer-in) */
export const checkTcHeader = (fields: Array<ArtField>, values: Record<string, FieldValue>) => checkNcdHeader(fields, values);

/** The header's answers after a change: the age at intake is in weeks or in months (the form's "choose one") */
export function applyTcHeaderChange(previous: Record<string, FieldValue>, next: Record<string, FieldValue>): Record<string, FieldValue> {
  const out = { ...next };
  if (out.ageIn_weeks && !previous.ageIn_weeks) {
    out.ageIn_months = null;
    out.ageIn_monthsNumber = null;
  }
  if (out.ageIn_months && !previous.ageIn_months) {
    out.ageIn_weeks = null;
    out.ageIn_weeksNumber = null;
  }
  return out;
}
