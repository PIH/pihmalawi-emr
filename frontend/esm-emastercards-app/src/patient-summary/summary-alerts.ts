import dayjs from 'dayjs';

/**
 * The legacy patient summary's alerts on weight and BMI (printableSummary.gsp and PrintableSummaryPageController),
 * for the patient summary's vitals and biometrics
 */

/**
 * The weight lost over a year, as a whole percent, when it is 10 % or more; else null. As the legacy summary measures
 * it: the latest weight against the most recent one at least 12 months before it.
 */
export function oneYearWeightLoss(weights: Array<{ value: number | boolean | null; date: string }>): number | null {
  const numeric = weights
    .filter((w): w is { value: number; date: string } => typeof w.value === 'number' && w.value > 0)
    .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
  const [latest] = numeric;
  const yearBefore = latest && numeric.find((w) => dayjs(latest.date).diff(dayjs(w.date), 'month') >= 12);
  if (!yearBefore) {
    return null;
  }
  const change = ((latest.value - yearBefore.value) * 100) / yearBefore.value;
  return change <= -10 ? Math.round(Math.abs(change)) : null;
}

/**
 * Whether a BMI is low, below 19, as the legacy summary flags it. Only from 18 years old, as the clinic's BMI alerts
 * (ic3-alerts.json) judge it: below that BMI isn't read against adult cut-offs.
 */
export function lowBmi(bmi: number | null, ageYears: number | null): boolean {
  return bmi !== null && ageYears !== null && ageYears >= 18 && bmi < 19;
}
