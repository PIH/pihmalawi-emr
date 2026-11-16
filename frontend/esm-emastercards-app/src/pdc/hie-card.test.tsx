import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard, useObsOnDays } from '../art/art.resource';
import { HIE_FORMS, HIE_VISIT } from './hie-concepts';
import { PDC_FORMS } from './pdc-concepts';
import { launchHiePanel } from './launch-hie-panel';
import { hieHeader, hieLabs, hieVisit } from './test-hie-data';
import { pdcHeader } from './test-pdc-data';
import HieCard from './hie-card.component';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
  useObsOnDays: vi.fn(),
}));
const mockLaunch = vi.fn();
vi.mock('./launch-hie-panel', () => ({ launchHiePanel: vi.fn(), useLaunchHiePanel: () => mockLaunch }));

const visits = [
  hieVisit('v2', '2026-10-08', {
    weight: 9.5,
    wfa: 70,
    severe: true,
    hypo: true,
    physiotherapy: true,
    referredTo: HIE_VISIT.referredToAnswers[0].value,
    next: '2026-11-05',
  }),
  hieVisit('v1', '2026-09-10', { weight: 9.1 }),
];

type Data = Partial<Record<keyof typeof HIE_FORMS | 'pdc', Array<ArtEncounter>>>;

function withData(state: 'CREATE' | 'EDIT', data: Data = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({
      key: 'pdc-developmental-delay',
      group: 'Pediatric Development Clinic Record',
      label: 'PDC Developmental Delay eMastercard',
      state,
      initialEncounterUuid: data.header?.[0]?.uuid ?? null,
      enrolment: {
        uuid: 'pp1',
        program: 'Pediatric development clinic program',
        dateEnrolled: '2026-03-12',
        dateCompleted: null,
        location: { uuid: 'neno-dh', display: 'Neno District Hospital' },
        state: { name: 'On treatment', startDate: '2026-03-12' },
      },
    }),
    systemLocationsTag: null,
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => {
    const key =
      form.encounterType === PDC_FORMS.header.encounterType
        ? 'pdc'
        : (Object.keys(HIE_FORMS) as Array<keyof typeof HIE_FORMS>).find((k) => HIE_FORMS[k].encounterType === form.encounterType);
    return { encounters: data[key] ?? [], isLoading: false, error: undefined, mutate: vi.fn() };
  });
  vi.mocked(useObsOnDays).mockReturnValue({});
}

const everything: Data = { header: [hieHeader], visit: visits, labs: [hieLabs], pdc: [pdcHeader] };
const renderCard = () => render(<HieCard patientUuid="p1" title="Pediatric Development (PDC)" />);

describe('HieCard', () => {
  it('names the card, with the state of the PDC treatment workflow', () => {
    withData('EDIT', everything);
    renderCard();
    expect(
      screen.getByText('HIE / developmental delay patient card · version 2 · On treatment since 12-Mar-2026 at Neno District Hospital'),
    ).toBeInTheDocument();
  });

  it("shows the headline: the PDC card's conditions at enrolment, growth, severe malnutrition and the next appointment", () => {
    withData('EDIT', everything);
    renderCard();
    const headline = within(screen.getByRole('region', { name: 'HIE / developmental delay at a glance' }));
    expect(headline.getByText('HIE, Low birth weight')).toBeInTheDocument();
    expect(headline.getByText('9.5 kg')).toBeInTheDocument();
    expect(headline.getByText('Severe')).toBeInTheDocument();
    expect(headline.getByText('05-Nov-2026')).toBeInTheDocument();
  });

  it('lists the header, the genetic syndrome among it', () => {
    withData('EDIT', everything);
    renderCard();
    const overview = within(screen.getByRole('region', { name: 'Patient Overview' }));
    expect(overview.getByText('Genetic syndrome: suspected')).toBeInTheDocument();
    expect(overview.getByText('Yes')).toBeInTheDocument();
    expect(overview.getByText('No')).toBeInTheDocument();
  });

  it('shows the grouped answers of the latest visits: W/A, tone, the plan and where the child was referred', () => {
    withData('EDIT', everything);
    renderCard();
    const monitoring = within(screen.getByRole('region', { name: 'Monitoring' }));
    expect(within(monitoring.getByRole('row', { name: /W\/A/ })).getByText('70')).toBeInTheDocument();
    expect(within(monitoring.getByRole('row', { name: /Tone/ })).getByText('Hypo')).toBeInTheDocument();
    expect(within(monitoring.getByRole('row', { name: /Tone/ })).getByText('Normal')).toBeInTheDocument();
    const table = within(screen.getByRole('table', { name: 'HIE / Developmental Delay Visits' }));
    expect(table.getByText('Physiotherapy')).toBeInTheDocument();
    expect(table.getByText('Tertiary care')).toBeInTheDocument();
  });

  it('shows the HB result on its own date, and records and edits laboratory tests in their panel', async () => {
    withData('EDIT', everything);
    renderCard();
    const tests = within(screen.getByRole('region', { name: 'Laboratory Tests' }));
    expect(tests.getByText('10.4 g/dL · 01-Oct-2026')).toBeInTheDocument();
    expect(tests.getByText('Done: Yes · Normal: Yes')).toBeInTheDocument();
    expect(tests.getByText('Blood glucose · 4.2 mmol/L')).toBeInTheDocument();
    await userEvent.click(tests.getByRole('button', { name: 'Record' }));
    expect(mockLaunch).toHaveBeenCalledWith('labs');
    await userEvent.click(tests.getByRole('button', { name: 'Edit' }));
    expect(launchHiePanel).toHaveBeenCalledWith('labs', { patientUuid: 'p1', encounterUuid: hieLabs.uuid });
  });

  it('asks to start the card before anything can be recorded', async () => {
    withData('CREATE');
    renderCard();
    expect(screen.getByRole('button', { name: 'Record HIE / developmental delay visit' })).toBeDisabled();
    await userEvent.click(within(screen.getByRole('region', { name: 'Patient Overview' })).getByRole('button', { name: 'Start the card' }));
    expect(launchHiePanel).toHaveBeenCalledWith('header', { patientUuid: 'p1', section: 'start' });
  });
});
