import { type ArtField } from '../art/art-fields';
import { type FieldValue } from '../art/obs-diff';
import { checkNcdHeader, clearUnasked } from '../shared/ncd';
import { PDC_HEADER_FIELDS } from './pdc-fields';

/** The header's rules: the NCD headers' (the follow-up agreement it requires, no future dates, concept limits) */
export const checkPdcHeader = (fields: Array<ArtField>, values: Record<string, FieldValue>) => checkNcdHeader(fields, values);

const ticked = (v: FieldValue) => v !== null && v !== undefined && v !== '';

/**
 * The header's answers after a change, as the form's script makes them: the age at intake is in weeks or in months,
 * ticking one clearing the other and its number; answers no longer asked (a date of enrolment once Enrolled is not
 * Yes, the medication once there is none) are cleared
 */
export function applyPdcHeaderChange(previous: Record<string, FieldValue>, next: Record<string, FieldValue>): Record<string, FieldValue> {
  const out = { ...next };
  if (ticked(out.ageAtIntake_weeksUnit) && !ticked(previous.ageAtIntake_weeksUnit)) {
    out.ageAtIntake_monthsUnit = null;
    out.ageAtIntake_months = null;
  } else if (ticked(out.ageAtIntake_monthsUnit) && !ticked(previous.ageAtIntake_monthsUnit)) {
    out.ageAtIntake_weeksUnit = null;
    out.ageAtIntake_weeks = null;
  }
  return clearUnasked(PDC_HEADER_FIELDS, out);
}
