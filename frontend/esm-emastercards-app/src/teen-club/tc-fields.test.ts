import fs from 'fs';
import path from 'path';
import { type ArtField } from '../art/art-fields';
import { buildObsPayload } from '../art/obs-diff';
import { TC_HEADER, TC_VISIT } from './tc-concepts';
import { TC_HEADER_SECTIONS, TC_VISIT_FIELDS } from './tc-fields';
import { TC_SURVEY_FIELDS, TC_SURVEY_SECTIONS } from './tc-survey-fields';

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

const headerFields = TC_HEADER_SECTIONS.patientGuardian.fields;
const visitFields = Object.values(TC_VISIT_FIELDS);
const missing = (file: string, fields: Array<ArtField>) => {
  const native = fieldConcepts(fields);
  return [...formConcepts(file)].filter((c) => !native.has(c));
};

/** The answers the survey offers for its purpose of teen club, a text concept that can't save them, which it asks as text */
const PURPOSE_ANSWERS = ['4f68cc43-7f2c-4ce8-8eb5-1ce1bfb796b0', 'be34f352-5c86-4ffa-b6bb-c3a4e2dc00fc', '9a35b9c4-7e60-4ac7-aa81-9626bd0906f0'];

describe('teen club fields', () => {
  it('the header saves every concept and answer teen-club-emastercard.xml does', () => {
    expect(missing('teen-club-emastercard.xml', headerFields)).toEqual([]);
    // the age at intake's groups, which the form names by their PIH codes
    expect(fieldConcepts(headerFields)).toContain(TC_HEADER.ageAtIntakeGroup);
    expect(fieldConcepts(headerFields)).toContain(TC_HEADER.age);
  });

  it('the visit saves every concept and answer teen-club-visit.xml does, its hospitalised under the hospitalised concept', () => {
    expect(formConcepts('teen-club-visit.xml')).toContain(TC_VISIT.hospitalised);
    expect(missing('teen-club-visit.xml', visitFields)).toEqual([]);
    expect(TC_VISIT_FIELDS.hospitalised.concept).not.toBe(TC_VISIT_FIELDS.sputumCollected.concept);
  });

  it('the intake survey saves every concept and answer teen-club-intake-survey.xml does', () => {
    expect(missing('teen-club-intake-survey.xml', TC_SURVEY_FIELDS).filter((c) => !PURPOSE_ANSWERS.includes(c))).toEqual([]);
    expect(TC_SURVEY_FIELDS).toHaveLength(70);
  });

  it('field names are unique within each form, and each part of the survey is headed', () => {
    [headerFields, visitFields, TC_SURVEY_FIELDS].forEach((fields) => {
      const names = fields.map((f) => f.name);
      expect(new Set(names).size).toBe(names.length);
    });
    expect(TC_SURVEY_FIELDS.filter((f) => f.heading).map((f) => f.heading)).toEqual(Object.values(TC_SURVEY_SECTIONS).map((s) => s.title));
  });
});
