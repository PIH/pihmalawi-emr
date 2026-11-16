import { type PdcCondition } from './pdc-condition';
import { HIE_CONDITION } from './hie-condition';
import { TRISOMY_CONDITION } from './trisomy-condition';
import { CLEFT_CONDITION } from './cleft-condition';

/** The PDC condition cards that are native so far; the other diagnosis card open in their flowsheet */
export const NATIVE_PDC_CONDITIONS: Array<PdcCondition> = [HIE_CONDITION, TRISOMY_CONDITION, CLEFT_CONDITION];

export const nativePdcCondition = (key: string) => NATIVE_PDC_CONDITIONS.find((c) => c.key === key) ?? null;
