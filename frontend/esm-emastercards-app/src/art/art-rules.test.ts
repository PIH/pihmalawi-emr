import {
  adherencePercent,
  checkDuplicate,
  checkHeightHistory,
  checkHeightWeight,
  checkNextAppointment,
  checkRegimen,
  clearViralLoadResults,
  sameDayValue,
  viralLoadDue,
} from './art-rules';

const r5A = 'regimen-5a';
const r13A = 'regimen-13a';
const r14A = 'regimen-14a';

describe('regimen check', () => {
  const history = [
    { regimen: r13A, date: '2026-08-05T09:00:00.000+0200', encounterUuid: 'e3' },
    { regimen: r13A, date: '2026-05-06T09:00:00.000+0200', encounterUuid: 'e2' },
    { regimen: r5A, date: '2022-01-10T09:00:00.000+0200', encounterUuid: 'e1' },
  ];

  it('requires a regimen', () => {
    expect(checkRegimen(null, history, '2026-11-04')).toEqual({ level: 'error', message: 'Required' });
  });

  it('accepts the same regimen as the last visit', () => {
    expect(checkRegimen(r13A, history, '2026-11-04')).toBeNull();
  });

  it('accepts any regimen when there is no history', () => {
    expect(checkRegimen(r14A, [], '2026-11-04')).toBeNull();
  });

  it('warns about a regimen never given before', () => {
    expect(checkRegimen(r14A, history, '2026-11-04')).toEqual({
      level: 'warning',
      message: 'Regimen is different from regimen at last visit',
    });
  });

  it('blocks a regimen given earlier but not at the last visit, naming when', () => {
    expect(checkRegimen(r5A, history, '2026-11-04')).toEqual({
      level: 'error',
      message: 'Regimen has been recorded in the past( Mon Jan 10 2022 ) but not on the last visit',
    });
  });

  it('regimen check ignores the encounter being edited and later regimens', () => {
    // editing the 06 May visit: only regimens before it count, so 5A was the last one
    expect(checkRegimen(r5A, history, '2026-05-06', 'e2')).toBeNull();
    // and the edited visit's own 13A doesn't count as given before
    expect(checkRegimen(r13A, history, '2026-05-06', 'e2')).toEqual({
      level: 'warning',
      message: 'Regimen is different from regimen at last visit',
    });
  });
});

describe('next appointment', () => {
  it('is required', () => {
    expect(checkNextAppointment(null, '2026-11-04')).toEqual({ level: 'error', message: 'Required' });
  });

  it('cannot be before the visit', () => {
    expect(checkNextAppointment('2026-11-03', '2026-11-04')).toEqual({ level: 'error', message: 'Cannot be in the past' });
  });

  it('must be within 12 months of the visit', () => {
    expect(checkNextAppointment('2027-11-05', '2026-11-04')).toEqual({
      level: 'error',
      message: 'Must be within 12 months of visit date',
    });
  });

  it('accepts the visit day up to 12 months later', () => {
    expect(checkNextAppointment('2026-11-04', '2026-11-04')).toBeNull();
    expect(checkNextAppointment('2027-11-04', '2026-11-04')).toBeNull();
  });
});

describe('height and weight', () => {
  it('warns when the height is smaller than the weight', () => {
    expect(checkHeightWeight(60, 61)).toEqual({ level: 'warning', message: 'The height should be larger than the weight' });
  });

  it('accepts a larger height, or a missing value', () => {
    expect(checkHeightWeight(162, 61)).toBeNull();
    expect(checkHeightWeight(null, 61)).toBeNull();
  });
});

describe('height history', () => {
  const adultHistory = [
    { height: 160, date: '2025-01-10' },
    { height: 162, date: '2025-06-10' },
    { height: 161, date: '2026-01-10' },
  ];

  it('warns about an adult height more than a standard deviation from the mean', () => {
    expect(checkHeightHistory(170, 30, adultHistory, '2026-11-04')).toEqual({
      level: 'warning',
      message: 'Adult height is an outlier please check!',
    });
    expect(checkHeightHistory(161, 30, adultHistory, '2026-11-04')).toBeNull();
  });

  it("warns when a child's height goes down", () => {
    const childHistory = [
      { height: 100, date: '2025-01-10' },
      { height: 110, date: '2026-01-10' },
    ];
    expect(checkHeightHistory(105, 6, childHistory, '2026-11-04')).toEqual({
      level: 'warning',
      message: 'Child height should not decrease overtime. On a previous visit (Jan 10th 26) we had a recorded height of: 110 cm',
    });
    expect(checkHeightHistory(112, 6, childHistory, '2026-11-04')).toBeNull();
  });

  it('only compares a child with earlier visits', () => {
    expect(checkHeightHistory(100, 6, [{ height: 110, date: '2026-12-01' }], '2026-11-04')).toBeNull();
  });
});

describe('duplicate', () => {
  const existing = [{ date: '2026-11-04T09:00:00.000+0200', encounterUuid: 'e1' }];

  it('blocks a new encounter of the same type on the same day', () => {
    expect(checkDuplicate('2026-11-04', existing)).toEqual({
      level: 'error',
      message: 'Please check the mastercard! This is a duplicate encounter',
    });
  });

  it('allows editing that encounter, and other days', () => {
    expect(checkDuplicate('2026-11-04', existing, 'e1')).toBeNull();
    expect(checkDuplicate('2026-11-05', existing)).toBeNull();
  });
});

describe('viral load results clear each other', () => {
  const all = { result: 1200, lessThanLimit: 40, ldl: true };

  it('a numeric result clears < and LDL', () => {
    expect(clearViralLoadResults('numeric', all)).toEqual({ result: 1200, lessThanLimit: null, ldl: false });
  });

  it('a < limit clears the numeric result and LDL', () => {
    expect(clearViralLoadResults('lessThan', all)).toEqual({ result: null, lessThanLimit: 40, ldl: false });
  });

  it('LDL clears both numbers', () => {
    expect(clearViralLoadResults('ldl', all)).toEqual({ result: null, lessThanLimit: null, ldl: true });
  });

  it('clearing a field clears nothing else', () => {
    expect(clearViralLoadResults('numeric', { result: null, lessThanLimit: 40, ldl: false })).toEqual({
      result: null,
      lessThanLimit: 40,
      ldl: false,
    });
  });
});

describe('sameDayValue', () => {
  const obs = [
    { value: 61, obsDatetime: '2026-11-04T08:00:00.000+0200', encounterUuid: 'vitals' },
    { value: 59, obsDatetime: '2026-11-03T08:00:00.000+0200', encounterUuid: 'old' },
  ];

  it('picks the value recorded on the visit day', () => {
    expect(sameDayValue(obs, '2026-11-04')).toBe(61);
  });

  it('ignores other days and the excluded encounter', () => {
    expect(sameDayValue(obs, '2026-11-05')).toBeNull();
    expect(sameDayValue(obs, '2026-11-04', 'vitals')).toBeNull();
  });
});

describe('adherencePercent', () => {
  it('is the tablets taken over the tablets expected, one a day', () => {
    // 90 given, 4 left after 90 days: 86 of 90 taken
    expect(adherencePercent(4, 90, 90)).toBe(96);
  });

  it('is capped at 100 and unknown without the numbers', () => {
    expect(adherencePercent(0, 90, 60)).toBe(100);
    expect(adherencePercent(null, 90, 90)).toBeNull();
    expect(adherencePercent(4, null, 90)).toBeNull();
    expect(adherencePercent(4, 90, 0)).toBeNull();
  });
});

describe('viralLoadDue, as the routine viral load alerts', () => {
  const due = (lineStart: string | null, lastViralLoad: string | null, today = '2026-11-04') => viralLoadDue({ lineStart, lastViralLoad, today });

  it('is not due in the first 6 months on a line', () => {
    expect(due('2026-06-01', null)).toBe(false);
  });

  it('is due from 6 months on a line with no viral load since it started', () => {
    expect(due('2026-04-01', null)).toBe(true);
    expect(due('2026-04-01', '2026-03-01')).toBe(true);
    expect(due('2026-04-01', '2026-10-01')).toBe(false);
  });

  it('after a year on a line, is due when the last viral load is over 12 months old', () => {
    expect(due('2019-02-18', '2025-09-02')).toBe(true);
    expect(due('2019-02-18', '2026-02-01')).toBe(false);
    expect(due('2019-02-18', null)).toBe(true);
  });

  it('is not due without a line start', () => {
    expect(due(null, null)).toBe(false);
  });
});
