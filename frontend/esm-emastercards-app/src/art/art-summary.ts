import { ART_INITIAL, ART_VISIT, REGIMENS, VIRAL_LOAD } from './art-concepts';
import { type ArtEncounter, memberValue, obsGroups, obsValue } from './art.resource';

/** The ART card's summaries of its encounters, shared by the HIV Care page and the patient summary */

export const regimenOf = (uuid: unknown) => REGIMENS.find((r) => r.uuid.toLowerCase() === String(uuid ?? '').toLowerCase()) ?? null;

/** A regimen with its drugs, e.g. 13A · TDF/3TC/DTG */
export const regimenText = (uuid: unknown) => {
  const regimen = regimenOf(uuid);
  return regimen ? [regimen.label, regimen.drugs].filter(Boolean).join(' · ') : null;
};

/** The current regimen and the day of the first visit of its latest unbroken run */
export function currentRegimen(visits: Array<ArtEncounter>) {
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

/**
 * When the patient started their current ART line, as far as the card says: the latest start date of the header's
 * regimens, else the first ART visit with a regimen, else the card's date
 */
export function lineStart(initial: ArtEncounter | null, visits: Array<ArtEncounter>): string | null {
  const starts = ART_INITIAL.regimens
    .map((slot) => obsValue(initial, slot.startDate) as string | null)
    .filter(Boolean)
    .sort();
  const firstVisit = [...visits].reverse().find((v) => obsValue(v, ART_VISIT.artRegimen));
  return starts.pop() ?? firstVisit?.encounterDatetime ?? initial?.encounterDatetime ?? null;
}

/** A viral load test's result as the card writes it: the number, "<" a limit, or LDL */
export function viralLoadResult(encounter: ArtEncounter): string | null {
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
