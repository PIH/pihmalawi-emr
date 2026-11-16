import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification } from '@carbon/react';
import { type ArtField, displayValue, formatDay } from '../art/art-fields';
import { type ArtEncounter, encounterValues, useCardEncounters, useEMastercard, useObsOnDays } from '../art/art.resource';
import { enrolmentText } from '../emastercards.resource';
import {
  type Column,
  day,
  EncounterTable,
  HeaderSectionCard,
  Headline,
  MonitoringCard,
  type MonitoringRow,
  RedIf,
  type Referenced,
  shown,
  TableCard,
} from '../shared/ncd-card';
import { capitalized, conditionKey, type PdcCondition, type PdcSummaryItem } from './pdc-condition';
import { launchConditionPanel, useLaunchConditionPanel } from './launch-pdc-condition-panel';
import { PDC_FORMS } from './pdc-concepts';
import { PDC_HEADER_FIELDS } from './pdc-fields';
import PdcSharedRecords from './pdc-shared-records.component';
import styles from '../care-page.scss';

/** How many of the latest visits the monitoring table shows */
const RECENT_VISITS = 4;
/** How many of the latest visits show values recorded the same day in other encounters, e.g. vitals */
const REFERENCED_VISITS = 12;

const CONDITIONS = PDC_HEADER_FIELDS.find((f) => f.name === 'conditions');

/** A visit's answer as the page shows it: a grouped one from its group, an obsreference one from the same day */
function answer(v: ArtEncounter | undefined, field: ArtField | undefined, referenced: Referenced): string | null {
  if (!v || !field) {
    return null;
  }
  return field.group ? displayValue(field, encounterValues([field], v)[field.name]) : shown(v, field, referenced);
}

const raw = (v: ArtEncounter, field: ArtField) => encounterValues([field], v)[field.name];

interface PdcConditionCardProps {
  condition: PdcCondition;
  patientUuid: string;
  /** The chart page's title, e.g. Pediatric Development (PDC) */
  title: string;
  tabs?: React.ReactNode;
}

/**
 * A PDC condition card (e.g. HIE / developmental delay, trisomy 21, cleft lip / palate), natively in O3: the headline, the card header's
 * sections, monitoring, laboratory tests and the visits, then the records every PDC condition card shares
 * (hospitalisations, complications, vision, hearing and radiology screening), each edited in its own side panel. Its
 * conditions at enrolment are the PDC card's.
 */
const PdcConditionCard: React.FC<PdcConditionCardProps> = ({ condition, patientUuid, title, tabs }) => {
  const { t } = useTranslation();
  const F = condition.visitFields;
  const { card, isLoading, error } = useEMastercard(patientUuid, condition.key);
  const { encounters: headers } = useCardEncounters(patientUuid, condition.forms.header);
  const { encounters: visits } = useCardEncounters(patientUuid, condition.forms.visit);
  const { encounters: labs } = useCardEncounters(patientUuid, condition.forms.labs);
  const { encounters: pdcHeaders } = useCardEncounters(patientUuid, PDC_FORMS.header);
  const referenced = useObsOnDays(
    patientUuid,
    Object.values(F)
      .filter((f) => f.reference)
      .map((f) => f.concept),
    [...new Set(visits.slice(0, REFERENCED_VISITS).map((v) => day(v.encounterDatetime)))],
  );
  const launch = useLaunchConditionPanel(patientUuid, condition);
  const k = (pattern: string) => conditionKey(condition, pattern);

  if (isLoading) {
    return <InlineLoading description={t('loading', 'Loading...')} />;
  }
  if (error) {
    return (
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title={t('loadError', 'Could not load the eMastercards')}
        subtitle={error.message}
      />
    );
  }
  if (!card || card.state === 'UNAVAILABLE') {
    return (
      <div className={styles.page}>
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={card?.message ?? t(k('no{P}Card'), `This patient has no ${condition.name} patient card.`)}
        />
      </div>
    );
  }

  const canEdit = card.state === 'CREATE' || card.state === 'EDIT';
  const canRecord = card.state === 'EDIT';
  const header = headers.find((e) => e.uuid === card.initialEncounterUuid) ?? (headers.length === 1 ? headers[0] : null);
  const latest = visits[0];
  const a = (v: ArtEncounter | undefined, field: ArtField | undefined) => answer(v, field, referenced);
  const isYes = (v: ArtEncounter, field: ArtField | undefined) => a(v, field) === 'Yes';
  const withGrowth = visits.find((v) => a(v, F.weight) || a(v, F.height) || a(v, F.muac));
  const withMalnutrition = visits.find((v) => a(v, F.malnutrition));
  const withMdat = visits.find((v) => a(v, F.mdatSummary));
  const next = a(latest, F.nextAppointment);
  const conditions = displayValue(CONDITIONS, encounterValues([CONDITIONS], pdcHeaders[0]).conditions);
  const description = [
    t(k('{p}PatientCard'), `${capitalized(condition.name)} patient card`),
    t('cardVersion', 'version {{version}}', { version: condition.version }),
    enrolmentText(card, t, formatDay),
  ]
    .filter(Boolean)
    .join(' · ');
  const on = (v: ArtEncounter) => t('assessed', 'Assessed {{date}}', { date: formatDay(v.encounterDatetime) });
  const onEdit = (panel: 'visit' | 'labs') =>
    canEdit ? (e: ArtEncounter) => launchConditionPanel(condition, panel, { patientUuid, encounterUuid: e.uuid }) : undefined;

  const section = (key: string) => (
    <HeaderSectionCard
      key={key}
      title={t(`${condition.prefix}Section_${key}`, condition.headerSections[key].title)}
      fields={condition.headerSections[key].fields}
      header={header}
      canEdit={canEdit}
      onEdit={() => launchConditionPanel(condition, 'header', { patientUuid, section: key })}
      onStart={() => launchConditionPanel(condition, 'header', { patientUuid, section: 'start' })}
    />
  );

  /** A monitoring row's or visit column's cell */
  const cell = (item: PdcSummaryItem, v: ArtEncounter): React.ReactNode => {
    const [first, second] = item.fields;
    if (item.mode === 'yes') {
      return (
        item.fields
          .filter((f) => isYes(v, f))
          .map((f) => f.label)
          .join(', ') || null
      );
    }
    if (item.mode === 'drug') {
      return [a(v, first), second && isYes(v, second) ? t('doseAdjusted', 'dose adjusted') : null].filter(Boolean).join(', ') || null;
    }
    if (item.alert) {
      return <RedIf value={a(v, first)} raised={item.alert(raw(v, first))} />;
    }
    return a(v, first);
  };
  const label = (item: PdcSummaryItem) => t(`pdcSummary_${item.key}`, item.label);

  const monitoringRows: Array<MonitoringRow> = condition.monitoring.map((item) => ({
    key: item.key,
    label: label(item),
    cell: (v) => cell(item, v) ?? '–',
  }));

  const visitColumns: Array<Column> = [
    { key: 'date', header: t('visitDate', 'Visit date') },
    { key: 'location', header: t('location', 'Location') },
    ...condition.visitColumns.map((item) => ({ key: item.key, header: label(item) })),
    { key: 'referredOut', header: t('referredOut', 'Referred out') },
    { key: 'next', header: t('nextAppointment', 'Next appointment') },
  ];
  const visitCells = (v: ArtEncounter): Record<string, React.ReactNode> => {
    const values = encounterValues(Object.values(F), v);
    // where to, else that the child was, with what either was specified as
    const referral = [
      (F.referredTo && displayValue(F.referredTo, values.referredTo)) ?? (isYes(v, F.referredOut) ? t('yes', 'Yes') : null),
      values.referredToOther,
      values.referredOutSpecify,
    ]
      .filter(Boolean)
      .join(' · ');
    return {
      date: formatDay(v.encounterDatetime),
      location: v.location?.display ?? null,
      ...Object.fromEntries(condition.visitColumns.map((item) => [item.key, cell(item, v)])),
      referredOut: referral || null,
      next: a(v, F.nextAppointment),
    };
  };

  const labColumns: Array<Column> = [
    { key: 'date', header: t('date', 'Date') },
    ...condition.labs.columns.map((c) => ({ key: c.key, header: t(`pdcLab_${c.key}`, c.label) })),
  ];
  const labCells = (e: ArtEncounter): Record<string, React.ReactNode> => {
    const values = encounterValues(condition.labs.fields, e);
    return {
      date: formatDay(e.encounterDatetime),
      ...Object.fromEntries(
        condition.labs.columns.map((c) => {
          const parts = c.items.flatMap(({ field, prefix }) => {
            const value = displayValue(field, values[field.name]);
            if (!value) {
              return [];
            }
            // a result with its own date, when it was from another day than the tests were recorded
            const own = field.obsDate ? (values[field.obsDate] as string | null) : null;
            const ownDay = own && own !== day(e.encounterDatetime) ? formatDay(own) : null;
            const shownValue = prefix ? t(`pdcLabPrefix_${field.name}`, `${prefix}: {{answer}}`, { answer: value }) : value;
            return [shownValue, ownDay].filter(Boolean);
          });
          return [c.key, parts.join(' · ') || null];
        }),
      ),
    };
  };

  const growthDetail = withGrowth
    ? [
        a(withGrowth, F.weight) && a(withGrowth, F.height) && `${t('height', 'Height')} ${a(withGrowth, F.height)}`,
        a(withGrowth, F.muac) && `${t('muac', 'MUAC')} ${a(withGrowth, F.muac)}`,
        t('measured', 'Measured {{date}}', { date: formatDay(withGrowth.encounterDatetime) }),
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>{t('careAndTreatment', 'Care and treatment')}</span>
          <h3 className={styles.title}>{title}</h3>
          <span className={styles.description}>{description}</span>
        </div>
        {canEdit && (
          <div className={styles.actions}>
            <Button kind="primary" size="md" disabled={!canRecord} onClick={() => launch('visit')}>
              {t(k('record{P}Visit'), `Record ${condition.name} visit`)}
            </Button>
          </div>
        )}
      </div>

      {tabs}

      {card.state === 'VIEW' && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title={card.message ?? t('viewOnly', 'You can view this card but not change it.')}
        />
      )}
      {card.state === 'CREATE' && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title={t(k('start{P}CardFirst'), 'Start the card first: visits and laboratory tests can be recorded once it has been saved.')}
        />
      )}

      <section aria-label={t(k('{p}AtAGlance'), `${capitalized(condition.name)} at a glance`)} className={styles.headlines}>
        <Headline label={t('pdcConditionsAtEnrolment', 'Conditions at enrolment')} value={conditions} />
        <Headline
          label={t('growth', 'Growth')}
          value={withGrowth ? (a(withGrowth, F.weight) ?? a(withGrowth, F.height) ?? a(withGrowth, F.muac)) : null}
          detail={growthDetail}
        />
        <Headline
          label={t('malnutrition', 'Malnutrition')}
          value={withMalnutrition ? a(withMalnutrition, F.malnutrition) : null}
          detail={withMalnutrition ? on(withMalnutrition) : null}
          alert={withMalnutrition ? condition.malnourished(raw(withMalnutrition, F.malnutrition)) : false}
        />
        <Headline
          label={t('mdatSummaryNormal', 'MDAT summary normal')}
          value={withMdat ? a(withMdat, F.mdatSummary) : null}
          detail={withMdat ? on(withMdat) : null}
        />
        <Headline
          label={t('nextAppointment', 'Next appointment')}
          value={next}
          detail={next ? t('booked', 'Booked {{date}}', { date: formatDay(latest.encounterDatetime) }) : null}
        />
      </section>

      <div className={styles.cards}>{Object.keys(condition.headerSections).map(section)}</div>

      <div className={styles.cards}>
        <MonitoringCard
          visits={visits}
          count={RECENT_VISITS}
          rows={monitoringRows}
          empty={t(k('no{P}Visits'), `No ${condition.name} visits recorded yet`)}
        />
        <TableCard title={t('labTests', 'Laboratory Tests')} onRecord={canRecord ? () => launch('labs') : undefined}>
          <EncounterTable
            label={t('labTests', 'Laboratory Tests')}
            columns={labColumns}
            encounters={labs}
            cells={labCells}
            onEdit={onEdit('labs')}
            empty={t('noLabTests', 'No tests recorded yet')}
          />
        </TableCard>
      </div>

      <TableCard title={t(k('{p}Visits'), `${condition.title} Visits`)}>
        <EncounterTable
          label={t(k('{p}Visits'), `${condition.title} Visits`)}
          columns={visitColumns}
          encounters={visits}
          cells={visitCells}
          onEdit={onEdit('visit')}
          empty={t(k('no{P}Visits'), `No ${condition.name} visits recorded yet`)}
        />
      </TableCard>

      <PdcSharedRecords patientUuid={patientUuid} cardKey={condition.key} canRecord={canRecord} canEdit={canEdit} />
    </div>
  );
};

export default PdcConditionCard;
