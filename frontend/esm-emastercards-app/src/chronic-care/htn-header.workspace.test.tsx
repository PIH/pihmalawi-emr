import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch, useSession } from '@openmrs/esm-framework';
import { card } from '../test-cards';
import { YES } from '../art/art-concepts';
import { useCardEncounters, useEMastercard, useLocationsTagged } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { useCarriedPatientGuardian } from '../shared/patient-guardian';
import { HTN_FORMS, HTN_HEADER } from './htn-concepts';
import { htnHeader } from './test-htn-data';
import HtnHeaderWorkspace from './htn-header.workspace';

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

function setUp({ state = 'EDIT' as 'CREATE' | 'EDIT' | 'VIEW', header = htnHeader as typeof htnHeader | null, carried = {} } = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({
      key: 'htn-dm',
      state,
      initialEncounterUuid: header?.uuid ?? null,
    }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockReturnValue({
    encounters: header ? [header] : [],
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  });
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(useCarriedPatientGuardian).mockReturnValue({
    carried,
    isLoading: false,
  });
  vi.mocked(useSession).mockReturnValue({
    sessionLocation: { uuid: 'neno-dh' },
  } as any);
  vi.mocked(openmrsFetch).mockResolvedValue({ data: { results: [] } } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel(section: 'start' | 'patientGuardian' | 'diagnoses' | 'history') {
  render(
    <HtnHeaderWorkspace
      workspaceProps={{ patientUuid: 'p1', section }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-htn-header-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const hypertension = HTN_HEADER.diagnoses[2].answer;

describe('HtnHeaderWorkspace', () => {
  it('starts the card with patient and guardian details and the diagnoses', async () => {
    setUp({ state: 'CREATE', header: null });
    renderPanel('history');
    expect(screen.getByText('Start the card')).toBeInTheDocument();
    expect(screen.queryByText('TB')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Guardian name'), {
      target: { value: 'Mary' },
    });
    await userEvent.click(within(screen.getByRole('group', { name: /Agrees to follow-up/ })).getByLabelText('Yes'));
    await userEvent.click(screen.getByLabelText('Hypertension'));
    fireEvent.change(screen.getByLabelText('Hypertension: date'), {
      target: { value: '2025-05-20' },
    });
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(HTN_FORMS.header);
    expect(args.encounterUuid).toBeUndefined();
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: HTN_HEADER.guardianName, value: 'Mary' },
        { concept: HTN_HEADER.agreesToFollowUp, value: YES },
        {
          concept: HTN_HEADER.diagnosisGroup,
          groupMembers: [
            { concept: HTN_HEADER.diagnosis, value: hypertension },
            { concept: HTN_HEADER.diagnosisDate, value: '2025-05-20' },
          ],
        },
      ]),
    );
  });

  it('a diagnosis ticked needs its date', async () => {
    setUp({ state: 'CREATE', header: null });
    renderPanel('start');
    await userEvent.click(within(screen.getByRole('group', { name: /Agrees to follow-up/ })).getByLabelText('Yes'));
    await userEvent.click(screen.getByLabelText('Type 2 DM'));
    await save();
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("fills patient and guardian in from the patient's other cards", () => {
    setUp({
      state: 'CREATE',
      header: null,
      carried: {
        guardianName: { value: 'Art Guardian', from: 'ART eMastercard' },
      },
    });
    renderPanel('start');
    expect(screen.getByLabelText('Guardian name')).toHaveValue('Art Guardian');
    expect(screen.getByText('Patient and guardian details were filled in from ART eMastercard. Check them, then save.')).toBeInTheDocument();
  });

  it("editing a section never voids another section's obs", async () => {
    setUp();
    renderPanel('history');
    await userEvent.click(screen.getByLabelText('Retinopathy'));
    fireEvent.change(screen.getByLabelText('Retinopathy: date'), {
      target: { value: '2026-01-15' },
    });
    await save();
    const [, args] = mockSave.mock.calls[0];
    expect(args.encounterUuid).toBe(htnHeader.uuid);
    expect(args.payload.void).toEqual([]);
    expect(args.payload.add).toEqual([
      {
        concept: HTN_HEADER.complicationGroup,
        groupMembers: [
          {
            concept: HTN_HEADER.complication,
            value: HTN_HEADER.complications[3].answer,
          },
          { concept: HTN_HEADER.diagnosisDate, value: '2026-01-15' },
        ],
      },
    ]);
  });

  it('shows the diagnoses saved, with their dates', () => {
    setUp();
    renderPanel('diagnoses');
    expect(screen.getByLabelText('Hypertension')).toBeChecked();
    expect(screen.getByLabelText('Hypertension: date')).toHaveValue('2025-05-20');
    expect(screen.getByLabelText('Type 1 DM')).not.toBeChecked();
  });

  it('ticking Type 1 DM unticks Type 2 DM', async () => {
    setUp();
    renderPanel('diagnoses');
    expect(screen.getByLabelText('Type 2 DM')).toBeChecked();
    await userEvent.click(screen.getByLabelText('Type 1 DM'));
    expect(screen.getByLabelText('Type 1 DM')).toBeChecked();
    expect(screen.getByLabelText('Type 2 DM')).not.toBeChecked();
  });

  it('hides the TB year for a patient who never had TB, and labels the complications', async () => {
    setUp();
    renderPanel('history');
    expect(screen.getByText('Complications')).toBeInTheDocument();
    expect(screen.getByLabelText('TB year')).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('group', { name: 'TB' })).getByLabelText('Never had TB'));
    expect(screen.queryByLabelText('TB year')).not.toBeInTheDocument();
  });

  it("shows a TB year outside its concept's limits while it is typed", () => {
    setUp();
    renderPanel('history');
    fireEvent.change(screen.getByLabelText('TB year'), { target: { value: '1900' } });
    expect(screen.getByText('Must be between 1950 and 2050')).toBeInTheDocument();
  });

  it('cannot start the card without a diagnosis', async () => {
    setUp({ state: 'CREATE', header: null });
    renderPanel('start');
    await userEvent.click(within(screen.getByRole('group', { name: /Agrees to follow-up/ })).getByLabelText('Yes'));
    await save();
    expect(screen.getByText('Tick at least one diagnosis: Type 1 DM, Type 2 DM or Hypertension.')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('cannot untick every diagnosis of a card', async () => {
    setUp();
    renderPanel('diagnoses');
    await userEvent.click(screen.getByLabelText('Hypertension'));
    await userEvent.click(screen.getByLabelText('Type 2 DM'));
    await save();
    expect(screen.getByText('Tick at least one diagnosis: Type 1 DM, Type 2 DM or Hypertension.')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });
});
