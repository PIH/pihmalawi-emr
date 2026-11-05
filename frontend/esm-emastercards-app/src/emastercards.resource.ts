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
  /** The patient's enrolment in the card's program: the current one, else the latest; null without one */
  enrolment: {
    uuid: string;
    program: string;
    dateEnrolled: string;
    dateCompleted: string | null;
    location: { uuid: string; display: string } | null;
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

/** "enrolled 12-Mar-2025 at Neno District Hospital", from the card's program enrolment, or null without one */
export function enrolmentText(
  card: Pick<EMastercardCard, 'enrolment'> | null,
  t: (key: string, fallback: string, options?: Record<string, unknown>) => string,
  formatDay: (date: string) => string | null,
): string | null {
  const enrolment = card?.enrolment;
  if (!enrolment?.dateEnrolled) {
    return null;
  }
  const date = formatDay(enrolment.dateEnrolled);
  return enrolment.location?.display
    ? t('enrolledAt', 'enrolled {{date}} at {{location}}', { date, location: enrolment.location.display })
    : t('enrolled', 'enrolled {{date}}', { date });
}
