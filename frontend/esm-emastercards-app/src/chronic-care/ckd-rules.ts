import { type ArtField } from '../art/art-fields';
import { type FieldValue } from '../art/obs-diff';
import { checkNcdHeader } from '../shared/ncd';
import { CKD_VISIT } from './ckd-concepts';

/**
 * The header's rules: the NCD headers' (required answers, a date for every diagnosis ticked, no future dates, as this
 * form refuses them all). The card is for chronic kidney disease itself, so its diagnoses (CHF, hypertension,
 * diabetes, other) are comorbidities and none is required.
 */
export const checkCkdHeader = (fields: Array<ArtField>, values: Record<string, FieldValue>) => checkNcdHeader(fields, values);

/** Whether kidney disease is advanced, CKD stage 4-5, as the card flags it in red */
export const advancedCkd = (stage: FieldValue) => String(stage ?? '').toLowerCase() === CKD_VISIT.ckdStages[2].value;
