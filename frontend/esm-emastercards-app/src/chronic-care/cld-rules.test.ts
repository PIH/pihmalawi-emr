import { clearUnasked, UNKNOWN } from '../shared/ncd';
import { CLD_HEADER_SECTIONS } from './cld-fields';
import { checkCldHeader, cldConditionsOf, severeAsthma } from './cld-rules';
import { CLD_VISIT, ASTHMA } from './cld-concepts';
import { cldHeader, copdOnlyHeader } from './test-cld-data';

const { diagnoses, history } = CLD_HEADER_SECTIONS;

describe('chronic lung disease rules', () => {
  it('a card needs at least one diagnosis, asthma or COPD, each with its date', () => {
    expect(checkCldHeader(diagnoses.fields, {}).diagnosis).toEqual({ level: 'error', message: 'Tick at least one diagnosis' });
    const rules = checkCldHeader(diagnoses.fields, { diagnosis_asthma: ASTHMA });
    expect(rules.diagnosis).toBeUndefined();
    expect(rules.diagnosis_asthmaDate).toEqual({ level: 'error', message: 'Required' });
  });

  it('allows a future diagnosis date, as the form does', () => {
    expect(checkCldHeader(diagnoses.fields, { diagnosis_asthma: ASTHMA, diagnosis_asthmaDate: '2099-01-01' }).diagnosis_asthmaDate).toBeNull();
  });

  it("asks the cough's duration and onset only once the cough is ticked, and no TB year of a patient who never had TB", () => {
    expect(clearUnasked(history.fields, { coughDuration: 6, ageAtOnset: 30, tbStatus: UNKNOWN, tbYear: 2010 })).toMatchObject({
      coughDuration: null,
      ageAtOnset: null,
      tbYear: null,
    });
    expect(checkCldHeader(history.fields, { dryCough: 'x', ageAtOnset: 30.5 }).ageAtOnset).toEqual({
      level: 'error',
      message: 'Must be a whole number',
    });
  });

  it('the conditions are the diagnoses, or both when none is ticked', () => {
    expect(cldConditionsOf(cldHeader)).toEqual({ asthma: true, copd: false });
    expect(cldConditionsOf(copdOnlyHeader)).toEqual({ asthma: false, copd: true });
    expect(cldConditionsOf(null)).toEqual({ asthma: true, copd: true });
  });

  it('flags severe persistent and severe uncontrolled asthma', () => {
    expect(severeAsthma(CLD_VISIT.severities[3].value)).toBe(true);
    expect(severeAsthma(CLD_VISIT.severities[4].value)).toBe(true);
    expect(severeAsthma(CLD_VISIT.severities[2].value)).toBe(false);
  });
});
