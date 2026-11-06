import useSWR from 'swr';
import { launchWorkspace2, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export type EMastercardState = 'CREATE' | 'EDIT' | 'VIEW' | 'UNAVAILABLE';

/** One of a patient's eMastercards, as the pihmalawi/emastercards endpoint returns it */
export interface EMastercardCard {
  key: string;
  group: string;
  label: string;
  state: EMastercardState;
  message: string | null;
  readonlyNote: boolean;
  initialEncounterUuid: string | null;
  created: string | null;
  lastVisit: string | null;
  lastVisitLocation: string | null;
  appointment: string | null;
  /**
   * The patient's enrolment in the card's program: the current one, else the latest; null without one. Its state is
   * the patient's current state in the card's own workflow (e.g. Mental health treatment), when they have one.
   */
  enrolment: {
    uuid: string;
    program: string;
    dateEnrolled: string;
    dateCompleted: string | null;
    location: { uuid: string; display: string } | null;
    state: { name: string; startDate: string } | null;
  } | null;
  flowsheetPath: string;
  formUuids: Array<string>;
  encounterTypeUuids: Array<string>;
}

export const flowsheetWorkspace = 'pihmalawi-emastercard-flowsheet-workspace';

export function emastercardsUrl(patientUuid: string) {
  return `${restBaseUrl}/pihmalawi/emastercards?patient=${patientUuid}`;
}

export function useEMastercards(patientUuid: string) {
  const { data, error, isLoading, mutate } = useSWR<
    { data: { results: Array<EMastercardCard>; systemLocationsTag?: string | null } },
    Error
  >(
    patientUuid ? emastercardsUrl(patientUuid) : null,
    openmrsFetch,
  );
  return {
    cards: data?.data?.results ?? [],
    /** The tag on the locations Neno forms may be recorded at (the pihmalawi.systemLocationsTag global property) */
    systemLocationsTag: data?.data?.systemLocationsTag ?? null,
    error,
    isLoading,
    mutate,
  };
}

/**
 * The card's flowsheet, embedded for the chart: on a date when creating the card, read-only when the user may only
 * view it
 */
export function flowsheetUrl(card: EMastercardCard, options: { encounterDate?: string } = {}) {
  let url = `${window.openmrsBase}/${card.flowsheetPath}&embedded=true`;
  if (card.state === 'CREATE' && options.encounterDate) {
    url += `&encounterDate=${options.encounterDate}`;
  }
  if (card.state === 'VIEW') {
    url += '&viewOnly=true';
  }
  return url;
}

export function launchFlowsheet(card: EMastercardCard, patientUuid: string, options: { encounterDate?: string } = {}) {
  launchWorkspace2(flowsheetWorkspace, { card, patientUuid, url: flowsheetUrl(card, options) });
}

/**
 * When the patient started on the card, as the Enrolments page says it: the state of the card's own workflow and
 * since when ("On treatment since 16-Oct-2026 at Neno District Hospital"), else the enrolment date ("enrolled
 * 12-Mar-2025 at Neno District Hospital"); null without an enrolment
 */
export function enrolmentText(
  card: Pick<EMastercardCard, 'enrolment'> | null,
  t: (key: string, fallback: string, options?: Record<string, unknown>) => string,
  formatDay: (date: string) => string | null,
): string | null {
  const enrolment = card?.enrolment;
  if (!enrolment?.dateEnrolled) {
    return null;
  }
  const location = enrolment.location?.display;
  if (enrolment.state?.startDate) {
    const options = { state: enrolment.state.name, date: formatDay(enrolment.state.startDate), location };
    return location
      ? t('stateSinceAt', '{{state}} since {{date}} at {{location}}', options)
      : t('stateSince', '{{state}} since {{date}}', options);
  }
  const date = formatDay(enrolment.dateEnrolled);
  return enrolment.location?.display
    ? t('enrolledAt', 'enrolled {{date}} at {{location}}', { date, location: enrolment.location.display })
    : t('enrolled', 'enrolled {{date}}', { date });
}
