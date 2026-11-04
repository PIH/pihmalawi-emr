import { ART_FORMS, ART_INITIAL, ART_VISIT, FOLLOW_UP_TESTING, REGIMENS, VIRAL_LOAD } from './art-concepts';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^[0-9]+A{30,}$/i;

function allValues(value: unknown): Array<string> {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(allValues);
  }
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(allValues);
  }
  return [];
}

describe('ART concepts', () => {
  it('REGIMENS has 44 options in form order', () => {
    expect(REGIMENS).toHaveLength(44);
    expect(REGIMENS[0].label).toBe('0A');
    expect(REGIMENS[28].label).toBe('13A');
    expect(REGIMENS[43].label).toBe('Non Standard');
  });

  it('every concept constant is a UUID', () => {
    const values = [ART_FORMS, ART_VISIT, ART_INITIAL, VIRAL_LOAD, FOLLOW_UP_TESTING].flatMap(allValues);
    expect(values.length).toBeGreaterThan(60);
    values.forEach((v) => expect(v).toMatch(uuid));
    REGIMENS.forEach((r) => expect(r.uuid).toMatch(uuid));
  });
});
