import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { card } from '../test-cards';
import { VIRAL_LOAD } from './art-concepts';
import { type ArtEncounter, useArtCard, useArtEncounters } from './art.resource';
import { launchArtPanel } from './launch-art-panel';
import { followUpTests, initial, viralLoad, visits } from './test-art-data';
import HivCareDashboard from './hiv-care-dashboard.component';
import HivCareDashboardLink from './hiv-care-dashboard-link.component';

vi.mock('./art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./art.resource')>()),
  useArtCard: vi.fn(),
  useArtEncounters: vi.fn(),
}));
vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  DashboardExtension: ({ title }: { title: string }) => <a href="#hivCare">{title}</a>,
}));
vi.mock('./launch-art-panel', () => ({ launchArtPanel: vi.fn(), useLaunchArtPanel: () => vi.fn() }));

const mockUseArtCard = vi.mocked(useArtCard);
const mockUseArtEncounters = vi.mocked(useArtEncounters);

function withData(
  state: 'CREATE' | 'EDIT' | 'VIEW' | 'UNAVAILABLE',
  data: { initial?: Array<ArtEncounter>; visits?: Array<ArtEncounter>; viralLoad?: Array<ArtEncounter> } = {},
  message: string | null = null,
) {
  mockUseArtCard.mockReturnValue({
    card: card({ state, message, initialEncounterUuid: data.initial?.[0]?.uuid ?? null }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  mockUseArtEncounters.mockImplementation((_patient, kind) => ({
    encounters:
      { initial: data.initial ?? [], visit: data.visits ?? [], viralLoad: data.viralLoad ?? [], followUpTesting: followUpTests }[kind],
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }));
}

const everything = {
  initial: [initial],
  visits,
  viralLoad: [
    viralLoad('vl-1', '2025-09-02', { ldl: true, reason: VIRAL_LOAD.testingReasonAnswers.routine }),
    viralLoad('vl-0', '2023-08-10', { numeric: 1240, reason: VIRAL_LOAD.testingReasonAnswers.targeted }),
  ],
};

describe('HivCareDashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-04T10:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('names the card under the title, in the Care and treatment group', () => {
    withData('EDIT', everything);
    render(<HivCareDashboard patientUuid="p1" />);
    expect(screen.getByText('Care and treatment')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'HIV care' })).toBeInTheDocument();
    expect(screen.getByText('ART patient card · version 9 · enrolled 18-Feb-2019 at Neno District Hospital')).toBeInTheDocument();
  });

  it('shows the headline row with what each number means', () => {
    withData('EDIT', everything);
    render(<HivCareDashboard patientUuid="p1" />);
    const headline = within(screen.getByRole('region', { name: 'HIV at a glance' }));
    expect(headline.getByText('13A')).toBeInTheDocument();
    expect(headline.getByText('TDF/3TC/DTG · since 06-May-2026')).toBeInTheDocument();
    expect(headline.getByText('LDL')).toBeInTheDocument();
    expect(headline.getByText('540')).toBeInTheDocument();
    expect(headline.getByText('cells/µL · 02-Sep-2025')).toBeInTheDocument();
    expect(headline.getByText('TB not suspected')).toBeInTheDocument();
    expect(headline.getByText('Screened 05-Aug-2026')).toBeInTheDocument();
    expect(headline.getByText('04-Nov-2026')).toBeInTheDocument();
    expect(headline.getByText('Booked 05-Aug-2026')).toBeInTheDocument();
  });

  it('highlights a viral load that is due', () => {
    withData('EDIT', everything);
    render(<HivCareDashboard patientUuid="p1" />);
    expect(within(screen.getByRole('region', { name: 'HIV at a glance' })).getByText('02-Sep-2025 · due now')).toBeInTheDocument();
  });

  it('does not highlight a viral load done in the last 12 months', () => {
    withData('EDIT', { ...everything, viralLoad: [viralLoad('vl-3', '2026-06-01', { ldl: true })] });
    render(<HivCareDashboard patientUuid="p1" />);
    const headline = within(screen.getByRole('region', { name: 'HIV at a glance' }));
    expect(headline.getByText('01-Jun-2026')).toBeInTheDocument();
    expect(headline.queryByText(/due now/)).not.toBeInTheDocument();
  });

  it('lists viral loads and follow-up tests newest first, with units and reasons', () => {
    withData('EDIT', everything);
    render(<HivCareDashboard patientUuid="p1" />);
    const region = within(screen.getByRole('region', { name: 'Viral load and follow-up tests' }));
    const table = within(region.getByRole('table', { name: 'Viral load and follow-up tests' }));
    ['Date', 'Test', 'Result', 'Reason'].forEach((h) => expect(table.getByRole('columnheader', { name: h })).toBeInTheDocument());
    const rows = table
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getAllByRole('cell').slice(0, 4).map((c) => c.textContent));
    expect(rows).toEqual([
      ['02-Sep-2025', 'Viral load', 'LDL', 'Routine'],
      ['02-Sep-2025', 'CD4 count', '540 cells/µL', '–'],
      ['10-Aug-2023', 'Viral load', '1,240 copies/mL', 'Targeted'],
    ]);
  });

  it('shows a numeric or "<" viral load as the latest', () => {
    withData('EDIT', { ...everything, viralLoad: [viralLoad('vl-2', '2026-01-01', { lessThan: 40 }), ...everything.viralLoad] });
    render(<HivCareDashboard patientUuid="p1" />);
    expect(within(screen.getByRole('region', { name: 'HIV at a glance' })).getByText('<40')).toBeInTheDocument();
  });

  it("shows each header card's values", () => {
    withData('EDIT', everything);
    render(<HivCareDashboard patientUuid="p1" />);
    const status = within(screen.getByRole('region', { name: 'Status at ART initiation' }));
    expect(status.getByText('Stage 2')).toBeInTheDocument();
    expect(status.getByText('Herpes zoster')).toBeInTheDocument();
    expect(status.getByText('312')).toBeInTheDocument();
    const test = within(screen.getByRole('region', { name: 'Confirmatory HIV test' }));
    expect(test.getByText('Rapid')).toBeInTheDocument();
    expect(test.getByText('Neno District Hospital')).toBeInTheDocument();
    const guardian = within(screen.getByRole('region', { name: 'Patient and guardian' }));
    expect(guardian.getByText('Test Guardian')).toBeInTheDocument();
    expect(guardian.getByText('Sister')).toBeInTheDocument();
    expect(guardian.getByText('Yes')).toBeInTheDocument();
  });

  it('says a header card is not recorded yet when the header has none of its answers', () => {
    withData('EDIT', everything);
    render(<HivCareDashboard patientUuid="p1" />);
    expect(within(screen.getByRole('region', { name: 'Confirmatory HIV test' })).queryByText('Not recorded yet')).not.toBeInTheDocument();
    withData('EDIT', { ...everything, initial: [{ ...everything.initial[0], obs: [] }] });
    render(<HivCareDashboard patientUuid="p2" />);
    expect(within(screen.getAllByRole('region', { name: 'Confirmatory HIV test' })[1]).getByText('Not recorded yet')).toBeInTheDocument();
  });

  it('lists ART visits newest first with the form\'s columns', () => {
    withData('EDIT', everything);
    render(<HivCareDashboard patientUuid="p1" />);
    const table = within(screen.getByRole('table', { name: 'ART visits' }));
    ['Visit date', 'Height', 'Weight', 'BP', 'Preg/BF', 'TB status', 'Side effects', 'Pill count', 'Doses missed', 'ART regimen', 'ARVs given', 'CPT/IPT', 'Next appointment'].forEach((h) =>
      expect(table.getByRole('columnheader', { name: h })).toBeInTheDocument(),
    );
    const rows = table.getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell')[0].textContent)).toEqual(['05-Aug-2026', '06-May-2026', '10-Jan-2022']);
    expect(within(rows[0]).getByText('CTX 960 × 90')).toBeInTheDocument();
    expect(within(rows[0]).getByText('90 (P)')).toBeInTheDocument();
  });

  it('shows visit-by-visit regimen changes, the current one tagged, under the initiation regimens', () => {
    withData('EDIT', everything);
    render(<HivCareDashboard patientUuid="p1" />);
    const history = within(screen.getByRole('region', { name: 'ART regimen history' }));
    expect(history.getByText('First line')).toBeInTheDocument();
    expect(history.getByText('5A · TDF/3TC/EFV · since 18-Feb-2019')).toBeInTheDocument();
    const changes = history.getAllByRole('listitem');
    expect(changes.map((li) => within(li).getAllByText(/./)[0].textContent)).toEqual(['06-May-2026', '10-Jan-2022']);
    expect(within(changes[0]).getByText('13A')).toBeInTheDocument();
    expect(within(changes[0]).getByText('Current')).toBeInTheDocument();
    expect(within(changes[1]).getByText('5A')).toBeInTheDocument();
    expect(within(changes[1]).queryByText('Current')).not.toBeInTheDocument();
  });

  it('CREATE: header Edit buttons enabled; Record ART visit, Record viral load, Record follow-up tests disabled with an explanation', async () => {
    withData('CREATE');
    render(<HivCareDashboard patientUuid="p1" />);
    expect(screen.getByRole('button', { name: 'Record ART visit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Record viral load' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Record follow-up tests' })).toBeDisabled();
    expect(screen.getByText(/Fill in the card header first/)).toBeInTheDocument();
    const edit = within(screen.getByRole('region', { name: 'Status at ART initiation' })).getByRole('button', { name: 'Edit' });
    await userEvent.click(edit);
    expect(launchArtPanel).toHaveBeenCalledWith('initial', { patientUuid: 'p1', section: 'status' });
  });

  it('EDIT: Edit on a visit row opens that visit', async () => {
    withData('EDIT', everything);
    render(<HivCareDashboard patientUuid="p1" />);
    const row = within(screen.getByRole('table', { name: 'ART visits' })).getAllByRole('row')[1];
    await userEvent.click(within(row).getByRole('button', { name: 'Edit' }));
    expect(launchArtPanel).toHaveBeenCalledWith('visit', { patientUuid: 'p1', encounterUuid: 'v3' });
  });

  it('VIEW: no Edit or Record actions, and the reason shown', () => {
    withData('VIEW', everything, 'Patient died');
    render(<HivCareDashboard patientUuid="p1" />);
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Record/ })).not.toBeInTheDocument();
    expect(screen.getByText('Patient died')).toBeInTheDocument();
  });

  it('shows the service message and no actions when UNAVAILABLE', () => {
    withData('UNAVAILABLE', everything, 'Multiple ART eMastercard forms found');
    render(<HivCareDashboard patientUuid="p1" />);
    expect(screen.getByText('Multiple ART eMastercard forms found')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('HivCareDashboardLink', () => {
  it('the link is hidden when the patient has no ART card', () => {
    mockUseArtCard.mockReturnValue({ card: null, systemLocationsTag: null, isLoading: false, error: undefined });
    const { container } = render(<HivCareDashboardLink basePath="/chart" patientUuid="p1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the link when the patient has an ART card', () => {
    withData('EDIT');
    render(<HivCareDashboardLink basePath="/chart" patientUuid="p1" />);
    expect(screen.getByText('HIV care')).toBeInTheDocument();
  });
});
