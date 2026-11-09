import { CKD_HEADER_CONFIG } from './ckd-header.workspace';
import { CLD_HEADER_CONFIG } from './cld-header.workspace';
import { CVD_HEADER_CONFIG } from './cvd-header.workspace';
import { HTN_HEADER_CONFIG } from './htn-header.workspace';
import { NCO_HEADER_CONFIG } from './nco-header.workspace';
import { SCD_HEADER_CONFIG } from './scd-header.workspace';

const CONFIGS = { HTN_HEADER_CONFIG, CLD_HEADER_CONFIG, CVD_HEADER_CONFIG, CKD_HEADER_CONFIG, SCD_HEADER_CONFIG, NCO_HEADER_CONFIG };

describe('the NCD cards header configurations', () => {
  it.each(Object.entries(CONFIGS))('%s starts the card with sections it has, the patient and guardian details first', (_, config) => {
    expect(config.startSections.length).toBeGreaterThan(0);
    config.startSections.forEach((key) => expect(Object.keys(config.sections)).toContain(key));
    expect(config.startSections[0]).toBe('patientGuardian');
    expect(Object.keys(config.sections)[0]).toBe('patientGuardian');
  });
});
