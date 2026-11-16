import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard, useObsOnDays } from '../art/art.resource';
import { PDC_FORMS } from './pdc-concepts';
import { launchConditionPanel } from './launch-pdc-condition-panel';
import { TRISOMY_CONDITION } from './trisomy-condition';
import { trisomyHeader, trisomyLabs, trisomyVisit } from './test-trisomy-data';
import { TRISOMY_FORMS, TRISOMY_MODERATE_MALNUTRITION } from './trisomy-concepts';
import { MODERATE_MALNUTRITION } from './hie-concepts';
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

const visits = [trisomyVisit('v2', '2026-10-08', { moderate: true, apnoea: true, earPain: true }), trisomyVisit('v1', '2026-09-10')];

type Data = Partial<Record<keyof typeof TRISOMY_FORMS | 'pdc', Array<ArtEncounter>>>;

function withData(state: 'CREATE' | 'EDIT', data: Data = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'pdc-trisomy', state, initialEncounterUuid: data.header?.[0]?.uuid ?? null }),
    systemLocationsTag: null,
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => {
    const key =
      form.encounterType === PDC_FORMS.header.encounterType
        ? 'pdc'
        : (Object.keys(TRISOMY_FORMS) as Array<keyof typeof TRISOMY_FORMS>).find((k) => TRISOMY_FORMS[k].encounterType === form.encounterType);
    return { encounters: data[key] ?? [], isLoading: false, error: undefined, mutate: vi.fn() };
  });
  vi.mocked(useObsOnDays).mockReturnValue({});
}

const everything: Data = { header: [trisomyHeader], visit: visits, labs: [trisomyLabs], pdc: [pdcHeader] };
const renderCard = () => render(<PdcConditionCard condition={TRISOMY_CONDITION} patientUuid="p1" title="Pediatric Development (PDC)" />);

describe('PdcConditionCard for trisomy 21', () => {
  it('names the card and flags moderate malnutrition, saved as this form\'s own concept', () => {
    withData('EDIT', everything);
    renderCard();
    expect(screen.getByText(/^Trisomy 21 patient card · version 2/)).toBeInTheDocument();
    const headline = within(screen.getByRole('region', { name: 'Trisomy 21 at a glance' }));
    expect(headline.getByText('Moderate')).toBeInTheDocument();
    // in red: this form's moderate malnutrition, not the HIE form's
    expect(TRISOMY_CONDITION.malnourished(TRISOMY_MODERATE_MALNUTRITION)).toBe(true);
    expect(TRISOMY_CONDITION.malnourished(MODERATE_MALNUTRITION)).toBe(false);
  });

  it('lists the meconium delay and the symptoms of the latest visits, each from its own group', () => {
    withData('EDIT', everything);
    renderCard();
    expect(within(screen.getByRole('region', { name: 'Patient Overview' })).getByText('Meconium delayed')).toBeInTheDocument();
    const monitoring = within(screen.getByRole('region', { name: 'Monitoring' }));
    expect(within(monitoring.getByRole('row', { name: /Sleep/ })).getByText('Apnoea')).toBeInTheDocument();
    expect(within(monitoring.getByRole('row', { name: /Ear/ })).getByText('Ear pain')).toBeInTheDocument();
    const table = within(screen.getByRole('table', { name: 'Trisomy 21 Visits' }));
    expect(table.getByText('Ear pain, Apnoea')).toBeInTheDocument();
  });

  it('shows the full blood count and TSH on its own date, and records lab tests in their panel', async () => {
    withData('EDIT', everything);
    renderCard();
    const tests = within(screen.getByRole('region', { name: 'Laboratory Tests' }));
    expect(tests.getByText('WBC: 6.2 /µL · Hb: 11.4 g/dL')).toBeInTheDocument();
    expect(tests.getByText('3 mIU/L · 02-Oct-2026')).toBeInTheDocument();
    await userEvent.click(tests.getByRole('button', { name: 'Record' }));
    expect(mockLaunch).toHaveBeenCalledWith('labs');
    await userEvent.click(tests.getByRole('button', { name: 'Edit' }));
    expect(launchConditionPanel).toHaveBeenCalledWith(TRISOMY_CONDITION, 'labs', { patientUuid: 'p1', encounterUuid: trisomyLabs.uuid });
  });

  it('has the records every PDC condition card shares', () => {
    withData('EDIT', everything);
    renderCard();
    expect(screen.getByRole('region', { name: 'Hospitalisation History' })).toBeInTheDocument();
  });
});
