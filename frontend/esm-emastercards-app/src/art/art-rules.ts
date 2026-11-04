import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import { type FieldValue } from './obs-diff';

dayjs.extend(advancedFormat);

/**
 * The ART card's validation rules, ported from art-visit.xml's script and the flowsheet's mastercard.js
 * (omod/src/main/webapp/resources/scripts/mastercard.js), with the same messages. An error stops the save, as it
 * does there; a warning only tells the clinician.
 */
export type RuleResult = { level: 'error' | 'warning'; message: string } | null;

const error = (message: string): RuleResult => ({ level: 'error', message });
const warning = (message: string): RuleResult => ({ level: 'warning', message });

function day(date: string) {
  return dayjs(date).format('YYYY-MM-DD');
}

/**
 * art-visit.xml's validateArtRegimen: the regimen is required; one that differs from the last visit's gets a
 * warning, unless it was recorded at an earlier visit, which is an error. Only regimens recorded before the visit
 * day count, and never the encounter being edited.
 */
export function checkRegimen(
  selected: string | null,
  history: Array<{ regimen: string; date: string; encounterUuid: string }>,
  encounterDate: string,
  editingEncounterUuid?: string,
): RuleResult {
  if (!selected) {
    return error('Required');
  }
  const before = history
    .filter((h) => h.encounterUuid !== editingEncounterUuid && day(h.date) < day(encounterDate))
    .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
  if (!before.length || before[0].regimen.toLowerCase() === selected.toLowerCase()) {
    return null;
  }
  const earlier = before.find((h) => h.regimen.toLowerCase() === selected.toLowerCase());
  if (earlier) {
    return error(
      `Regimen has been recorded in the past( ${dayjs(earlier.date).format('ddd MMM DD YYYY')} ) but not on the last visit`,
    );
  }
  return warning('Regimen is different from regimen at last visit');
}

/** mastercard.js's validateAppointmentDate: required, not before the visit and within 12 months of it */
export function checkNextAppointment(next: string | null, visitDate: string): RuleResult {
  if (!next) {
    return error('Required');
  }
  const months = dayjs(day(next)).diff(dayjs(day(visitDate)), 'month', true);
  if (months < 0) {
    return error('Cannot be in the past');
  }
  if (months > 12) {
    return error('Must be within 12 months of visit date');
  }
  return null;
}

/** mastercard.js's validateHeightAndWeight: a warning */
export function checkHeightWeight(height: number | null, weight: number | null): RuleResult {
  if (height > 0 && weight > 0 && height < weight) {
    return warning('The height should be larger than the weight');
  }
  return null;
}

/**
 * mastercard.js's validateHeight, both warnings: from age 20, a height more than one (population) standard
 * deviation from the patient's other ART visit heights; before, a height below one recorded at an earlier visit
 */
export function checkHeightHistory(
  height: number | null,
  ageYears: number,
  history: Array<{ height: number; date: string }>,
  visitDate: string,
): RuleResult {
  if (!(height > 0) || !history.length) {
    return null;
  }
  if (ageYears >= 20) {
    const values = history.map((h) => h.height);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdev = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
    return Math.abs(height - mean) > stdev ? warning('Adult height is an outlier please check!') : null;
  }
  const taller = [...history]
    .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
    .find((h) => day(h.date) < day(visitDate) && height < h.height);
  return taller
    ? warning(
        `Child height should not decrease overtime. On a previous visit (${dayjs(taller.date).format('MMM Do YY')}) we had a recorded height of: ${taller.height} cm`,
      )
    : null;
}

/** mastercard.js's duplicate-encounter check: a new encounter can't share its day with one of the same type */
export function checkDuplicate(
  visitDate: string,
  existing: Array<{ date: string; encounterUuid: string }>,
  editingEncounterUuid?: string,
): RuleResult {
  if (editingEncounterUuid) {
    return null;
  }
  return existing.some((e) => day(e.date) === day(visitDate))
    ? error('Please check the mastercard! This is a duplicate encounter')
    : null;
}

interface ViralLoadResults {
  result: number | null;
  lessThanLimit: number | null;
  ldl: boolean;
}

/** mastercard.js's setupViralLoadValidation: a numeric result, a "<" limit and LDL each clear the other two */
export function clearViralLoadResults(changed: 'numeric' | 'lessThan' | 'ldl', values: ViralLoadResults): ViralLoadResults {
  const given = (n: number | null) => n !== null && n !== undefined && !Number.isNaN(Number(n));
  if (changed === 'numeric' && given(values.result)) {
    return { ...values, lessThanLimit: null, ldl: false };
  }
  if (changed === 'lessThan' && given(values.lessThanLimit)) {
    return { ...values, result: null, ldl: false };
  }
  if (changed === 'ldl' && values.ldl) {
    return { ...values, result: null, lessThanLimit: null };
  }
  return values;
}

/**
 * The value recorded on the visit day in another encounter (newest first), which obsreference fields show and
 * the next appointment is prefilled from
 */
export function sameDayValue(
  obs: Array<{ value: FieldValue; obsDatetime: string; encounterUuid: string }>,
  visitDate: string,
  excludeEncounterUuid?: string,
): FieldValue {
  const found = obs.find((o) => o.encounterUuid !== excludeEncounterUuid && day(o.obsDatetime) === day(visitDate));
  return found ? found.value : null;
}

/** The percentage of the tablets expected to be taken, one a day, that were; shown only, never saved */
export function adherencePercent(
  pillsLeft: number | null,
  dispensedLastVisit: number | null,
  daysSinceLastVisit: number,
): number | null {
  if (pillsLeft === null || pillsLeft === undefined || !dispensedLastVisit || !(daysSinceLastVisit > 0)) {
    return null;
  }
  const percent = Math.round((100 * (dispensedLastVisit - pillsLeft)) / daysSinceLastVisit);
  return Math.max(0, Math.min(100, percent));
}

/**
 * Whether a routine viral load is due, as the due-for-routine-viral-load alerts say: 6 months after starting an ART
 * line when none has been done since, then whenever the last one is over 12 months old
 */
export function viralLoadDue({ lineStart, lastViralLoad, today }: { lineStart: string | null; lastViralLoad: string | null; today: string }): boolean {
  if (!lineStart) {
    return false;
  }
  const daysOnLine = dayjs(day(today)).diff(day(lineStart), 'day');
  const noneSinceStart = !lastViralLoad || day(lastViralLoad) < day(lineStart);
  if (daysOnLine > 360) {
    return noneSinceStart || dayjs(day(today)).diff(day(lastViralLoad), 'day') > 360;
  }
  return daysOnLine > 180 && noneSinceStart;
}
