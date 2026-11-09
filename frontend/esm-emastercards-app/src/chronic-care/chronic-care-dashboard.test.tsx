import React from 'react';
import { render, screen } from '@testing-library/react';
import { card } from '../test-cards';
import { useCardGroup } from '../art/art.resource';
import { useCurrentUrl } from '../shared/card-group';
import ChronicCareDashboard from './chronic-care-dashboard.component';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useCardGroup: vi.fn(),
}));
vi.mock('../shared/card-group', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../shared/card-group')>()),
  useCurrentUrl: vi.fn(),
}));
vi.mock('./htn-card.component', () => ({
  default: ({ title, tabs }) => (
    <div>
      Native HTN card: {title}
      {tabs}
    </div>
  ),
}));
vi.mock('../shared/legacy-card-page.component', () => ({
  default: ({ card: c }) => <div>Legacy page: {c.label}</div>,
}));

const group = 'Chronic Care Record';
const htn = card({
  key: 'htn-dm',
  group,
  label: 'Hypertension and Diabetes eMastercard',
  state: 'EDIT',
});
const oldChronicCare = card({
  key: 'chronic-care',
  group,
  label: 'Chronic Care eMastercard',
  state: 'EDIT',
});
const inactive = (key: string, label: string, state: { name: string; startDate: string } | null) =>
  card({
    key,
    group,
    label,
    state: 'UNAVAILABLE',
    message: `Not available: Inactive program state (${label})`,
    enrolment: state
      ? {
          uuid: 'pp',
          program: 'Chronic care program',
          dateEnrolled: '2024-01-01',
          dateCompleted: null,
          location: null,
          state,
        }
      : null,
  });

function withCards(cards, lapsed = [], url = 'http://x/openmrs/spa/patient/p1/chart/chronicCare') {
  vi.mocked(useCardGroup).mockReturnValue({
    cards,
    inactive: lapsed,
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCurrentUrl).mockReturnValue(new URL(url));
}

describe('ChronicCareDashboard', () => {
  it('shows the hypertension and diabetes card natively, titled Chronic Care Record', () => {
    withCards([htn]);
    render(<ChronicCareDashboard patientUuid="p1" />);
    expect(screen.getByText('Native HTN card: Chronic Care Record')).toBeInTheDocument();
  });

  it("shows another chronic care card's legacy flowsheet, with a tab for each card", () => {
    withCards([htn, oldChronicCare], [], 'http://x/openmrs/spa/patient/p1/chart/chronicCare?card=chronic-care');
    render(<ChronicCareDashboard patientUuid="p1" />);
    expect(screen.getByText('Legacy page: Chronic Care eMastercard')).toBeInTheDocument();
  });

  it("notes a card only when the patient has a state for it that isn't on treatment, not every chronic condition", () => {
    withCards(
      [htn],
      [
        inactive('ckd', 'Chronic Kidney Disease eMastercard', {
          name: 'Patient defaulted',
          startDate: '2026-01-01',
        }),
        inactive('scd', 'Sickle Cell Disease eMastercard', null),
      ],
    );
    render(<ChronicCareDashboard patientUuid="p1" />);
    expect(screen.getByText('Chronic Kidney Disease shows only when it is a state on treatment/in advanced care in Enrolments')).toBeInTheDocument();
    expect(screen.queryByText(/Sickle Cell Disease shows only/)).not.toBeInTheDocument();
  });
});
