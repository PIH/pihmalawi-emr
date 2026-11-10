import useSWR from 'swr';
import dayjs from 'dayjs';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { ART_VISIT, FOLLOW_UP_TESTING, ART_INITIAL } from '../art/art-concepts';
import { formatDay } from '../art/art-fields';
import { adherencePercent, viralLoadDue } from '../art/art-rules';
import { currentRegimen, lineStart, viralLoadResult } from '../art/art-summary';
import { type ArtEncounter, obsValue, useArtCard, useArtEncounters } from '../art/art.resource';
import { type EMastercardCard } from '../emastercards.resource';
import { type QuickProgram } from '../enrolments/enrolments.resource';
import { cardName } from '../shared/card-group';

const day = (date: string) => String(date).slice(0, 10);

export interface RecentVisit {
  uuid: string;
  startDatetime: string;
  stopDatetime: string | null;
  visitType: { display: string } | null;
  location?: { display: string } | null;
  encounters: Array<{
    voided?: boolean;
    encounterType: { uuid?: string; display: string } | null;
    form: { uuid?: string; display: string } | null;
  }>;
}

/** The patient's latest visits, newest first */
export function useRecentVisits(patientUuid: string, count = 3) {
  const { data, isLoading } = useSWR(
    patientUuid
      ? `${restBaseUrl}/visit?patient=${patientUuid}&v=custom:(uuid,startDatetime,stopDatetime,visitType:(display),location:(display),encounters:(voided,encounterType:(uuid,display),form:(uuid,display)))`
      : null,
    (url: string) => openmrsFetch<{ results: Array<RecentVisit> }>(url).then((res) => res.data?.results ?? []),
  );
  const visits = [...(data ?? [])].sort((a, b) => (a.startDatetime < b.startDatetime ? 1 : -1)).slice(0, count);
  return { visits, isLoading };
}

/** What was recorded in a visit: each form (else encounter type) once, in the order recorded */
export function visitContents(visit: RecentVisit): Array<string> {
  const names = visit.encounters.filter((e) => !e.voided).map((e) => e.form?.display ?? e.encounterType?.display ?? null);
  return [...new Set(names.filter(Boolean))];
}

/**
 * What was recorded in a visit, by the eMastercard each form belongs to (e.g. Cardiac and Vascular Disease, 6 forms);
 * a form on no card, e.g. vitals, by its own name
 */
export function visitGroups(visit: RecentVisit, cards: Array<EMastercardCard>): Array<{ name: string; forms: number }> {
  const byForm = new Map<string, string>();
  const byType = new Map<string, string>();
  cards.forEach((c) => {
    c.formUuids.forEach((u) => byForm.set(u.toLowerCase(), cardName(c)));
    c.encounterTypeUuids.forEach((u) => byType.set(u.toLowerCase(), cardName(c)));
  });
  const groups = new Map<string, number>();
  visit.encounters
    .filter((e) => !e.voided)
    .forEach((e) => {
      const name =
        (e.form?.uuid && byForm.get(e.form.uuid.toLowerCase())) ||
        (e.encounterType?.uuid && byType.get(e.encounterType.uuid.toLowerCase())) ||
        e.form?.display ||
        e.encounterType?.display;
      if (name) {
        groups.set(name, (groups.get(name) ?? 0) + 1);
      }
    });
  return [...groups].map(([name, forms]) => ({ name, forms }));
}

export interface Alert {
  name: string;
  alert: string;
  action: string | null;
  categories: Array<string>;
}

/** The patient's alerts, from the alert rules the legacy dashboard and the screening apps use */
export function useAlerts(patientUuid: string) {
  const { data, isLoading } = useSWR(patientUuid ? `${restBaseUrl}/pihmalawi/ic3ScreeningData?patients=${patientUuid}` : null, (url: string) =>
    openmrsFetch<Array<{ alerts?: Array<Alert> }>>(url).then((res) => res.data?.[0]?.alerts ?? []),
  );
  return { alerts: data ?? [], isLoading };
}

export interface CareCardRow {
  key: string;
  name: string;
  lastVisit: string | null;
  appointment: string | null;
  overdue: boolean;
}

/** Each eMastercard the patient has, with its last visit and next appointment; overdue when that has passed */
export function careCardRows(cards: Array<EMastercardCard>, today: string): Array<CareCardRow> {
  return cards
    .filter((c) => (c.state === 'EDIT' || c.state === 'VIEW') && c.created)
    .map((c) => ({
      key: c.key,
      name: cardName(c),
      lastVisit: c.lastVisit,
      appointment: c.appointment,
      overdue: c.state === 'EDIT' && Boolean(c.appointment) && day(c.appointment) < today,
    }));
}

/** The HIV care summary from the patient's ART card: null when they have no ART card with anything recorded */
export function useHivSummary(patientUuid: string, today = dayjs().format('YYYY-MM-DD')) {
  const { card } = useArtCard(patientUuid);
  const { encounters: initials } = useArtEncounters(patientUuid, 'initial');
  const { encounters: visits } = useArtEncounters(patientUuid, 'visit');
  const { encounters: viralLoads } = useArtEncounters(patientUuid, 'viralLoad');
  const { encounters: followUps } = useArtEncounters(patientUuid, 'followUpTesting');
  if (!card || (card.state !== 'EDIT' && card.state !== 'VIEW')) {
    return null;
  }
  const initial = initials.find((e) => e.uuid === card.initialEncounterUuid) ?? initials[0] ?? null;
  return { card, ...summarizeArt(initial, visits, viralLoads, followUps, today), canRecord: card.state === 'EDIT' };
}

/** The ART card's headline facts, as the summary shows them */
export function summarizeArt(
  initial: ArtEncounter | null,
  visits: Array<ArtEncounter>,
  viralLoads: Array<ArtEncounter>,
  followUps: Array<ArtEncounter>,
  today: string,
) {
  const regimen = currentRegimen(visits);
  const headerStarts = ART_INITIAL.regimens
    .map((slot) => obsValue(initial, slot.startDate) as string | null)
    .filter(Boolean)
    .sort();
  const firstVisit = [...visits].reverse().find((v) => obsValue(v, ART_VISIT.artRegimen));
  const artStart = headerStarts[0] ?? firstVisit?.encounterDatetime ?? null;
  const latestViralLoad = viralLoads.map((e) => ({ date: e.encounterDatetime, result: viralLoadResult(e) })).find((x) => x.result) ?? null;
  const cd4Test = followUps.find((e) => obsValue(e, FOLLOW_UP_TESTING.cd4Count) !== null);
  const [latest, previous] = visits;
  const adherence =
    latest && previous
      ? adherencePercent(
          obsValue(latest, ART_VISIT.pillCount) as number | null,
          obsValue(previous, ART_VISIT.numArvsGiven) as number | null,
          dayjs(day(latest.encounterDatetime)).diff(day(previous.encounterDatetime), 'day'),
        )
      : null;
  return {
    regimen,
    artStart,
    yearsOnArt: artStart ? dayjs(today).diff(day(artStart), 'year') : null,
    latestViralLoad,
    cd4: cd4Test ? { value: obsValue(cd4Test, FOLLOW_UP_TESTING.cd4Count), date: cd4Test.encounterDatetime } : null,
    adherence,
    nextAppointment: (obsValue(latest, ART_VISIT.nextAppointment) as string | null) ?? null,
    viralLoadDue: viralLoadDue({ lineStart: lineStart(initial, visits), lastViralLoad: viralLoads[0]?.encounterDatetime ?? null, today }),
  };
}

export interface DueItem {
  key: string;
  label: string;
  status: 'today' | 'overdue';
}

/** Each card the patient can be seen on whose next appointment is today or has passed, the longest overdue first */
export function dueItems(cards: Array<EMastercardCard>, today: string): Array<DueItem> {
  return cards
    .filter((c) => c.state === 'EDIT' && c.appointment && day(c.appointment) <= today)
    .sort((a, b) => (day(a.appointment) < day(b.appointment) ? -1 : 1))
    .map((c) => {
      const overdue = day(c.appointment) < today;
      return {
        key: c.key,
        label: overdue ? `${cardName(c)} appointment · ${formatDay(c.appointment)}` : `${cardName(c)} appointment`,
        status: overdue ? 'overdue' : 'today',
      };
    });
}

export interface ProgramRow {
  key: string;
  label: string;
  /** One line per condition for programs with several, e.g. Chronic Care */
  details: Array<string>;
  active: boolean;
}

/** The programs the patient is in, then those they have left; not those they were never in */
export function programRows(programs: Array<QuickProgram>): Array<ProgramRow> {
  const active = programs
    .filter((p) => p.enrolment)
    .map((p) => {
      const states = p.workflows.filter((w) => w.currentState);
      const details = p.multipleWorkflows
        ? states.map((w) => `${w.name.replace(/ treatment$/i, '')} · ${w.currentState.name}`)
        : [states[0]?.currentState.name].filter(Boolean);
      return { key: p.key, label: p.label, details, active: true };
    });
  const ended = programs
    .filter((p) => !p.enrolment && p.lastEnrolment)
    .map((p) => {
      const last = p.lastEnrolment;
      const outcome = last.exitState?.name ?? 'Treatment completed';
      const year = last.dateCompleted ? dayjs(last.dateCompleted).format('YYYY') : null;
      return { key: p.key, label: p.label, details: [[outcome, year].filter(Boolean).join(' · ')], active: false };
    });
  return [...active, ...ended];
}
