import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard, useObsOnDays } from '../art/art.resource';
import { TC_FORMS } from './tc-concepts';
import { launchTcPanel } from './launch-tc-panel';
import { survey, tcHeader, tcVisit } from './test-tc-data';
import TcCard from './tc-card.component';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
  useObsOnDays: vi.fn(),
}));
const mockLaunch = vi.fn();
vi.mock('./launch-tc-panel', () => ({ launchTcPanel: vi.fn(), useLaunchTcPanel: () => mockLaunch }));

const visits = [
  tcVisit('v2', '2026-10-08', { sti: '+', muacNormal: false, hospitalised: true, next: '2026-11-05' }),
  tcVisit('v1', '2026-09-10', { sti: '-' }),
];

function withData(state: 'CREATE' | 'EDIT', data: Partial<Record<keyof typeof TC_FORMS, Array<ArtEncounter>>> = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({
      key: 'teen-club',
      group: 'Teen Club Record',
      label: 'Teen Club eMastercard',
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
    (Object.keys(TC_FORMS) as Array<keyof typeof TC_FORMS>).find((k) => TC_FORMS[k].encounterType === encounterType);
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: data[key(form.encounterType)] ?? [],
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }));
  vi.mocked(useObsOnDays).mockReturnValue({});
}

const everything = { header: [tcHeader], visit: visits, survey: [survey] };
const renderCard = () => render(<TcCard patientUuid="p1" title="HIV care" />);

describe('TcCard', () => {
  it('names the card, with the state of its own treatment workflow', () => {
    withData('EDIT', everything);
    renderCard();
    expect(screen.getByRole('heading', { name: 'HIV care' })).toBeInTheDocument();
    expect(screen.getByText('Teen club patient card · version 2 · On treatment since 10-Feb-2025 at Neno District Hospital')).toBeInTheDocument();
  });

  it('shows the headline row from the latest screening, a positive STI screening and an abnormal MUAC in red', () => {
    withData('EDIT', everything);
    renderCard();
    const headline = within(screen.getByRole('region', { name: 'Teen club at a glance' }));
    expect(headline.getByText('+')).toBeInTheDocument();
    expect(headline.getAllByText('No').length).toBeGreaterThan(0);
    expect(headline.getByText('05-Nov-2026')).toBeInTheDocument();
  });

  it('shows the intake / referral form with the age at intake, and records intake surveys in their panel', async () => {
    withData('EDIT', everything);
    renderCard();
    const details = within(screen.getByRole('region', { name: 'Patient and Guardian Details' }));
    expect(details.getByText('Age at intake in months · 170')).toBeInTheDocument();
    expect(details.getByText('Aunt')).toBeInTheDocument();
    const surveys = within(screen.getByRole('region', { name: 'Intake Surveys' }));
    expect(surveys.getByText('01-Feb-2024')).toBeInTheDocument();
    await userEvent.click(surveys.getByRole('button', { name: 'Record' }));
    expect(mockLaunch).toHaveBeenCalledWith('survey');
    await userEvent.click(surveys.getByRole('button', { name: 'Edit' }));
    expect(launchTcPanel).toHaveBeenCalledWith('survey', { patientUuid: 'p1', encounterUuid: survey.uuid });
  });

  it('shows hospitalisation in red in the screening table', () => {
    withData('EDIT', everything);
    renderCard();
    const monitoring = within(screen.getByRole('region', { name: 'Monitoring' }));
    expect(within(monitoring.getByRole('row', { name: /Hospitalised/ })).getByText('Yes')).toBeInTheDocument();
  });
});
