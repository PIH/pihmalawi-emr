import { renderHook } from '@testing-library/react';
import { useEMastercards } from '../emastercards.resource';
import { card } from '../test-cards';
import { useHivCards } from './hiv-cards';

vi.mock('../emastercards.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../emastercards.resource')>()),
  useEMastercards: vi.fn(),
}));

const preArt = (overrides = {}) => card({ key: 'pre-art', group: 'Pre-ART Patient Card', label: 'Pre-ART eMastercard', ...overrides });
const withCards = (cards: Array<ReturnType<typeof card>>) =>
  vi.mocked(useEMastercards).mockReturnValue({ cards, systemLocationsTag: null, error: undefined, isLoading: false, mutate: vi.fn() } as never);
const lapsed = {
  state: 'UNAVAILABLE' as const,
  message: 'Not available: Inactive program state (Pre-ART eMastercard)',
  enrolment: { state: { name: 'X' } } as never,
};

describe('useHivCards', () => {
  it('shows an existing pre-ART card view-only, since the program has been retired', () => {
    withCards([card({ state: 'EDIT' }), preArt({ state: 'EDIT' })]);
    const { cards } = renderHook(() => useHivCards('p1')).result.current;
    expect(cards.map((c) => [c.key, c.state])).toEqual([
      ['art', 'EDIT'],
      ['pre-art', 'VIEW'],
    ]);
    expect(cards[1].message).toBe('The Pre-ART program has been retired: this card is view-only.');
  });

  it('does not offer to start a pre-ART card', () => {
    withCards([card({ state: 'EDIT' }), preArt({ state: 'CREATE' })]);
    expect(renderHook(() => useHivCards('p1')).result.current.cards.map((c) => c.key)).toEqual(['art']);
  });

  it('has no note that the pre-ART card shows only in its state', () => {
    withCards([card({ ...lapsed, message: 'Not available: Inactive program state (ART eMastercard)' }), preArt(lapsed)]);
    const { cards, inactive } = renderHook(() => useHivCards('p1')).result.current;
    expect(cards).toEqual([]);
    expect(inactive.map((c) => c.key)).toEqual(['art']);
  });
});
