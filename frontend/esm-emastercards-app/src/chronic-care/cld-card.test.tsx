import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard, useObsOnDays } from '../art/art.resource';
import { CLD_FORMS } from './cld-concepts';
import { launchCldPanel } from './launch-cld-panel';
import { cldHeader, cldVisit, copdOnlyHeader, peakFlow } from './test-cld-data';
import CldCard from './cld-card.component';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
  useObsOnDays: vi.fn(),
}));
const mockLaunch = vi.fn();
vi.mock('./launch-cld-panel', () => ({ launchCldPanel: vi.fn(), useLaunchCldPanel: () => mockLaunch }));

const visits = [
  cldVisit('v3', '2026-10-08', { next: '2026-11-05' }),
  cldVisit('v2', '2026-09-10', {
    daySymptoms: 4,
    nightSymptoms: 2,
    perWeek: 3,
    exacerbation: true,
    severity: 3,
    meds: [['betaAgonist', 2, 'puff(s)', 'BID']],
  }),
];

function withData(state: 'CREATE' | 'EDIT', data: Partial<Record<keyof typeof CLD_FORMS, Array<ArtEncounter>>> = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({
      key: 'asthma',
      group: 'Chronic Care Record',
      label: 'Chronic Lung Disease eMastercard',
      state,
      initialEncounterUuid: data.header?.[0]?.uuid ?? null,
      enrolment: {
        uuid: 'pp1',
        program: 'Chronic care program',
        dateEnrolled: '2025-04-02',
        dateCompleted: null,
        location: { uuid: 'neno-dh', display: 'Neno District Hospital' },
        state: { name: 'On treatment', startDate: '2025-04-02' },
      },
    }),
    systemLocationsTag: null,
    isLoading: false,
    error: undefined,
  });
  const key = (encounterType: string) =>
    (Object.keys(CLD_FORMS) as Array<keyof typeof CLD_FORMS>).find((k) => CLD_FORMS[k].encounterType === encounterType);
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: data[key(form.encounterType)] ?? [],
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }));
  vi.mocked(useObsOnDays).mockReturnValue({});
}

const everything = { header: [cldHeader], visit: visits, peakFlow: [peakFlow] };
const renderCard = () => render(<CldCard patientUuid="p1" title="Chronic Care Record" />);

describe('CldCard', () => {
  it('names the card, with the state of its own treatment workflow', () => {
    withData('EDIT', everything);
    renderCard();
    expect(
      screen.getByText('Chronic lung disease patient card · version 1 · On treatment since 02-Apr-2025 at Neno District Hospital'),
    ).toBeInTheDocument();
  });

  it('shows the headline row, severe asthma among it, and the medications of the latest visit that dispensed any', () => {
    withData('EDIT', everything);
    renderCard();
    const headline = within(screen.getByRole('region', { name: 'Chronic lung disease at a glance' }));
    expect(headline.getByText('4 / 2 per week')).toBeInTheDocument();
    expect(headline.getByText('3 per week')).toBeInTheDocument();
    expect(headline.getByText('320')).toBeInTheDocument();
    expect(headline.getByText('Severe persistent')).toBeInTheDocument();
    expect(headline.getByText('B-agonist 2 puff(s)')).toBeInTheDocument();
    expect(headline.getByText('05-Nov-2026')).toBeInTheDocument();
  });

  it('puts Patient and Guardian Details first, and lists the diagnoses and exposures with their dates', () => {
    withData('EDIT', everything);
    renderCard();
    const titles = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent);
    expect(titles.slice(0, 3)).toEqual(['Patient and Guardian Details', 'Diagnoses and Family History', 'Patient History and Exposures']);
    expect(within(screen.getByRole('region', { name: 'Diagnoses and Family History' })).getByText('Asthma · 01-Mar-2025')).toBeInTheDocument();
    const history = within(screen.getByRole('region', { name: 'Patient History and Exposures' }));
    expect(history.getByRole('heading', { name: 'Exposures' })).toBeInTheDocument();
    expect(history.getByText('TB contact · 10-Jan-2024')).toBeInTheDocument();
  });

  it('shows an exacerbation in the monitoring table, and records peak flows in their panel', async () => {
    withData('EDIT', everything);
    renderCard();
    const monitoring = within(screen.getByRole('region', { name: 'Monitoring' }));
    expect(within(monitoring.getByRole('row', { name: /Exacerbation today/ })).getByText('Yes')).toBeInTheDocument();
    const peakFlows = within(screen.getByRole('region', { name: 'Peak Flow / Spirometry' }));
    await userEvent.click(peakFlows.getByRole('button', { name: 'Record' }));
    expect(mockLaunch).toHaveBeenCalledWith('peakFlow');
    await userEvent.click(peakFlows.getByRole('button', { name: 'Edit' }));
    expect(launchCldPanel).toHaveBeenCalledWith('peakFlow', { patientUuid: 'p1', encounterUuid: peakFlow.uuid });
  });

  it('hides the asthma severity for a patient with COPD only', () => {
    withData('EDIT', { ...everything, header: [copdOnlyHeader] });
    renderCard();
    expect(screen.queryByText('Asthma severity')).not.toBeInTheDocument();
  });
});
