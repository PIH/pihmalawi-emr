import { CVD_HEADER, CVD_VISIT } from './cvd-concepts';
import { CVD_HEADER_SECTIONS } from './cvd-fields';
import { checkCvdHeader, severeNyha } from './cvd-rules';

const { diagnoses } = CVD_HEADER_SECTIONS;

describe('cardiac and vascular disease rules', () => {
  it('a card needs at least one diagnosis, each with its date, which may be in the future as the form allows', () => {
    expect(checkCvdHeader(diagnoses.fields, {}).diagnosis).toEqual({ level: 'error', message: 'Tick at least one diagnosis' });
    const afib = CVD_HEADER.diagnoses.find((d) => d.key === 'afib').answer;
    expect(checkCvdHeader(diagnoses.fields, { diagnosis_afib: afib }).diagnosis_afibDate).toEqual({ level: 'error', message: 'Required' });
    const rules = checkCvdHeader(diagnoses.fields, { diagnosis_afib: afib, diagnosis_afibDate: '2099-01-01' });
    expect(rules.diagnosis).toBeUndefined();
    expect(rules.diagnosis_afibDate).toBeNull();
  });

  it('flags NYHA class III and IV', () => {
    expect(severeNyha(CVD_VISIT.nyhaClasses[2].value)).toBe(true);
    expect(severeNyha(CVD_VISIT.nyhaClasses[3].value)).toBe(true);
    expect(severeNyha(CVD_VISIT.nyhaClasses[1].value)).toBe(false);
  });
});
