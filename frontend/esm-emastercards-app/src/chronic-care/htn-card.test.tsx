import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard, useObsOnDays } from '../art/art.resource';
import { HTN_FORMS, HTN_HEADER, HTN_VISIT } from './htn-concepts';
import { launchHtnPanel } from './launch-htn-panel';
import { annualLab, encounter, hospitalisation, htnHeader, htnVisit, obs, quarterlyLab } from './test-htn-data';
import HtnCard from './htn-card.component';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
  useObsOnDays: vi.fn(),
}));
const mockLaunch = vi.fn();
vi.mock('./launch-htn-panel', () => ({
  launchHtnPanel: vi.fn(),
  useLaunchHtnPanel: () => mockLaunch,
}));

const visits = [
  htnVisit('v3', '2026-10-08', {
    meds: [
      ['amlodipine', 5, 'OD'],
      ['metformin', 500, 'BID'],
    ],
    next: '2026-11-05',
  }),
  htnVisit('v2', '2026-09-10', {
    bp: [152, 96],
    hbA1c: 7.4,
    meds: [['amlodipine', 5, 'OD']],
    ulcers: true,
  }),
  htnVisit('v1', '2026-08-13', { bp: [148, 92], meds: [['hctz', 25, 'OD']] }),
];

function withData(state: 'CREATE' | 'EDIT' | 'VIEW' | 'UNAVAILABLE', data: Partial<Record<keyof typeof HTN_FORMS, Array<ArtEncounter>>> = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({
      key: 'htn-dm',
      group: 'Chronic Care Record',
      label: 'Hypertension and Diabetes eMastercard',
      state,
      message: state === 'UNAVAILABLE' ? 'Not available: Inactive program state (Hypertension and Diabetes eMastercard)' : null,
      initialEncounterUuid: data.header?.[0]?.uuid ?? null,
      enrolment: {
        uuid: 'pp1',
        program: 'Chronic care program',
        dateEnrolled: '2025-06-02',
        dateCompleted: null,
        location: { uuid: 'neno-dh', display: 'Neno District Hospital' },
        state: { name: 'On treatment', startDate: '2025-06-02' },
      },
    }),
    systemLocationsTag: null,
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: (Object.keys(HTN_FORMS) as Array<keyof typeof HTN_FORMS>).find((k) => HTN_FORMS[k].encounterType === form.encounterType)
      ? (data[(Object.keys(HTN_FORMS) as Array<keyof typeof HTN_FORMS>).find((k) => HTN_FORMS[k].encounterType === form.encounterType)] ?? [])
      : [],
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }));
  // the latest visit's blood pressure was taken with the vitals
  vi.mocked(useObsOnDays).mockReturnValue({
    '2026-10-08': {
      [HTN_VISIT.systolicBp]: [
        {
          value: 138,
          obsDatetime: '2026-10-08T08:30:00.000+0000',
          encounterUuid: 'vitals',
        },
      ],
      [HTN_VISIT.diastolicBp]: [
        {
          value: 86,
          obsDatetime: '2026-10-08T08:30:00.000+0000',
          encounterUuid: 'vitals',
        },
      ],
    },
  } as any);
}

const everything = {
  header: [htnHeader],
  visit: visits,
  quarterlyLabs: [quarterlyLab],
  annualLabs: [annualLab],
  hospitalisation: [hospitalisation],
};
const renderCard = () => render(<HtnCard patientUuid="p1" title="Chronic Care Record" />);

describe('HtnCard', () => {
  it('names the card, with the state of its own treatment workflow', () => {
    withData('EDIT', everything);
    renderCard();
    expect(screen.getByRole('heading', { name: 'Chronic Care Record' })).toBeInTheDocument();
    expect(
      screen.getByText('Hypertension and diabetes patient card · version 1 · On treatment since 02-Jun-2025 at Neno District Hospital'),
    ).toBeInTheDocument();
  });

  it('shows the headline row, with blood pressure taken with the vitals', () => {
    withData('EDIT', everything);
    renderCard();
    const headline = within(
      screen.getByRole('region', {
        name: 'Hypertension and diabetes at a glance',
      }),
    );
    expect(headline.getByText('138/86 mmHg')).toBeInTheDocument();
    expect(headline.getByText('HbA1c 7.4 %')).toBeInTheDocument();
    expect(headline.getByText('AML 5 mg, MET 500 mg')).toBeInTheDocument();
    expect(headline.getByText('Amlodipine · once daily, Metformin · twice daily · Dispensed 08-Oct-2026')).toBeInTheDocument();
    expect(headline.getByText('05-Nov-2026')).toBeInTheDocument();
    expect(headline.getByText('Last discharged 21-Jul-2026')).toBeInTheDocument();
  });

  it('puts Patient and Guardian Details first, then the diagnoses with their dates', () => {
    withData('EDIT', everything);
    renderCard();
    const titles = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent);
    expect(titles.slice(0, 3)).toEqual(['Patient and Guardian Details', 'Diagnoses and Family History', 'Patient History and Complications']);
    const diagnoses = within(screen.getByRole('region', { name: 'Diagnoses and Family History' }));
    expect(diagnoses.getByText('Hypertension · 20-May-2025')).toBeInTheDocument();
    expect(diagnoses.getByText('Type 2 DM · 01-Feb-2024')).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('region', {
          name: 'Patient History and Complications',
        }),
      ).getByText('Stroke/TIA · 10-Aug-2023'),
    ).toBeInTheDocument();
  });

  it('shows the last 4 visits in the monitoring table, raised blood pressure and ulcers in red', () => {
    withData('EDIT', everything);
    renderCard();
    const monitoring = within(screen.getByRole('region', { name: 'Monitoring' }));
    expect(monitoring.getByText('Last 4 visits')).toBeInTheDocument();
    expect(monitoring.getByText('152/96')).toBeInTheDocument();
    expect(monitoring.getByText('138/86')).toBeInTheDocument();
    expect(within(monitoring.getByRole('row', { name: /Ulcers/ })).getByText('Yes')).toBeInTheDocument();
  });

  it('lists the medication history', () => {
    withData('EDIT', everything);
    renderCard();
    const history = within(screen.getByRole('region', { name: 'Medication History' }));
    expect(history.getByText('08-Oct-2026')).toBeInTheDocument();
    expect(history.getByText('13-Aug-2026')).toBeInTheDocument();
  });

  it('lists the laboratory tests and hospitalisations, each recorded and edited in its panel', async () => {
    withData('EDIT', everything);
    renderCard();
    const quarterly = within(screen.getByRole('region', { name: 'Quarterly Laboratory Tests' }));
    expect(quarterly.getByText('Trace')).toBeInTheDocument();
    expect(quarterly.getByText('Non-reactive')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Annual Laboratory Tests' })).getByText('High lipids')).toBeInTheDocument();
    const hospital = within(screen.getByRole('region', { name: 'Hospitalisation History' }));
    expect(hospital.getByText('Hyperglycaemia')).toBeInTheDocument();
    expect(hospital.getByText('5 days')).toBeInTheDocument();
    await userEvent.click(quarterly.getByRole('button', { name: 'Record' }));
    expect(mockLaunch).toHaveBeenCalledWith('quarterlyLabs');
    await userEvent.click(hospital.getByRole('button', { name: 'Edit' }));
    expect(launchHtnPanel).toHaveBeenCalledWith('hospitalisation', {
      patientUuid: 'p1',
      encounterUuid: hospitalisation.uuid,
    });
  });

  it('is started from any section until the header exists', async () => {
    withData('CREATE');
    renderCard();
    expect(screen.getByText('Start the card first: visits, tests and hospitalisations can be recorded once it has been saved.')).toBeInTheDocument();
    await userEvent.click(
      within(screen.getByRole('region', { name: 'Diagnoses and Family History' })).getByRole('button', { name: 'Start the card' }),
    );
    expect(launchHtnPanel).toHaveBeenCalledWith('header', {
      patientUuid: 'p1',
      section: 'start',
    });
  });

  it('says why when the card is not available', () => {
    withData('UNAVAILABLE');
    renderCard();
    expect(screen.getByText('Not available: Inactive program state (Hypertension and Diabetes eMastercard)')).toBeInTheDocument();
  });

  it('shows raised blood sugar in red, and the medications of the latest visit that dispensed any', () => {
    const checkUp = htnVisit('v4', '2026-10-20', { hbA1c: 8.1 });
    withData('EDIT', { ...everything, visit: [checkUp, ...visits] });
    renderCard();
    const headline = within(screen.getByRole('region', { name: 'Hypertension and diabetes at a glance' }));
    expect(headline.getByText('HbA1c 8.1 %')).toBeInTheDocument();
    expect(headline.getByText('AML 5 mg, MET 500 mg')).toBeInTheDocument();
    expect(headline.getByText('Amlodipine · once daily, Metformin · twice daily · Dispensed 08-Oct-2026')).toBeInTheDocument();
  });

  it('labels the complications', () => {
    withData('EDIT', everything);
    renderCard();
    expect(
      within(screen.getByRole('region', { name: 'Patient History and Complications' })).getByRole('heading', { name: 'Complications' }),
    ).toBeInTheDocument();
  });

  it('hides what is asked only for diabetes when the patient has only hypertension', () => {
    const htnOnly = encounter('htn-header-2', '2025-06-02', [
      obs(HTN_HEADER.diagnosisGroup, null, [obs(HTN_HEADER.diagnosis, HTN_HEADER.diagnoses[2].answer)]),
    ]);
    withData('EDIT', { ...everything, header: [htnOnly] });
    renderCard();
    expect(screen.queryByText('Blood sugar')).not.toBeInTheDocument();
    expect(screen.queryByText('HbA1c')).not.toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Ulcers/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('Blood pressure').length).toBeGreaterThan(0);
  });
});
