import React from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  Button,
  InlineLoading,
  InlineNotification,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { ART_CARD_VERSION, ART_INITIAL, ART_VISIT, FOLLOW_UP_TESTING, REGIMENS, VIRAL_LOAD } from './art-concepts';
import {
  ART_VISIT_FIELDS,
  type ArtField,
  displayValue,
  FOLLOW_UP_FIELDS,
  formatDay,
  INITIAL_SECTIONS,
  type InitialSection,
  PREVENTIVE_THERAPIES,
  VIRAL_LOAD_FIELDS,
} from './art-fields';
import { viralLoadDue } from './art-rules';
import { type ArtEncounter, memberValue, obsGroups, obsValue, useArtCard, useArtEncounters } from './art.resource';
import { launchArtPanel, useLaunchArtPanel } from './launch-art-panel';
import { enrolmentText } from '../emastercards.resource';
import styles from '../care-page.scss';

interface HivCareDashboardProps {
  patientUuid: string;
}

const regimenOf = (uuid: unknown) => REGIMENS.find((r) => r.uuid.toLowerCase() === String(uuid ?? '').toLowerCase()) ?? null;

/** A regimen with its drugs, e.g. 13A · TDF/3TC/DTG */
const regimenText = (uuid: unknown) => {
  const regimen = regimenOf(uuid);
  return regimen ? [regimen.label, regimen.drugs].filter(Boolean).join(' · ') : null;
};

const number = (value: unknown) => Number(value).toLocaleString('en');

/** The current regimen and the day of the first visit of its latest unbroken run */
function currentRegimen(visits: Array<ArtEncounter>) {
  const withRegimen = visits.filter((v) => obsValue(v, ART_VISIT.artRegimen));
  if (!withRegimen.length) {
    return null;
  }
  const current = obsValue(withRegimen[0], ART_VISIT.artRegimen);
  let since = withRegimen[0];
  for (const visit of withRegimen) {
    if (obsValue(visit, ART_VISIT.artRegimen) !== current) {
      break;
    }
    since = visit;
  }
  return { regimen: regimenOf(current), since: since.encounterDatetime };
}

/** The visits at which the regimen changed (the first visit counting as one), newest first */
function regimenChanges(visits: Array<ArtEncounter>) {
  const oldestFirst = [...visits].reverse().filter((v) => obsValue(v, ART_VISIT.artRegimen));
  const changes: Array<{ date: string; regimen: (typeof REGIMENS)[number] | null }> = [];
  let previous: unknown = null;
  oldestFirst.forEach((v) => {
    const regimen = obsValue(v, ART_VISIT.artRegimen);
    if (regimen !== previous) {
      changes.push({ date: v.encounterDatetime, regimen: regimenOf(regimen) });
      previous = regimen;
    }
  });
  return changes.reverse();
}

/**
 * When the patient started their current ART line, as far as the card says: the latest start date of the header's
 * regimens, else the first ART visit with a regimen, else the card's date
 */
function lineStart(initial: ArtEncounter | null, visits: Array<ArtEncounter>): string | null {
  const starts = ART_INITIAL.regimens.map((slot) => obsValue(initial, slot.startDate) as string | null).filter(Boolean).sort();
  const firstVisit = [...visits].reverse().find((v) => obsValue(v, ART_VISIT.artRegimen));
  return starts.pop() ?? firstVisit?.encounterDatetime ?? initial?.encounterDatetime ?? null;
}

/** A viral load test's result as the card writes it: the number, "<" a limit, or LDL */
function viralLoadResult(encounter: ArtEncounter): string | null {
  const group = obsGroups(encounter, VIRAL_LOAD.group)[0];
  const ldl = memberValue(group, VIRAL_LOAD.ldl);
  const lessThan = memberValue(group, VIRAL_LOAD.lessThanLimit);
  const numeric = memberValue(group, VIRAL_LOAD.result);
  if (ldl === true) {
    return 'LDL';
  }
  if (lessThan !== null) {
    return `<${lessThan}`;
  }
  return numeric !== null ? String(numeric) : null;
}

interface TestRow {
  key: string;
  encounter: ArtEncounter;
  kind: 'viralLoad' | 'followUpTesting';
  test: string;
  result: string;
  reason: string;
}

const field = (fields: Array<ArtField>, name: string) => fields.find((f) => f.name === name);

/** The viral load and follow-up test results, one row a test, newest first */
function testRows(viralLoads: Array<ArtEncounter>, followUps: Array<ArtEncounter>, t: (key: string, fallback: string) => string): Array<TestRow> {
  const vlRows: Array<TestRow> = viralLoads.map((e) => {
    const group = obsGroups(e, VIRAL_LOAD.group)[0];
    const result = viralLoadResult(e);
    const noResult = displayValue(field(VIRAL_LOAD_FIELDS, 'noResultReason'), memberValue(group, VIRAL_LOAD.noResultReason));
    return {
      key: e.uuid,
      encounter: e,
      kind: 'viralLoad',
      test: t('viralLoad', 'Viral load'),
      result:
        result === null
          ? [t('noResult', 'No result'), noResult && `(${noResult})`].filter(Boolean).join(' ')
          : result === 'LDL'
            ? result
            : `${result.startsWith('<') ? `<${number(result.slice(1))}` : number(result)} copies/mL`,
      reason: displayValue(field(VIRAL_LOAD_FIELDS, 'testingReason'), memberValue(group, VIRAL_LOAD.testingReason)) ?? '–',
    };
  });
  const fuRows: Array<TestRow> = followUps.flatMap((e) => {
    const glucose = obsGroups(e, FOLLOW_UP_TESTING.glucoseGroup)[0];
    const glucoseType = displayValue(field(FOLLOW_UP_FIELDS, 'glucoseTestType'), memberValue(glucose, FOLLOW_UP_TESTING.glucoseTestType));
    const results = [
      { name: 'cd4Count', test: t('cd4Count', 'CD4 count'), value: obsValue(e, FOLLOW_UP_TESTING.cd4Count), unit: 'cells/µL' },
      { name: 'cd4Percent', test: t('cd4Percent', 'CD4 %'), value: obsValue(e, FOLLOW_UP_TESTING.cd4Percent), unit: '%' },
      { name: 'phq9Score', test: t('phq9Score', 'PHQ-9 score'), value: obsValue(e, FOLLOW_UP_TESTING.phq9Score), unit: null },
      {
        name: 'serumGlucose',
        test: [t('serumGlucose', 'Serum glucose'), glucoseType && `(${glucoseType.toLowerCase()})`].filter(Boolean).join(' '),
        value: memberValue(glucose, FOLLOW_UP_TESTING.serumGlucose),
        unit: 'mg/dL',
      },
    ].filter((r) => r.value !== null);
    const rows = results.length ? results : [{ name: 'none', test: t('followUpTests', 'Follow-up tests'), value: null, unit: null }];
    return rows.map((r) => ({
      key: `${e.uuid}-${r.name}`,
      encounter: e,
      kind: 'followUpTesting' as const,
      test: r.test,
      result: r.value === null ? '–' : [number(r.value), r.unit].filter(Boolean).join(' '),
      reason: '–',
    }));
  });
  // sort is stable: on the same day, viral loads come first
  return [...vlRows, ...fuRows].sort((a, b) => dayjs(b.encounter.encounterDatetime).diff(a.encounter.encounterDatetime));
}

function visitColumns(t: (key: string, fallback: string) => string) {
  return [
    { key: 'date', header: t('visitDate', 'Visit date') },
    { key: 'location', header: t('location', 'Location') },
    { key: 'height', header: t('height', 'Height') },
    { key: 'weight', header: t('weight', 'Weight') },
    { key: 'bp', header: t('bp', 'BP') },
    { key: 'pregnant', header: t('pregBf', 'Preg/BF') },
    { key: 'tb', header: t('tbStatus', 'TB status') },
    { key: 'sideEffects', header: t('sideEffects', 'Side effects') },
    { key: 'pillCount', header: t('pillCount', 'Pill count') },
    { key: 'dosesMissed', header: t('dosesMissed', 'Doses missed') },
    { key: 'regimen', header: t('artRegimen', 'ART regimen') },
    { key: 'arvs', header: t('arvsGiven', 'ARVs given') },
    { key: 'cptIpt', header: t('cptIpt', 'CPT/IPT') },
    { key: 'next', header: t('nextAppointment', 'Next appointment') },
  ];
}

function visitCells(v: ArtEncounter): Record<string, string | null> {
  const f = ART_VISIT_FIELDS;
  const show = (field: ArtField) => displayValue(field, obsValue(v, field.concept, field.kind === 'multi'));
  const systolic = obsValue(v, ART_VISIT.systolicBp);
  const diastolic = obsValue(v, ART_VISIT.diastolicBp);
  const tablets = obsValue(v, ART_VISIT.numArvsGiven);
  const givenTo = obsValue(v, ART_VISIT.arvsGivenTo);
  const cptIpt = obsGroups(v, ART_VISIT.preventiveTherapyGroup)
    .map((g) => {
      const drug = PREVENTIVE_THERAPIES.find((p) => p.drug === String(memberValue(g, ART_VISIT.preventiveTherapyStatus)).toLowerCase());
      const pills = memberValue(g, ART_VISIT.preventiveTherapyPills);
      return drug ? [drug.label, pills].filter((x) => x !== null).join(' × ') : null;
    })
    .filter(Boolean)
    .join(', ');
  return {
    date: formatDay(v.encounterDatetime),
    location: v.location?.display ?? null,
    height: show(f.height),
    weight: show(f.weight),
    bp: systolic !== null || diastolic !== null ? `${systolic ?? '–'}/${diastolic ?? '–'}` : null,
    pregnant: show(f.pregnantLactating),
    tb: show(f.tbStatus),
    sideEffects: show(f.sideEffects),
    pillCount: show(f.pillCount),
    dosesMissed: show(f.dosesMissed),
    regimen: show(f.artRegimen),
    arvs: tablets !== null ? `${tablets}${givenTo === null ? '' : givenTo === true ? ' (G)' : ' (P)'}` : null,
    cptIpt: cptIpt || null,
    next: show(f.nextAppointment),
  };
}

const Headline: React.FC<{ label: string; value: string | null; detail?: string | null; alert?: boolean }> = ({
  label,
  value,
  detail,
  alert,
}) => (
  <div className={styles.headline}>
    <span className={styles.label}>{label}</span>
    <span className={styles.value}>{value ?? '–'}</span>
    {detail && <span className={alert ? styles.due : styles.detail}>{detail}</span>}
  </div>
);

/**
 * The ART patient card, natively in O3: the headline numbers, the card header's sections, the regimen history,
 * the viral load and follow-up test results and the ART visits, each edited in its own side panel
 */
const HivCareDashboard: React.FC<HivCareDashboardProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { card, isLoading, error } = useArtCard(patientUuid);
  const { encounters: initials } = useArtEncounters(patientUuid, 'initial');
  const { encounters: visits } = useArtEncounters(patientUuid, 'visit');
  const { encounters: viralLoads } = useArtEncounters(patientUuid, 'viralLoad');
  const { encounters: followUps } = useArtEncounters(patientUuid, 'followUpTesting');
  const launchNew = useLaunchArtPanel(patientUuid);

  if (isLoading) {
    return <InlineLoading description={t('loading', 'Loading...')} />;
  }
  if (error) {
    return (
      <InlineNotification kind="error" lowContrast hideCloseButton title={t('loadError', 'Could not load the eMastercards')} subtitle={error.message} />
    );
  }
  if (!card || card.state === 'UNAVAILABLE') {
    return (
      <div className={styles.page}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>{t('careAndTreatment', 'Care and treatment')}</span>
          <h3 className={styles.title}>{t('hivCare', 'HIV care')}</h3>
        </div>
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={card?.message ?? t('noArtCard', 'This patient has no ART patient card.')}
        />
      </div>
    );
  }

  const canEdit = card.state === 'CREATE' || card.state === 'EDIT';
  const headerSaved = card.state === 'EDIT';
  const initial = initials.find((e) => e.uuid === card.initialEncounterUuid) ?? (headerSaved ? initials[0] : null);
  const regimen = currentRegimen(visits);
  const latestVisit = visits[0];
  const latestViralLoad = viralLoads.map((e) => ({ e, result: viralLoadResult(e) })).find((x) => x.result);
  const latestCd4 = followUps.find((e) => obsValue(e, FOLLOW_UP_TESTING.cd4Count) !== null);
  const vlDue =
    card.state !== 'VIEW' &&
    viralLoadDue({
      lineStart: lineStart(initial, visits),
      lastViralLoad: viralLoads[0]?.encounterDatetime ?? null,
      today: dayjs().format('YYYY-MM-DD'),
    });
  const latestVlDate = latestViralLoad ? formatDay(latestViralLoad.e.encounterDatetime) : null;
  const tbStatus = displayValue(ART_VISIT_FIELDS.tbStatus, obsValue(latestVisit, ART_VISIT.tbStatus));
  const nextAppointment = formatDay(obsValue(latestVisit, ART_VISIT.nextAppointment) as string);
  const cardDescription = [
    t('artPatientCard', 'ART patient card'),
    t('cardVersion', 'version {{version}}', { version: ART_CARD_VERSION }),
    enrolmentText(card, t, formatDay),
  ]
    .filter(Boolean)
    .join(' · ');
  const tests = testRows(viralLoads, followUps, t);
  const changes = regimenChanges(visits);
  const columns = visitColumns(t);

  const editButton = (onClick: () => void) =>
    canEdit && (
      <Button kind="ghost" size="sm" onClick={onClick}>
        {t('editSection', 'Edit')}
      </Button>
    );
  const recordButton = (label: string, onClick: () => void, kind: 'primary' | 'tertiary' = 'tertiary') =>
    canEdit && (
      <Button kind={kind} size="md" disabled={!headerSaved} onClick={onClick}>
        {label}
      </Button>
    );

  const section = (key: InitialSection, extra?: React.ReactNode) => {
    const { title, fields } = INITIAL_SECTIONS[key];
    const shown = fields
      .filter((f) => !f.name.endsWith('Start'))
      .map((f) => ({ f, value: displayValue(f, obsValue(initial, f.concept, f.kind === 'multi')) }))
      .filter((x) => x.value !== null);
    return (
      <section aria-label={title} className={styles.card}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>{t(`section_${key}`, title)}</h4>
          {editButton(() => launchArtPanel('initial', { patientUuid, section: key }))}
        </div>
        <dl className={styles.fields}>
          {shown.map(({ f, value }) => (
            <React.Fragment key={f.name}>
              <dt>{f.label}</dt>
              <dd>{value}</dd>
            </React.Fragment>
          ))}
        </dl>
        {!shown.length && <p className={styles.empty}>{t('notRecorded', 'Not recorded yet')}</p>}
        {extra}
      </section>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>{t('careAndTreatment', 'Care and treatment')}</span>
          <h3 className={styles.title}>{t('hivCare', 'HIV care')}</h3>
          <span className={styles.description}>{cardDescription}</span>
        </div>
        {recordButton(t('recordArtVisit', 'Record ART visit'), () => launchNew('visit'), 'primary')}
      </div>

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
          title={t('fillHeaderFirst', 'Fill in the card header first: ART visits and tests can be recorded once it has been saved.')}
        />
      )}

      <section aria-label={t('hivAtAGlance', 'HIV at a glance')} className={styles.headlines}>
        <Headline
          label={t('currentRegimen', 'Current regimen')}
          value={regimen?.regimen?.label ?? null}
          detail={
            regimen
              ? [regimen.regimen?.drugs, t('since', 'since {{date}}', { date: formatDay(regimen.since) })].filter(Boolean).join(' · ')
              : null
          }
        />
        <Headline
          label={t('viralLoad', 'Viral load')}
          value={latestViralLoad?.result ?? null}
          detail={vlDue ? [latestVlDate, t('dueNow', 'due now')].filter(Boolean).join(' · ') : latestVlDate}
          alert={vlDue}
        />
        <Headline
          label={t('cd4Count', 'CD4 count')}
          value={latestCd4 ? String(obsValue(latestCd4, FOLLOW_UP_TESTING.cd4Count)) : null}
          detail={latestCd4 ? `cells/µL · ${formatDay(latestCd4.encounterDatetime)}` : null}
        />
        <Headline
          label={t('tbStatus', 'TB status')}
          value={tbStatus}
          detail={tbStatus ? t('screened', 'Screened {{date}}', { date: formatDay(latestVisit.encounterDatetime) }) : null}
        />
        <Headline
          label={t('nextAppointment', 'Next appointment')}
          value={nextAppointment}
          detail={nextAppointment ? t('booked', 'Booked {{date}}', { date: formatDay(latestVisit.encounterDatetime) }) : null}
        />
      </section>

      <div className={styles.cards}>
        {section('patientGuardian')}
        {section('status')}
        {section('confirmatoryTest')}
      </div>

      <div className={styles.cards}>
        <section aria-label={t('regimenHistory', 'ART Regimen History')} className={styles.card}>
          <div className={styles.cardHeader}>
            <h4 className={styles.cardTitle}>{t('regimenHistory', 'ART Regimen History')}</h4>
            {editButton(() => launchArtPanel('initial', { patientUuid, section: 'regimens' }))}
          </div>
          <h5 className={styles.subtitle}>{t('atInitiation', 'At initiation')}</h5>
          <dl className={styles.fields}>
            {[0, 1, 2].map((i) => {
              const [slot, start] = INITIAL_SECTIONS.regimens.fields.slice(i * 2, i * 2 + 2);
              const label = regimenText(obsValue(initial, slot.concept));
              const since = formatDay(obsValue(initial, start.concept) as string);
              return (
                <React.Fragment key={slot.name}>
                  <dt>{slot.label}</dt>
                  <dd>{label ? [label, since && t('since', 'since {{date}}', { date: since })].filter(Boolean).join(' · ') : '–'}</dd>
                </React.Fragment>
              );
            })}
          </dl>
          <h5 className={styles.subtitle}>{t('regimenChanges', 'Changes at ART visits')}</h5>
          <ol className={styles.history}>
            {changes.map((c, i) => (
              <li key={c.date}>
                <span className={styles.historyDate}>{formatDay(c.date)}</span>
                <span className={styles.historyRegimen}>
                  <b>{c.regimen?.label ?? '–'}</b>
                  {c.regimen?.drugs && <span>{` · ${c.regimen.drugs}`}</span>}
                </span>
                {i === 0 && (
                  <Tag type="green" size="sm">
                    {t('current', 'Current')}
                  </Tag>
                )}
              </li>
            ))}
          </ol>
          {!changes.length && <p className={styles.empty}>{t('noArtVisits', 'No ART visits recorded yet')}</p>}
        </section>

        <section aria-label={t('viralLoadAndFollowUpTests', 'Viral Load and Follow-Up Tests')} className={styles.card}>
          <div className={styles.cardHeader}>
            <h4 className={styles.cardTitle}>{t('viralLoadAndFollowUpTests', 'Viral Load and Follow-Up Tests')}</h4>
          </div>
          <div className={styles.tableWrapper}>
            <Table aria-label={t('viralLoadAndFollowUpTests', 'Viral Load and Follow-Up Tests')} size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>{t('date', 'Date')}</TableHeader>
                  <TableHeader>{t('test', 'Test')}</TableHeader>
                  <TableHeader>{t('result', 'Result')}</TableHeader>
                  <TableHeader>{t('reason', 'Reason')}</TableHeader>
                  {canEdit && <TableHeader aria-label={t('actions', 'Actions')} />}
                </TableRow>
              </TableHead>
              <TableBody>
                {tests.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell>{formatDay(r.encounter.encounterDatetime)}</TableCell>
                    <TableCell>{r.test}</TableCell>
                    <TableCell>{r.result}</TableCell>
                    <TableCell>{r.reason}</TableCell>
                    {canEdit && (
                      <TableCell>{editButton(() => launchArtPanel(r.kind, { patientUuid, encounterUuid: r.encounter.uuid }))}</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!tests.length && <p className={styles.empty}>{t('noTests', 'No viral loads or follow-up tests recorded yet')}</p>}
          <div className={styles.actions}>
            {recordButton(t('recordViralLoad', 'Record viral load'), () => launchNew('viralLoad'))}
            {recordButton(t('recordFollowUpTests', 'Record follow-up tests'), () => launchNew('followUpTesting'))}
          </div>
        </section>
      </div>

      <section aria-label={t('artVisits', 'ART Visits')} className={styles.card}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>{t('artVisits', 'ART Visits')}</h4>
        </div>
        <div className={styles.tableWrapper}>
          <Table aria-label={t('artVisits', 'ART Visits')} size="sm">
            <TableHead>
              <TableRow>
                {columns.map((c) => (
                  <TableHeader key={c.key}>{c.header}</TableHeader>
                ))}
                {canEdit && <TableHeader aria-label={t('actions', 'Actions')} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {visits.map((v) => {
                const cells = visitCells(v);
                return (
                  <TableRow key={v.uuid}>
                    {columns.map((c) => (
                      <TableCell key={c.key}>{cells[c.key] ?? ''}</TableCell>
                    ))}
                    {canEdit && (
                      <TableCell>{editButton(() => launchArtPanel('visit', { patientUuid, encounterUuid: v.uuid }))}</TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {!visits.length && <p className={styles.empty}>{t('noArtVisits', 'No ART visits recorded yet')}</p>}
      </section>
    </div>
  );
};

export default HivCareDashboard;
