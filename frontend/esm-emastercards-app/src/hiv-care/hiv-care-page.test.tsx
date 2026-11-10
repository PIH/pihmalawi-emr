import React from 'react';
import { render, screen } from '@testing-library/react';
import { card } from '../test-cards';
import { useCurrentUrl } from '../shared/card-group';
import { useHivCards } from './hiv-cards';
import HivCarePage from './hiv-care-page.component';

vi.mock('./hiv-cards', async (importOriginal) => ({ ...(await importOriginal<typeof import('./hiv-cards')>()), useHivCards: vi.fn() }));
vi.mock('../shared/card-group', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../shared/card-group')>()),
  useCurrentUrl: vi.fn(),
}));
vi.mock('../art/hiv-care-dashboard.component', () => ({
  default: ({ title, tabs }) => (
    <div>
      ART card: {title}
      {tabs}
    </div>
  ),
}));
vi.mock('../teen-club/tc-card.component', () => ({ default: ({ title }) => <div>Teen club card: {title}</div> }));
vi.mock('../shared/legacy-card-page.component', () => ({ default: ({ card: c }) => <div>Legacy page: {c.label}</div> }));

const art = card({ state: 'EDIT' });
const teenClub = card({ key: 'teen-club', group: 'Teen Club Record', label: 'Teen Club eMastercard', state: 'EDIT' });
const preArt = card({ key: 'pre-art', group: 'Pre-ART Patient Card', label: 'Pre-ART eMastercard', state: 'VIEW' });

function at(card: string | null, cards = [art, teenClub, preArt], inactive = []) {
  vi.mocked(useHivCards).mockReturnValue({ cards, inactive, isLoading: false });
  vi.mocked(useCurrentUrl).mockReturnValue(new URL(`http://x/openmrs/spa/patient/p1/chart/hivCare${card ? `?card=${card}` : ''}`));
}

describe('HivCarePage', () => {
  it('shows the ART card by default, titled HIV care, with a tab for each HIV card', () => {
    at(null);
    render(<HivCarePage patientUuid="p1" />);
    expect(screen.getByText('ART card: HIV care')).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['ART', 'Teen Club', 'Pre-ART']);
  });

  it('shows the teen club card natively', () => {
    at('teen-club');
    render(<HivCarePage patientUuid="p1" />);
    expect(screen.getByText('Teen club card: HIV care')).toBeInTheDocument();
  });

  it("shows a card that isn't native yet in its legacy flowsheet", () => {
    at('pre-art');
    render(<HivCarePage patientUuid="p1" />);
    expect(screen.getByText('Legacy page: Pre-ART eMastercard')).toBeInTheDocument();
  });

  it('notes a card the patient has a state for that is not on treatment', () => {
    const lapsed = card({ key: 'teen-club', label: 'Teen Club eMastercard', state: 'UNAVAILABLE', message: 'Not available: Inactive program state' });
    at(null, [art], [lapsed]);
    render(<HivCarePage patientUuid="p1" />);
    expect(screen.getByText('Teen Club shows only when it is a state on treatment/in advanced care in Enrolments')).toBeInTheDocument();
  });
});
