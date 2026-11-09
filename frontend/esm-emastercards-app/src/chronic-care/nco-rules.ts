import { type ArtField } from '../art/art-fields';
import { type FieldValue } from '../art/obs-diff';
import { checkNcdHeader } from '../shared/ncd';
import { NCO_DIAGNOSES } from './nco-fields';

/**
 * The header's rules: the NCD headers' (required answers, a date for every diagnosis ticked, concept limits) and at
 * least one diagnosis, the conditions the card is for
 */
export const checkNcoHeader = (fields: Array<ArtField>, values: Record<string, FieldValue>) =>
  checkNcdHeader(fields, values, { diagnoses: NCO_DIAGNOSES });
