import React from 'react';
import { render as renderWithoutCache, screen, within } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { getDefaultsFromConfigSchema, openmrsFetch, useConfig } from '@openmrs/esm-framework';
import { configSchema } from '../config-schema';
import userEvent from '@testing-library/user-event';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import LatestVitals from './latest-vitals.extension';
import HivSummary from './hiv-summary.extension';

vi.mock('@openmrs/esm-patient-common-lib', () => ({
  useLaunchWorkspaceRequiringVisit: vi.fn(),
  usePatientChartStore: vi.fn(() => ({ patient: null, visitContext: null, mutateVisitContext: vi.fn() })),
}));

const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const mockUseLaunchWorkspaceRequiringVisit = vi.mocked(useLaunchWorkspaceRequiringVisit);

/** One measure of the strip: its label, value and date */
const item = (label: string) => within(screen.getByText(label, { exact: true }).parentElement);

// Each test gets its own SWR cache: they use the same patient, so they'd share cached results otherwise
function render(ui: React.ReactElement) {
  return renderWithoutCache(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{ui}</SWRConfig>);
}
const mockUseConfig = vi.mocked(useConfig);

const SYSTOLIC = 'systolic-uuid';
const DIASTOLIC = 'diastolic-uuid';
const WEIGHT = 'weight-uuid';
const HEIGHT = 'height-uuid';

const vitalsConcepts = {
  systolicBloodPressureUuid: SYSTOLIC,
  diastolicBloodPressureUuid: DIASTOLIC,
  pulseUuid: 'pulse-uuid',
  temperatureUuid: 'temperature-uuid',
  oxygenSaturationUuid: 'spo2-uuid',
  respiratoryRateUuid: 'rr-uuid',
  heightUuid: HEIGHT,
  weightUuid: WEIGHT,
  midUpperArmCircumferenceUuid: 'muac-uuid',
};

function observation(code: string, date: string, encounter: string, value: object) {
  return {
    resource: {
      resourceType: 'Observation',
      code: { coding: [{ code }] },
      effectiveDateTime: date,
      encounter: { reference: `Encounter/${encounter}` },
      ...value,
    },
  };
}

const quantity = (value: number, unit: string) => ({ valueQuantity: { value, unit } });

/** Answers the FHIR and REST requests from the given observations per concept and enrollments */
function serve(observations: Record<string, Array<ReturnType<typeof observation>>>, enrollments: Array<object> = []) {
  mockOpenmrsFetch.mockImplementation((url: string) => {
    if (url.includes('programenrollment')) {
      return Promise.resolve({ data: { results: enrollments } } as any);
    }
    const codes = new URL(url, 'http://localhost').searchParams.get('code').split(',');
    const entry = codes
      .flatMap((code) => observations[code] ?? [])
      .sort((a, b) => b.resource.effectiveDateTime.localeCompare(a.resource.effectiveDateTime));
    return Promise.resolve({ data: { entry } } as any);
  });
}

describe('LatestVitals', () => {
  beforeEach(() => {
    mockUseConfig.mockImplementation((options?: { externalModuleName?: string }) =>
      options?.externalModuleName === '@openmrs/esm-patient-vitals-app'
        ? ({ concepts: vitalsConcepts } as any)
        : (getDefaultsFromConfigSchema(configSchema) as any),
    );
  });

  it('shows the latest BP recorded as a pair, even when a later visit only has a weight, each value with its date', async () => {
    serve({
      [SYSTOLIC]: [observation(SYSTOLIC, '2026-09-01', 'september', quantity(140, 'mmHg'))],
      [DIASTOLIC]: [observation(DIASTOLIC, '2026-09-01', 'september', quantity(90, 'mmHg'))],
      [WEIGHT]: [
        observation(WEIGHT, '2026-10-01', 'october', quantity(62, 'kg')),
        observation(WEIGHT, '2026-09-01', 'september', quantity(60, 'kg')),
      ],
      [HEIGHT]: [observation(HEIGHT, '2026-01-05', 'january', quantity(170, 'cm'))],
    });

    render(<LatestVitals patientUuid="patient-uuid" />);

    expect(await screen.findByText('140 / 90 mmHg')).toBeInTheDocument();
    expect(item('BP').getByText('01-Sep-2026')).toBeInTheDocument();
    expect(item('Weight').getByText('62 kg')).toBeInTheDocument();
    expect(item('Weight').getByText('01-Oct-2026')).toBeInTheDocument();
    // BMI from the latest weight and height
    expect(item('BMI').getByText('21.5 kg/m²')).toBeInTheDocument();
  });

  it('opens the vitals form from Record vitals, starting a visit first if there is none', async () => {
    const launch = vi.fn();
    mockUseLaunchWorkspaceRequiringVisit.mockReturnValue(launch);
    serve({});

    render(<LatestVitals patientUuid="patient-uuid" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Record vitals' }));

    expect(mockUseLaunchWorkspaceRequiringVisit).toHaveBeenCalledWith('patient-uuid', 'patient-vitals-biometrics-form-workspace');
    expect(launch).toHaveBeenCalledWith({}, {}, expect.objectContaining({ patientUuid: 'patient-uuid' }));
  });

  it("ignores a systolic reading without its diastolic, as the vitals table can't show it", async () => {
    serve({
      [SYSTOLIC]: [
        observation(SYSTOLIC, '2026-10-01', 'october', quantity(150, 'mmHg')),
        observation(SYSTOLIC, '2026-09-01', 'september', quantity(140, 'mmHg')),
      ],
      [DIASTOLIC]: [observation(DIASTOLIC, '2026-09-01', 'september', quantity(90, 'mmHg'))],
    });

    render(<LatestVitals patientUuid="patient-uuid" />);

    expect(await screen.findByText('140 / 90 mmHg')).toBeInTheDocument();
  });
});

describe('HivSummary', () => {
  const VIRAL_LOAD = '654a7694-977f-11e1-8993-905e29aff6c1';
  const LDL = 'e97b36a2-16f5-11e6-b6ba-3e1d05defe78';
  const CD4 = '656c327a-977f-11e1-8993-905e29aff6c1';
  const hivEnrollment = { program: { uuid: '66850b0a-977f-11e1-8993-905e29aff6c1' }, dateCompleted: null };

  beforeEach(() => {
    mockUseConfig.mockReturnValue(getDefaultsFromConfigSchema(configSchema) as any);
  });

  it('shows the latest viral load and CD4 count, with their dates, for a patient in the HIV program', async () => {
    serve(
      {
        [VIRAL_LOAD]: [observation(VIRAL_LOAD, '2026-06-01', 'june', quantity(1500, 'copies/ml'))],
        [CD4]: [observation(CD4, '2026-03-01', 'march', quantity(350, 'cells/µL'))],
      },
      [hivEnrollment],
    );

    render(<HivSummary patientUuid="patient-uuid" />);

    expect(await screen.findByText('1500 copies/ml')).toBeInTheDocument();
    expect(screen.getByText('01-Jun-2026')).toBeInTheDocument();
    expect(screen.getByText('350 cells/µL')).toBeInTheDocument();
    expect(screen.getByText('01-Mar-2026')).toBeInTheDocument();
  });

  it('shows LDL when the latest viral load result was below detection', async () => {
    serve(
      {
        [VIRAL_LOAD]: [observation(VIRAL_LOAD, '2026-06-01', 'june', quantity(1500, 'copies/ml'))],
        [LDL]: [observation(LDL, '2026-09-01', 'september', { valueBoolean: true })],
      },
      [hivEnrollment],
    );

    render(<HivSummary patientUuid="patient-uuid" />);

    expect(await screen.findByText('LDL')).toBeInTheDocument();
    expect(screen.getByText('01-Sep-2026')).toBeInTheDocument();
  });

  it('shows nothing for a patient not in the HIV program', async () => {
    serve({ [VIRAL_LOAD]: [observation(VIRAL_LOAD, '2026-06-01', 'june', quantity(1500, 'copies/ml'))] }, [
      { ...hivEnrollment, dateCompleted: '2026-07-01' },
    ]);

    const { container } = render(<HivSummary patientUuid="patient-uuid" />);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(container).toBeEmptyDOMElement();
  });
});
