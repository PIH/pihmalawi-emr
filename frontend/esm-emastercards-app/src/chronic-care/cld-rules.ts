import { type ArtField } from '../art/art-fields';
import { encounterValues, type ArtEncounter } from '../art/art.resource';
import { type FieldValue } from '../art/obs-diff';
import { checkNcdHeader } from '../shared/ncd';
import { CLD_VISIT } from './cld-concepts';
import { CLD_DIAGNOSES, CLD_HEADER_SECTIONS } from './cld-fields';

/**
 * The header's rules: the NCD headers' (required answers, dated diagnoses and exposures, no future dates where the
 * form refuses them, concept limits) and at least one diagnosis, asthma or COPD
 */
export const checkCldHeader = (fields: Array<ArtField>, values: Record<string, FieldValue>) =>
  checkNcdHeader(fields, values, { diagnoses: CLD_DIAGNOSES });

/** The conditions a card header diagnoses. A card with neither ticked, e.g. one started on paper, shows both. */
export function cldConditionsOf(header: ArtEncounter | null | undefined): { asthma: boolean; copd: boolean } {
  const fields = CLD_HEADER_SECTIONS.diagnoses.fields.filter((f) => f.checkbox);
  const values = encounterValues(fields, header);
  const diagnosed = { asthma: !!values.diagnosis_asthma, copd: !!values.diagnosis_copd };
  return diagnosed.asthma || diagnosed.copd ? diagnosed : { asthma: true, copd: true };
}

/** Whether asthma is severe, persistent or uncontrolled, as the card flags it in red */
export const severeAsthma = (severity: FieldValue) => CLD_VISIT.severities.slice(3).some((s) => s.value === String(severity ?? '').toLowerCase());
