import { MH_HEADER } from './mh-concepts';
import { checkAtLeastOneDiagnosis, checkDiagnosisDates, mseState, setMse } from './mh-rules';

const SCHIZO = MH_HEADER.diagnoses[0].answer;
const H = 'hallucinations';

describe('mental health rules', () => {
  it('a ticked diagnosis needs its date', () => {
    expect(checkDiagnosisDates({ dx_schizophrenia: SCHIZO })).toEqual({ dx_schizophreniaDate: { level: 'error', message: 'Required' } });
    expect(checkDiagnosisDates({ dx_schizophrenia: SCHIZO, dx_schizophreniaDate: '2025-03-12' })).toEqual({});
  });

  it('at least one diagnosis', () => {
    expect(checkAtLeastOneDiagnosis({})).toEqual({ level: 'error', message: 'Must enter at least one diagnosis!' });
    expect(checkAtLeastOneDiagnosis({ dx_manic: MH_HEADER.diagnoses[1].answer })).toBeNull();
  });

  it('present and absent clear each other', () => {
    expect(setMse({ msePresent: [H], mseAbsent: [] }, H, 'absent')).toEqual({ msePresent: [], mseAbsent: [H] });
    expect(setMse({ msePresent: [H], mseAbsent: [] }, H, null)).toEqual({ msePresent: [], mseAbsent: [] });
    expect(setMse({ msePresent: null, mseAbsent: null }, H, 'present')).toEqual({ msePresent: [H], mseAbsent: [] });
  });

  it('present wins over absent', () => {
    expect(mseState([H], [H], H)).toBe('present');
    expect(mseState([], [H], 'HALLUCINATIONS'.toLowerCase())).toBe('absent');
    expect(mseState([], [], H)).toBeNull();
  });
});
