import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { ART_FORMS, type ArtFormKind, DEFAULT_PROVIDER, ENCOUNTER_ROLE } from './art-concepts';

/** A field's value: a coded answer's uuid (or several), a number, text, a yyyy-mm-dd date or a boolean */
export type FieldValue = string | number | boolean | Array<string> | null;

/** One question of a form: the concept it saves and how */
export interface FieldSpec {
  name: string;
  concept: string;
  kind: 'coded' | 'multi' | 'number' | 'text' | 'date' | 'boolean';
  /**
   * Like the HTML forms' obsreference: the value recorded the same day in another encounter is shown, and only a
   * value the clinician enters or changes is saved. 'override' lets them change a shown value; 'readonly' doesn't.
   */
  reference?: 'override' | 'readonly';
  /** The obs group the field belongs to; groups of the same concept are told apart by one member's value */
  group?: { concept: string; match?: { concept: string; value: string } };
  /** The values key holding this obs's comment, for an answer the forms "specify" in a comment field */
  comment?: string;
}

/** A form's encounter type and form, which every encounter it saves carries */
export interface CardForm {
  encounterType: string;
  form: string;
}

/** An obs already on the encounter; coded values are the answer's uuid */
export interface ExistingObs {
  uuid: string;
  concept: string;
  value: string | number | boolean | null;
  comment?: string | null;
  groupMembers?: Array<ExistingObs>;
}

export interface NewObs {
  concept: string;
  value?: string | number | boolean;
  comment?: string;
  groupMembers?: Array<NewObs>;
}

export interface ObsPayload {
  add: Array<NewObs>;
  void: Array<string>;
}

function isEmpty(value: FieldValue) {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

function normalize(kind: FieldSpec['kind'], value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  if (kind === 'date') {
    return String(value).slice(0, 10);
  }
  if (kind === 'number') {
    return String(Number(value));
  }
  if (kind === 'boolean') {
    return String(value === true || value === 'true');
  }
  return kind === 'text' ? String(value) : String(value).toLowerCase();
}

function same(field: FieldSpec, a: unknown, b: unknown) {
  return normalize(field.kind, a) === normalize(field.kind, b);
}

/** The comment the panel gives a field's obs, if any */
function commentOf(field: FieldSpec, values: Record<string, FieldValue>): string | undefined {
  const comment = field.comment ? values[field.comment] : null;
  return comment === null || comment === undefined || comment === '' ? undefined : String(comment);
}

const sameComment = (a: string | null | undefined, b: string | undefined) => (a ?? '') === (b ?? '');

/** A new obs of a field, with its comment when it has one */
function newObs(field: FieldSpec, value: string | number | boolean, comment: string | undefined): NewObs {
  return { concept: field.concept, value: toObsValue(field, value), ...(comment ? { comment } : {}) };
}

function toObsValue(field: FieldSpec, value: string | number | boolean): string | number | boolean {
  if (field.kind === 'number') {
    return Number(value);
  }
  if (field.kind === 'date') {
    return String(value).slice(0, 10);
  }
  return value;
}

/**
 * What the field should hold on this encounter: for reference fields, nothing when the clinician kept the same-day
 * value (or, read-only, when there is one), so the referenced obs isn't saved twice
 */
function wanted(field: FieldSpec, value: FieldValue, reference: FieldValue, existing: ExistingObs | undefined) {
  if (field.reference && !isEmpty(reference)) {
    if (field.reference === 'readonly') {
      return { skip: true, value: null };
    }
    if (same(field, value, reference) && !(existing && same(field, existing.value, value))) {
      return { skip: false, value: null };
    }
  }
  return { skip: false, value };
}

function diffField(
  field: FieldSpec,
  value: FieldValue,
  reference: FieldValue,
  obs: Array<ExistingObs>,
  out: ObsPayload,
  comment?: string,
) {
  const mine = obs.filter((o) => o.concept.toLowerCase() === field.concept.toLowerCase());
  if (field.kind === 'multi') {
    const answers = (Array.isArray(value) ? value : isEmpty(value) ? [] : [String(value)]).map((a) => a.toLowerCase());
    mine.filter((o) => !answers.includes(normalize('multi', o.value))).forEach((o) => out.void.push(o.uuid));
    answers
      .filter((a) => !mine.some((o) => normalize('multi', o.value) === a))
      .forEach((a) => out.add.push({ concept: field.concept, value: (value as Array<string>).find((v) => v.toLowerCase() === a) }));
    return;
  }
  const current = mine[0];
  const { skip, value: desired } = wanted(field, value, reference, current);
  if (skip) {
    return;
  }
  if (isEmpty(desired)) {
    mine.forEach((o) => out.void.push(o.uuid));
    return;
  }
  if (current && mine.length === 1 && same(field, current.value, desired) && sameComment(current.comment, comment)) {
    return;
  }
  mine.forEach((o) => out.void.push(o.uuid));
  out.add.push(newObs(field, desired as string | number | boolean, comment));
}

function groupKey(field: FieldSpec) {
  const { concept, match } = field.group;
  return `${concept}|${match?.concept ?? ''}|${match?.value ?? ''}`.toLowerCase();
}

function findGroup(field: FieldSpec, obs: Array<ExistingObs>) {
  const { concept, match } = field.group;
  return obs.find(
    (o) =>
      o.concept.toLowerCase() === concept.toLowerCase() &&
      (!match ||
        (o.groupMembers ?? []).some(
          (m) => m.concept.toLowerCase() === match.concept.toLowerCase() && normalize('coded', m.value) === match.value.toLowerCase(),
        )),
  );
}

function diffGroup(fields: Array<FieldSpec>, values: Record<string, FieldValue>, references: Record<string, FieldValue>, obs: Array<ExistingObs>, out: ObsPayload) {
  if (fields.some((f) => f.reference === 'readonly' && !isEmpty(references[f.name]))) {
    return;
  }
  const existing = findGroup(fields[0], obs);
  const members = existing?.groupMembers ?? [];
  const filled = fields.filter((f) => !isEmpty(values[f.name]));
  const unchanged =
    existing &&
    fields.every((f) => {
      const member = members.find((m) => m.concept.toLowerCase() === f.concept.toLowerCase());
      return same(f, member?.value, values[f.name]) && (!member || sameComment(member.comment, commentOf(f, values)));
    });
  if (unchanged) {
    return;
  }
  if (existing) {
    out.void.push(existing.uuid);
  }
  // members the panel doesn't ask about (from older forms, or hidden questions) stay in the group
  const asked = fields.map((f) => f.concept.toLowerCase());
  const kept = members
    .filter((m) => !asked.includes(m.concept.toLowerCase()))
    .map((m) => ({ concept: m.concept, value: m.value, ...(m.comment ? { comment: m.comment } : {}) }));
  if (filled.length || (existing && kept.length)) {
    out.add.push({
      concept: fields[0].group.concept,
      groupMembers: [
        ...filled.map((f) => newObs(f, values[f.name] as string | number | boolean, commentOf(f, values))),
        ...kept,
      ],
    });
  }
}

/**
 * The obs to add to and void from an encounter so that it holds the panel's values, as HTML Form Entry saves them:
 * unchanged obs stay, changed ones are replaced, cleared ones are voided, and obs of concepts the panel doesn't ask
 * about are never touched
 */
export function buildObsPayload(
  fields: Array<FieldSpec>,
  values: Record<string, FieldValue>,
  existing: Array<ExistingObs>,
  references: Record<string, FieldValue>,
): ObsPayload {
  const out: ObsPayload = { add: [], void: [] };
  const topLevel = existing.filter((o) => !o.groupMembers?.length);
  const groups = existing.filter((o) => o.groupMembers?.length);
  const done = new Set<string>();
  fields.forEach((field) => {
    if (!field.group) {
      diffField(field, values[field.name] ?? null, references[field.name] ?? null, topLevel, out, commentOf(field, values));
      return;
    }
    const key = groupKey(field);
    if (!done.has(key)) {
      done.add(key);
      diffGroup(fields.filter((f) => f.group && groupKey(f) === key), values, references, groups, out);
    }
  });
  return out;
}

/** An encounter's datetime within its O3 visit: the visit's start, so it is never before the visit begins */
export function encounterDatetimeFor(visit: { startDatetime: string }): string {
  return visit.startDatetime;
}

function serverMessage(e: any): string {
  return e?.responseBody?.error?.message ?? e?.message ?? String(e);
}

export interface SaveArgs {
  patientUuid: string;
  encounterUuid?: string;
  visitUuid?: string;
  datetime: string;
  locationUuid: string;
  payload: ObsPayload;
}

/** Saves an ART card form's encounter, as saveEncounter does */
export function saveArtEncounter(kind: ArtFormKind, args: SaveArgs): Promise<{ uuid: string }> {
  return saveEncounter(ART_FORMS[kind], args);
}

/**
 * Saves a card form's encounter: creates it with the form's encounter type, form and provider, or updates an
 * existing one (setting its form to the current one) by adding and voiding obs
 */
export async function saveEncounter({ encounterType, form }: CardForm, args: SaveArgs): Promise<{ uuid: string }> {
  try {
    if (!args.encounterUuid) {
      const res = await openmrsFetch<{ uuid: string }>(`${restBaseUrl}/encounter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          patient: args.patientUuid,
          encounterType,
          form,
          location: args.locationUuid,
          visit: args.visitUuid,
          encounterDatetime: args.datetime,
          encounterProviders: [{ provider: DEFAULT_PROVIDER, encounterRole: ENCOUNTER_ROLE }],
          obs: args.payload.add,
        },
      });
      return { uuid: res.data.uuid };
    }
    await openmrsFetch(`${restBaseUrl}/encounter/${args.encounterUuid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { form, location: args.locationUuid },
    });
    // Adds first, undone if any fails, so a failed edit leaves the encounter as it was; voids only once all are in
    const context = {
      person: args.patientUuid,
      encounter: args.encounterUuid,
      obsDatetime: args.datetime,
      location: args.locationUuid,
    };
    const added: Array<string> = [];
    try {
      for (const obs of args.payload.add) {
        // only the uuid back: REST fails converting a new obs group's full representation
        const res = await openmrsFetch<{ uuid: string }>(`${restBaseUrl}/obs?v=custom:(uuid)`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            ...context,
            ...obs,
            // REST gives group members none of these itself
            ...(obs.groupMembers ? { groupMembers: obs.groupMembers.map((m) => ({ ...m, ...context })) } : {}),
          },
        });
        added.push(res.data?.uuid);
      }
    } catch (e) {
      for (const uuid of added.filter(Boolean)) {
        await openmrsFetch(`${restBaseUrl}/obs/${uuid}`, { method: 'DELETE' }).catch(() => undefined);
      }
      throw e;
    }
    for (const uuid of args.payload.void) {
      await openmrsFetch(`${restBaseUrl}/obs/${uuid}`, { method: 'DELETE' });
    }
    return { uuid: args.encounterUuid };
  } catch (e) {
    throw new Error(serverMessage(e));
  }
}
