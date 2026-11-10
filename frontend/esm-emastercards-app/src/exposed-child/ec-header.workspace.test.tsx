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
import { EC_FORMS, EC_HEADER, WEEKS } from './ec-concepts';
import { ecHeader } from './test-ec-data';
import EcHeaderWorkspace from './ec-header.workspace';

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

function setUp({ state = 'EDIT' as 'CREATE' | 'EDIT', header = ecHeader as typeof ecHeader | null } = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'exposed-child', state, initialEncounterUuid: header?.uuid ?? null }),
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

function renderPanel(section: 'start' | 'patientGuardian' | 'status') {
  render(
    <EcHeaderWorkspace
      workspaceProps={{ patientUuid: 'p1', section }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-ec-header-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const agree = () => userEvent.click(within(screen.getByRole('group', { name: /Agrees to follow-up/ })).getByLabelText('Yes'));

describe('EcHeaderWorkspace', () => {
  it('starts the card with the child and guardian details and the status at enrolment, an NVP age in weeks by default', async () => {
    setUp({ state: 'CREATE', header: null });
    renderPanel('start');
    expect(screen.getByText('Child and Guardian Details')).toBeInTheDocument();
    expect(screen.getByText('Status at Enrolment')).toBeInTheDocument();
    await agree();
    fireEvent.change(screen.getByLabelText('Guardian relation'), { target: { value: 'Grandmother' } });
    fireEvent.change(screen.getByLabelText('Child: age when starting NVP'), { target: { value: '2' } });
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(EC_FORMS.header);
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: NCD_HEADER.agreesToFollowUp, value: YES },
        { concept: EC_HEADER.guardianRelation, value: 'Grandmother' },
        {
          concept: EC_HEADER.nvpStartGroup,
          groupMembers: [
            { concept: EC_HEADER.nvpStartAge, value: 2 },
            { concept: EC_HEADER.nvpStartAgeUnit, value: WEEKS },
          ],
        },
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

  it('shows the status at enrolment saved', () => {
    setUp();
    renderPanel('status');
    expect(within(screen.getByRole('group', { name: 'Mother: status' })).getByLabelText('On ART')).toBeChecked();
    expect(screen.getByLabelText(/Child: age at enrolment/)).toHaveValue(6);
    expect(screen.getByLabelText(/Birth weight/)).toHaveValue(3.1);
  });
});
