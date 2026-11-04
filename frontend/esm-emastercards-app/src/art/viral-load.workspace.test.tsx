import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch, usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { ART_FORMS, VIRAL_LOAD } from './art-concepts';
import { useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from './art.resource';
import { saveEncounter } from './obs-diff';
import ViralLoadWorkspace from './viral-load.workspace';

vi.mock('./art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
  useLocationsTagged: vi.fn(),
  useSameDayObs: vi.fn(),
}));
vi.mock('./obs-diff', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./obs-diff')>()),
  saveEncounter: vi.fn(),
}));
vi.mock('@openmrs/esm-patient-common-lib', () => ({ usePatientChartStore: vi.fn() }));

const mockSave = vi.mocked(saveEncounter);

function setUp() {
  vi.mocked(useEMastercard).mockReturnValue({ card: card({ state: 'EDIT' }), systemLocationsTag: 'Upper Neno', isLoading: false, error: undefined });
  vi.mocked(useCardEncounters).mockReturnValue({ encounters: [], isLoading: false, error: undefined, mutate: vi.fn() });
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(useSameDayObs).mockReturnValue({ obs: {}, isLoading: false });
  vi.mocked(usePatient).mockReturnValue({ patient: { gender: 'female' }, patientUuid: 'p1', isLoading: false, error: null } as any);
  vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
  vi.mocked(usePatientChartStore).mockReturnValue({
    visitContext: { uuid: 'visit-today', startDatetime: '2026-11-04T08:00:00.000+0000' },
  } as any);
  vi.mocked(openmrsFetch).mockResolvedValue({ data: { answers: [{ uuid: 'lab-neno', display: 'Neno DH lab' }] } } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel() {
  render(
    <ViralLoadWorkspace
      workspaceProps={{ patientUuid: 'p1' }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-art-viral-load-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

describe('ViralLoadWorkspace', () => {
  it('saves the viral load group with Bled, lab ID, location, sample ID, reason and result', async () => {
    setUp();
    renderPanel();
    await userEvent.click(screen.getByLabelText('Routine'));
    await userEvent.selectOptions(await screen.findByLabelText('Lab location'), 'Neno DH lab');
    fireEvent.change(screen.getByLabelText('Lab ID'), { target: { value: 'LAB-1' } });
    await userEvent.click(screen.getByLabelText('Bled'));
    fireEvent.change(screen.getByLabelText('Sample ID'), { target: { value: 'S-1' } });
    fireEvent.change(screen.getByLabelText('Viral load'), { target: { value: '1200' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save and close' }));

    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(ART_FORMS.viralLoad);
    expect(args.visitUuid).toBe('visit-today');
    expect(args.payload.add).toEqual([
      {
        concept: VIRAL_LOAD.group,
        groupMembers: [
          { concept: VIRAL_LOAD.testingReason, value: VIRAL_LOAD.testingReasonAnswers.routine },
          { concept: VIRAL_LOAD.labLocation, value: 'lab-neno' },
          { concept: VIRAL_LOAD.labId, value: 'LAB-1' },
          { concept: VIRAL_LOAD.sampleTaken, value: true },
          { concept: VIRAL_LOAD.sampleId, value: 'S-1' },
          { concept: VIRAL_LOAD.result, value: 1200 },
        ],
      },
    ]);
  });

  it('numeric, < and LDL clear each other', async () => {
    setUp();
    renderPanel();
    fireEvent.change(screen.getByLabelText('Viral load'), { target: { value: '1200' } });
    await userEvent.click(screen.getByLabelText('LDL'));
    expect(screen.getByLabelText('Viral load')).toHaveValue(null);
    fireEvent.change(screen.getByLabelText('Less than (<)'), { target: { value: '40' } });
    expect(screen.getByLabelText('LDL')).not.toBeChecked();
  });

  it('asks for a no-result reason only without a result', async () => {
    setUp();
    renderPanel();
    expect(screen.getByLabelText('Reason for no result')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Viral load'), { target: { value: '1200' } });
    expect(screen.queryByLabelText('Reason for no result')).not.toBeInTheDocument();
  });

  it('offers all locations', () => {
    setUp();
    renderPanel();
    expect(useLocationsTagged).toHaveBeenCalledWith(null);
  });
});
