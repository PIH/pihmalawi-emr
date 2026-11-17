import { type PdcCondition } from './pdc-condition';
import { HIE_CONDITION } from './hie-condition';
import { TRISOMY_CONDITION } from './trisomy-condition';
import { CLEFT_CONDITION } from './cleft-condition';
import { OTHER_DIAGNOSIS_CONDITION } from './other-diagnosis-condition';

/** The PDC condition cards, all native */
export const NATIVE_PDC_CONDITIONS: Array<PdcCondition> = [HIE_CONDITION, TRISOMY_CONDITION, CLEFT_CONDITION, OTHER_DIAGNOSIS_CONDITION];

export const nativePdcCondition = (key: string) => NATIVE_PDC_CONDITIONS.find((c) => c.key === key) ?? null;
