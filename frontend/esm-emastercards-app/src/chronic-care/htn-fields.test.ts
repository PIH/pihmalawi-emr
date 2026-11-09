import fs from 'fs';
import path from 'path';
import { buildObsPayload } from '../art/obs-diff';
import { type ArtField } from '../art/art-fields';
import { HTN_HEADER, HTN_QUARTERLY_LABS, HTN_VISIT } from './htn-concepts';
import {
  HTN_ANNUAL_LAB_FIELDS,
  HTN_HEADER_SECTIONS,
  HTN_HOSPITALISATION_FIELDS,
  HTN_MEDICATION_FIELDS,
  HTN_QUARTERLY_LAB_FIELDS,
  HTN_VISIT_FIELDS,
} from './htn-fields';
import { obs } from './test-htn-data';

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
  // the repeats' {0} answers, from their with="[...]" lists (some with a trailing space, e.g. '$amlodipine ')
  const repeated = [...xml.matchAll(/\['(\$\w+)\s*'/g)].map((m) => m[1]);
  // without the obs only shown in the flowsheet's table (the forms' VIEW mode), which the entry view repeats
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

const headerFields = Object.values(HTN_HEADER_SECTIONS).flatMap((s) => s.fields);
const visitFields = [...Object.values(HTN_VISIT_FIELDS), ...HTN_MEDICATION_FIELDS];
const missing = (file: string, fields: Array<ArtField>) => {
  const native = fieldConcepts(fields);
  return [...formConcepts(file)].filter((c) => !native.has(c));
};

describe('hypertension and diabetes fields', () => {
  it('the header saves every concept and answer hypertension-and-diabetes-emastercard.xml does', () => {
    expect(missing('hypertension-and-diabetes-emastercard.xml', headerFields)).toEqual([]);
  });

  it('the visit saves every concept and answer hypertension-and-diabetes-visit.xml does', () => {
    // the form's drugs are read, including those its repeats list with a trailing space
    expect(formConcepts('hypertension-and-diabetes-visit.xml')).toContain(HTN_VISIT.medications.find((m) => m.key === 'amlodipine').drug);
    expect(missing('hypertension-and-diabetes-visit.xml', visitFields)).toEqual([]);
  });

  it('the laboratory tests and hospitalisations save every concept and answer their forms do', () => {
    expect(missing('hypertension-and-diabetes-quarterly-laboratory-tests.xml', HTN_QUARTERLY_LAB_FIELDS)).toEqual([]);
    expect(missing('hypertension-and-diabetes-annual-laboratory-tests.xml', HTN_ANNUAL_LAB_FIELDS)).toEqual([]);
    expect(missing('hypertension-and-diabetes-hospitalization-history.xml', HTN_HOSPITALISATION_FIELDS)).toEqual([]);
  });

  it('field names are unique within each form', () => {
    [headerFields, visitFields, HTN_QUARTERLY_LAB_FIELDS, HTN_ANNUAL_LAB_FIELDS, HTN_HOSPITALISATION_FIELDS].forEach((fields) => {
      const names = fields.map((f) => f.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  it('a diagnosis is saved in its own group with its date', () => {
    const fields = HTN_HEADER_SECTIONS.diagnoses.fields;
    const htn = HTN_HEADER.diagnoses[2].answer;
    const payload = buildObsPayload(fields, { diagnosis_htn: htn, diagnosis_htnDate: '2025-05-20' }, [], {});
    expect(payload.add).toEqual([
      {
        concept: HTN_HEADER.diagnosisGroup,
        groupMembers: [
          { concept: HTN_HEADER.diagnosis, value: htn },
          { concept: HTN_HEADER.diagnosisDate, value: '2025-05-20' },
        ],
      },
    ]);
  });

  it('unticking a complication voids its group', () => {
    const fields = HTN_HEADER_SECTIONS.history.fields;
    const stroke = HTN_HEADER.complications[0].answer;
    const existing = [obs(HTN_HEADER.complicationGroup, null, [obs(HTN_HEADER.complication, stroke)])];
    expect(buildObsPayload(fields, { complication_stroke: null }, existing, {})).toEqual({ add: [], void: [existing[0].uuid] });
  });

  it('the HIV test is saved in its group with its sample date', () => {
    const result = HTN_QUARTERLY_LABS.hivResults[0].value;
    const payload = buildObsPayload(HTN_QUARTERLY_LAB_FIELDS, { hivResult: result, hivSampleDate: '2026-11-04' }, [], {});
    expect(payload.add).toEqual([
      {
        concept: HTN_QUARTERLY_LABS.hivTestGroup,
        groupMembers: [
          { concept: HTN_QUARTERLY_LABS.hivResult, value: result },
          { concept: HTN_QUARTERLY_LABS.hivSampleDate, value: '2026-11-04' },
        ],
      },
    ]);
  });
});
