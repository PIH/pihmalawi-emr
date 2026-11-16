import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { CLEFT_FORMS } from './cleft-concepts';
import { HIE_LABS } from './hie-concepts';
import { cleftLabs } from './test-cleft-data';
import { CONDITION_WORKSPACES } from './pdc-condition-workspaces';

const CleftLabsWorkspace = CONDITION_WORKSPACES['pdc-cleft-lip-palate'].labs;

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

function setUp(encounters = [cleftLabs]) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'pdc-cleft-lip-palate', state: 'EDIT' }),
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
    <CleftLabsWorkspace
      workspaceProps={{ patientUuid: 'p1', encounterUuid }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-cleft-labs-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));

describe('the cleft lip / palate lab tests panel', () => {
  it('records HB on its own date and another test, as pdc-hb-and-other-laboratory-tests.xml does', async () => {
    setUp([]);
    renderPanel();
    expect(screen.queryByLabelText('TSH: date')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('HB'), { target: { value: '9.8' } });
    fireEvent.change(screen.getByLabelText('HB: date'), { target: { value: '2026-10-30' } });
    fireEvent.change(screen.getByLabelText('Other test: type of test'), { target: { value: 'Echo' } });
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(CLEFT_FORMS.labs);
    expect(args.payload.add).toEqual([
      { concept: HIE_LABS.hb, value: 9.8, obsDatetime: '2026-10-30' },
      { concept: HIE_LABS.otherTestGroup, groupMembers: [{ concept: HIE_LABS.otherTestType, value: 'Echo' }] },
    ]);
  });

  it('refuses an HB date in the future', async () => {
    setUp();
    renderPanel(cleftLabs.uuid);
    fireEvent.change(screen.getByLabelText('HB: date'), { target: { value: '2099-01-01' } });
    await save();
    expect(screen.getByText('Cannot be in the future')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });
});
