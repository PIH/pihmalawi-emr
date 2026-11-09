import fs from 'fs';
import path from 'path';
import { type ArtField } from '../art/art-fields';
import { buildObsPayload } from '../art/obs-diff';
import { NCD_HEADER } from '../shared/ncd';
import { CVD_HEADER, CVD_VISIT, OTHER } from './cvd-concepts';
import {
  CVD_CHEST_XRAY_FIELDS,
  CVD_ECHO_FIELDS,
  CVD_EKG_FIELDS,
  CVD_HEADER_SECTIONS,
  CVD_HOSPITALISATION_FIELDS,
  CVD_MEDICATION_FIELDS,
  CVD_PROTOCOL_LAB_FIELDS,
  CVD_QUARTERLY_LAB_FIELDS,
  CVD_VISIT_FIELDS,
} from './cvd-fields';
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

const headerFields = Object.values(CVD_HEADER_SECTIONS).flatMap((s) => s.fields);
const visitFields = [...Object.values(CVD_VISIT_FIELDS), ...CVD_MEDICATION_FIELDS];
const missing = (file: string, fields: Array<ArtField>) => {
  const native = fieldConcepts(fields);
  return [...formConcepts(file)].filter((c) => !native.has(c));
};

describe('cardiac and vascular disease fields', () => {
  it('the header saves every concept and answer cardiac-and-vascular-disease-emastercard.xml does', () => {
    expect(formConcepts('cardiac-and-vascular-disease-emastercard.xml')).toContain(CVD_HEADER.diagnoses[0].answer);
    expect(missing('cardiac-and-vascular-disease-emastercard.xml', headerFields)).toEqual([]);
  });

  it('the visit saves every concept and answer cardiac-and-vascular-disease-visit.xml does', () => {
    expect(formConcepts('cardiac-and-vascular-disease-visit.xml')).toContain(CVD_VISIT.medications.find((m) => m.key === 'amlodipine').drug);
    expect(missing('cardiac-and-vascular-disease-visit.xml', visitFields)).toEqual([]);
  });

  it('the imaging, laboratory and hospitalisation panels save every concept and answer their forms do', () => {
    expect(missing('echocardiogram-ultrasound-imaging-results.xml', CVD_ECHO_FIELDS)).toEqual([]);
    expect(missing('electrocardiographic-ekg-imaging-results.xml', CVD_EKG_FIELDS)).toEqual([]);
    expect(missing('chest-x-ray-cxr-imaging-results.xml', CVD_CHEST_XRAY_FIELDS)).toEqual([]);
    expect(missing('cardiac-and-vascular-disease-quarterly-laboratory-tests.xml', CVD_QUARTERLY_LAB_FIELDS)).toEqual([]);
    expect(missing('cardiac-and-vascular-disease-frequency-per-protocol-laboratory-tests.xml', CVD_PROTOCOL_LAB_FIELDS)).toEqual([]);
    expect(missing('cardiac-and-vascular-disease-hospitalization-history.xml', CVD_HOSPITALISATION_FIELDS)).toEqual([]);
  });

  it('field names are unique within each form', () => {
    [headerFields, visitFields].forEach((fields) => {
      const names = fields.map((f) => f.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  it('an Other diagnosis is saved in its group with what it was and its date', () => {
    const payload = buildObsPayload(
      CVD_HEADER_SECTIONS.diagnoses.fields,
      { diagnosis_other: OTHER, diagnosis_otherName: 'Myocarditis', diagnosis_otherDate: '2025-01-01' },
      [],
      {},
    );
    expect(payload.add).toEqual([
      {
        concept: NCD_HEADER.diagnosisGroup,
        groupMembers: [
          { concept: NCD_HEADER.diagnosis, value: OTHER },
          { concept: CVD_HEADER.otherDiagnosis, value: 'Myocarditis' },
          { concept: NCD_HEADER.diagnosisDate, value: '2025-01-01' },
        ],
      },
    ]);
  });

  it('an Other family planning method is saved with what it was, and replaced when that changes', () => {
    const fields = CVD_HEADER_SECTIONS.history.fields;
    expect(buildObsPayload(fields, { familyPlanning: [OTHER], familyPlanningOther: 'Implant' }, [], {}).add).toEqual([
      { concept: CVD_HEADER.familyPlanning, value: OTHER, comment: 'Implant' },
    ]);
    const existing = [{ ...obs(CVD_HEADER.familyPlanning, OTHER), comment: 'Implant' }];
    expect(buildObsPayload(fields, { familyPlanning: [OTHER], familyPlanningOther: 'Implant' }, existing, {})).toEqual({ add: [], void: [] });
    expect(buildObsPayload(fields, { familyPlanning: [OTHER], familyPlanningOther: 'IUD' }, existing, {})).toEqual({
      add: [{ concept: CVD_HEADER.familyPlanning, value: OTHER, comment: 'IUD' }],
      void: [existing[0].uuid],
    });
  });

  it('the ECHO and ECG of the header are each a group of a date and a result', () => {
    const payload = buildObsPayload(CVD_HEADER_SECTIONS.imaging.fields, { ecgDate: '2025-01-20', ecgResult: CVD_HEADER.ecgResults[0].value }, [], {});
    expect(payload.add).toEqual([
      {
        concept: CVD_HEADER.ecgGroup,
        groupMembers: [
          { concept: CVD_HEADER.imagingDate, value: '2025-01-20' },
          { concept: CVD_HEADER.ecgResult, value: CVD_HEADER.ecgResults[0].value },
        ],
      },
    ]);
  });
});
