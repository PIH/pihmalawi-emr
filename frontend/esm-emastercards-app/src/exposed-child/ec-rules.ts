import { type ArtField } from '../art/art-fields';
import { type FieldValue } from '../art/obs-diff';
import { checkNcdHeader } from '../shared/ncd';
import { EC_VISIT, WEEKS } from './ec-concepts';

/** The header's rules: the NCD headers' (the follow-up agreement it requires, no future dates, concept limits) */
export const checkEcHeader = (fields: Array<ArtField>, values: Record<string, FieldValue>) => checkNcdHeader(fields, values);

/** The header's answers after a change: an age when starting NVP, or an NVP duration, is in weeks unless months is chosen */
export function applyEcHeaderChange(_previous: Record<string, FieldValue>, next: Record<string, FieldValue>): Record<string, FieldValue> {
  const out = { ...next };
  if (out.nvpStartAge !== null && out.nvpStartAge !== undefined && out.nvpStartAge !== '' && !out.nvpStartAgeUnit) {
    out.nvpStartAgeUnit = WEEKS;
  }
  if (out.nvpDuration !== null && out.nvpDuration !== undefined && out.nvpDuration !== '' && !out.nvpDurationUnit) {
    out.nvpDurationUnit = WEEKS;
  }
  return out;
}

const value = (v: FieldValue) => String(v ?? '').toLowerCase();

/** Whether the child is HIV infected or presumed to have severe HIV disease (B or D), as the card flags it in red */
export const hivInfected = (status: FieldValue) => [EC_VISIT.childHivStatuses[1].value, EC_VISIT.childHivStatuses[3].value].includes(value(status));

/** Whether the child is wasted, moderately or severely, as the card flags it in red */
export const wasted = (wasting: FieldValue) => EC_VISIT.wastingAnswers.slice(1).some((a) => a.value === value(wasting));
