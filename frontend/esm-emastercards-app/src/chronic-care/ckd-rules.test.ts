import { clearUnasked, NCD_HEADER } from '../shared/ncd';
import { CKD_HEADER, CKD_VISIT } from './ckd-concepts';
import { CKD_HEADER_SECTIONS } from './ckd-fields';
import { advancedCkd, checkCkdHeader } from './ckd-rules';

const { diagnoses, history, etiology } = CKD_HEADER_SECTIONS;

describe('chronic kidney disease rules', () => {
  it('the diagnoses are comorbidities: none is required, but each one ticked needs its date', () => {
    expect(checkCkdHeader(diagnoses.fields, {}).diagnosis).toBeUndefined();
    const chf = CKD_HEADER.diagnoses[0].answer;
    expect(checkCkdHeader(diagnoses.fields, { diagnosis_chf: chf }).diagnosis_chfDate).toEqual({ level: 'error', message: 'Required' });
  });

  it('refuses future dates, as the form does', () => {
    expect(checkCkdHeader(etiology.fields, { etiologyDate: '2099-01-01' }).etiologyDate).toEqual({
      level: 'error',
      message: 'Cannot be in the future',
    });
    expect(checkCkdHeader(history.fields, { hivTestDate: '2099-01-01' }).hivTestDate).toEqual({ level: 'error', message: 'Cannot be in the future' });
  });

  it('asks no TB date of a patient who never had TB', () => {
    const never = NCD_HEADER.tbStatuses[3].value;
    expect(clearUnasked(history.fields, { tbStatus: never, tbDate: '2019-04-01' })).toMatchObject({ tbDate: null });
  });

  it('flags CKD stage 4-5', () => {
    expect(advancedCkd(CKD_VISIT.ckdStages[2].value)).toBe(true);
    expect(advancedCkd(CKD_VISIT.ckdStages[1].value)).toBe(false);
  });
});
