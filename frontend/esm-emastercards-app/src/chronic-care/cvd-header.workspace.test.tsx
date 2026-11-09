import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch, useSession } from '@openmrs/esm-framework';
import { card } from '../test-cards';
import { YES } from '../art/art-concepts';
import { useCardEncounters, useEMastercard, useLocationsTagged } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { NCD_HEADER } from '../shared/ncd';
import { useCarriedPatientGuardian } from '../shared/patient-guardian';
import { CVD_FORMS, CVD_HEADER, OTHER } from './cvd-concepts';
import { cvdHeader } from './test-cvd-data';
import CvdHeaderWorkspace from './cvd-header.workspace';

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

function setUp({ state = 'EDIT' as 'CREATE' | 'EDIT', header = cvdHeader as typeof cvdHeader | null } = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'chf', state, initialEncounterUuid: header?.uuid ?? null }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockReturnValue({ encounters: header ? [header] : [], isLoading: false, error: undefined, mutate: vi.fn() });
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(useCarriedPatientGuardian).mockReturnValue({ carried: {}, isLoading: false });
  vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
  vi.mocked(openmrsFetch).mockResolvedValue({ data: { results: [] } } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel(section: 'start' | 'patientGuardian' | 'diagnoses' | 'history' | 'imaging') {
  render(
    <CvdHeaderWorkspace
      workspaceProps={{ patientUuid: 'p1', section }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-cvd-header-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const agree = () => userEvent.click(within(screen.getByRole('group', { name: /Agrees to follow-up/ })).getByLabelText('Yes'));

const cardiomyopathy = CVD_HEADER.diagnoses[0].answer;

describe('CvdHeaderWorkspace', () => {
  it('starts the card with patient and guardian details and the diagnoses', async () => {
    setUp({ state: 'CREATE', header: null });
    renderPanel('imaging');
    expect(screen.getByText('Start the card')).toBeInTheDocument();
    await agree();
    await userEvent.click(screen.getByLabelText('Cardiomyopathy'));
    fireEvent.change(screen.getByLabelText('Cardiomyopathy: date'), { target: { value: '2025-01-15' } });
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(CVD_FORMS.header);
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: NCD_HEADER.agreesToFollowUp, value: YES },
        {
          concept: NCD_HEADER.diagnosisGroup,
          groupMembers: [
            { concept: NCD_HEADER.diagnosis, value: cardiomyopathy },
            { concept: NCD_HEADER.diagnosisDate, value: '2025-01-15' },
          ],
        },
      ]),
    );
  });

  it('cannot start the card without a diagnosis', async () => {
    setUp({ state: 'CREATE', header: null });
    renderPanel('start');
    await agree();
    await save();
    expect(screen.getByText('Tick at least one diagnosis.')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('asks what an Other diagnosis was once it is ticked', async () => {
    setUp();
    renderPanel('diagnoses');
    expect(screen.queryByLabelText('Other diagnosis: specify')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Other'));
    expect(screen.getByLabelText('Other diagnosis: specify')).toBeInTheDocument();
  });

  it('shows an Other family planning method with what it was, and clears it once unticked', async () => {
    setUp();
    renderPanel('history');
    const familyPlanning = within(screen.getByRole('group', { name: 'Family planning' }));
    expect(familyPlanning.getByLabelText('Other')).toBeChecked();
    expect(screen.getByLabelText('Specify')).toHaveValue('Implant');
    await userEvent.click(familyPlanning.getByLabelText('Other'));
    expect(screen.queryByLabelText('Specify')).not.toBeInTheDocument();
    await save();
    const other = cvdHeader.obs.find((o) => o.concept === CVD_HEADER.familyPlanning && o.value === OTHER);
    expect(mockSave.mock.calls[0][1].payload).toEqual({ add: [], void: [other.uuid] });
  });
});
