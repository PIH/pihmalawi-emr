import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { HIE_FORMS, HIE_LABS } from './hie-concepts';
import { YES } from './pdc-concepts';
import { hieLabs } from './test-hie-data';
import { CONDITION_WORKSPACES } from './pdc-condition-workspaces';

const HieLabsWorkspace = CONDITION_WORKSPACES['pdc-developmental-delay'].labs;

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

function setUp() {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'pdc-developmental-delay', state: 'EDIT' }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockReturnValue({ encounters: [hieLabs], isLoading: false, error: undefined, mutate: vi.fn() });
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(useSameDayObs).mockReturnValue({ obs: {}, isLoading: false });
  vi.mocked(usePatient).mockReturnValue({ patient: { birthDate: '2025-03-12' }, patientUuid: 'p1', isLoading: false, error: null } as any);
  vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
  vi.mocked(usePatientChartStore).mockReturnValue({ visitContext: { uuid: 'visit-today', startDatetime: '2026-11-04T08:00:00.000+0000' } } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel(encounterUuid?: string) {
  render(
    <HieLabsWorkspace
      workspaceProps={{ patientUuid: 'p1', encounterUuid }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-hie-labs-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));

describe('HieLabsWorkspace', () => {
  it('records HB on its own date and the TSH in its construct', async () => {
    setUp();
    vi.mocked(useCardEncounters).mockReturnValue({ encounters: [], isLoading: false, error: undefined, mutate: vi.fn() });
    renderPanel();
    expect(screen.getByText('Record laboratory tests')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('HB'), { target: { value: '11.2' } });
    fireEvent.change(screen.getByLabelText('HB: date'), { target: { value: '2026-10-30' } });
    await userEvent.click(within(screen.getByRole('group', { name: 'TSH: done' })).getByLabelText('Yes'));
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(HIE_FORMS.labs);
    expect(args.payload.add).toEqual([
      { concept: HIE_LABS.hb, value: 11.2, obsDatetime: '2026-10-30' },
      { concept: HIE_LABS.tshGroup, groupMembers: [{ concept: HIE_LABS.tshDone, value: YES }] },
    ]);
  });

  it("edits the HB result's date alone", async () => {
    setUp();
    renderPanel(hieLabs.uuid);
    expect(screen.getByLabelText('HB: date')).toHaveValue('2026-10-01');
    fireEvent.change(screen.getByLabelText('HB: date'), { target: { value: '2026-10-02' } });
    await save();
    const hb = hieLabs.obs.find((o) => o.concept === HIE_LABS.hb);
    expect(mockSave.mock.calls[0][1].payload).toEqual({
      add: [{ concept: HIE_LABS.hb, value: 10.4, obsDatetime: '2026-10-02' }],
      void: [hb.uuid],
    });
  });

  it('refuses a future date', async () => {
    setUp();
    renderPanel(hieLabs.uuid);
    fireEvent.change(screen.getByLabelText('HB: date'), { target: { value: '2099-01-01' } });
    await save();
    expect(screen.getByText('Cannot be in the future')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });
});
