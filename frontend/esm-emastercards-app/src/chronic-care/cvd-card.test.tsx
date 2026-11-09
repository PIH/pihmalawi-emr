import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard, useObsOnDays } from '../art/art.resource';
import { CVD_FORMS } from './cvd-concepts';
import { launchCvdPanel } from './launch-cvd-panel';
import { cvdHeader, cvdVisit, echo } from './test-cvd-data';
import CvdCard from './cvd-card.component';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
  useObsOnDays: vi.fn(),
}));
const mockLaunch = vi.fn();
vi.mock('./launch-cvd-panel', () => ({ launchCvdPanel: vi.fn(), useLaunchCvdPanel: () => mockLaunch }));

const visits = [
  cvdVisit('v2', '2026-10-08', { bp: [150, 95], nyha: 2, hospitalised: true, meds: [['furosemide', 40, 'OD']], next: '2026-11-05' }),
  cvdVisit('v1', '2026-09-10', { bp: [130, 80], nyha: 1 }),
];

function withData(state: 'CREATE' | 'EDIT', data: Partial<Record<keyof typeof CVD_FORMS, Array<ArtEncounter>>> = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({
      key: 'chf',
      group: 'Chronic Care Record',
      label: 'Cardiac and Vascular Disease eMastercard',
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
    (Object.keys(CVD_FORMS) as Array<keyof typeof CVD_FORMS>).find((k) => CVD_FORMS[k].encounterType === encounterType);
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: data[key(form.encounterType)] ?? [],
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }));
  vi.mocked(useObsOnDays).mockReturnValue({});
}

const everything = { header: [cvdHeader], visit: visits, echo: [echo] };
const renderCard = () => render(<CvdCard patientUuid="p1" title="Chronic Care Record" />);

describe('CvdCard', () => {
  it('names the card, with the state of its own treatment workflow', () => {
    withData('EDIT', everything);
    renderCard();
    expect(
      screen.getByText('Cardiac and vascular disease patient card · version 3 · On treatment since 10-Feb-2025 at Neno District Hospital'),
    ).toBeInTheDocument();
  });

  it('shows the headline row, raised blood pressure among it', () => {
    withData('EDIT', everything);
    renderCard();
    const headline = within(screen.getByRole('region', { name: 'Cardiac and vascular disease at a glance' }));
    expect(headline.getByText('150/95 mmHg')).toBeInTheDocument();
    expect(headline.getByText('III')).toBeInTheDocument();
    expect(headline.getByText('FURO 40 mg')).toBeInTheDocument();
    expect(headline.getByText('05-Nov-2026')).toBeInTheDocument();
  });

  it('lists the header: diagnoses with their dates, family planning with what Other was, and the imaging results', () => {
    withData('EDIT', everything);
    renderCard();
    expect(within(screen.getByRole('region', { name: 'Diagnoses' })).getByText('Cardiomyopathy · 15-Jan-2025')).toBeInTheDocument();
    const history = within(screen.getByRole('region', { name: 'Patient History and Exposures' }));
    expect(history.getByText('Hypertension')).toBeInTheDocument();
    expect(history.getByText('Other (Implant)')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Imaging Results' })).getByText('Dilated LV')).toBeInTheDocument();
  });

  it('shows hospitalisation in red in the monitoring table, and records an echocardiogram in its panel', async () => {
    withData('EDIT', everything);
    renderCard();
    const monitoring = within(screen.getByRole('region', { name: 'Monitoring' }));
    expect(within(monitoring.getByRole('row', { name: /Hospitalised/ })).getByText('Yes')).toBeInTheDocument();
    const echoes = within(screen.getByRole('region', { name: 'Echocardiogram' }));
    expect(echoes.getByText('Reduced')).toBeInTheDocument();
    await userEvent.click(echoes.getByRole('button', { name: 'Record' }));
    expect(mockLaunch).toHaveBeenCalledWith('echo');
    await userEvent.click(echoes.getByRole('button', { name: 'Edit' }));
    expect(launchCvdPanel).toHaveBeenCalledWith('echo', { patientUuid: 'p1', encounterUuid: echo.uuid });
  });
});
