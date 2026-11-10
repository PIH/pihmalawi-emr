import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard } from '../art/art.resource';
import { PA_FORMS } from './pa-concepts';
import { paHeader, paVisit } from './test-pa-data';
import PaCard from './pa-card.component';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
}));

const visits = [
  paVisit('v2', '2016-05-10', { stage: 2, wasting: 1, cd4: 420, sideEffects: [1, 3], next: '2016-08-10' }),
  paVisit('v1', '2016-02-10', { stage: 1 }),
];

function withData(state: 'CREATE' | 'EDIT' | 'VIEW' | 'UNAVAILABLE', data: Partial<Record<keyof typeof PA_FORMS, Array<ArtEncounter>>> = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({
      key: 'pre-art',
      group: 'Pre-ART Patient Card',
      label: 'Pre-ART eMastercard',
      state,
      message: state === 'UNAVAILABLE' ? 'Not available: Inactive program state (Pre-ART eMastercard)' : null,
      initialEncounterUuid: data.header?.[0]?.uuid ?? null,
    }),
    systemLocationsTag: null,
    isLoading: false,
    error: undefined,
  });
  const key = (encounterType: string) =>
    (Object.keys(PA_FORMS) as Array<keyof typeof PA_FORMS>).find((k) => PA_FORMS[k].encounterType === encounterType);
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: data[key(form.encounterType)] ?? [],
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }));
}

const everything = { header: [paHeader], visit: visits };
const renderCard = () => render(<PaCard patientUuid="p1" title="HIV Care" />);

describe('PaCard', () => {
  it('is view-only, even when the server would allow editing: no record, edit or start buttons', () => {
    withData('EDIT', everything);
    renderCard();
    expect(screen.getByRole('heading', { name: 'HIV Care' })).toBeInTheDocument();
    expect(screen.getByText('The Pre-ART program has been retired: this card is view-only.')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toEqual([]);
  });

  it('names the card and its version', () => {
    withData('EDIT', everything);
    renderCard();
    expect(screen.getByText(/^Pre-ART patient card · version 1/)).toBeInTheDocument();
  });

  it('shows the headline row from the latest visits', () => {
    withData('EDIT', everything);
    renderCard();
    const headline = within(screen.getByRole('region', { name: 'Pre-ART at a glance' }));
    expect(headline.getByText('3')).toBeInTheDocument();
    expect(headline.getByText('420')).toBeInTheDocument();
    expect(headline.getByText('TB not suspected')).toBeInTheDocument();
    expect(headline.getByText('10-Aug-2016')).toBeInTheDocument();
  });

  it('shows the patient and guardian details and the status at enrolment', () => {
    withData('EDIT', everything);
    renderCard();
    const details = within(screen.getByRole('region', { name: 'Patient / Guardian Details' }));
    expect(details.getByText('Guardian Name')).toBeInTheDocument();
    const status = within(screen.getByRole('region', { name: 'Status at Enrolment' }));
    expect(status.getByText('Neno HTC 123')).toBeInTheDocument();
    expect(status.getByText('20-Feb-2015')).toBeInTheDocument();
    expect(status.getByText('Rapid')).toBeInTheDocument();
    expect(status.getByText('34 years')).toBeInTheDocument();
  });

  it('lists the visits, newest first, with their side effects', () => {
    withData('EDIT', everything);
    renderCard();
    const rows = within(screen.getByRole('table', { name: 'Pre-ART Visits' })).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('10-May-2016');
    expect(rows[1]).toHaveTextContent('Peripheral neuropathy, Skin rash');
    expect(rows[2]).toHaveTextContent('10-Feb-2016');
  });

  it('says so when the patient has no Pre-ART card', () => {
    withData('CREATE');
    renderCard();
    expect(screen.getByText('This patient has no Pre-ART patient card.')).toBeInTheDocument();
  });
});
