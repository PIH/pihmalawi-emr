import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard, useObsOnDays } from '../art/art.resource';
import { SCD_FORMS } from './scd-concepts';
import { launchScdPanel } from './launch-scd-panel';
import { annualMonitoring, scdHeader, scdVisit } from './test-scd-data';
import ScdCard from './scd-card.component';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
  useObsOnDays: vi.fn(),
}));
const mockLaunch = vi.fn();
vi.mock('./launch-scd-panel', () => ({ launchScdPanel: vi.fn(), useLaunchScdPanel: () => mockLaunch }));

const visits = [
  scdVisit('v2', '2026-10-08', { hb: 7, pain: true, hospitalised: true, meds: [['hydroxyurea', 500, 'OD']], next: '2026-11-05' }),
  scdVisit('v1', '2026-09-10', { hb: 9 }),
];

function withData(state: 'CREATE' | 'EDIT', data: Partial<Record<keyof typeof SCD_FORMS, Array<ArtEncounter>>> = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({
      key: 'scd',
      group: 'Chronic Care Record',
      label: 'Sickle Cell Disease eMastercard',
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
    (Object.keys(SCD_FORMS) as Array<keyof typeof SCD_FORMS>).find((k) => SCD_FORMS[k].encounterType === encounterType);
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: data[key(form.encounterType)] ?? [],
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }));
  vi.mocked(useObsOnDays).mockReturnValue({});
}

const everything = { header: [scdHeader], visit: visits, annualMonitoring: [annualMonitoring] };
const renderCard = () => render(<ScdCard patientUuid="p1" title="Chronic Care Record" />);

describe('ScdCard', () => {
  it('names the card, with the state of its own treatment workflow', () => {
    withData('EDIT', everything);
    renderCard();
    expect(
      screen.getByText('Sickle cell disease patient card · version 1 · On treatment since 10-Feb-2025 at Neno District Hospital'),
    ).toBeInTheDocument();
  });

  it('shows the headline row, pain in red among it', () => {
    withData('EDIT', everything);
    renderCard();
    const headline = within(screen.getByRole('region', { name: 'Sickle cell disease at a glance' }));
    expect(headline.getByText('7 g/dL')).toBeInTheDocument();
    expect(headline.getByText('Yes')).toBeInTheDocument();
    expect(headline.getByText('HYD 500 mg')).toBeInTheDocument();
    expect(headline.getByText('05-Nov-2026')).toBeInTheDocument();
  });

  it('lists the header: the date of diagnosis and tests, and the reasons for referral with what Other was', () => {
    withData('EDIT', everything);
    renderCard();
    const diagnosis = within(screen.getByRole('region', { name: 'Diagnosis and Tests' }));
    expect(diagnosis.getByText('20-Apr-2024')).toBeInTheDocument();
    expect(diagnosis.queryByText('Sickle cell disease')).not.toBeInTheDocument();
    const referral = within(screen.getByRole('region', { name: 'Reasons for Referral' }));
    expect(referral.getByText('OPD')).toBeInTheDocument();
    expect(referral.getByText('School nurse')).toBeInTheDocument();
  });

  it('shows hospitalisation in red in the monitoring table, and records annual monitoring in its panel', async () => {
    withData('EDIT', everything);
    renderCard();
    const monitoring = within(screen.getByRole('region', { name: 'Monitoring' }));
    expect(within(monitoring.getByRole('row', { name: /Hospitalised since last visit/ })).getByText('Yes')).toBeInTheDocument();
    const annual = within(screen.getByRole('region', { name: 'Annual Monitoring' }));
    expect(annual.getByText('42 U/L')).toBeInTheDocument();
    await userEvent.click(annual.getByRole('button', { name: 'Record' }));
    expect(mockLaunch).toHaveBeenCalledWith('annualMonitoring');
    await userEvent.click(annual.getByRole('button', { name: 'Edit' }));
    expect(launchScdPanel).toHaveBeenCalledWith('annualMonitoring', { patientUuid: 'p1', encounterUuid: annualMonitoring.uuid });
  });
});
