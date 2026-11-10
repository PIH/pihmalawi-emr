import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard, useObsOnDays } from '../art/art.resource';
import { EC_FORMS } from './ec-concepts';
import { launchEcPanel } from './launch-ec-panel';
import { ecHeader, ecVisit, eidTest } from './test-ec-data';
import EcCard from './ec-card.component';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
  useObsOnDays: vi.fn(),
}));
const mockLaunch = vi.fn();
vi.mock('./launch-ec-panel', () => ({ launchEcPanel: vi.fn(), useLaunchEcPanel: () => mockLaunch }));

const visits = [
  ecVisit('v2', '2026-10-08', { status: 1, wasting: 2, sick: true, next: '2026-11-05' }),
  ecVisit('v1', '2026-09-10', { status: 0, cpt: 30 }),
];
const tests = [eidTest('eid-2', '2026-09-01', 1), eidTest('eid-1', '2026-04-01', 0)];

function withData(state: 'CREATE' | 'EDIT', data: Partial<Record<keyof typeof EC_FORMS, Array<ArtEncounter>>> = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({
      key: 'exposed-child',
      group: 'Exposed Child Patient Card',
      label: 'Exposed Child eMastercard',
      state,
      initialEncounterUuid: data.header?.[0]?.uuid ?? null,
      enrolment: {
        uuid: 'pp1',
        program: 'Chronic care program',
        dateEnrolled: '2025-02-10',
        dateCompleted: null,
        location: { uuid: 'neno-dh', display: 'Neno District Hospital' },
        state: { name: 'On treatment', startDate: '2025-02-10' },
      },
    }),
    systemLocationsTag: null,
    isLoading: false,
    error: undefined,
  });
  const key = (encounterType: string) =>
    (Object.keys(EC_FORMS) as Array<keyof typeof EC_FORMS>).find((k) => EC_FORMS[k].encounterType === encounterType);
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: data[key(form.encounterType)] ?? [],
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }));
  vi.mocked(useObsOnDays).mockReturnValue({});
}

const everything = { header: [ecHeader], visit: visits, eid: tests };
const renderCard = () => render(<EcCard patientUuid="p1" title="HIV Care" />);

describe('EcCard', () => {
  it('names the card, with the state of its own treatment workflow', () => {
    withData('EDIT', everything);
    renderCard();
    expect(screen.getByText('Exposed child patient card · version 1 · On treatment since 10-Feb-2025 at Neno District Hospital')).toBeInTheDocument();
  });

  it('shows the headline row: HIV infection and a positive EID result in red', () => {
    withData('EDIT', everything);
    renderCard();
    const headline = within(screen.getByRole('region', { name: 'Exposed child at a glance' }));
    expect(headline.getByText('B: Infected')).toBeInTheDocument();
    expect(headline.getByText('Positive')).toBeInTheDocument();
    expect(headline.getByText('Sample taken 01-Sep-2026')).toBeInTheDocument();
    expect(headline.getByText('05-Nov-2026')).toBeInTheDocument();
  });

  it('shows the child and guardian details and the status at enrolment, with the NVP age and its unit', () => {
    withData('EDIT', everything);
    renderCard();
    expect(within(screen.getByRole('region', { name: 'Child and Guardian Details' })).getByText('Mother')).toBeInTheDocument();
    const status = within(screen.getByRole('region', { name: 'Status at Enrolment' }));
    expect(status.getByText('On ART')).toBeInTheDocument();
    expect(status.getByText('Weeks')).toBeInTheDocument();
  });

  it('lists the EID tests, recorded and edited in their panel, and shows wasting and sickness in red', async () => {
    withData('EDIT', everything);
    renderCard();
    const eid = within(screen.getByRole('region', { name: 'EID Tests' }));
    expect(eid.getAllByText('S-123')).toHaveLength(2);
    await userEvent.click(eid.getByRole('button', { name: 'Record' }));
    expect(mockLaunch).toHaveBeenCalledWith('eid');
    await userEvent.click(eid.getAllByRole('button', { name: 'Edit' })[0]);
    expect(launchEcPanel).toHaveBeenCalledWith('eid', { patientUuid: 'p1', encounterUuid: 'eid-2' });
    const monitoring = within(screen.getByRole('region', { name: 'Monitoring' }));
    expect(within(monitoring.getByRole('row', { name: /Wasting/ })).getByText('Severe')).toBeInTheDocument();
  });
});
