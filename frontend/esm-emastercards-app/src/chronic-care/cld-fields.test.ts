import fs from 'fs';
import path from 'path';
import { type ArtField } from '../art/art-fields';
import { buildObsPayload } from '../art/obs-diff';
import { CLD_HEADER, CLD_VISIT } from './cld-concepts';
import { CLD_HEADER_SECTIONS, CLD_HOSPITALISATION_FIELDS, CLD_MEDICATION_FIELDS, CLD_PEAK_FLOW_FIELDS, CLD_VISIT_FIELDS } from './cld-fields';

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

const headerFields = Object.values(CLD_HEADER_SECTIONS).flatMap((s) => s.fields);
const visitFields = [...Object.values(CLD_VISIT_FIELDS), ...CLD_MEDICATION_FIELDS];
const missing = (file: string, fields: Array<ArtField>) => {
  const native = fieldConcepts(fields);
  return [...formConcepts(file)].filter((c) => !native.has(c));
};

describe('chronic lung disease fields', () => {
  it('the header saves every concept and answer chronic-lung-disease-emastercard.xml does', () => {
    expect(formConcepts('chronic-lung-disease-emastercard.xml')).toContain(CLD_HEADER.exposures[2].answer);
    expect(missing('chronic-lung-disease-emastercard.xml', headerFields)).toEqual([]);
  });

  it('the visit saves every concept and answer chronic-lung-disease-visit.xml does', () => {
    expect(formConcepts('chronic-lung-disease-visit.xml')).toContain(CLD_VISIT.medications[0].drug);
    expect(missing('chronic-lung-disease-visit.xml', visitFields)).toEqual([]);
  });

  it('the peak flow and hospitalisation save every concept their forms do', () => {
    expect(missing('chronic-lung-disease-peak-flow.xml', CLD_PEAK_FLOW_FIELDS)).toEqual([]);
    expect(missing('chronic-lung-disease-hospitalization.xml', CLD_HOSPITALISATION_FIELDS)).toEqual([]);
  });

  it('field names are unique within each form', () => {
    [headerFields, visitFields].forEach((fields) => {
      const names = fields.map((f) => f.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  it('an exposure is saved in its own group with its date', () => {
    const contact = CLD_HEADER.exposures[0].answer;
    const payload = buildObsPayload(
      CLD_HEADER_SECTIONS.history.fields,
      { exposure_tbContact: contact, exposure_tbContactDate: '2024-01-10' },
      [],
      {},
    );
    expect(payload.add).toEqual([
      {
        concept: CLD_HEADER.exposureGroup,
        groupMembers: [
          { concept: CLD_HEADER.exposure, value: contact },
          { concept: CLD_HEADER.exposureDate, value: '2024-01-10' },
        ],
      },
    ]);
  });

  it('the medications offer puffs among their dose units', () => {
    expect(CLD_MEDICATION_FIELDS.find((f) => f.name === 'med_betaAgonistDoseUnit').options[0]).toEqual({
      value: CLD_VISIT.doseUnits[0].value,
      label: 'puff(s)',
    });
  });
});
