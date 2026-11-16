import { pdcHeaderWorkspace, pdcLabsWorkspace } from './pdc-condition-panels';
import { type PdcConditionForm } from './pdc-condition';
import { NATIVE_PDC_CONDITIONS } from './pdc-conditions';
import { pdcVisitWorkspace } from './pdc-visit-panel';

/** Each native PDC condition card's panels (header, visit, lab tests), by the card's key, built once */
export const CONDITION_WORKSPACES = Object.fromEntries(
  NATIVE_PDC_CONDITIONS.map((c) => [c.key, { header: pdcHeaderWorkspace(c), visit: pdcVisitWorkspace(c), labs: pdcLabsWorkspace(c) }]),
) as Record<string, Record<PdcConditionForm, React.FC<any>>>;
