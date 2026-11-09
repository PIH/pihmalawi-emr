import { type ArtField } from '../art/art-fields';
import { type FieldValue } from '../art/obs-diff';
import { checkNcdHeader } from '../shared/ncd';

/**
 * The header's rules: the NCD headers' (required answers, among them the date of diagnosis the form's script requires;
 * no future dates, as this form refuses them all; concept limits). The card's diagnosis, sickle cell disease, is
 * always saved, so none needs ticking.
 */
export const checkScdHeader = (fields: Array<ArtField>, values: Record<string, FieldValue>) => checkNcdHeader(fields, values);
