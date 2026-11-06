import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard } from '../art/art.resource';
import { EP_FORMS } from './ep-concepts';
import { launchEpPanel } from './launch-ep-panel';
import { epHeader, epVisit } from './test-ep-data';
import EpilepsyCard from './epilepsy-card.component';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
}));
vi.mock('./launch-ep-panel', () => ({ launchEpPanel: vi.fn(), useLaunchEpVisit: () => vi.fn() }));

const visits = [
  epVisit('v3', '2026-10-08', { meds: [['cbz', 200, 'BID']], next: '2026-11-05' }),
  epVisit('v2', '2026-09-10', { seizures: true, count: 2, triggers: ['fever', 'sleep'], meds: [['cbz', 200, 'BID']] }),
  epVisit('v1', '2026-08-13', { seizures: true, count: 5, hospitalised: true, meds: [['pb', 30, 'OD']] }),
];

function withData(state: 'CREATE' | 'EDIT' | 'VIEW' | 'UNAVAILABLE', data: { header?: Array<ArtEncounter>; visits?: Array<ArtEncounter> } = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({
      key: 'epilepsy',
      label: 'Epilepsy eMastercard',
      state,
      message: state === 'UNAVAILABLE' ? 'Not available: Inactive program state (Epilepsy eMastercard)' : null,
      initialEncounterUuid: data.header?.[0]?.uuid ?? null,
      enrolment: {
        uuid: 'pp1',
        program: 'Mental Health Care Program',
        dateEnrolled: '2025-03-11',
        dateCompleted: null,
        location: { uuid: 'neno-dh', display: 'Neno District Hospital' },
        state: { name: 'In advanced care', startDate: '2026-01-09' },
      },
    }),
    systemLocationsTag: null,
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: { [EP_FORMS.header.encounterType]: data.header ?? [], [EP_FORMS.visit.encounterType]: data.visits ?? [] }[form.encounterType] ?? [],
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }));
}

const everything = { header: [epHeader], visits };
const renderCard = () => render(<EpilepsyCard patientUuid="p1" title="Mental Health Record" />);

describe('EpilepsyCard', () => {
  it("names the card, with the state of its own treatment workflow", () => {
    withData('EDIT', everything);
    renderCard();
    expect(screen.getByRole('heading', { name: 'Mental Health Record' })).toBeInTheDocument();
    expect(screen.getByText('Epilepsy patient card · version 1 · In advanced care since 09-Jan-2026 at Neno District Hospital')).toBeInTheDocument();
  });

  it('shows the headline row from the latest visit', () => {
    withData('EDIT', everything);
    renderCard();
    const headline = within(screen.getByRole('region', { name: 'Epilepsy at a glance' }));
    expect(headline.getAllByText('No').length).toBeGreaterThan(0);
    expect(headline.getByText('CBZ 200 mg')).toBeInTheDocument();
    expect(headline.getByText('Carbamazepine · twice daily')).toBeInTheDocument();
    expect(headline.getByText('05-Nov-2026')).toBeInTheDocument();
  });

  it('header cards show their answers', () => {
    withData('EDIT', everything);
    renderCard();
    // Patient and Guardian Details comes first, on the left
    expect(
      screen.getByRole('region', { name: 'Patient and Guardian Details' }).compareDocumentPosition(screen.getByRole('region', { name: 'Seizure Types' })),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(within(screen.getByRole('region', { name: 'Seizure Types' })).getByText('Tonic clonic')).toBeInTheDocument();
    const exposures = within(screen.getByRole('region', { name: 'Exposures, Triggers and Complications' }));
    expect(exposures.getByText('Alcohol · 01-Jun-2018')).toBeInTheDocument();
    expect(exposures.getByText('Other: Glue')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'History at Enrolment' })).getByText('2019')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Patient and Guardian Details' })).getByText('Test Guardian')).toBeInTheDocument();
  });

  it('seizure activity over the last visits', () => {
    withData('EDIT', everything);
    renderCard();
    const region = within(screen.getByRole('region', { name: 'Seizure Activity' }));
    expect(region.getByText('Last 4 visits')).toBeInTheDocument();
    const row = region.getAllByRole('row').find((r) => within(r).queryByText('Number of seizures'));
    expect(within(row).getAllByRole('cell').slice(1).map((c) => c.textContent)).toEqual(['–', '2', '5']);
    const triggers = region.getAllByRole('row').find((r) => within(r).queryByText('Seizure triggers'));
    expect(within(triggers).getAllByRole('cell')[2].textContent).toBe('Fever, Sleep deprivation');
  });

  it('medication history, as the mockup writes it', () => {
    withData('EDIT', everything);
    renderCard();
    const rows = within(screen.getByRole('region', { name: 'Medication History' })).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('CBZ · carbamazepine 200 mg twice daily');
    expect(rows[0]).toHaveTextContent('Current');
    expect(rows[1]).toHaveTextContent('PB · phenobarbitone 30 mg once daily');
  });

  it('lists visits newest first, each with Edit', async () => {
    withData('EDIT', everything);
    renderCard();
    const table = within(screen.getByRole('table', { name: 'Epilepsy Visits' }));
    const rows = table.getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell')[0].textContent)).toEqual(['08-Oct-2026', '10-Sep-2026', '13-Aug-2026']);
    await userEvent.click(within(rows[1]).getByRole('button', { name: 'Edit' }));
    expect(launchEpPanel).toHaveBeenCalledWith('visit', { patientUuid: 'p1', encounterUuid: 'v2' });
  });

  it('CREATE: each header card starts the card, and visits wait for it', async () => {
    withData('CREATE');
    renderCard();
    expect(screen.getByRole('button', { name: 'Record epilepsy visit' })).toBeDisabled();
    await userEvent.click(within(screen.getByRole('region', { name: 'Seizure Types' })).getByRole('button', { name: 'Start the card' }));
    expect(launchEpPanel).toHaveBeenCalledWith('header', { patientUuid: 'p1', section: 'start' });
  });

  it('EDIT: a header card opens its own section', async () => {
    withData('EDIT', everything);
    renderCard();
    await userEvent.click(within(screen.getByRole('region', { name: 'History at Enrolment' })).getByRole('button', { name: 'Edit' }));
    expect(launchEpPanel).toHaveBeenCalledWith('header', { patientUuid: 'p1', section: 'history' });
  });

  it('VIEW: no actions', () => {
    withData('VIEW', everything);
    renderCard();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Record/ })).not.toBeInTheDocument();
  });

  it('UNAVAILABLE: only the message', () => {
    withData('UNAVAILABLE', everything);
    renderCard();
    expect(screen.getByText('Not available: Inactive program state (Epilepsy eMastercard)')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
