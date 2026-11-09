import { HTN_HEADER, HTN_VISIT, UNKNOWN } from './htn-concepts';
import { HTN_HEADER_SECTIONS } from './htn-fields';
import { applyHeaderChange, bpRaised, checkHeader, checkRange, conditionsOf, sugarRaised } from './htn-rules';
import { htnHeader, encounter, obs } from './test-htn-data';

const history = HTN_HEADER_SECTIONS.history.fields;

describe('hypertension and diabetes rules', () => {
  it('a complication ticked needs its date, as validate_dx_fields.js requires', () => {
    const stroke = HTN_HEADER.complications[0].answer;
    expect(checkHeader(history, { complication_stroke: stroke }).complication_strokeDate).toEqual({ level: 'error', message: 'Required' });
    expect(
      checkHeader(history, {
        complication_stroke: stroke,
        complication_strokeDate: '2024-01-01',
      }).complication_strokeDate,
    ).toBeNull();
    expect(checkHeader(history, {}).complication_strokeDate).toBeUndefined();
  });

  it('a diagnosis date cannot be in the future, but an HIV test date can', () => {
    const fields = HTN_HEADER_SECTIONS.diagnoses.fields;
    const rules = checkHeader(
      fields,
      {
        diagnosis_htn: HTN_HEADER.diagnoses[2].answer,
        diagnosis_htnDate: '2026-12-01',
      },
      '2026-11-09',
    );
    expect(rules.diagnosis_htnDate).toEqual({
      level: 'error',
      message: 'Cannot be in the future',
    });
    expect(checkHeader(history, { hivTestDate: '2026-12-01' }, '2026-11-09').hivTestDate).toBeNull();
  });

  it("the TB year is within its concept's range", () => {
    expect(checkHeader(history, { tbYear: 1900 }).tbYear).toEqual({
      level: 'error',
      message: 'Must be between 1950 and 2050',
    });
    expect(checkHeader(history, { tbYear: 2010 }).tbYear).toBeNull();
  });

  it('exercise days and CV risk are whole numbers within their ranges', () => {
    expect(checkRange('exercise', 8)).toEqual({
      level: 'error',
      message: 'Must be between 0 and 7',
    });
    expect(checkRange('cvRisk', 12.5)).toEqual({
      level: 'error',
      message: 'Must be a whole number',
    });
    expect(checkRange('fruitVegetables', -1)).toEqual({ level: 'error', message: 'Must be at least 0' });
    expect(checkRange('systolicBp', 300)).toEqual({ level: 'error', message: 'Must be between 20 and 250' });
    expect(checkRange('hbA1c', 1)).toEqual({ level: 'error', message: 'Must be between 2 and 16' });
    // no limit on the concept, no check
    expect(checkRange('lengthOfStay', -1)).toBeNull();
    expect(checkRange('exercise', 3)).toBeNull();
  });

  it('flags a blood pressure at or above 140/90', () => {
    expect(bpRaised(150, 85)).toBe(true);
    expect(bpRaised(130, 92)).toBe(true);
    expect(bpRaised(128, 82)).toBe(false);
    expect(bpRaised(null, null)).toBe(false);
  });

  it('a patient cannot have both types of diabetes: ticking one unticks the other', () => {
    const [dm1, dm2] = HTN_HEADER.diagnoses;
    const before = { diagnosis_dm1: dm1.answer, diagnosis_dm1Date: '2020-01-01' };
    expect(applyHeaderChange(before, { ...before, diagnosis_dm2: dm2.answer })).toMatchObject({
      diagnosis_dm1: null,
      diagnosis_dm1Date: null,
      diagnosis_dm2: dm2.answer,
    });
    const both = checkHeader(HTN_HEADER_SECTIONS.diagnoses.fields, { diagnosis_dm1: dm1.answer, diagnosis_dm2: dm2.answer });
    expect(both.diagnosis_dm2).toEqual({ level: 'error', message: 'A patient cannot have both Type 1 and Type 2 DM' });
  });

  it('a patient who never had TB has no TB year', () => {
    expect(applyHeaderChange({ tbYear: 2010 }, { tbYear: 2010, tbStatus: UNKNOWN })).toMatchObject({ tbYear: null });
    expect(checkHeader(history, { tbStatus: UNKNOWN, tbYear: 1800 }).tbYear).toBeUndefined();
  });

  it('flags blood sugar at the thresholds diabetes is diagnosed at', () => {
    const [fasting, random] = HTN_VISIT.glucoseTestTypes.map((g) => g.value);
    expect(sugarRaised({ hbA1c: 6.5 })).toBe(true);
    expect(sugarRaised({ hbA1c: 6.2 })).toBe(false);
    expect(sugarRaised({ glucose: 130, testType: fasting })).toBe(true);
    expect(sugarRaised({ glucose: 130, testType: random })).toBe(false);
    expect(sugarRaised({ glucose: 210, testType: random })).toBe(true);
  });

  it('the conditions a card is for are its diagnoses, or both when none is ticked', () => {
    expect(conditionsOf(htnHeader)).toEqual({ diabetes: true, hypertension: true });
    const htnOnly = encounter('h', '2025-01-01', [obs(HTN_HEADER.diagnosisGroup, null, [obs(HTN_HEADER.diagnosis, HTN_HEADER.diagnoses[2].answer)])]);
    expect(conditionsOf(htnOnly)).toEqual({ diabetes: false, hypertension: true });
    expect(conditionsOf(null)).toEqual({ diabetes: true, hypertension: true });
  });

  it('a card needs at least one diagnosis', () => {
    const fields = HTN_HEADER_SECTIONS.diagnoses.fields;
    expect(checkHeader(fields, {}).diagnosis).toEqual({ level: 'error', message: 'Tick at least one diagnosis' });
    expect(checkHeader(fields, { diagnosis_htn: HTN_HEADER.diagnoses[2].answer, diagnosis_htnDate: '2025-01-01' }).diagnosis).toBeUndefined();
    // sections without the diagnoses don't ask for one
    expect(checkHeader(history, {}).diagnosis).toBeUndefined();
  });
});
