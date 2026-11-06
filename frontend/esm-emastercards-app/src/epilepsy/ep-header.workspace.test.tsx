import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch, useSession } from '@openmrs/esm-framework';
import { card } from '../test-cards';
import { YES } from '../art/art-concepts';
import { useCardEncounters, useEMastercard, useLocationsTagged } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { useCarriedPatientGuardian } from '../shared/patient-guardian';
import { EP_FORMS, EP_HEADER } from './ep-concepts';
import { epHeader } from './test-ep-data';
import EpHeaderWorkspace from './ep-header.workspace';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
  useLocationsTagged: vi.fn(),
}));
vi.mock('../art/obs-diff', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/obs-diff')>()),
  saveEncounter: vi.fn(),
}));
vi.mock('../shared/patient-guardian', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../shared/patient-guardian')>()),
  useCarriedPatientGuardian: vi.fn(),
}));

const mockSave = vi.mocked(saveEncounter);

function setUp({ state = 'EDIT' as 'CREATE' | 'EDIT' | 'VIEW' | 'UNAVAILABLE', header = epHeader as typeof epHeader | null, carried = {} } = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'epilepsy', state, initialEncounterUuid: header?.uuid ?? null, message: state === 'UNAVAILABLE' ? 'Multiple forms found' : null }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockReturnValue({ encounters: header ? [header] : [], isLoading: false, error: undefined, mutate: vi.fn() });
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(useCarriedPatientGuardian).mockReturnValue({ carried, isLoading: false });
  vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
  vi.mocked(openmrsFetch).mockResolvedValue({ data: { results: [] } } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel(section: 'start' | 'seizureTypes' | 'familyHistory' | 'history' | 'exposures' | 'patientGuardian') {
  render(
    <EpHeaderWorkspace
      workspaceProps={{ patientUuid: 'p1', section }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-ep-header-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));

describe('EpHeaderWorkspace', () => {
  it('starts the card with patient and guardian, saving the epilepsy diagnosis as the form does', async () => {
    setUp({ state: 'CREATE', header: null });
    renderPanel('seizureTypes');
    expect(screen.getByText('Start the card')).toBeInTheDocument();
    expect(screen.queryByText('Tonic clonic')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Guardian name'), { target: { value: 'Mary' } });
    await userEvent.click(screen.getByLabelText('Yes'));
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(EP_FORMS.header);
    expect(args.encounterUuid).toBeUndefined();
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: EP_HEADER.guardianName, value: 'Mary' },
        { concept: EP_HEADER.agreesToFollowUp, value: YES },
        { concept: EP_HEADER.diagnosisGroup, groupMembers: [{ concept: EP_HEADER.diagnosis, value: EP_HEADER.epilepsy }] },
      ]),
    );
  });

  it('the follow-up agreement is required to start the card', async () => {
    setUp({ state: 'CREATE', header: null });
    renderPanel('start');
    await save();
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("fills patient and guardian in from the patient's other cards", () => {
    setUp({ state: 'CREATE', header: null, carried: { guardianName: { value: 'Mh Guardian', from: 'Mental Health eMastercard' } } });
    renderPanel('start');
    expect(screen.getByLabelText('Guardian name')).toHaveValue('Mh Guardian');
    expect(screen.getByText('Patient and guardian details were filled in from Mental Health eMastercard. Check them, then save.')).toBeInTheDocument();
  });

  it("editing a section never voids another section's obs, nor saves the diagnosis again", async () => {
    setUp();
    renderPanel('seizureTypes');
    const clonic = screen.getByRole('group', { name: 'Clonic' });
    await userEvent.click(clonic.querySelector('input[value="' + YES + '"]'));
    await save();
    const [, args] = mockSave.mock.calls[0];
    expect(args.encounterUuid).toBe(epHeader.uuid);
    expect(args.payload).toEqual({ add: [{ concept: EP_HEADER.seizureTypes[1].concept, value: YES }], void: [] });
  });

  it('an exposure shows its date once ticked, and an Other one asks what it was', async () => {
    setUp();
    renderPanel('exposures');
    expect(screen.getByLabelText('Alcohol: date')).toBeInTheDocument();
    expect(screen.queryByLabelText('Smoking: date')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Glue')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Smoking'));
    expect(screen.getByLabelText('Smoking: date')).toBeInTheDocument();
  });

  it('refuses a month of onset that is not a month', async () => {
    setUp();
    renderPanel('history');
    fireEvent.change(screen.getByLabelText('Month of onset'), { target: { value: '13' } });
    await save();
    expect(screen.getByText('Must be a month from 1 to 12')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });
});
