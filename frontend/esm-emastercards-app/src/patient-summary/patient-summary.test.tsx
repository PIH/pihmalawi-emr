import React from 'react';
import dayjs from 'dayjs';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEMastercards } from '../emastercards.resource';
import { useQuickPrograms } from '../enrolments/enrolments.resource';
import { hivOnArt, tbCompleted } from '../enrolments/test-programs';
import { card } from '../test-cards';
import { useLatestBloodPressure, useLatestObs } from '../vitals-header/latest-obs.resource';
import { useHivSummary, useRecentVisits } from './summary.resource';
import PatientSummary from './patient-summary.extension';

const mockRecordVitals = vi.fn();
const mockLaunchVisit = vi.fn();
vi.mock('../vitals-header/latest-vitals.extension', () => ({ useRecordVitals: () => mockRecordVitals }));
vi.mock('../vitals-header/latest-obs.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../vitals-header/latest-obs.resource')>()),
  useLatestObs: vi.fn(),
  useLatestBloodPressure: vi.fn(),
}));
vi.mock('./record-visit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./record-visit')>()),
  useLaunchCardVisit: () => mockLaunchVisit,
}));
vi.mock('../emastercards.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../emastercards.resource')>()),
  useEMastercards: vi.fn(),
}));
vi.mock('../enrolments/enrolments.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../enrolments/enrolments.resource')>()),
  useQuickPrograms: vi.fn(),
}));
vi.mock('./summary.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./summary.resource')>()),
  useHivSummary: vi.fn(),
  useRecentVisits: vi.fn(),
}));

const today = dayjs().format('YYYY-MM-DD');
const hiv = {
  card: card({ state: 'EDIT' }),
  canRecord: true,
  regimen: { regimen: { uuid: 'r', label: '13A', drugs: 'TDF/3TC/DTG' }, since: '2022-06-04' },
  artStart: '2019-02-18',
  yearsOnArt: 7,
  latestViralLoad: { date: '2025-09-02', result: 'LDL' },
  cd4: { value: 540, date: '2025-09-02' },
  adherence: 98,
  nextAppointment: today,
  viralLoadDue: true,
};

function withData({ withHiv = true } = {}) {
  vi.mocked(useHivSummary).mockReturnValue(withHiv ? (hiv as never) : null);
  vi.mocked(useRecentVisits).mockReturnValue({
    visits: [
      {
        uuid: 'v1',
        startDatetime: `${today}T08:00:00.000+0000`,
        stopDatetime: null,
        visitType: { display: 'Outpatient' },
        location: { display: 'Neno District Hospital' },
        encounters: [{ encounterType: { display: 'VITALS' }, form: null }],
      },
    ],
    isLoading: false,
  });
  vi.mocked(useEMastercards).mockReturnValue({
    cards: [
      card({ state: 'EDIT', created: '2019-02-18', lastVisit: '2026-08-05', appointment: today }),
      card({ key: 'htn-dm', label: 'Hypertension and Diabetes eMastercard', state: 'EDIT', created: '2026-10-30', appointment: '2026-10-01' }),
    ],
  } as never);
  vi.mocked(useQuickPrograms).mockReturnValue({ programs: [hivOnArt(), tbCompleted()] } as never);
  vi.mocked(useLatestBloodPressure).mockReturnValue({
    bloodPressure: {
      systolic: { value: 128, unit: 'mmHg', date: `${today}T08:00:00.000+0000` },
      diastolic: { value: 82, unit: 'mmHg', date: today },
    },
    isLoading: false,
  } as never);
  vi.mocked(useLatestObs).mockReturnValue({ latest: new Map(), isLoading: false } as never);
}

describe('PatientSummary', () => {
  it('has Record vitals, and Record visit to choose which card to record a visit on', async () => {
    withData();
    render(<PatientSummary patientUuid="p1" />);

    expect(screen.getByRole('heading', { name: 'Patient summary' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record ART visit' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Record vitals' }));
    expect(mockRecordVitals).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Record visit' }));
    expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['ART', 'Hypertension and Diabetes']);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Hypertension and Diabetes' }));
    expect(mockLaunchVisit).toHaveBeenCalledWith('htn-dm');
  });

  it('shows the latest vitals and biometrics in one long card, with a link to their history', () => {
    withData();
    render(<PatientSummary patientUuid="p1" />);

    const vitals = within(screen.getByRole('region', { name: 'Vitals and biometrics' }));
    expect(vitals.getByText('128/82')).toBeInTheDocument();
    expect(vitals.getByText('Today')).toBeInTheDocument();
    expect(vitals.getAllByText('--')).toHaveLength(8);
    expect(vitals.getByRole('link', { name: 'Vitals history' })).toHaveAttribute('href', expect.stringContaining('chart/vitals-and-biometrics'));
  });

  it('shows no alerts for now', () => {
    withData();
    render(<PatientSummary patientUuid="p1" />);

    expect(screen.queryByRole('region', { name: 'Alerts' })).not.toBeInTheDocument();
  });

  it('lists every eMastercard with its last visit and next appointment, and what is due at this visit', () => {
    withData();
    render(<PatientSummary patientUuid="p1" />);

    const care = within(screen.getByRole('region', { name: 'Care and treatment' }));
    expect(care.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'ARTLast visit 05-Aug-2026 · Next Today',
      'Hypertension and DiabetesNo visit yet · Next 01-Oct-2026Overdue',
    ]);
    expect(care.getByRole('link', { name: 'Hypertension and Diabetes' })).toHaveAttribute(
      'href',
      expect.stringContaining('chart/chronicCare?card=htn-dm'),
    );
    const due = within(screen.getByRole('region', { name: 'Due at this visit' }));
    expect(due.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Hypertension and Diabetes appointment · 01-Oct-2026Overdue',
      'ART appointmentToday',
    ]);
  });

  it('summarises HIV care from the ART card', () => {
    withData();
    render(<PatientSummary patientUuid="p1" />);

    const hivCard = within(screen.getByRole('region', { name: 'HIV Care' }));
    expect(hivCard.getByText('13A · TDF/3TC/DTG')).toBeInTheDocument();
    expect(hivCard.getByText('7 years on ART')).toBeInTheDocument();
    expect(hivCard.getByText('LDL')).toBeInTheDocument();
    expect(hivCard.getByText('540 cells/µL')).toBeInTheDocument();
    expect(hivCard.getByText('98%')).toBeInTheDocument();
    expect(hivCard.getByText('Today')).toBeInTheDocument();
  });

  it('lists the programs, active and completed, and the recent visits', () => {
    withData();
    render(<PatientSummary patientUuid="p1" />);

    const programs = within(screen.getByRole('region', { name: 'Active programs' }));
    expect(programs.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'HIV ProgramOn antiretroviralsActive',
      'TB ProgramTreatment complete · 2021Completed',
    ]);
    const visits = within(screen.getByRole('region', { name: 'Recent visits' }));
    expect(visits.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      `Today${dayjs(`${today}T08:00:00.000+0000`).format('HH:mm')}Outpatient · Neno District HospitalVITALSIn progress`,
    ]);
  });

  it('has no HIV card for a patient without an ART card', () => {
    withData({ withHiv: false });
    render(<PatientSummary patientUuid="p1" />);

    expect(screen.queryByRole('region', { name: 'HIV Care' })).not.toBeInTheDocument();
  });
});
