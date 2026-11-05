import useSWR from 'swr';
import { fhirBaseUrl, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type EMastercardCard, useEMastercards } from '../emastercards.resource';
import { ART_FORMS, type ArtFormKind, ART_INITIAL, ART_VISIT, VIRAL_LOAD } from './art-concepts';
import { type CardForm, type ExistingObs, type FieldSpec, type FieldValue } from './obs-diff';
import { MH_VISIT } from '../mental-health/mh-concepts';

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
  comment?: string | null;
  groupMembers?: Array<RestObs> | null;
}

/** Boolean concepts, which REST may return as the true or false concept; other cards add theirs */
export const BOOLEAN_CONCEPTS = [ART_VISIT.arvsGivenTo, ART_INITIAL.ks, VIRAL_LOAD.sampleTaken, VIRAL_LOAD.ldl, MH_VISIT.sideEffects];

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
    ...(o.comment ? { comment: o.comment } : {}),
    ...(o.groupMembers?.length ? { groupMembers: o.groupMembers.map(toArtObs) } : {}),
  };
}

const obsRep = 'uuid,obsDatetime,concept:(uuid),value,comment,groupMembers:(uuid,obsDatetime,concept:(uuid),value,comment)';
const encounterRep = `custom:(uuid,encounterDatetime,location:(uuid,display),visit:(uuid),form:(uuid),obs:(${obsRep}))`;

/** Every ART hook's SWR key starts with this, so a save can refresh the whole HIV care page */
export function artSwrKey(patientUuid: string) {
  return `pihmalawi-art-${patientUuid}`;
}

/**
 * The patient's encounters of one ART card form's encounter type, whatever form saved them, newest first
 */
export function useArtEncounters(patientUuid: string, kind: ArtFormKind) {
  return useCardEncounters(patientUuid, ART_FORMS[kind]);
}

/**
 * The patient's encounters of a card form's encounter type, whatever form saved them, newest first
 */
export function useCardEncounters(patientUuid: string, { encounterType }: CardForm) {
  const { data, error, isLoading, mutate } = useSWR(
    patientUuid ? [artSwrKey(patientUuid), encounterType] : null,
    async () => {
      const res = await openmrsFetch<{ results: Array<Omit<ArtEncounter, 'obs'> & { obs: Array<RestObs> }> }>(
        `${restBaseUrl}/encounter?patient=${patientUuid}&encounterType=${encounterType}&v=${encounterRep}&order=desc&limit=100`,
      );
      return (res.data?.results ?? [])
        .map((e) => ({ ...e, obs: (e.obs ?? []).map(toArtObs) }))
        .sort((a, b) => new Date(b.encounterDatetime).getTime() - new Date(a.encounterDatetime).getTime());
    },
  );
  return { encounters: data ?? [], error, isLoading, mutate };
}

/** One ART encounter by uuid, for editing one older than those useArtEncounters lists */
export function useArtEncounter(patientUuid: string, encounterUuid: string | undefined) {
  const { data, isLoading } = useSWR(
    patientUuid && encounterUuid ? [artSwrKey(patientUuid), 'encounter', encounterUuid] : null,
    async () => {
      const res = await openmrsFetch<Omit<ArtEncounter, 'obs'> & { obs: Array<RestObs> }>(
        `${restBaseUrl}/encounter/${encounterUuid}?v=${encounterRep}`,
      );
      return { ...res.data, obs: (res.data?.obs ?? []).map(toArtObs) } as ArtEncounter;
    },
  );
  return { encounter: data, isLoading };
}

/** The patient's ART eMastercard, as the eMastercards endpoint gives it, or null when they have none */
export function useArtCard(patientUuid: string) {
  return useEMastercard(patientUuid, 'art');
}

/** One of the patient's eMastercards by key, as the eMastercards endpoint gives it, or null when they have none */
export function useEMastercard(
  patientUuid: string,
  key: string,
): {
  card: EMastercardCard | null;
  systemLocationsTag: string | null;
  isLoading: boolean;
  error: Error | undefined;
} {
  const { cards, systemLocationsTag, isLoading, error } = useEMastercards(patientUuid);
  return { card: cards.find((c) => c.key === key) ?? null, systemLocationsTag, isLoading, error };
}

interface Relationship {
  personA: { uuid?: string; display: string };
  relationshipType: { uuid: string };
}

/** The patient's community health workers, as the card headers show them: person A of a CHW relationship */
export function useChws(patientUuid: string | null, relationshipType: string) {
  const { data } = useSWR(
    patientUuid ? `${restBaseUrl}/relationship?person=${patientUuid}&v=custom:(personA:(uuid,display),relationshipType:(uuid))` : null,
    (url: string) => openmrsFetch<{ results: Array<Relationship> }>(url).then((res) => res.data?.results ?? []),
  );
  return (data ?? [])
    .filter((r) => r.relationshipType?.uuid === relationshipType && r.personA?.uuid !== patientUuid)
    .map((r) => r.personA.display);
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

/**
 * A panel's fields as an encounter holds them: group members from the group the field belongs to (told apart by
 * its matching answer, when the form has several groups of one concept), and each comment under its own key
 */
export function encounterValues(fields: Array<FieldSpec>, encounter: ArtEncounter | null | undefined): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {};
  fields.forEach((f) => {
    let found: Array<ArtObs>;
    if (f.group) {
      const { match } = f.group;
      const group = obsGroups(encounter, f.group.concept).find(
        (g) =>
          !match ||
          g.groupMembers.some(
            (m) => m.concept === match.concept.toLowerCase() && String(m.value).toLowerCase() === match.value.toLowerCase(),
          ),
      );
      found = (group?.groupMembers ?? []).filter((m) => m.concept === f.concept.toLowerCase());
    } else {
      found = (encounter?.obs ?? []).filter((o) => o.concept === f.concept.toLowerCase() && !o.groupMembers);
    }
    values[f.name] = f.kind === 'multi' ? found.map((o) => String(o.value)) : ((found[0]?.value as FieldValue) ?? null);
    if (f.comment) {
      values[f.comment] = found[0]?.comment ?? null;
    }
  });
  return values;
}

export interface SameDayObs {
  value: FieldValue;
  obsDatetime: string;
  encounterUuid: string | null;
}

interface FhirObservation {
  code?: { coding?: Array<{ code?: string }> };
  effectiveDateTime?: string;
  encounter?: { reference?: string };
  valueQuantity?: { value?: number };
  valueDateTime?: string;
  valueBoolean?: boolean;
  valueString?: string;
  valueCodeableConcept?: { coding?: Array<{ code?: string }> };
}

/**
 * The patient's obs of some concepts recorded on one day, in any encounter, newest first, by concept: what the
 * HTML forms' obsreference fields show, and where the next appointment is prefilled from
 */
export function useSameDayObs(patientUuid: string, conceptUuids: Array<string>, day: string | null) {
  const codes = conceptUuids.filter(Boolean);
  const { data, isLoading } = useSWR(
    patientUuid && day && codes.length ? [artSwrKey(patientUuid), 'same-day', day, ...codes] : null,
    async () => {
      const res = await openmrsFetch<{ entry?: Array<{ resource: FhirObservation }> }>(
        `${fhirBaseUrl}/Observation?subject:Patient=${patientUuid}&code=${codes.join(',')}&date=${day}&_sort=-date&_count=100`,
      );
      const byConcept: Record<string, Array<SameDayObs>> = {};
      (res.data?.entry ?? []).forEach(({ resource: r }) => {
        const concept = r.code?.coding?.[0]?.code?.toLowerCase();
        if (!concept) {
          return;
        }
        const value =
          r.valueQuantity?.value ??
          r.valueDateTime ??
          r.valueBoolean ??
          r.valueString ??
          r.valueCodeableConcept?.coding?.[0]?.code ??
          null;
        (byConcept[concept] ??= []).push({
          value,
          obsDatetime: r.effectiveDateTime,
          encounterUuid: r.encounter?.reference?.replace('Encounter/', '') ?? null,
        });
      });
      return byConcept;
    },
  );
  return { obs: data ?? ({} as Record<string, Array<SameDayObs>>), isLoading };
}
