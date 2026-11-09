import { type ArtField } from '../art/art-fields';
import { type FieldValue } from '../art/obs-diff';
import { checkNcdHeader } from '../shared/ncd';
import { CVD_VISIT } from './cvd-concepts';
import { CVD_DIAGNOSES } from './cvd-fields';

/**
 * The header's rules: the NCD headers' (required answers, a date for every diagnosis ticked, concept limits) and at
 * least one diagnosis
 */
export const checkCvdHeader = (fields: Array<ArtField>, values: Record<string, FieldValue>) =>
  checkNcdHeader(fields, values, { diagnoses: CVD_DIAGNOSES });

/** Whether heart failure is severe, NYHA class III or IV, as the card flags it in red */
export const severeNyha = (nyha: FieldValue) => CVD_VISIT.nyhaClasses.slice(2).some((c) => c.value === String(nyha ?? '').toLowerCase());
