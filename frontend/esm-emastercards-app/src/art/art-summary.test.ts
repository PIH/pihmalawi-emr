import { highViralLoad } from './art-summary';

describe('highViralLoad', () => {
  it('flags a numeric viral load of 1000 copies/mL or more, as the legacy patient summary does', () => {
    expect(highViralLoad('1000')).toBe(true);
    expect(highViralLoad('850000')).toBe(true);
    expect(highViralLoad('999')).toBe(false);
  });

  it('never flags a "<" result, LDL or no result', () => {
    expect(highViralLoad('<1000')).toBe(false);
    expect(highViralLoad('<40')).toBe(false);
    expect(highViralLoad('LDL')).toBe(false);
    expect(highViralLoad(null)).toBe(false);
  });
});
