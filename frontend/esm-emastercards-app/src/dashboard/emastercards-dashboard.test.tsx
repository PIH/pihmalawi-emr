import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { card } from '../test-cards';
import { useEMastercards } from '../emastercards.resource';
import EMastercardsDashboard from './emastercards-dashboard.component';

vi.mock('../emastercards.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../emastercards.resource')>()),
  useEMastercards: vi.fn(),
}));

const mockUseEMastercards = vi.mocked(useEMastercards);

describe('EMastercardsDashboard', () => {
  it('lists the cards under their groups, in the order the server gives them', () => {
    mockUseEMastercards.mockReturnValue({
      systemLocationsTag: null,
      cards: [
        card({ key: 'art' }),
        card({ key: 'ckd', group: 'Chronic Care Record', label: 'Chronic Kidney Disease eMastercard' }),
        card({ key: 'scd', group: 'Chronic Care Record', label: 'Sickle Cell Disease eMastercard' }),
      ],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    render(<EMastercardsDashboard patientUuid="patient-uuid" />);

    const groups = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent);
    expect(groups).toEqual(['ART Patient Card', 'Chronic Care Record']);
    const chronicCare = screen.getByRole('region', { name: 'Chronic Care Record' });
    const buttons = within(chronicCare)
      .getAllByRole('button')
      .map((b) => b.textContent);
    expect(buttons).toEqual(['Create new Chronic Kidney Disease eMastercard', 'Create new Sickle Cell Disease eMastercard']);
  });

  it('says when the cards could not be loaded', () => {
    mockUseEMastercards.mockReturnValue({ systemLocationsTag: null, cards: [], isLoading: false, error: new Error('nope'), mutate: vi.fn() });

    render(<EMastercardsDashboard patientUuid="patient-uuid" />);

    expect(screen.getByText(/could not load the eMastercards/i)).toBeInTheDocument();
  });
});
