import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { TRISOMY_FORMS, TRISOMY_LABS } from './trisomy-concepts';
import { trisomyLabs } from './test-trisomy-data';
import { CONDITION_WORKSPACES } from './pdc-condition-workspaces';

const TrisomyLabsWorkspace = CONDITION_WORKSPACES['pdc-trisomy'].labs;

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

function setUp(encounters = [trisomyLabs]) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'pdc-trisomy', state: 'EDIT' }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockReturnValue({ encounters, isLoading: false, error: undefined, mutate: vi.fn() });
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(useSameDayObs).mockReturnValue({ obs: {}, isLoading: false });
  vi.mocked(usePatient).mockReturnValue({ patient: { birthDate: '2025-03-12' }, patientUuid: 'p1', isLoading: false, error: null } as any);
  vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
  vi.mocked(usePatientChartStore).mockReturnValue({ visitContext: { uuid: 'visit-today', startDatetime: '2026-11-04T08:00:00.000+0000' } } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel(encounterUuid?: string) {
  render(
    <TrisomyLabsWorkspace
      workspaceProps={{ patientUuid: 'p1', encounterUuid }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-trisomy-labs-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));

describe('the trisomy 21 lab tests panel', () => {
  it('records the full blood count, and TSH on its own date', async () => {
    setUp([]);
    renderPanel();
    fireEvent.change(screen.getByLabelText('Platelets'), { target: { value: '250' } });
    fireEvent.change(screen.getByLabelText('Differential'), { target: { value: 'Normal' } });
    fireEvent.change(screen.getByLabelText('TSH'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('TSH: date'), { target: { value: '2026-10-30' } });
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(TRISOMY_FORMS.labs);
    expect(args.payload.add).toEqual([
      { concept: TRISOMY_LABS.platelets, value: 250 },
      { concept: TRISOMY_LABS.differential, value: 'Normal' },
      { concept: TRISOMY_LABS.tsh, value: 4, obsDatetime: '2026-10-30' },
    ]);
  });

  it('refuses a TSH with decimals, as its concept does, while it is typed', async () => {
    setUp();
    renderPanel(trisomyLabs.uuid);
    fireEvent.change(screen.getByLabelText('TSH'), { target: { value: '3.5' } });
    expect(screen.getByText('Must be a whole number')).toBeInTheDocument();
    await save();
    expect(mockSave).not.toHaveBeenCalled();
  });
});
