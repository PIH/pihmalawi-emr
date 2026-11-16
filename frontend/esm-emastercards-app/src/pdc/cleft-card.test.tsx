import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard, useObsOnDays } from '../art/art.resource';
import { PDC_FORMS } from './pdc-concepts';
import { launchConditionPanel } from './launch-pdc-condition-panel';
import { CLEFT_CONDITION } from './cleft-condition';
import { CLEFT_FORMS } from './cleft-concepts';
import { cleftHeader, cleftLabs, cleftVisit } from './test-cleft-data';
import { pdcHeader } from './test-pdc-data';
import PdcConditionCard from './pdc-condition-card.component';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
  useObsOnDays: vi.fn(),
}));
const mockLaunch = vi.fn();
vi.mock('./launch-pdc-condition-panel', () => ({ launchConditionPanel: vi.fn(), useLaunchConditionPanel: () => mockLaunch }));

const visits = [
  cleftVisit('v2', '2026-10-08', { moderate: true, earPain: true, murmur: true, surgery: '2026-12-01T00:00:00.000+0000' }),
  cleftVisit('v1', '2026-09-10'),
];

type Data = Partial<Record<keyof typeof CLEFT_FORMS | 'pdc', Array<ArtEncounter>>>;

function withData(state: 'CREATE' | 'EDIT', data: Data = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'pdc-cleft-lip-palate', state, initialEncounterUuid: data.header?.[0]?.uuid ?? null }),
    systemLocationsTag: null,
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => {
    const key =
      form.encounterType === PDC_FORMS.header.encounterType
        ? 'pdc'
        : (Object.keys(CLEFT_FORMS) as Array<keyof typeof CLEFT_FORMS>).find((k) => CLEFT_FORMS[k].encounterType === form.encounterType);
    return { encounters: data[key] ?? [], isLoading: false, error: undefined, mutate: vi.fn() };
  });
  vi.mocked(useObsOnDays).mockReturnValue({});
}

const everything: Data = { header: [cleftHeader], visit: visits, labs: [cleftLabs], pdc: [pdcHeader] };
const renderCard = () => render(<PdcConditionCard condition={CLEFT_CONDITION} patientUuid="p1" title="Pediatric Development (PDC)" />);

describe('PdcConditionCard for cleft lip / palate', () => {
  it('names the card and shows the facial abnormalities from their one group', () => {
    withData('EDIT', everything);
    renderCard();
    expect(screen.getByText(/^Cleft lip \/ palate patient card · version 2/)).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Cleft lip / palate at a glance' })).getByText('Moderate')).toBeInTheDocument();
    const overview = within(screen.getByRole('region', { name: 'Patient Overview' }));
    expect(overview.getByText('Facial abnormalities: small jaw')).toBeInTheDocument();
  });

  it('lists the problems, the surgery date and the plan of the latest visits', () => {
    withData('EDIT', everything);
    renderCard();
    const monitoring = within(screen.getByRole('region', { name: 'Monitoring' }));
    expect(within(monitoring.getByRole('row', { name: /Problems/ })).getByText('Feeding problems, Heart murmur, Ear pain')).toBeInTheDocument();
    const table = within(screen.getByRole('table', { name: 'Cleft Lip / Palate Visits' }));
    expect(table.getByText('01-Dec-2026')).toBeInTheDocument();
    expect(table.getAllByText('Review after repair')).toHaveLength(2);
  });

  it('shows HB on its own date, and edits lab tests in their panel', async () => {
    withData('EDIT', everything);
    renderCard();
    const tests = within(screen.getByRole('region', { name: 'Laboratory Tests' }));
    expect(tests.getByText('10.2 g/dL · 01-Oct-2026')).toBeInTheDocument();
    await userEvent.click(tests.getByRole('button', { name: 'Edit' }));
    expect(launchConditionPanel).toHaveBeenCalledWith(CLEFT_CONDITION, 'labs', { patientUuid: 'p1', encounterUuid: cleftLabs.uuid });
  });

  it('has the records every PDC condition card shares', () => {
    withData('EDIT', everything);
    renderCard();
    expect(screen.getByRole('region', { name: 'Radiology Screening' })).toBeInTheDocument();
  });
});
