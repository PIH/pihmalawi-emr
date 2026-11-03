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
  flowsheetPath: string;
  formUuids: Array<string>;
  encounterTypeUuids: Array<string>;
}

export const flowsheetWorkspace = 'pihmalawi-emastercard-flowsheet-workspace';

export function emastercardsUrl(patientUuid: string) {
  return `${restBaseUrl}/pihmalawi/emastercards?patient=${patientUuid}`;
}

export function useEMastercards(patientUuid: string) {
  const { data, error, isLoading, mutate } = useSWR<{ data: { results: Array<EMastercardCard> } }, Error>(
    patientUuid ? emastercardsUrl(patientUuid) : null,
    openmrsFetch,
  );
  return { cards: data?.data?.results ?? [], error, isLoading, mutate };
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
