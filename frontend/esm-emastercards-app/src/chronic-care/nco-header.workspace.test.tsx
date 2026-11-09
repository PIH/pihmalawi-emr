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
import { NCO_FORMS, NCO_HEADER } from './nco-concepts';
import { ncoHeader } from './test-nco-data';
import NcoHeaderWorkspace from './nco-header.workspace';

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

function setUp({ state = 'EDIT' as 'CREATE' | 'EDIT', header = ncoHeader as typeof ncoHeader | null } = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'ncd-other', state, initialEncounterUuid: header?.uuid ?? null }),
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
    <NcoHeaderWorkspace
      workspaceProps={{ patientUuid: 'p1', section }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-nco-header-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const agree = () => userEvent.click(within(screen.getByRole('group', { name: /Agrees to follow-up/ })).getByLabelText('Yes'));

describe('NcoHeaderWorkspace', () => {
  it('starts the card with patient and guardian details and the diagnoses', async () => {
    setUp({ state: 'CREATE', header: null });
    renderPanel('imaging');
    expect(screen.getByText('Start the card')).toBeInTheDocument();
    await agree();
    await userEvent.click(screen.getByLabelText('Rheumatoid arthritis'));
    fireEvent.change(screen.getByLabelText('Rheumatoid arthritis: date'), { target: { value: '2024-10-01' } });
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(NCO_FORMS.header);
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: NCD_HEADER.agreesToFollowUp, value: YES },
        {
          concept: NCD_HEADER.diagnosisGroup,
          groupMembers: [
            { concept: NCD_HEADER.diagnosis, value: NCO_HEADER.diagnoses[0].answer },
            { concept: NCD_HEADER.diagnosisDate, value: '2024-10-01' },
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

  it('shows the diagnoses with what Other was, and the comorbidities', () => {
    setUp();
    renderPanel('diagnoses');
    expect(screen.getByLabelText('Cirrhosis')).toBeChecked();
    expect(screen.getByLabelText('Other diagnosis: specify')).toHaveValue('Lupus');
    expect(within(screen.getByRole('group', { name: 'Comorbidities' })).getByLabelText('Hypertension')).toBeChecked();
  });

  it('asks the TB date and hides it for a patient who never had TB', async () => {
    setUp();
    renderPanel('history');
    expect(screen.getByLabelText('TB: date')).toHaveValue('2018-02-01');
    await userEvent.click(within(screen.getByRole('group', { name: 'TB' })).getByLabelText('Never had TB'));
    expect(screen.queryByLabelText('TB: date')).not.toBeInTheDocument();
  });
});
