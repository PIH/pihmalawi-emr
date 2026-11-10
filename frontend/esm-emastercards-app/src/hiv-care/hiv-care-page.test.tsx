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
vi.mock('../teen-club/tc-card.component', () => ({
  default: ({ title, tabs }) => (
    <div>
      Teen club card: {title}
      {tabs}
    </div>
  ),
}));
vi.mock('../exposed-child/ec-card.component', () => ({ default: ({ title }) => <div>Exposed child card: {title}</div> }));
vi.mock('../shared/legacy-card-page.component', () => ({ default: ({ card: c }) => <div>Legacy page: {c.label}</div> }));

const art = card({ state: 'EDIT' });
const teenClub = card({ key: 'teen-club', group: 'Teen Club Record', label: 'Teen Club eMastercard', state: 'EDIT' });
const preArt = card({ key: 'pre-art', group: 'Pre-ART Patient Card', label: 'Pre-ART eMastercard', state: 'VIEW' });

function at(card: string | null, cards = [art, teenClub, preArt], inactive = []) {
  vi.mocked(useHivCards).mockReturnValue({ cards, inactive, isLoading: false });
  vi.mocked(useCurrentUrl).mockReturnValue(new URL(`http://x/openmrs/spa/patient/p1/chart/hivCare${card ? `?card=${card}` : ''}`));
}

describe('HivCarePage', () => {
  it('shows the ART card by default, titled HIV Care, with a tab for each HIV card', () => {
    at(null);
    render(<HivCarePage patientUuid="p1" />);
    expect(screen.getByText('ART card: HIV Care')).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['ART', 'Teen Club', 'Pre-ART']);
  });

  it('shows the teen club card natively', () => {
    at('teen-club');
    render(<HivCarePage patientUuid="p1" />);
    expect(screen.getByText('Teen club card: HIV Care')).toBeInTheDocument();
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
    expect(
      screen.getByText('Teen Club shows only when it is a state Patient transfer in or First time initiation in Enrolments'),
    ).toBeInTheDocument();
  });

  it('shows the exposed child card natively', () => {
    const exposedChild = card({ key: 'exposed-child', group: 'Exposed Child Patient Card', label: 'Exposed Child eMastercard', state: 'EDIT' });
    at('exposed-child', [art, exposedChild]);
    render(<HivCarePage patientUuid="p1" />);
    expect(screen.getByText('Exposed child card: HIV Care')).toBeInTheDocument();
  });

  it('names the Enrolments state the ART, exposed child and pre-ART cards are for', () => {
    const lapsed = (key: string, label: string) => card({ key, label, state: 'UNAVAILABLE', message: 'Not available: Inactive program state' });
    at(
      null,
      [card({ key: 'teen-club', group: 'Teen Club Record', label: 'Teen Club eMastercard', state: 'EDIT' })],
      [lapsed('art', 'ART eMastercard'), lapsed('exposed-child', 'Exposed Child eMastercard'), lapsed('pre-art', 'Pre-ART eMastercard')],
    );
    render(<HivCarePage patientUuid="p1" />);
    expect(screen.getByText('ART shows only when it is a state on antiretrovirals in Enrolments')).toBeInTheDocument();
    expect(screen.getByText('Exposed Child shows only when it is a state Exposed Child (Continue) in Enrolments')).toBeInTheDocument();
    expect(screen.getByText('Pre-ART shows only when it is a state Pre-ART (Continue) in Enrolments')).toBeInTheDocument();
  });
});
