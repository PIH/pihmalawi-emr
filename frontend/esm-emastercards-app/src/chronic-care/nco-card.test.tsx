import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard, useObsOnDays } from '../art/art.resource';
import { NCO_FORMS } from './nco-concepts';
import { launchNcoPanel } from './launch-nco-panel';
import { annualLab, ncoHeader, ncoVisit } from './test-nco-data';
import NcoCard from './nco-card.component';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
  useObsOnDays: vi.fn(),
}));
const mockLaunch = vi.fn();
vi.mock('./launch-nco-panel', () => ({ launchNcoPanel: vi.fn(), useLaunchNcoPanel: () => mockLaunch }));

const visits = [
  ncoVisit('v3', '2026-10-08', { next: '2026-11-05' }),
  ncoVisit('v2', '2026-09-10', { medications: 'Methotrexate 10 mg weekly', changed: true, hospitalised: true }),
  ncoVisit('v1', '2026-08-13', { medications: 'Methotrexate 7.5 mg weekly' }),
];

function withData(state: 'CREATE' | 'EDIT', data: Partial<Record<keyof typeof NCO_FORMS, Array<ArtEncounter>>> = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({
      key: 'ncd-other',
      group: 'Chronic Care Record',
      label: 'NCD Other eMastercard',
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
    (Object.keys(NCO_FORMS) as Array<keyof typeof NCO_FORMS>).find((k) => NCO_FORMS[k].encounterType === encounterType);
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: data[key(form.encounterType)] ?? [],
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }));
  vi.mocked(useObsOnDays).mockReturnValue({});
}

const everything = { header: [ncoHeader], visit: visits, annualLabs: [annualLab] };
const renderCard = () => render(<NcoCard patientUuid="p1" title="Chronic Care Record" />);

describe('NcoCard', () => {
  it('names the card, with the state of its own treatment workflow', () => {
    withData('EDIT', everything);
    renderCard();
    expect(screen.getByText('NCD other patient card · version 1 · On treatment since 10-Feb-2025 at Neno District Hospital')).toBeInTheDocument();
  });

  it('shows the medications of the latest visit that wrote any down, and the next appointment with its location', () => {
    withData('EDIT', everything);
    renderCard();
    const headline = within(screen.getByRole('region', { name: 'NCD other at a glance' }));
    expect(headline.getByText('Methotrexate 10 mg weekly')).toBeInTheDocument();
    expect(headline.getByText('Dispensed 10-Sep-2026')).toBeInTheDocument();
    expect(headline.getByText('05-Nov-2026')).toBeInTheDocument();
    expect(headline.getByText('IC3 · Booked 08-Oct-2026')).toBeInTheDocument();
  });

  it('lists the medication history as the visits wrote it, the changes marked', () => {
    withData('EDIT', everything);
    renderCard();
    const history = within(screen.getByRole('region', { name: 'Medication History' }));
    expect(history.getByText('Methotrexate 7.5 mg weekly')).toBeInTheDocument();
    expect(history.getByText('Changed')).toBeInTheDocument();
    expect(history.getByText('Current')).toBeInTheDocument();
  });

  it('lists the header: diagnoses with what Other was and their dates, and the TB date', () => {
    withData('EDIT', everything);
    renderCard();
    const diagnoses = within(screen.getByRole('region', { name: 'Diagnoses and Comorbidities' }));
    expect(diagnoses.getByText('Cirrhosis · 01-Dec-2024')).toBeInTheDocument();
    expect(diagnoses.getByText('Lupus')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Patient History' })).getByText('01-Feb-2018')).toBeInTheDocument();
  });

  it('records annual laboratory tests in their panel', async () => {
    withData('EDIT', everything);
    renderCard();
    const annual = within(screen.getByRole('region', { name: 'Annual Laboratory Tests' }));
    expect(annual.getByText('Trace')).toBeInTheDocument();
    await userEvent.click(annual.getByRole('button', { name: 'Record' }));
    expect(mockLaunch).toHaveBeenCalledWith('annualLabs');
    await userEvent.click(annual.getByRole('button', { name: 'Edit' }));
    expect(launchNcoPanel).toHaveBeenCalledWith('annualLabs', { patientUuid: 'p1', encounterUuid: annualLab.uuid });
  });
});
