import { MH_FORMS, MH_HEADER, MH_SCREENING, MH_VISIT } from './mh-concepts';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^[0-9]+a{20,}$/;
const LABELS = new Set(['key', 'label', 'short']);

function allValues(value: unknown, key = ''): Array<string> {
  if (typeof value === 'string') {
    return LABELS.has(key) ? [] : [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((v) => allValues(v));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => (typeof v === 'boolean' ? [] : allValues(v, k)));
  }
  return [];
}

describe('mental health concepts', () => {
  it('every concept constant is a UUID', () => {
    const values = [MH_FORMS, MH_HEADER, MH_VISIT, MH_SCREENING].flatMap((v) => allValues(v));
    expect(values.length).toBeGreaterThan(100);
    values.forEach((v) => expect(v).toMatch(uuid));
  });
});
