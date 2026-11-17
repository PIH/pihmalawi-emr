import { lowBmi, oneYearWeightLoss } from './summary-alerts';

const w = (value: number, date: string) => ({ value, date: `${date}T09:00:00.000+0200` });

describe('oneYearWeightLoss', () => {
  it('gives the loss against the most recent weight at least 12 months before the latest, from 10 %', () => {
    expect(oneYearWeightLoss([w(54, '2026-11-01'), w(58, '2026-06-01'), w(60, '2025-10-01'), w(70, '2024-01-01')])).toBe(10);
    expect(oneYearWeightLoss([w(50, '2026-11-01'), w(62.5, '2025-11-01')])).toBe(20);
  });

  it('gives nothing for a smaller loss, a gain, or no weight a year before', () => {
    expect(oneYearWeightLoss([w(55, '2026-11-01'), w(60, '2025-10-01')])).toBeNull();
    expect(oneYearWeightLoss([w(66, '2026-11-01'), w(60, '2025-10-01')])).toBeNull();
    expect(oneYearWeightLoss([w(40, '2026-11-01'), w(60, '2026-03-01')])).toBeNull();
    expect(oneYearWeightLoss([])).toBeNull();
  });
});

describe('lowBmi', () => {
  it('flags a BMI below 19 from 18 years old only', () => {
    expect(lowBmi(18.2, 30)).toBe(true);
    expect(lowBmi(19, 30)).toBe(false);
    expect(lowBmi(15.1, 2)).toBe(false);
    expect(lowBmi(null, 30)).toBe(false);
    expect(lowBmi(17, null)).toBe(false);
  });
});
