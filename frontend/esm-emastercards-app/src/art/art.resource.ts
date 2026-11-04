import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type EMastercardCard, useEMastercards } from '../emastercards.resource';
import { ART_FORMS, type ArtFormKind, ART_INITIAL, ART_VISIT, VIRAL_LOAD } from './art-concepts';
import { type ExistingObs, type FieldValue } from './obs-diff';

/** An obs of an ART encounter; coded values are the answer's uuid, booleans true or false */
export interface ArtObs extends ExistingObs {
  obsDatetime: string;
  groupMembers?: Array<ArtObs>;
}

export interface ArtEncounter {
  uuid: string;
  encounterDatetime: string;
  location: { uuid: string; display: string } | null;
  visit: { uuid: string } | null;
  form: { uuid: string } | null;
  obs: Array<ArtObs>;
}

interface RestObs {
  uuid: string;
  obsDatetime: string;
  concept: { uuid: string };
  value: unknown;
  groupMembers?: Array<RestObs> | null;
}

/** Boolean concepts, which REST may return as the true or false concept */
const BOOLEAN_CONCEPTS = [ART_VISIT.arvsGivenTo, ART_INITIAL.ks, VIRAL_LOAD.sampleTaken, VIRAL_LOAD.ldl];

function toValue(concept: string, value: unknown): ArtObs['value'] {
  if (value && typeof value === 'object') {
    const { uuid, display } = value as { uuid: string; display?: string };
    if (BOOLEAN_CONCEPTS.includes(concept)) {
      return /^(yes|true)$/i.test(display ?? '');
    }
    return uuid;
  }
  return (value as ArtObs['value']) ?? null;
}

function toArtObs(o: RestObs): ArtObs {
  const concept = o.concept.uuid.toLowerCase();
  return {
    uuid: o.uuid,
    obsDatetime: o.obsDatetime,
    concept,
    value: toValue(concept, o.value),
    ...(o.groupMembers?.length ? { groupMembers: o.groupMembers.map(toArtObs) } : {}),
  };
}

const obsRep = 'uuid,obsDatetime,concept:(uuid),value,groupMembers:(uuid,obsDatetime,concept:(uuid),value)';
const encounterRep = `custom:(uuid,encounterDatetime,location:(uuid,display),visit:(uuid),form:(uuid),obs:(${obsRep}))`;

/** Every ART hook's SWR key starts with this, so a save can refresh the whole HIV care page */
export function artSwrKey(patientUuid: string) {
  return `pihmalawi-art-${patientUuid}`;
}

/**
 * The patient's encounters of one ART card form's encounter type, whatever form saved them, newest first
 */
export function useArtEncounters(patientUuid: string, kind: ArtFormKind) {
  const { encounterType } = ART_FORMS[kind];
  const { data, error, isLoading, mutate } = useSWR(
    patientUuid ? [artSwrKey(patientUuid), kind] : null,
    async () => {
      const res = await openmrsFetch<{ results: Array<Omit<ArtEncounter, 'obs'> & { obs: Array<RestObs> }> }>(
        `${restBaseUrl}/encounter?patient=${patientUuid}&encounterType=${encounterType}&v=${encounterRep}&limit=100`,
      );
      return (res.data?.results ?? [])
        .map((e) => ({ ...e, obs: (e.obs ?? []).map(toArtObs) }))
        .sort((a, b) => new Date(b.encounterDatetime).getTime() - new Date(a.encounterDatetime).getTime());
    },
  );
  return { encounters: data ?? [], error, isLoading, mutate };
}

/** The patient's ART eMastercard, as the eMastercards endpoint gives it, or null when they have none */
export function useArtCard(patientUuid: string): {
  card: EMastercardCard | null;
  systemLocationsTag: string | null;
  isLoading: boolean;
  error: Error | undefined;
} {
  const { cards, systemLocationsTag, isLoading, error } = useEMastercards(patientUuid);
  return { card: cards.find((c) => c.key === 'art') ?? null, systemLocationsTag, isLoading, error };
}

/** The locations with a tag (every location when there is no tag), for location choices */
export function useLocationsTagged(tag: string | null) {
  const { data } = useSWR(
    ['pihmalawi-locations', tag ?? ''],
    () =>
      openmrsFetch<{ results: Array<{ uuid: string; display: string }> }>(
        `${restBaseUrl}/location?${tag ? `tag=${encodeURIComponent(tag)}&` : ''}v=custom:(uuid,display)&limit=500`,
      ).then((res) => res.data?.results ?? []),
  );
  return data ?? [];
}

/** An encounter's top-level obs of a concept: its value, or every value for a concept asked many times */
export function obsValue(encounter: ArtEncounter | null | undefined, concept: string, multi = false): FieldValue {
  const found = (encounter?.obs ?? []).filter((o) => o.concept === concept.toLowerCase() && !o.groupMembers);
  if (multi) {
    return found.map((o) => String(o.value));
  }
  return (found[0]?.value as FieldValue) ?? null;
}

/** An encounter's obs groups of a concept */
export function obsGroups(encounter: ArtEncounter | null | undefined, concept: string): Array<ArtObs> {
  return (encounter?.obs ?? []).filter((o) => o.concept === concept.toLowerCase() && o.groupMembers);
}

/** A group's member value */
export function memberValue(group: ArtObs | undefined, concept: string): FieldValue {
  return (group?.groupMembers?.find((m) => m.concept === concept.toLowerCase())?.value as FieldValue) ?? null;
}
