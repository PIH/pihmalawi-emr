import fs from 'fs';
import path from 'path';
import { buildObsPayload } from '../art/obs-diff';
import { type ArtField } from '../art/art-fields';
import { EP_HEADER } from './ep-concepts';
import { EP_DIAGNOSIS_FIELD, EP_HEADER_SECTIONS, EP_MEDICATION_FIELDS, EP_VISIT_FIELDS } from './ep-fields';
import { obs } from './test-ep-data';

const FORMS = path.resolve(__dirname, '../../../../content/configuration/backend_configuration/htmlforms');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^[0-9]+a{20,}$/;

/** Every concept a form's obs and obs groups save, and every answer they offer, with its macros resolved */
function formConcepts(file: string): Set<string> {
  // without its comments: the header's diagnosis date is commented out, as it is not collected on paper
  const xml = fs.readFileSync(path.join(FORMS, file), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const macros: Record<string, string> = {};
  const block = xml.slice(xml.indexOf('<macros>'), xml.indexOf('</macros>'));
  block.split('\n').forEach((line) => {
    const plain = line.trim().match(/^(\w+)=(\S+)$/);
    const tag = line.match(/<macro key="(\w+)" value="([^"]+)"/);
    const [, key, value] = plain ?? tag ?? [];
    if (key) {
      macros[key] = value;
    }
  });
  // the repeats' {0} answers, from their with="[...]" lists
  const repeated = [...xml.matchAll(/\['(\$\w+)'/g)].map((m) => m[1]);
  const attributes = [...xml.matchAll(/(?:conceptId|answerConceptIds?|groupingConceptId)="([^"]+)"/g)].flatMap((m) => m[1].split(','));
  return new Set(
    [...attributes, ...repeated]
      .map((v) => v.trim())
      .map((v) => (v.startsWith('$') ? macros[v.slice(1)] : v))
      .filter((v) => v && UUID.test(v.toLowerCase()))
      .map((v) => v.toLowerCase()),
  );
}

/** The concepts and answers the native fields save */
function fieldConcepts(fields: Array<ArtField>): Set<string> {
  return new Set(
    fields
      .flatMap((f) => [f.concept, f.group?.concept, f.group?.match?.value, ...(f.options ?? []).map((o) => o.value)])
      .filter(Boolean)
      .map((v) => v.toLowerCase()),
  );
}

const headerFields = [...Object.values(EP_HEADER_SECTIONS).flatMap((s) => s.fields), EP_DIAGNOSIS_FIELD];
const visitFields = [...Object.values(EP_VISIT_FIELDS), ...EP_MEDICATION_FIELDS];

describe('epilepsy fields', () => {
  it('the header saves every concept and answer epilepsy-emastercard.xml does', () => {
    const native = fieldConcepts(headerFields);
    expect([...formConcepts('epilepsy-emastercard.xml')].filter((c) => !native.has(c))).toEqual([]);
  });

  it('the visit saves every concept and answer epilepsy-visit.xml does', () => {
    const native = fieldConcepts(visitFields);
    expect([...formConcepts('epilepsy-visit.xml')].filter((c) => !native.has(c))).toEqual([]);
  });

  it('field names are unique within the header and within the visit', () => {
    [headerFields, visitFields].forEach((fields) => {
      const names = fields.flatMap((f) => [f.name, ...(f.comment ? [f.comment] : [])]);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  it('an exposure is saved in its own group with its date, and an Other one with what it was', () => {
    const fields = EP_HEADER_SECTIONS.exposures.fields;
    const smoking = EP_HEADER.exposures[0].answer;
    const other = EP_HEADER.exposures[4].answer;
    const payload = buildObsPayload(
      fields,
      { exposure_smoking: smoking, exposure_smokingDate: '2020-01-01', exposure_other: other, exposure_otherComment: 'Glue' },
      [],
      {},
    );
    expect(payload.add).toEqual([
      {
        concept: EP_HEADER.exposureGroup,
        groupMembers: [
          { concept: EP_HEADER.exposure, value: smoking },
          { concept: EP_HEADER.exposureDate, value: '2020-01-01' },
        ],
      },
      { concept: EP_HEADER.exposureGroup, groupMembers: [{ concept: EP_HEADER.exposure, value: other, comment: 'Glue' }] },
    ]);
  });

  it('unticking a complication voids its group', () => {
    const fields = EP_HEADER_SECTIONS.exposures.fields;
    const burns = EP_HEADER.complications[1].answer;
    const existing = [obs(EP_HEADER.complicationGroup, null, [obs(EP_HEADER.complication, burns)])];
    expect(buildObsPayload(fields, { complication_burns: null }, existing, {})).toEqual({ add: [], void: [existing[0].uuid] });
  });
});
