import React from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from '@carbon/react';
import { type ArtField, displayValue, formatDay } from '../art/art-fields';
import { sameDayValue } from '../art/art-rules';
import { type ArtEncounter, encounterValues, obsValue } from '../art/art.resource';
import { type FieldValue } from '../art/obs-diff';
import { type CardMedication, MedicationEntry, medicationChanges } from './medications';
import styles from '../care-page.scss';

/** The NCD card pages' shared parts: headlines, header section cards, tables of encounters, monitoring, medications */

export const day = (date: string) => dayjs(date).format('YYYY-MM-DD');

/** Obs recorded on each of some days in any encounter, by day and concept (useObsOnDays) */
export type Referenced = Record<string, Record<string, Array<{ value: FieldValue; obsDatetime: string; encounterUuid: string }>>>;

/**
 * A visit's answer to a question, or for an obsreference field without one, the value recorded the same day in
 * another encounter, as the flowsheet shows it
 */
export function valueOf(v: ArtEncounter | undefined, field: ArtField, referenced: Referenced = {}): FieldValue {
  if (!v) {
    return null;
  }
  const own = obsValue(v, field.concept, field.kind === 'multi');
  if ((own !== null && !(Array.isArray(own) && !own.length)) || !field.reference) {
    return own;
  }
  return sameDayValue(referenced[day(v.encounterDatetime)]?.[field.concept.toLowerCase()] ?? [], v.encounterDatetime);
}

export const shown = (v: ArtEncounter | undefined, field: ArtField, referenced: Referenced = {}) =>
  displayValue(field, valueOf(v, field, referenced));

/** A form's answers as table cells, those in obs groups (e.g. an HIV test) included */
export function fieldCells(fields: Array<ArtField>, e: ArtEncounter, referenced: Referenced = {}) {
  const values = encounterValues(fields, e);
  return {
    date: formatDay(e.encounterDatetime),
    ...Object.fromEntries(
      fields
        .filter((f) => !f.hidden)
        .map((f) => [f.name, f.reference && values[f.name] === null ? shown(e, f, referenced) : displayValue(f, values[f.name])]),
    ),
  };
}

/** A value in red when it is raised, e.g. a blood pressure at or above 140/90 */
export const RedIf: React.FC<{ value: string | null; raised: boolean }> = ({ value, raised }) =>
  value ? <span className={raised ? styles.present : undefined}>{value}</span> : <>–</>;

export const Headline: React.FC<{ label: string; value: string | null; detail?: string | null; alert?: boolean }> = ({
  label,
  value,
  detail,
  alert,
}) => (
  <div className={styles.headline}>
    <span className={styles.label}>{label}</span>
    <span className={alert ? `${styles.value} ${styles.present}` : styles.value}>{value ?? '–'}</span>
    {detail && <span className={styles.detail}>{detail}</span>}
  </div>
);

export interface Column {
  key: string;
  header: string;
}

/** A form's encounters as a table, each row edited in the form's panel */
export const EncounterTable: React.FC<{
  label: string;
  columns: Array<Column>;
  encounters: Array<ArtEncounter>;
  cells: (e: ArtEncounter) => Record<string, React.ReactNode>;
  onEdit?: (e: ArtEncounter) => void;
  empty: string;
}> = ({ label, columns, encounters, cells, onEdit, empty }) => {
  const { t } = useTranslation();
  if (!encounters.length) {
    return <p className={styles.empty}>{empty}</p>;
  }
  return (
    <div className={styles.tableWrapper}>
      <Table aria-label={label} size="sm">
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableHeader key={c.key}>{c.header}</TableHeader>
            ))}
            {onEdit && <TableHeader aria-label={t('actions', 'Actions')} />}
          </TableRow>
        </TableHead>
        <TableBody>
          {encounters.map((e) => {
            const row = cells(e);
            return (
              <TableRow key={e.uuid}>
                {columns.map((c) => (
                  <TableCell key={c.key}>{row[c.key] ?? ''}</TableCell>
                ))}
                {onEdit && (
                  <TableCell>
                    <Button kind="ghost" size="sm" onClick={() => onEdit(e)}>
                      {t('editSection', 'Edit')}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

/** A card of the page holding a table, with a button to record a new encounter */
export const TableCard: React.FC<{ title: string; onRecord?: () => void; children: React.ReactNode }> = ({ title, onRecord, children }) => {
  const { t } = useTranslation();
  return (
    <section aria-label={title} className={styles.card}>
      <div className={styles.cardHeader}>
        <h4 className={styles.cardTitle}>{title}</h4>
        {onRecord && (
          <Button kind="ghost" size="sm" onClick={onRecord}>
            {t('record', 'Record')}
          </Button>
        )}
      </div>
      {children}
    </section>
  );
};

/**
 * A header section's answers as the page lists them: the diagnoses, complications or exposures ticked, with their
 * dates and under their heading, then every other answer by its label
 */
export function sectionRows(fields: Array<ArtField>, header: ArtEncounter | null) {
  const values = encounterValues(fields, header);
  const listed = fields
    .filter((f) => f.checkbox && f.group && values[f.name])
    .map((f) => ({ key: f.name, value: [f.label, formatDay(values[`${f.name}Date`] as string)].filter(Boolean).join(' · ') }));
  // the label the checkboxes are asked under, e.g. Complications
  const heading = fields.find((f) => f.checkbox && f.heading)?.heading ?? null;
  const dated = new Set(fields.filter((f) => f.checkbox && f.group).map((f) => `${f.name}Date`));
  const labelled = fields
    .filter((f) => !(f.checkbox && f.group) && !dated.has(f.name))
    .map((f) => ({ key: f.name, label: f.label, value: displayValue(f, values[f.name]) }))
    .filter((r) => r.value !== null);
  return { listed, labelled, heading };
}

/** A section of the card header, edited in the header panel, or the card started from it until the header exists */
export const HeaderSectionCard: React.FC<{
  title: string;
  fields: Array<ArtField>;
  header: ArtEncounter | null;
  canEdit: boolean;
  onEdit: () => void;
  onStart: () => void;
}> = ({ title, fields, header, canEdit, onEdit, onStart }) => {
  const { t } = useTranslation();
  const { listed, labelled, heading } = sectionRows(fields, header);
  return (
    <section aria-label={title} className={styles.card}>
      <div className={styles.cardHeader}>
        <h4 className={styles.cardTitle}>{title}</h4>
        {canEdit && (
          <Button kind="ghost" size="sm" onClick={header ? onEdit : onStart}>
            {header ? t('editSection', 'Edit') : t('startCard', 'Start the card')}
          </Button>
        )}
      </div>
      {listed.length > 0 && heading && <h5 className={styles.subsectionHeader}>{t(`heading_${heading}`, heading)}</h5>}
      {listed.length > 0 && (
        <ul className={styles.history}>
          {listed.map((r) => (
            <li key={r.key}>{r.value}</li>
          ))}
        </ul>
      )}
      {labelled.length > 0 && (
        <dl className={styles.fields}>
          {labelled.map((r) => (
            <React.Fragment key={r.key}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}
      {!listed.length && !labelled.length && <p className={styles.empty}>{t('notRecorded', 'Not recorded yet')}</p>}
    </section>
  );
};

export interface MonitoringRow {
  key: string;
  label: string;
  cell: (v: ArtEncounter) => React.ReactNode;
}

/** The latest visits' findings, a column per visit, as the mental status examination is shown on the mental health card */
export const MonitoringCard: React.FC<{ visits: Array<ArtEncounter>; count: number; rows: Array<MonitoringRow>; empty: string }> = ({
  visits,
  count,
  rows,
  empty,
}) => {
  const { t } = useTranslation();
  const recent = visits.slice(0, count);
  return (
    <section aria-label={t('monitoring', 'Monitoring')} className={styles.card}>
      <div className={styles.cardHeader}>
        <h4 className={styles.cardTitle}>{t('monitoring', 'Monitoring')}</h4>
        {recent.length > 0 && <span className={styles.detail}>{t('lastVisits', 'Last {{count}} visits', { count })}</span>}
      </div>
      {recent.length ? (
        <div className={styles.tableWrapper}>
          <Table aria-label={t('monitoring', 'Monitoring')} size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>{t('finding', 'Finding')}</TableHeader>
                {recent.map((v) => (
                  <TableHeader key={v.uuid}>{formatDay(v.encounterDatetime)}</TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell>{r.label}</TableCell>
                  {recent.map((v) => (
                    <TableCell key={v.uuid}>{r.cell(v)}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className={styles.empty}>{empty}</p>
      )}
    </section>
  );
};

/** The visits at which the medications changed, newest first and the latest marked current */
export const MedicationHistoryCard: React.FC<{ visits: Array<ArtEncounter>; medications: Array<CardMedication> }> = ({ visits, medications }) => {
  const { t } = useTranslation();
  const changes = medicationChanges(visits, medications);
  return (
    <section aria-label={t('medicationHistory', 'Medication History')} className={styles.card}>
      <div className={styles.cardHeader}>
        <h4 className={styles.cardTitle}>{t('medicationHistory', 'Medication History')}</h4>
      </div>
      <ol className={styles.history}>
        {changes.map((c, i) => (
          <li key={c.date}>
            <span className={styles.historyDate}>{formatDay(c.date)}</span>
            <span className={styles.historyRegimen}>
              {c.medications.map((m, j) => (
                <React.Fragment key={j}>
                  {j > 0 && ', '}
                  <MedicationEntry medication={m} />
                </React.Fragment>
              ))}
            </span>
            {i === 0 && (
              <Tag type="green" size="sm">
                {t('current', 'Current')}
              </Tag>
            )}
          </li>
        ))}
      </ol>
      {!changes.length && <p className={styles.empty}>{t('noMedications', 'No medications recorded yet')}</p>}
    </section>
  );
};
