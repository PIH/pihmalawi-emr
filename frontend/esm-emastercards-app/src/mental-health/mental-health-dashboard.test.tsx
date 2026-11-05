import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard } from '../art/art.resource';
import { FINDINGS, MH_FORMS } from './mh-concepts';
import { launchMhPanel } from './launch-mh-panel';
import { mhHeader, mhScreening, mhVisit } from './test-mh-data';
import MentalHealthDashboard from './mental-health-dashboard.component';
import MentalHealthDashboardLink from './mental-health-dashboard-link.component';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
}));
vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  DashboardExtension: ({ title }: { title: string }) => <a href="#mentalHealth">{title}</a>,
}));
vi.mock('./launch-mh-panel', () => ({ launchMhPanel: vi.fn(), useLaunchMhPanel: () => vi.fn() }));

const visits = [
  mhVisit('v4', '2026-10-08', { meds: [['ris', 2, 'BID']] }),
  mhVisit('v3', '2026-09-10', { meds: [['ris', 2, 'BID']] }),
  mhVisit('v2', '2026-08-13', { present: [FINDINGS.delusions], meds: [['ris', 2, 'BID']] }),
  mhVisit('v1', '2026-07-16', {
    present: [FINDINGS.hallucinations, FINDINGS.delusions],
    stable: false,
    able: false,
    hospitalised: true,
    meds: [['cpz', 100, 'OD']],
  }),
];

function withData(
  state: 'CREATE' | 'EDIT' | 'VIEW' | 'UNAVAILABLE',
  data: { header?: Array<ArtEncounter>; visits?: Array<ArtEncounter>; screenings?: Array<ArtEncounter> } = {},
  message: string | null = null,
) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'mental-health', state, message, initialEncounterUuid: data.header?.[0]?.uuid ?? null }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters:
      {
        [MH_FORMS.header.encounterType]: data.header ?? [],
        [MH_FORMS.visit.encounterType]: data.visits ?? [],
        [MH_FORMS.screening.encounterType]: data.screenings ?? [],
      }[form.encounterType] ?? [],
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }));
}

const everything = { header: [mhHeader], visits, screenings: [mhScreening('s1', '2026-06-01')] };

describe('MentalHealthDashboard', () => {
  it('names the card under the title', () => {
    withData('EDIT', everything);
    render(<MentalHealthDashboard patientUuid="p1" />);
    expect(screen.getByText('Care and treatment')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mental health' })).toBeInTheDocument();
    expect(screen.getByText('Mental health patient card · enrolled 12-Mar-2025 at Neno District Hospital')).toBeInTheDocument();
  });

  it('shows the headline row', () => {
    withData('EDIT', everything);
    render(<MentalHealthDashboard patientUuid="p1" />);
    const headline = within(screen.getByRole('region', { name: 'Mental health at a glance' }));
    expect(headline.getAllByText('Yes').length).toBeGreaterThan(0);
    expect(headline.getAllByText('Assessed 08-Oct-2026')).toHaveLength(3);
    expect(headline.getByText('RIS 2 mg')).toBeInTheDocument();
    expect(headline.getByText('BID')).toBeInTheDocument();
    expect(headline.getByText('Able')).toBeInTheDocument();
    expect(headline.getByText('04-Nov-2026')).toBeInTheDocument();
    expect(headline.getByText('Booked 08-Oct-2026')).toBeInTheDocument();
  });

  it('header cards show their answers', () => {
    withData('EDIT', everything);
    render(<MentalHealthDashboard patientUuid="p1" />);
    expect(within(screen.getByRole('region', { name: 'Diagnoses' })).getByText('Schizophrenia · 12-Mar-2025')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Presenting features' })).getByText('Hallucinations · 01-Mar-2025')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'History and exposures' })).getByText('Past')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Patient and guardian' })).getByText('Test Guardian')).toBeInTheDocument();
  });

  it('MSE table shows the last 4 visits', () => {
    withData('EDIT', everything);
    render(<MentalHealthDashboard patientUuid="p1" />);
    const table = within(screen.getByRole('table', { name: 'Mental status examination' }));
    expect(table.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Finding',
      '08-Oct-2026',
      '10-Sep-2026',
      '13-Aug-2026',
      '16-Jul-2026',
    ]);
    const row = table.getAllByRole('row').find((r) => within(r).queryByText('Hallucinations'));
    expect(within(row).getAllByRole('cell').slice(1).map((c) => c.textContent)).toEqual(['–', '–', '–', 'Present']);
  });

  it('medication history tags the current regimen', () => {
    withData('EDIT', everything);
    render(<MentalHealthDashboard patientUuid="p1" />);
    const history = within(screen.getByRole('region', { name: 'Medication history' }));
    const rows = history.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('13-Aug-2026')).toBeInTheDocument();
    expect(within(rows[0]).getByText('RIS 2 mg BID')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Current')).toBeInTheDocument();
    expect(within(rows[1]).getByText('CPZ 100 mg OD')).toBeInTheDocument();
    expect(within(rows[1]).queryByText('Current')).not.toBeInTheDocument();
    expect(history.getByText('1')).toBeInTheDocument();
  });

  it('lists visits and screenings newest first with Edit', async () => {
    withData('EDIT', everything);
    render(<MentalHealthDashboard patientUuid="p1" />);
    const table = within(screen.getByRole('table', { name: 'Mental health visits' }));
    const rows = table.getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell')[0].textContent)).toEqual(['08-Oct-2026', '10-Sep-2026', '13-Aug-2026', '16-Jul-2026']);
    await userEvent.click(within(rows[0]).getByRole('button', { name: 'Edit' }));
    expect(launchMhPanel).toHaveBeenCalledWith('visit', { patientUuid: 'p1', encounterUuid: 'v4' });
    const screenings = within(screen.getByRole('table', { name: 'Screenings' }));
    const first = screenings.getAllByRole('row')[1];
    expect(within(first).getByText('Depression')).toBeInTheDocument();
    await userEvent.click(within(first).getByRole('button', { name: 'Edit' }));
    expect(launchMhPanel).toHaveBeenCalledWith('screening', { patientUuid: 'p1', encounterUuid: 's1' });
  });

  it('CREATE: Start the card, Record disabled', async () => {
    withData('CREATE');
    render(<MentalHealthDashboard patientUuid="p1" />);
    expect(screen.getByRole('button', { name: 'Record mental health visit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Record screening' })).toBeDisabled();
    expect(screen.getByText(/Start the card first/)).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('region', { name: 'Diagnoses' })).getByRole('button', { name: 'Start the card' }));
    expect(launchMhPanel).toHaveBeenCalledWith('header', { patientUuid: 'p1', section: 'start' });
  });

  it('EDIT: a header card opens its own section', async () => {
    withData('EDIT', everything);
    render(<MentalHealthDashboard patientUuid="p1" />);
    await userEvent.click(within(screen.getByRole('region', { name: 'History and exposures' })).getByRole('button', { name: 'Edit' }));
    expect(launchMhPanel).toHaveBeenCalledWith('header', { patientUuid: 'p1', section: 'historyExposures' });
  });

  it('VIEW: no actions', () => {
    withData('VIEW', everything, 'Patient died');
    render(<MentalHealthDashboard patientUuid="p1" />);
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Record/ })).not.toBeInTheDocument();
    expect(screen.getByText('Patient died')).toBeInTheDocument();
  });

  it('UNAVAILABLE: only the message', () => {
    withData('UNAVAILABLE', everything, 'Multiple Mental Health eMastercard forms found');
    render(<MentalHealthDashboard patientUuid="p1" />);
    expect(screen.getByText('Multiple Mental Health eMastercard forms found')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('MentalHealthDashboardLink', () => {
  it('the link is hidden when the card is not available to the patient', () => {
    withData('UNAVAILABLE', {}, 'Not available: Inactive program state (Mental Health eMastercard)');
    const { container } = render(<MentalHealthDashboardLink basePath="/chart" patientUuid="p1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('the link shows only with a mental-health card', () => {
    vi.mocked(useEMastercard).mockReturnValue({ card: null, systemLocationsTag: null, isLoading: false, error: undefined });
    const { container } = render(<MentalHealthDashboardLink basePath="/chart" patientUuid="p1" />);
    expect(container).toBeEmptyDOMElement();
    withData('EDIT');
    render(<MentalHealthDashboardLink basePath="/chart" patientUuid="p1" />);
    expect(screen.getByText('Mental health')).toBeInTheDocument();
  });
});
