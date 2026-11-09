import fs from 'fs';
import path from 'path';
import { type ArtField } from '../art/art-fields';
import { buildObsPayload } from '../art/obs-diff';
import { NCO_HEADER, NCO_VISIT } from './nco-concepts';
import { NCO_ANNUAL_LAB_FIELDS, NCO_HEADER_SECTIONS, NCO_HOSPITALISATION_FIELDS, NCO_QUARTERLY_LAB_FIELDS, NCO_VISIT_FIELDS } from './nco-fields';

const FORMS = path.resolve(__dirname, '../../../../content/configuration/backend_configuration/htmlforms');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^[0-9]+a{20,}$/;

/** Every concept a form's obs and obs groups save, and every answer they offer, with its macros resolved */
function formConcepts(file: string): Set<string> {
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
  const repeated = [...xml.matchAll(/\['(\$\w+)\s*'/g)].map((m) => m[1]);
  const attributes = [...xml.matchAll(/(?:conceptId|answerConceptIds?|groupingConceptId)="([^"]+)"/g)].flatMap((m) => m[1].split(','));
  return new Set(
    [...attributes, ...repeated]
      .map((v) => v.trim())
      .map((v) => (v.startsWith('$') ? macros[v.slice(1)] : v))
      .filter((v) => v && UUID.test(v.toLowerCase()))
      .map((v) => v.toLowerCase()),
  );
}

function fieldConcepts(fields: Array<ArtField>): Set<string> {
  return new Set(
    fields
      .flatMap((f) => [f.concept, f.group?.concept, f.group?.match?.value, ...(f.options ?? []).map((o) => o.value)])
      .filter(Boolean)
      .map((v) => v.toLowerCase()),
  );
}

const headerFields = Object.values(NCO_HEADER_SECTIONS).flatMap((s) => s.fields);
const visitFields = Object.values(NCO_VISIT_FIELDS);
const missing = (file: string, fields: Array<ArtField>) => {
  const native = fieldConcepts(fields);
  return [...formConcepts(file)].filter((c) => !native.has(c));
};

describe('NCD other fields', () => {
  it('the header saves every concept and answer ncd-other-emastercard.xml does', () => {
    expect(formConcepts('ncd-other-emastercard.xml')).toContain(NCO_HEADER.diagnoses[0].answer);
    expect(missing('ncd-other-emastercard.xml', headerFields)).toEqual([]);
  });

  it('the visit saves every concept and answer ncd-other-visit.xml does', () => {
    expect(formConcepts('ncd-other-visit.xml')).toContain(NCO_VISIT.medications);
    expect(missing('ncd-other-visit.xml', visitFields)).toEqual([]);
  });

  it('the laboratory and hospitalisation panels save every concept and answer their forms do', () => {
    expect(missing('ncd-other-quarterly-laboratory-tests.xml', NCO_QUARTERLY_LAB_FIELDS)).toEqual([]);
    expect(missing('ncd-other-annual-laboratory-tests.xml', NCO_ANNUAL_LAB_FIELDS)).toEqual([]);
    expect(missing('ncd-other-hospitalization-history.xml', NCO_HOSPITALISATION_FIELDS)).toEqual([]);
  });

  it('field names are unique within each form', () => {
    [headerFields, visitFields].forEach((fields) => {
      const names = fields.map((f) => f.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });
});
