import { renderHook, waitFor } from '@testing-library/react';
import { openmrsFetch } from '@openmrs/esm-framework';
import { encounterValues, useArtEncounters, useCardEncounters } from './art.resource';

describe('useArtEncounters', () => {
  it('asks for the newest encounters first', async () => {
    vi.mocked(openmrsFetch).mockResolvedValue({ data: { results: [] } } as any);
    renderHook(() => useArtEncounters('patient-newest', 'visit'));
    await waitFor(() => expect(openmrsFetch).toHaveBeenCalled());
    expect(vi.mocked(openmrsFetch).mock.calls[0][0]).toContain('order=desc');
  });
});

describe('useCardEncounters', () => {
  it('keeps obs comments', async () => {
    vi.mocked(openmrsFetch).mockResolvedValue({
      data: {
        results: [
          {
            uuid: 'e1',
            encounterDatetime: '2026-11-04T09:00:00.000+0000',
            location: null,
            visit: null,
            form: null,
            obs: [{ uuid: 'o1', obsDatetime: '2026-11-04', concept: { uuid: 'C1' }, value: 'x', comment: 'note' }],
          },
        ],
      },
    } as any);
    const { result } = renderHook(() => useCardEncounters('patient-comments', { encounterType: 'type-mh', form: 'form-mh' }));
    await waitFor(() => expect(result.current.encounters).toHaveLength(1));
    expect(vi.mocked(openmrsFetch).mock.calls[0][0]).toContain('encounterType=type-mh');
    expect(vi.mocked(openmrsFetch).mock.calls[0][0]).toContain('comment');
    expect(result.current.encounters[0].obs[0].comment).toBe('note');
  });
});

describe('encounterValues', () => {
  const o = (uuid: string, concept: string, value: any, groupMembers?: Array<any>, comment?: string) => ({
    uuid,
    concept,
    value,
    obsDatetime: '2026-11-04',
    ...(groupMembers ? { groupMembers } : {}),
    ...(comment ? { comment } : {}),
  });
  const encounter = {
    uuid: 'e1',
    encounterDatetime: '2026-11-04',
    location: null,
    visit: null,
    form: null,
    obs: [
      o('g1', 'grp', null, [o('m1', 'dx', 'a'), o('m2', 'date', '2025-01-01')]),
      o('g2', 'grp', null, [o('m3', 'dx', 'b'), o('m4', 'date', '2025-02-02')]),
      o('t1', 'top', 'current', undefined, 'kachasu'),
    ],
  };

  it('reads groups told apart by an answer, and comments', () => {
    const fields = [
      { name: 'b', concept: 'dx', kind: 'coded' as const, group: { concept: 'grp', match: { concept: 'dx', value: 'b' } } },
      { name: 'bDate', concept: 'date', kind: 'date' as const, group: { concept: 'grp', match: { concept: 'dx', value: 'b' } } },
      { name: 'c', concept: 'dx', kind: 'coded' as const, group: { concept: 'grp', match: { concept: 'dx', value: 'c' } } },
      { name: 'top', concept: 'top', kind: 'coded' as const, comment: 'topComment' },
    ];
    expect(encounterValues(fields, encounter)).toEqual({ b: 'b', bDate: '2025-02-02', c: null, top: 'current', topComment: 'kachasu' });
  });

  it('reads the comment of each specified answer of a multi question', () => {
    const e = {
      ...encounter,
      obs: [o('d1', 'dx', 'CNS', undefined, 'meningitis'), o('d2', 'dx', 'other', undefined, 'rickets'), o('d3', 'dx', 'hie')],
    };
    const field = {
      name: 'dx',
      concept: 'dx',
      kind: 'multi' as const,
      comments: [
        { answer: 'cns', key: 'cnsSpecify' },
        { answer: 'other', key: 'otherSpecify' },
      ],
    };
    expect(encounterValues([field], e)).toEqual({ dx: ['CNS', 'other', 'hie'], cnsSpecify: 'meningitis', otherSpecify: 'rickets' });
  });
});
