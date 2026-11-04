import { renderHook, waitFor } from '@testing-library/react';
import { openmrsFetch } from '@openmrs/esm-framework';
import { useArtEncounters, useCardEncounters } from './art.resource';

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
