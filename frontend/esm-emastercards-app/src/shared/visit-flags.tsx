import React from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { InlineNotification } from '@carbon/react';
import { formatDay } from '../art/art-fields';
import styles from '../care-page.scss';

/**
 * What the legacy flowsheet (mastercard.js's afterShowVisitTable) flags on the encounters a card already holds, each
 * time it shows them: an inconsistent height and encounters of the form on the same day. The panels check a visit
 * being recorded; this checks what was saved, in O3 or in the legacy forms.
 *
 * Heights are judged by age at the visit, as the flowsheet judges a height being entered (validateHeight): from 20, one
 * more than one (population) standard deviation from the patient's other adult heights on the form; before, one lower
 * than a height recorded at an earlier visit. The flowsheet's table applied the standard deviation at every age, which
 * flags a growing child's first and latest heights; without a birth date this does the same.
 */
export interface VisitFlags {
  /** Encounters whose height is an outlier */
  heightOutliers: Set<string>;
  /** Encounters sharing their day with another of the same form */
  duplicates: Set<string>;
}

interface Flaggable {
  uuid: string;
  encounterDatetime: string;
}

const day = (date: string) => dayjs(date).format('YYYY-MM-DD');

/** Heights more than one (population) standard deviation from their mean */
function outliers(heights: Array<{ uuid: string; height: number }>): Array<string> {
  if (!heights.length) {
    return [];
  }
  const mean = heights.reduce((a, h) => a + h.height, 0) / heights.length;
  const stdev = Math.sqrt(heights.reduce((a, h) => a + (h.height - mean) ** 2, 0) / heights.length);
  return heights.filter((h) => Math.abs(h.height - mean) > stdev).map((h) => h.uuid);
}

export function visitFlags<T extends Flaggable>(encounters: Array<T>, heightOf?: (e: T) => unknown, birthDate?: string | null): VisitFlags {
  const heightOutliers = new Set<string>();
  if (heightOf) {
    // as the flowsheet reads it: the height shown, as a whole number, when there is one
    const heights = encounters
      .map((e) => ({ uuid: e.uuid, date: day(e.encounterDatetime), height: parseInt(String(heightOf(e) ?? ''), 10) }))
      .filter((h) => h.height > 0);
    if (!birthDate) {
      outliers(heights).forEach((u) => heightOutliers.add(u));
    } else {
      const adult = (h: { date: string }) => dayjs(h.date).diff(dayjs(birthDate), 'year') >= 20;
      outliers(heights.filter(adult)).forEach((u) => heightOutliers.add(u));
      heights
        .filter((h) => !adult(h) && heights.some((earlier) => earlier.date < h.date && earlier.height > h.height))
        .forEach((h) => heightOutliers.add(h.uuid));
    }
  }
  const byDay = new Map<string, Array<string>>();
  encounters.forEach((e) => byDay.set(day(e.encounterDatetime), [...(byDay.get(day(e.encounterDatetime)) ?? []), e.uuid]));
  const duplicates = new Set([...byDay.values()].filter((uuids) => uuids.length > 1).flat());
  return { heightOutliers, duplicates };
}

/** A row's props: duplicates highlighted, as the flowsheet does */
export const flaggedRow = (flags: VisitFlags, uuid: string) =>
  flags.duplicates.has(uuid) ? { className: styles.flaggedRow, 'data-flag': 'duplicate' } : {};

/** A height cell's content, highlighted when it is an outlier */
export const flaggedHeight = (flags: VisitFlags, uuid: string, content: React.ReactNode) =>
  flags.heightOutliers.has(uuid) ? (
    <span className={styles.flaggedValue} data-flag="height">
      {content}
    </span>
  ) : (
    content
  );

/** Above the table, what to check and on which days, as the flowsheet's message says it */
export const VisitFlagsNotice: React.FC<{ encounters: Array<Flaggable>; flags: VisitFlags }> = ({ encounters, flags }) => {
  const { t } = useTranslation();
  const days = (uuids: Set<string>) => [
    ...new Set(
      encounters
        .filter((e) => uuids.has(e.uuid))
        .sort((a, b) => dayjs(a.encounterDatetime).valueOf() - dayjs(b.encounterDatetime).valueOf())
        .map((e) => formatDay(e.encounterDatetime)),
    ),
  ];
  const heights = days(flags.heightOutliers);
  const duplicates = days(flags.duplicates);
  if (!heights.length && !duplicates.length) {
    return null;
  }
  return (
    <div className={styles.flagsNotice}>
      {heights.length > 0 && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={t('checkHeight', 'Please check the height for {{days}}', {
            days: heights.join(', '),
            interpolation: { escapeValue: false },
          })}
          subtitle={t('checkHeightWhy', "An adult's height far from their other heights on this card, or a child's lower than at an earlier visit.")}
        />
      )}
      {duplicates.length > 0 && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={t('checkDuplicateEncounters', 'Please check the duplicate encounters on {{days}}', {
            days: duplicates.join(', '),
            interpolation: { escapeValue: false },
          })}
          subtitle={t('checkDuplicateEncountersWhy', 'There is more than one on the same day.')}
        />
      )}
    </div>
  );
};
