import fs from 'fs';
import path from 'path';
import { type ArtField } from '../art/art-fields';
import { buildObsPayload } from '../art/obs-diff';
import { CKD_HEADER, CKD_VISIT } from './ckd-concepts';
import {
  CKD_ANNUAL_LAB_FIELDS,
  CKD_HEADER_SECTIONS,
  CKD_HOSPITALISATION_FIELDS,
  CKD_IMAGING_FIELDS,
  CKD_MEDICATION_FIELDS,
  CKD_QUARTERLY_LAB_FIELDS,
  CKD_VISIT_FIELDS,
} from './ckd-fields';

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

const headerFields = Object.values(CKD_HEADER_SECTIONS).flatMap((s) => s.fields);
const visitFields = [...Object.values(CKD_VISIT_FIELDS), ...CKD_MEDICATION_FIELDS];
const missing = (file: string, fields: Array<ArtField>) => {
  const native = fieldConcepts(fields);
  return [...formConcepts(file)].filter((c) => !native.has(c));
};

describe('chronic kidney disease fields', () => {
  it('the header saves every concept and answer chronic-kidney-disease-emastercard.xml does', () => {
    expect(formConcepts('chronic-kidney-disease-emastercard.xml')).toContain(CKD_HEADER.etiologies[3].value);
    expect(missing('chronic-kidney-disease-emastercard.xml', headerFields)).toEqual([]);
  });

  it('the visit saves every concept and answer chronic-kidney-disease-visit.xml does', () => {
    expect(formConcepts('chronic-kidney-disease-visit.xml')).toContain(CKD_VISIT.medications.find((m) => m.key === 'amlodipine').drug);
    expect(missing('chronic-kidney-disease-visit.xml', visitFields)).toEqual([]);
  });

  it('the laboratory, imaging and hospitalisation panels save every concept and answer their forms do', () => {
    expect(missing('chronic-kidney-disease-quarterly-laboratory-tests.xml', CKD_QUARTERLY_LAB_FIELDS)).toEqual([]);
    expect(missing('chronic-kidney-disease-annual-laboratory-tests.xml', CKD_ANNUAL_LAB_FIELDS)).toEqual([]);
    expect(missing('chronic-kidney-disease-imaging-results.xml', CKD_IMAGING_FIELDS)).toEqual([]);
    expect(missing('chronic-kidney-disease-hospitalization-history.xml', CKD_HOSPITALISATION_FIELDS)).toEqual([]);
  });

  it('field names are unique within each form', () => {
    [headerFields, visitFields].forEach((fields) => {
      const names = fields.map((f) => f.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  it("an Other medication is named in the visit's own Other medication concept", () => {
    expect(CKD_MEDICATION_FIELDS.find((f) => f.name === 'med_otherName').concept).toBe(CKD_VISIT.otherMedication);
  });
});
