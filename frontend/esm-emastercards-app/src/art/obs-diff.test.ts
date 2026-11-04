import { openmrsFetch } from '@openmrs/esm-framework';
import { buildObsPayload, encounterDatetimeFor, type FieldSpec, saveArtEncounter } from './obs-diff';
import { ART_FORMS, DEFAULT_PROVIDER, ENCOUNTER_ROLE } from './art-concepts';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

const pills: FieldSpec = { name: 'pills', concept: 'c-pills', kind: 'number' };
const sideEffects: FieldSpec = { name: 'sideEffects', concept: 'c-side', kind: 'multi' };
const weight: FieldSpec = { name: 'weight', concept: 'c-weight', kind: 'number', reference: 'override' };
const bp: FieldSpec = { name: 'bp', concept: 'c-bp', kind: 'number', reference: 'readonly' };
const ctxStatus: FieldSpec = {
  name: 'ctxStatus',
  concept: 'c-status',
  kind: 'coded',
  group: { concept: 'c-group', match: { concept: 'c-status', value: 'ctx' } },
};
const ctxPills: FieldSpec = {
  name: 'ctxPills',
  concept: 'c-amount',
  kind: 'number',
  group: { concept: 'c-group', match: { concept: 'c-status', value: 'ctx' } },
};

describe('buildObsPayload', () => {
  it('adds obs for new values', () => {
    const payload = buildObsPayload([pills, sideEffects], { pills: 4, sideEffects: ['no'] }, [], {});
    expect(payload).toEqual({
      add: [
        { concept: 'c-pills', value: 4 },
        { concept: 'c-side', value: 'no' },
      ],
      void: [],
    });
  });

  it('replaces a changed value', () => {
    const payload = buildObsPayload([pills], { pills: 5 }, [{ uuid: 'o1', concept: 'c-pills', value: 4 }], {});
    expect(payload).toEqual({ add: [{ concept: 'c-pills', value: 5 }], void: ['o1'] });
  });

  it('leaves an unchanged value alone', () => {
    const payload = buildObsPayload([pills], { pills: 4 }, [{ uuid: 'o1', concept: 'c-pills', value: 4 }], {});
    expect(payload).toEqual({ add: [], void: [] });
  });

  it('voids a cleared value', () => {
    const payload = buildObsPayload([pills], { pills: null }, [{ uuid: 'o1', concept: 'c-pills', value: 4 }], {});
    expect(payload).toEqual({ add: [], void: ['o1'] });
  });

  it('voids removed multi answers only', () => {
    const existing = [
      { uuid: 'o1', concept: 'c-side', value: 'pn' },
      { uuid: 'o2', concept: 'c-side', value: 'sk' },
    ];
    const payload = buildObsPayload([sideEffects], { sideEffects: ['pn', 'hp'] }, existing, {});
    expect(payload).toEqual({ add: [{ concept: 'c-side', value: 'hp' }], void: ['o2'] });
  });

  it('keeps obs of concepts the panel does not own', () => {
    const existing = [
      { uuid: 'o1', concept: 'c-depo', value: 'yes' },
      { uuid: 'o2', concept: 'c-pills', value: 4 },
    ];
    const payload = buildObsPayload([pills], { pills: null }, existing, {});
    expect(payload.void).toEqual(['o2']);
    expect(JSON.stringify(payload)).not.toContain('c-depo');
  });

  describe('reference fields save only overrides', () => {
    it('saves nothing when the value equals the same-day reference', () => {
      expect(buildObsPayload([weight], { weight: 61 }, [], { weight: 61 })).toEqual({ add: [], void: [] });
    });

    it('saves a value that differs from the reference', () => {
      expect(buildObsPayload([weight], { weight: 60 }, [], { weight: 61 })).toEqual({
        add: [{ concept: 'c-weight', value: 60 }],
        void: [],
      });
    });

    it('voids a saved override that was cleared', () => {
      const existing = [{ uuid: 'o1', concept: 'c-weight', value: 60 }];
      expect(buildObsPayload([weight], { weight: null }, existing, { weight: 61 })).toEqual({ add: [], void: ['o1'] });
    });

    it('never saves a read-only field that has a reference', () => {
      expect(buildObsPayload([bp], { bp: 140 }, [], { bp: 128 })).toEqual({ add: [], void: [] });
    });

    it('saves a read-only field that has no reference', () => {
      expect(buildObsPayload([bp], { bp: 140 }, [], {})).toEqual({ add: [{ concept: 'c-bp', value: 140 }], void: [] });
    });
  });

  it('builds obs groups', () => {
    const payload = buildObsPayload([ctxStatus, ctxPills], { ctxStatus: 'ctx', ctxPills: 90 }, [], {});
    expect(payload).toEqual({
      add: [
        {
          concept: 'c-group',
          groupMembers: [
            { concept: 'c-status', value: 'ctx' },
            { concept: 'c-amount', value: 90 },
          ],
        },
      ],
      void: [],
    });
  });

  it('replaces a group whole when any member changes, and finds it by its matching member', () => {
    const existing = [
      {
        uuid: 'g-inh',
        concept: 'c-group',
        value: null,
        groupMembers: [
          { uuid: 'm1', concept: 'c-status', value: 'inh' },
          { uuid: 'm2', concept: 'c-amount', value: 30 },
        ],
      },
      {
        uuid: 'g-ctx',
        concept: 'c-group',
        value: null,
        groupMembers: [
          { uuid: 'm3', concept: 'c-status', value: 'ctx' },
          { uuid: 'm4', concept: 'c-amount', value: 60 },
        ],
      },
    ];
    const payload = buildObsPayload([ctxStatus, ctxPills], { ctxStatus: 'ctx', ctxPills: 90 }, existing, {});
    expect(payload.void).toEqual(['g-ctx']);
    expect(payload.add).toHaveLength(1);
  });

  it('voids a group whose members were all cleared', () => {
    const existing = [
      {
        uuid: 'g-ctx',
        concept: 'c-group',
        value: null,
        groupMembers: [{ uuid: 'm3', concept: 'c-status', value: 'ctx' }],
      },
    ];
    expect(buildObsPayload([ctxStatus, ctxPills], { ctxStatus: null, ctxPills: null }, existing, {})).toEqual({
      add: [],
      void: ['g-ctx'],
    });
  });

  it('compares dates by day and uuids without case', () => {
    const date: FieldSpec = { name: 'next', concept: 'c-next', kind: 'date' };
    const coded: FieldSpec = { name: 'tb', concept: 'c-tb', kind: 'coded' };
    const existing = [
      { uuid: 'o1', concept: 'c-next', value: '2027-02-03T00:00:00.000+0000' },
      { uuid: 'o2', concept: 'c-tb', value: 'ABC' },
    ];
    expect(buildObsPayload([date, coded], { next: '2027-02-03', tb: 'abc' }, existing, {})).toEqual({
      add: [],
      void: [],
    });
  });
});

describe('encounterDatetimeFor', () => {
  it('uses the visit start', () => {
    expect(encounterDatetimeFor({ startDatetime: '2026-11-04T09:15:00.000+0200' })).toBe('2026-11-04T09:15:00.000+0200');
  });
});

describe('saveArtEncounter', () => {
  it('creates the encounter with its type, form, provider, visit and obs', async () => {
    mockOpenmrsFetch.mockResolvedValue({ data: { uuid: 'enc-1' } } as any);
    const result = await saveArtEncounter('visit', {
      patientUuid: 'p1',
      visitUuid: 'v1',
      datetime: '2026-11-04T09:15:00.000+0200',
      locationUuid: 'l1',
      payload: { add: [{ concept: 'c-pills', value: 4 }], void: [] },
    });
    expect(result).toEqual({ uuid: 'enc-1' });
    const [url, init] = mockOpenmrsFetch.mock.calls[0];
    expect(url).toMatch(/\/encounter$/);
    expect(init.method).toBe('POST');
    expect(init.body).toEqual({
      patient: 'p1',
      encounterType: ART_FORMS.visit.encounterType,
      form: ART_FORMS.visit.form,
      location: 'l1',
      visit: 'v1',
      encounterDatetime: '2026-11-04T09:15:00.000+0200',
      encounterProviders: [{ provider: DEFAULT_PROVIDER, encounterRole: ENCOUNTER_ROLE }],
      obs: [{ concept: 'c-pills', value: 4 }],
    });
  });

  it('saveArtEncounter posts form and type, then voids', async () => {
    mockOpenmrsFetch.mockResolvedValue({ data: { uuid: 'enc-1' } } as any);
    await saveArtEncounter('visit', {
      patientUuid: 'p1',
      encounterUuid: 'enc-1',
      datetime: '2026-11-04T09:15:00.000+0200',
      locationUuid: 'l1',
      payload: { add: [{ concept: 'c-pills', value: 5 }], void: ['o1'] },
    });
    const calls = mockOpenmrsFetch.mock.calls.map(([url, init]) => [url, init?.method, init?.body]);
    expect(calls[0]).toEqual([
      expect.stringMatching(/\/encounter\/enc-1$/),
      'POST',
      { form: ART_FORMS.visit.form, location: 'l1' },
    ]);
    expect(calls[1]).toEqual([
      expect.stringMatching(/\/obs$/),
      'POST',
      {
        person: 'p1',
        encounter: 'enc-1',
        obsDatetime: '2026-11-04T09:15:00.000+0200',
        location: 'l1',
        concept: 'c-pills',
        value: 5,
      },
    ]);
    expect(calls[2]).toEqual([expect.stringMatching(/\/obs\/o1$/), 'DELETE', undefined]);
  });

  it('throws the server message', async () => {
    mockOpenmrsFetch.mockRejectedValue({ responseBody: { error: { message: 'Invalid location' } } });
    await expect(
      saveArtEncounter('visit', {
        patientUuid: 'p1',
        visitUuid: 'v1',
        datetime: '2026-11-04',
        locationUuid: 'l1',
        payload: { add: [], void: [] },
      }),
    ).rejects.toThrow('Invalid location');
  });
});
