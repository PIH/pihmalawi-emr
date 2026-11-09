import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { MH_VISIT } from '../mental-health/mh-concepts';
import { HTN_FORMS, HTN_HEADER, HTN_VISIT } from './htn-concepts';
import { encounter, htnHeader, htnVisit, obs } from './test-htn-data';
import HtnVisitWorkspace from './htn-visit.workspace';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
  useLocationsTagged: vi.fn(),
  useSameDayObs: vi.fn(),
}));
vi.mock('../art/obs-diff', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/obs-diff')>()),
  saveEncounter: vi.fn(),
}));
vi.mock('@openmrs/esm-patient-common-lib', () => ({
  usePatientChartStore: vi.fn(),
}));

const mockSave = vi.mocked(saveEncounter);
const TODAY_VISIT = {
  uuid: 'visit-today',
  startDatetime: '2026-11-04T08:00:00.000+0000',
};
const earlier = htnVisit('v1', '2026-10-08', {
  bp: [150, 95],
  meds: [['amlodipine', 5, 'OD']],
});

function setUp({
  state = 'EDIT' as 'CREATE' | 'EDIT' | 'VIEW',
  encounters = [earlier] as Array<ArtEncounter>,
  header = htnHeader as ArtEncounter,
  sameDay = {} as Record<string, Array<{ value: unknown; obsDatetime: string; encounterUuid: string }>>,
} = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'htn-dm', state, initialEncounterUuid: header.uuid }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  // the card header (whose diagnoses decide what is asked) and the visits
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: form.encounterType === HTN_FORMS.header.encounterType ? [header] : encounters,
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }));
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(useSameDayObs).mockReturnValue({
    obs: sameDay as any,
    isLoading: false,
  });
  vi.mocked(usePatient).mockReturnValue({
    patient: { gender: 'male', birthDate: '1960-03-12' },
    patientUuid: 'p1',
    isLoading: false,
    error: null,
  } as any);
  vi.mocked(useSession).mockReturnValue({
    sessionLocation: { uuid: 'neno-dh' },
  } as any);
  vi.mocked(usePatientChartStore).mockReturnValue({
    visitContext: TODAY_VISIT,
  } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel(encounterUuid?: string) {
  render(
    <HtnVisitWorkspace
      workspaceProps={{ patientUuid: 'p1', encounterUuid }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-htn-visit-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const question = (name: string) => within(screen.getByRole('group', { name }));

describe('HtnVisitWorkspace', () => {
  it('records a new visit in the O3 visit, with what hypertension-and-diabetes-visit.xml saves', async () => {
    setUp();
    renderPanel();
    fireEvent.change(screen.getByLabelText(/Systolic BP/), {
      target: { value: '142' },
    });
    fireEvent.change(screen.getByLabelText(/Diastolic BP/), {
      target: { value: '88' },
    });
    await userEvent.click(question('Tobacco').getByLabelText('Never'));
    await userEvent.click(question('Foot check: Ulcers').getByLabelText('No'));
    await userEvent.click(screen.getByLabelText('Metformin (MET)'));
    fireEvent.change(screen.getByLabelText('Metformin (MET) dose'), {
      target: { value: '500' },
    });
    await userEvent.selectOptions(screen.getByLabelText('Metformin (MET) frequency'), 'BID');
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(HTN_FORMS.visit);
    expect(args.visitUuid).toBe('visit-today');
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: HTN_VISIT.systolicBp, value: 142 },
        { concept: HTN_VISIT.diastolicBp, value: 88 },
        { concept: HTN_VISIT.tobacco, value: HTN_VISIT.useAnswers[1].value },
        {
          concept: MH_VISIT.dispensingGroup,
          groupMembers: [
            {
              concept: MH_VISIT.medication,
              value: HTN_VISIT.medications[2].drug,
            },
            { concept: MH_VISIT.dose, value: 500 },
            {
              concept: MH_VISIT.frequency,
              value: MH_VISIT.frequencies[1].value,
            },
          ],
        },
      ]),
    );
  });

  it('shows blood pressure taken with the vitals the same day, without saving it again', async () => {
    setUp({
      sameDay: {
        [HTN_VISIT.systolicBp]: [
          {
            value: 138,
            obsDatetime: TODAY_VISIT.startDatetime,
            encounterUuid: 'vitals',
          },
        ],
        [HTN_VISIT.diastolicBp]: [
          {
            value: 84,
            obsDatetime: TODAY_VISIT.startDatetime,
            encounterUuid: 'vitals',
          },
        ],
      },
    });
    renderPanel();
    expect(screen.getByText(/138/)).toBeInTheDocument();
    await userEvent.click(question('Alcohol').getByLabelText('Stopped'));
    await save();
    const concepts = mockSave.mock.calls[0][1].payload.add.map((o) => o.concept);
    expect(concepts).not.toContain(HTN_VISIT.systolicBp);
    expect(concepts).toContain(HTN_VISIT.alcohol);
  });

  it('refuses exercise days outside 0 to 7', async () => {
    setUp();
    renderPanel();
    fireEvent.change(screen.getByLabelText('Days per week with 30 minutes of exercise'), { target: { value: '9' } });
    await save();
    expect(screen.getByText('Must be between 0 and 7')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('edits a visit, voiding only what changed', async () => {
    setUp();
    renderPanel('v1');
    expect(screen.getByLabelText('Amlodipine (AML)')).toBeChecked();
    await userEvent.click(screen.getByLabelText('Amlodipine (AML)'));
    await save();
    const group = earlier.obs.find((o) => o.concept === MH_VISIT.dispensingGroup);
    expect(mockSave.mock.calls[0][1].encounterUuid).toBe('v1');
    expect(mockSave.mock.calls[0][1].payload).toEqual({
      add: [],
      void: [group.uuid],
    });
  });

  it('enters a past visit on an earlier day', async () => {
    setUp();
    renderPanel();
    fireEvent.change(screen.getByLabelText('Visit date'), {
      target: { value: '2026-10-08' },
    });
    await save();
    // that day already has a visit on the card
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('is read-only until the card is started', () => {
    setUp({ state: 'CREATE' });
    renderPanel();
    expect(screen.queryByRole('button', { name: 'Save and close' })).not.toBeInTheDocument();
  });

  it("shows a number outside its concept's limits while it is typed, and refuses to save it", async () => {
    setUp();
    renderPanel();
    fireEvent.change(screen.getByLabelText(/Systolic BP/), { target: { value: '300' } });
    expect(screen.getByText('Must be between 20 and 250')).toBeInTheDocument();
    await save();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('asks about glucose, the foot check and diabetes medications only for diabetes', () => {
    const htnOnly = encounter('htn-header-2', '2025-06-02', [
      obs(HTN_HEADER.diagnosisGroup, null, [obs(HTN_HEADER.diagnosis, HTN_HEADER.diagnoses[2].answer)]),
    ]);
    setUp({ header: htnOnly });
    renderPanel();
    expect(screen.queryByText('Glucose Monitoring')).not.toBeInTheDocument();
    expect(screen.queryByText('Foot Check')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Metformin (MET)')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Amlodipine (AML)')).toBeInTheDocument();
    expect(screen.getByLabelText('Aspirin (ASP)')).toBeInTheDocument();
  });

  it('asks about antihypertensives only for hypertension', () => {
    const dmOnly = encounter('htn-header-3', '2025-06-02', [
      obs(HTN_HEADER.diagnosisGroup, null, [obs(HTN_HEADER.diagnosis, HTN_HEADER.diagnoses[1].answer)]),
    ]);
    setUp({ header: dmOnly });
    renderPanel();
    expect(screen.getByText('Glucose Monitoring')).toBeInTheDocument();
    expect(screen.getByLabelText('Metformin (MET)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Amlodipine (AML)')).not.toBeInTheDocument();
    expect(screen.queryByText('Diuretics')).not.toBeInTheDocument();
  });
});
