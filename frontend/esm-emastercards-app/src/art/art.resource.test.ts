import { renderHook, waitFor } from '@testing-library/react';
import { openmrsFetch } from '@openmrs/esm-framework';
import { useArtEncounters } from './art.resource';

describe('useArtEncounters', () => {
  it('asks for the newest encounters first', async () => {
    vi.mocked(openmrsFetch).mockResolvedValue({ data: { results: [] } } as any);
    renderHook(() => useArtEncounters('patient-newest', 'visit'));
    await waitFor(() => expect(openmrsFetch).toHaveBeenCalled());
    expect(vi.mocked(openmrsFetch).mock.calls[0][0]).toContain('order=desc');
  });
});
