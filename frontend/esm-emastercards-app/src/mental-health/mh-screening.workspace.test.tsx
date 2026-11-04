import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { MH_FORMS, MH_SCREENING, NON_CODED_TEXT } from './mh-concepts';
import { encounter, obs } from './test-mh-data';
import MhScreeningWorkspace from './mh-screening.workspace';

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
vi.mock('@openmrs/esm-patient-common-lib', () => ({ usePatientChartStore: vi.fn() }));

const mockSave = vi.mocked(saveEncounter);

function setUp(encounters = []) {
  vi.mocked(useEMastercard).mockReturnValue({ card: card({ key: 'mental-health', state: 'EDIT' }), systemLocationsTag: 'Upper Neno', isLoading: false, error: undefined });
  vi.mocked(useCardEncounters).mockReturnValue({ encounters, isLoading: false, error: undefined, mutate: vi.fn() });
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(useSameDayObs).mockReturnValue({ obs: {} as any, isLoading: false });
  vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
  vi.mocked(usePatientChartStore).mockReturnValue({ visitContext: { uuid: 'visit-today', startDatetime: '2026-11-04T08:00:00.000+0000' } } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel(encounterUuid?: string) {
  render(
    <MhScreeningWorkspace
      workspaceProps={{ patientUuid: 'p1', encounterUuid }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-mh-screening-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));

describe('MhScreeningWorkspace', () => {
  it('records a screening', async () => {
    setUp();
    renderPanel();
    expect(screen.getByText('Record screening')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Depression'));
    await userEvent.click(screen.getByLabelText('PM +'));
    await userEvent.click(screen.getByLabelText('Session 1'));
    fireEvent.change(screen.getByLabelText('Next appointment *'), { target: { value: '2026-12-02' } });
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(MH_FORMS.screening);
    expect(args.visitUuid).toBe('visit-today');
    expect(args.payload.add).toEqual([
      { concept: MH_SCREENING.diagnosis, value: MH_SCREENING.diagnoses[0].value },
      { concept: MH_SCREENING.intervention, value: MH_SCREENING.interventions[0].value },
      { concept: MH_SCREENING.session, value: MH_SCREENING.sessions[0].value },
      { concept: MH_SCREENING.nextAppointment, value: '2026-12-02' },
    ]);
  });

  it('Other diagnosis is saved in its group with its text', async () => {
    setUp();
    renderPanel();
    expect(screen.queryByLabelText('Other diagnosis: specify')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Other diagnosis'));
    fireEvent.change(screen.getByLabelText('Other diagnosis: specify'), { target: { value: 'insomnia' } });
    fireEvent.change(screen.getByLabelText('Next appointment *'), { target: { value: '2026-12-02' } });
    await save();
    expect(mockSave.mock.calls[0][1].payload.add).toContainEqual({
      concept: MH_SCREENING.otherDiagnosisGroup,
      groupMembers: [
        { concept: MH_SCREENING.diagnosis, value: MH_SCREENING.other },
        { concept: NON_CODED_TEXT, value: 'insomnia' },
      ],
    });
  });

  it('next appointment is required', async () => {
    setUp();
    renderPanel();
    await userEvent.click(screen.getByLabelText('Depression'));
    await save();
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('unticking Other on an existing screening voids its group and leaves no text behind', async () => {
    const group = obs(MH_SCREENING.otherDiagnosisGroup, null, [obs(MH_SCREENING.diagnosis, MH_SCREENING.other), obs(NON_CODED_TEXT, 'insomnia')]);
    const existing = encounter('s1', '2026-11-04', [group, obs(MH_SCREENING.nextAppointment, '2026-12-02T00:00:00.000+0000')]);
    setUp([existing]);
    renderPanel('s1');
    await userEvent.click(screen.getByLabelText('Other diagnosis'));
    await save();
    expect(mockSave.mock.calls[0][1].payload).toEqual({ add: [], void: [group.uuid] });
  });
});
