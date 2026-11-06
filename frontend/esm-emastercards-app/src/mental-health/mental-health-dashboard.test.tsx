import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { card } from '../test-cards';
import { navigate } from '@openmrs/esm-framework';
import { type ArtEncounter, useCardEncounters, useCardGroup, useEMastercard } from '../art/art.resource';
import { FINDINGS, MH_FORMS } from './mh-concepts';
import { launchMhPanel } from './launch-mh-panel';
import { mhHeader, mhScreening, mhVisit } from './test-mh-data';
import MentalHealthDashboard from './mental-health-dashboard.component';
import MentalHealthDashboardLink from './mental-health-dashboard-link.component';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
  useCardGroup: vi.fn(),
}));
vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  DashboardExtension: ({ title }: { title: string }) => <a href="#mentalHealth">{title}</a>,
}));
vi.mock('../epilepsy/epilepsy-card.component', () => ({
  default: ({ tabs }: { tabs?: React.ReactNode }) => (
    <div>
      {tabs}
      <p>Native epilepsy card</p>
    </div>
  ),
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
  extraCards: Array<ReturnType<typeof card>> = [],
) {
  const mhCard = card({ key: 'mental-health', group: 'Mental Health Record', label: 'Mental Health eMastercard', state, message, initialEncounterUuid: data.header?.[0]?.uuid ?? null, enrolment: { uuid: 'pp1', program: 'Mental Health Care Program', dateEnrolled: '2025-02-20', dateCompleted: null, location: { uuid: 'neno-dh', display: 'Neno District Hospital' }, state: null } });
  vi.mocked(useCardGroup).mockReturnValue({ cards: state === 'UNAVAILABLE' ? [] : [mhCard, ...extraCards], inactive: [], isLoading: false, error: undefined });
  vi.mocked(useEMastercard).mockReturnValue({
    card: mhCard,
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
    expect(screen.getByRole('heading', { name: 'Mental Health Record' })).toBeInTheDocument();
    expect(screen.getByText('Mental health patient card · version 1.4 · enrolled 20-Feb-2025 at Neno District Hospital')).toBeInTheDocument();
  });

  it('shows the headline row', () => {
    withData('EDIT', everything);
    render(<MentalHealthDashboard patientUuid="p1" />);
    const headline = within(screen.getByRole('region', { name: 'Mental health at a glance' }));
    expect(headline.getAllByText('Yes').length).toBeGreaterThan(0);
    expect(headline.getAllByText('Assessed 08-Oct-2026')).toHaveLength(3);
    expect(headline.getByText('RIS 2 mg')).toBeInTheDocument();
    expect(headline.getByText('Risperidone · twice daily')).toBeInTheDocument();
    expect(headline.getByText('Able')).toBeInTheDocument();
    expect(headline.getByText('04-Nov-2026')).toBeInTheDocument();
    expect(headline.getByText('Booked 08-Oct-2026')).toBeInTheDocument();
  });

  it('header cards show their answers', () => {
    withData('EDIT', everything);
    render(<MentalHealthDashboard patientUuid="p1" />);
    // Patient and Guardian Details comes first, on the left
    expect(
      screen.getByRole('region', { name: 'Patient and Guardian Details' }).compareDocumentPosition(screen.getByRole('region', { name: 'Diagnoses' })),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    const diagnoses = within(screen.getByRole('region', { name: 'Diagnoses' }));
    expect(diagnoses.getByText('Schizophrenia · 12-Mar-2025')).toBeInTheDocument();
    // the presenting features sit under the diagnoses, in the same card, as in the mockup
    expect(within(diagnoses.getByRole('group', { name: 'Presenting Features' })).getByText('Hallucinations · 01-Mar-2025')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Presenting Features' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'History and Exposures' })).getByText('Past')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Patient and Guardian Details' })).getByText('Test Guardian')).toBeInTheDocument();
  });

  it('MSE table shows the last 4 visits', () => {
    withData('EDIT', everything);
    render(<MentalHealthDashboard patientUuid="p1" />);
    expect(within(screen.getByRole('region', { name: 'Mental Status Examination' })).getByText('Last 4 visits')).toBeInTheDocument();
    const table = within(screen.getByRole('table', { name: 'Mental Status Examination' }));
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
    const history = within(screen.getByRole('region', { name: 'Medication History' }));
    const rows = history.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('13-Aug-2026')).toBeInTheDocument();
    expect(rows[0].querySelector('b')?.textContent).toBe('RIS');
    expect(rows[0]).toHaveTextContent('RIS · risperidone 2 mg twice daily');
    expect(within(rows[0]).getByText('Current')).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent('CPZ · chlorpromazine 100 mg once daily');
    expect(within(rows[1]).queryByText('Current')).not.toBeInTheDocument();
    expect(history.getByText('1')).toBeInTheDocument();
  });

  it('lists visits and screenings newest first with Edit', async () => {
    withData('EDIT', everything);
    render(<MentalHealthDashboard patientUuid="p1" />);
    const table = within(screen.getByRole('table', { name: 'Mental Health Visits' }));
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
    await userEvent.click(within(screen.getByRole('region', { name: 'History and Exposures' })).getByRole('button', { name: 'Edit' }));
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

const epilepsyCard = card({
  key: 'epilepsy',
  group: 'Mental Health Record',
  label: 'Epilepsy eMastercard',
  state: 'EDIT',
  flowsheetPath: 'htmlformentryui/htmlform/flowsheet.page?headerForm=file:configuration/htmlforms/epilepsy-emastercard.xml&patientId=7',
});

describe('MentalHealthDashboard enrolment', () => {
  it("shows the state of the card's own workflow and since when, not the enrolment date", () => {
    withData('EDIT', everything);
    vi.mocked(useEMastercard).mockReturnValue({
      card: card({
        key: 'mental-health',
        state: 'EDIT',
        initialEncounterUuid: mhHeader.uuid,
        enrolment: {
          uuid: 'pp1',
          program: 'Mental Health Care Program',
          dateEnrolled: '2025-03-11',
          dateCompleted: null,
          location: { uuid: 'neno-dh', display: 'Neno District Hospital' },
          state: { name: 'On treatment', startDate: '2026-10-16' },
        },
      }),
      systemLocationsTag: null,
      isLoading: false,
      error: undefined,
    });
    render(<MentalHealthDashboard patientUuid="p1" />);
    expect(screen.getByText('Mental health patient card · version 1.4 · On treatment since 16-Oct-2026 at Neno District Hospital')).toBeInTheDocument();
  });
});

describe('MentalHealthDashboard with more than one card', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('shows a tab for each card, the mental health card first', () => {
    withData('EDIT', everything, null, [epilepsyCard]);
    render(<MentalHealthDashboard patientUuid="p1" />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Mental Health', 'Epilepsy']);
    expect(screen.getByRole('tab', { name: 'Mental Health' })).toHaveAttribute('aria-selected', 'true');
    // both cards are active, so neither needs explaining
    expect(screen.queryByText(/shows only when it is a state on treatment/)).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Diagnoses' })).toBeInTheDocument();
  });

  it('opens the card the URL names: epilepsy shows its native card', () => {
    window.history.replaceState(null, '', '/openmrs/spa/patient/p1/chart/mentalHealth?card=epilepsy');
    withData('EDIT', everything, null, [epilepsyCard]);
    render(<MentalHealthDashboard patientUuid="p1" />);
    expect(screen.getByRole('tab', { name: 'Epilepsy' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Native epilepsy card')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Diagnoses' })).not.toBeInTheDocument();
  });

  it('a card not yet kept natively shows its legacy card', () => {
    const legacy = card({ key: 'some-card', group: 'Mental Health Record', label: 'Some eMastercard', state: 'EDIT' });
    window.history.replaceState(null, '', '/openmrs/spa/patient/p1/chart/mentalHealth?card=some-card');
    withData('EDIT', everything, null, [epilepsyCard, legacy]);
    render(<MentalHealthDashboard patientUuid="p1" />);
    expect(screen.getByRole('tab', { name: 'Some' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTitle('Some eMastercard')).toBeInTheDocument();
  });

  it('a tab opens its card', async () => {
    withData('EDIT', everything, null, [epilepsyCard]);
    render(<MentalHealthDashboard patientUuid="p1" />);
    await userEvent.click(screen.getByRole('tab', { name: 'Epilepsy' }));
    expect(navigate).toHaveBeenCalledWith({ to: '${openmrsSpaBase}/patient/p1/chart/mentalHealth?card=epilepsy' });
  });

  it('a patient with only an epilepsy card sees it, without tabs', () => {
    withData('UNAVAILABLE', {}, 'Not available');
    vi.mocked(useCardGroup).mockReturnValue({
      cards: [epilepsyCard],
      inactive: [card({ key: 'mental-health', group: 'Mental Health Record', label: 'Mental Health eMastercard', state: 'UNAVAILABLE' })],
      isLoading: false,
      error: undefined,
    });
    render(<MentalHealthDashboard patientUuid="p1" />);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByText('Native epilepsy card')).toBeInTheDocument();
    expect(screen.getByText('Mental Health shows only when it is a state on treatment/in advanced care in Enrolments')).toBeInTheDocument();
  });

  it('says why epilepsy is missing when the patient is not on treatment or in advanced care for it', () => {
    withData('EDIT', everything);
    vi.mocked(useCardGroup).mockReturnValue({
      cards: [card({ key: 'mental-health', group: 'Mental Health Record', state: 'EDIT' })],
      inactive: [card({ key: 'epilepsy', group: 'Mental Health Record', label: 'Epilepsy eMastercard', state: 'UNAVAILABLE' })],
      isLoading: false,
      error: undefined,
    });
    render(<MentalHealthDashboard patientUuid="p1" />);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByText('Epilepsy shows only when it is a state on treatment/in advanced care in Enrolments')).toBeInTheDocument();
  });
});

describe('MentalHealthDashboardLink', () => {
  it('expands to a link for each card when the patient has more than one', async () => {
    withData('EDIT', everything, null, [epilepsyCard]);
    render(<MentalHealthDashboardLink basePath="${openmrsSpaBase}/patient/p1/chart" patientUuid="p1" />);
    expect(screen.getByRole('button', { name: /Mental Health Record/ })).toHaveAttribute('aria-expanded', 'true');
    const epilepsy = screen.getByRole('link', { name: 'Epilepsy' });
    expect(screen.getByRole('link', { name: 'Mental Health' })).toBeInTheDocument();
    expect(epilepsy).toHaveAttribute('href', '/openmrs/spa/patient/p1/chart/mentalHealth?card=epilepsy');
    await userEvent.click(screen.getByRole('button', { name: /Mental Health Record/ }));
    expect(screen.queryByRole('link', { name: 'Epilepsy' })).not.toBeInTheDocument();
  });

  it('the link is hidden when the card is not available to the patient', () => {
    withData('UNAVAILABLE', {}, 'Not available: Inactive program state (Mental Health eMastercard)');
    const { container } = render(<MentalHealthDashboardLink basePath="/chart" patientUuid="p1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('the link shows only with a mental-health card', () => {
    vi.mocked(useCardGroup).mockReturnValue({ cards: [], inactive: [], isLoading: false, error: undefined });
    const { container } = render(<MentalHealthDashboardLink basePath="/chart" patientUuid="p1" />);
    expect(container).toBeEmptyDOMElement();
    withData('EDIT');
    render(<MentalHealthDashboardLink basePath="/chart" patientUuid="p1" />);
    expect(screen.getByText('Mental Health')).toBeInTheDocument();
  });
});
