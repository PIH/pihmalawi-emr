import React from 'react';
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
} from '@carbon/react';
import { ART_VISIT, FOLLOW_UP_TESTING, VIRAL_LOAD } from './art-concepts';
import {
  ART_VISIT_FIELDS,
  type ArtField,
  displayValue,
  formatDay,
  INITIAL_SECTIONS,
  type InitialSection,
  PREVENTIVE_THERAPIES,
  REGIMEN_OPTIONS,
} from './art-fields';
import { type ArtEncounter, memberValue, obsGroups, obsValue, useArtCard, useArtEncounters } from './art.resource';
import { launchArtPanel, useLaunchArtPanel } from './launch-art-panel';
import styles from './hiv-care.scss';

interface HivCareDashboardProps {
  patientUuid: string;
}

const regimenLabel = (uuid: unknown) =>
  REGIMEN_OPTIONS.find((o) => o.value.toLowerCase() === String(uuid ?? '').toLowerCase())?.label ?? null;

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
  return { label: regimenLabel(current), since: since.encounterDatetime };
}

/** The visits at which the regimen changed (the first visit counting as one), newest first */
function regimenChanges(visits: Array<ArtEncounter>) {
  const oldestFirst = [...visits].reverse().filter((v) => obsValue(v, ART_VISIT.artRegimen));
  const changes: Array<{ date: string; label: string }> = [];
  let previous: unknown = null;
  oldestFirst.forEach((v) => {
    const regimen = obsValue(v, ART_VISIT.artRegimen);
    if (regimen !== previous) {
      changes.push({ date: v.encounterDatetime, label: regimenLabel(regimen) });
      previous = regimen;
    }
  });
  return changes.reverse();
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

const Headline: React.FC<{ label: string; value: string | null; detail?: string | null }> = ({ label, value, detail }) => (
  <div className={styles.headline}>
    <span className={styles.label}>{label}</span>
    <span className={styles.value}>{value ?? '–'}</span>
    {detail && <span className={styles.detail}>{detail}</span>}
  </div>
);

/**
 * The ART patient card, natively in O3: the headline numbers, the card header's sections, the regimen history,
 * the viral load and CD4 results and the ART visits, each edited in its own side panel
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
        <h3 className={styles.title}>{t('hivCare', 'HIV care')}</h3>
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
    return (
      <section aria-label={title} className={styles.card}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>{t(`section_${key}`, title)}</h4>
          {editButton(() => launchArtPanel('initial', { patientUuid, section: key }))}
        </div>
        <dl className={styles.fields}>
          {fields
            .filter((f) => !f.name.endsWith('Start'))
            .map((f) => {
              const value = displayValue(f, obsValue(initial, f.concept, f.kind === 'multi'));
              return value === null ? null : (
                <React.Fragment key={f.name}>
                  <dt>{f.label}</dt>
                  <dd>{value}</dd>
                </React.Fragment>
              );
            })}
        </dl>
        {!initial && <p className={styles.empty}>{t('notRecorded', 'Not recorded yet')}</p>}
        {extra}
      </section>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h3 className={styles.title}>{t('hivCare', 'HIV care')}</h3>
          <span className={styles.detail}>{card.label}</span>
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
          value={regimen?.label ?? null}
          detail={regimen ? t('since', 'since {{date}}', { date: formatDay(regimen.since) }) : null}
        />
        <Headline
          label={t('viralLoad', 'Viral load')}
          value={latestViralLoad?.result ?? null}
          detail={latestViralLoad ? formatDay(latestViralLoad.e.encounterDatetime) : null}
        />
        <Headline
          label={t('cd4Count', 'CD4 count')}
          value={latestCd4 ? String(obsValue(latestCd4, FOLLOW_UP_TESTING.cd4Count)) : null}
          detail={latestCd4 ? formatDay(latestCd4.encounterDatetime) : null}
        />
        <Headline
          label={t('tbStatus', 'TB status')}
          value={displayValue(ART_VISIT_FIELDS.tbStatus, obsValue(latestVisit, ART_VISIT.tbStatus))}
          detail={latestVisit ? formatDay(latestVisit.encounterDatetime) : null}
        />
        <Headline
          label={t('nextAppointment', 'Next appointment')}
          value={formatDay(obsValue(latestVisit, ART_VISIT.nextAppointment) as string)}
        />
      </section>

      <div className={styles.cards}>
        {section('status')}
        {section('confirmatoryTest')}
        {section('patientGuardian')}
      </div>

      <div className={styles.cards}>
        <section aria-label={t('regimenHistory', 'ART regimen history')} className={styles.card}>
          <div className={styles.cardHeader}>
            <h4 className={styles.cardTitle}>{t('regimenHistory', 'ART regimen history')}</h4>
            {editButton(() => launchArtPanel('initial', { patientUuid, section: 'regimens' }))}
          </div>
          <dl className={styles.fields}>
            {[0, 1, 2].map((i) => {
              const [slot, start] = INITIAL_SECTIONS.regimens.fields.slice(i * 2, i * 2 + 2);
              const label = regimenLabel(obsValue(initial, slot.concept));
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
          <ol className={styles.list}>
            {regimenChanges(visits).map((c) => (
              <li key={c.date}>{`${formatDay(c.date)}: ${c.label}`}</li>
            ))}
          </ol>
        </section>

        <section aria-label={t('viralLoadAndCd4', 'Viral load and CD4')} className={styles.card}>
          <div className={styles.cardHeader}>
            <h4 className={styles.cardTitle}>{t('viralLoadAndCd4', 'Viral load and CD4')}</h4>
          </div>
          <dl className={styles.fields}>
            {viralLoads.map((e) => (
              <React.Fragment key={e.uuid}>
                <dt>{`${formatDay(e.encounterDatetime)} · ${t('viralLoad', 'Viral load')}`}</dt>
                <dd>
                  {viralLoadResult(e) ?? t('noResult', 'No result')}
                  {editButton(() => launchArtPanel('viralLoad', { patientUuid, encounterUuid: e.uuid }))}
                </dd>
              </React.Fragment>
            ))}
            {followUps.map((e) => (
              <React.Fragment key={e.uuid}>
                <dt>{`${formatDay(e.encounterDatetime)} · ${t('followUpTests', 'Follow-up tests')}`}</dt>
                <dd>
                  {[
                    obsValue(e, FOLLOW_UP_TESTING.cd4Count) !== null && `CD4 ${obsValue(e, FOLLOW_UP_TESTING.cd4Count)}`,
                    obsValue(e, FOLLOW_UP_TESTING.phq9Score) !== null && `PHQ-9 ${obsValue(e, FOLLOW_UP_TESTING.phq9Score)}`,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '–'}
                  {editButton(() => launchArtPanel('followUpTesting', { patientUuid, encounterUuid: e.uuid }))}
                </dd>
              </React.Fragment>
            ))}
          </dl>
          <div className={styles.actions}>
            {recordButton(t('recordViralLoad', 'Record viral load'), () => launchNew('viralLoad'))}
            {recordButton(t('recordFollowUpTests', 'Record follow-up tests'), () => launchNew('followUpTesting'))}
          </div>
        </section>
      </div>

      <section aria-label={t('artVisits', 'ART visits')} className={styles.card}>
        <h4 className={styles.cardTitle}>{t('artVisits', 'ART visits')}</h4>
        <div className={styles.tableWrapper}>
          <Table aria-label={t('artVisits', 'ART visits')} size="sm" useZebraStyles>
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
