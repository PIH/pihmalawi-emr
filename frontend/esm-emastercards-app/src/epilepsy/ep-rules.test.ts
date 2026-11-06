import dayjs from 'dayjs';
import { NO, YES } from '../art/art-concepts';
import { checkOnset, checkSeizureCount } from './ep-rules';

describe('epilepsy rules', () => {
  it('the date of onset is a month from 1 to 12 and a year not in the future', () => {
    const today = dayjs('2026-11-05');
    expect(checkOnset({ onsetMonth: 3, onsetYear: 2019 }, today)).toEqual({});
    expect(checkOnset({ onsetMonth: 13, onsetYear: 2027 }, today)).toEqual({
      onsetMonth: { level: 'error', message: 'Must be a month from 1 to 12' },
      onsetYear: { level: 'error', message: 'Must be a year, not in the future' },
    });
    expect(checkOnset({ onsetMonth: null, onsetYear: null }, today)).toEqual({});
  });

  it('warns when seizures are counted but the visit says there were none', () => {
    expect(checkSeizureCount({ anySeizures: YES, numberOfSeizures: 3 }, YES)).toBeNull();
    expect(checkSeizureCount({ anySeizures: NO, numberOfSeizures: 3 }, YES)?.level).toBe('warning');
    expect(checkSeizureCount({ numberOfSeizures: -1 }, YES)?.level).toBe('error');
  });
});
