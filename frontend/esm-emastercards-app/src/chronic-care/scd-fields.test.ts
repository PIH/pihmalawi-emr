import fs from 'fs';
import path from 'path';
import { type ArtField } from '../art/art-fields';
import { buildObsPayload } from '../art/obs-diff';
import { SCD_HEADER, SCD_VISIT } from './scd-concepts';
import {
  SCD_ANNUAL_MONITORING_FIELDS,
  SCD_HEADER_SECTIONS,
  SCD_HOSPITALISATION_FIELDS,
  SCD_MEDICATION_FIELDS,
  SCD_QUARTERLY_SCREENING_FIELDS,
  SCD_VISIT_FIELDS,
} from './scd-fields';

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

const headerFields = Object.values(SCD_HEADER_SECTIONS).flatMap((s) => s.fields);
const visitFields = [...Object.values(SCD_VISIT_FIELDS), ...SCD_MEDICATION_FIELDS];
const missing = (file: string, fields: Array<ArtField>) => {
  const native = fieldConcepts(fields);
  return [...formConcepts(file)].filter((c) => !native.has(c));
};

describe('sickle cell disease fields', () => {
  it('the header saves every concept and answer sickle-cell-disease-emastercard.xml does', () => {
    expect(formConcepts('sickle-cell-disease-emastercard.xml')).toContain(SCD_HEADER.sickleCellDisease);
    expect(missing('sickle-cell-disease-emastercard.xml', headerFields)).toEqual([]);
  });

  it('the visit saves every concept and answer sickle-cell-disease-visit.xml does', () => {
    expect(formConcepts('sickle-cell-disease-visit.xml')).toContain(SCD_VISIT.medications[2].drug);
    expect(missing('sickle-cell-disease-visit.xml', visitFields)).toEqual([]);
  });

  it('the screening, monitoring and hospitalisation panels save every concept and answer their forms do', () => {
    expect(missing('sickle-cell-disease-quarterly-screening.xml', SCD_QUARTERLY_SCREENING_FIELDS)).toEqual([]);
    expect(missing('sickle-cell-disease-annual-monitoring.xml', SCD_ANNUAL_MONITORING_FIELDS)).toEqual([]);
    expect(missing('sickle-cell-disease-hospitalization-history.xml', SCD_HOSPITALISATION_FIELDS)).toEqual([]);
  });

  it('field names are unique within each form', () => {
    [headerFields, visitFields].forEach((fields) => {
      const names = fields.map((f) => f.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });
});
