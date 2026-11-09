import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard, useObsOnDays } from '../art/art.resource';
import { CKD_FORMS } from './ckd-concepts';
import { launchCkdPanel } from './launch-ckd-panel';
import { ckdHeader, ckdVisit, ultrasound } from './test-ckd-data';
import CkdCard from './ckd-card.component';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
  useObsOnDays: vi.fn(),
}));
const mockLaunch = vi.fn();
vi.mock('./launch-ckd-panel', () => ({ launchCkdPanel: vi.fn(), useLaunchCkdPanel: () => mockLaunch }));

const visits = [
  ckdVisit('v2', '2026-10-08', { gfr: 22, stage: 2, confusion: true, meds: [['other', 1, 'OD', 'Sodium bicarbonate']], next: '2026-11-05' }),
  ckdVisit('v1', '2026-09-10', { gfr: 30, stage: 1 }),
];

function withData(state: 'CREATE' | 'EDIT', data: Partial<Record<keyof typeof CKD_FORMS, Array<ArtEncounter>>> = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({
      key: 'ckd',
      group: 'Chronic Care Record',
      label: 'Chronic Kidney Disease eMastercard',
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
    (Object.keys(CKD_FORMS) as Array<keyof typeof CKD_FORMS>).find((k) => CKD_FORMS[k].encounterType === encounterType);
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: data[key(form.encounterType)] ?? [],
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }));
  vi.mocked(useObsOnDays).mockReturnValue({});
}

const everything = { header: [ckdHeader], visit: visits, imaging: [ultrasound] };
const renderCard = () => render(<CkdCard patientUuid="p1" title="Chronic Care Record" />);

describe('CkdCard', () => {
  it('names the card, with the state of its own treatment workflow', () => {
    withData('EDIT', everything);
    renderCard();
    expect(
      screen.getByText('Chronic kidney disease patient card · version 1 · On treatment since 10-Feb-2025 at Neno District Hospital'),
    ).toBeInTheDocument();
  });

  it('shows the headline row, advanced CKD among it, and an Other medication by its name', () => {
    withData('EDIT', everything);
    renderCard();
    const headline = within(screen.getByRole('region', { name: 'Chronic kidney disease at a glance' }));
    expect(headline.getByText('4-5')).toBeInTheDocument();
    expect(headline.getByText('22 mL/min')).toBeInTheDocument();
    expect(headline.getByText('Sodium bicarbonate 1 mg')).toBeInTheDocument();
    expect(headline.getByText('05-Nov-2026')).toBeInTheDocument();
  });

  it('lists the header: the presumed etiology, the diagnoses with their dates and the TB date', () => {
    withData('EDIT', everything);
    renderCard();
    const etiology = within(screen.getByRole('region', { name: 'Presumed Etiology' }));
    expect(etiology.getByText('Hypertension, Diabetes')).toBeInTheDocument();
    expect(etiology.getByText('NSAIDs')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Diagnoses' })).getByText('Hypertension · 01-Jun-2024')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Patient History' })).getByText('01-Apr-2019')).toBeInTheDocument();
  });

  it('shows confusion in red in the monitoring table, and records an ultrasound in its panel', async () => {
    withData('EDIT', everything);
    renderCard();
    const monitoring = within(screen.getByRole('region', { name: 'Monitoring' }));
    expect(within(monitoring.getByRole('row', { name: /Confusion/ })).getByText('Yes')).toBeInTheDocument();
    const ultrasounds = within(screen.getByRole('region', { name: 'Ultrasound' }));
    expect(ultrasounds.getByText('Small echogenic kidneys')).toBeInTheDocument();
    await userEvent.click(ultrasounds.getByRole('button', { name: 'Record' }));
    expect(mockLaunch).toHaveBeenCalledWith('imaging');
    await userEvent.click(ultrasounds.getByRole('button', { name: 'Edit' }));
    expect(launchCkdPanel).toHaveBeenCalledWith('imaging', { patientUuid: 'p1', encounterUuid: ultrasound.uuid });
  });
});
