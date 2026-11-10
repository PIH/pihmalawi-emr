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
import { TC_FORMS, TC_HEADER } from './tc-concepts';
import { tcHeader } from './test-tc-data';
import TcHeaderWorkspace from './tc-header.workspace';

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

function setUp({ state = 'EDIT' as 'CREATE' | 'EDIT', header = tcHeader as typeof tcHeader | null } = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'teen-club', state, initialEncounterUuid: header?.uuid ?? null }),
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

function renderPanel(section: 'start' | 'patientGuardian') {
  render(
    <TcHeaderWorkspace
      workspaceProps={{ patientUuid: 'p1', section }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-tc-header-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const agree = () => userEvent.click(within(screen.getByRole('group', { name: /Agrees to follow-up/ })).getByLabelText('Yes'));

describe('TcHeaderWorkspace', () => {
  it('starts the card with the intake / referral form, the follow-up agreement required', async () => {
    setUp({ state: 'CREATE', header: null });
    renderPanel('start');
    expect(screen.getByText('Start the card')).toBeInTheDocument();
    expect(screen.queryByLabelText('Guardian name')).not.toBeInTheDocument();
    await save();
    expect(screen.getByText('Required')).toBeInTheDocument();
    await agree();
    await userEvent.click(screen.getByLabelText('Age at intake in weeks'));
    fireEvent.change(screen.getByLabelText('Age at intake: weeks'), { target: { value: '30' } });
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(TC_FORMS.header);
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: NCD_HEADER.agreesToFollowUp, value: YES },
        {
          concept: TC_HEADER.ageAtIntakeGroup,
          groupMembers: [
            { concept: TC_HEADER.timeUnit, value: TC_HEADER.weeks },
            { concept: TC_HEADER.age, value: 30 },
          ],
        },
      ]),
    );
  });

  it('the age at intake is in weeks or in months: ticking one unticks the other', async () => {
    setUp();
    renderPanel('patientGuardian');
    expect(screen.getByLabelText('Age at intake in months')).toBeChecked();
    expect(screen.getByLabelText('Age at intake: months')).toHaveValue(170);
    await userEvent.click(screen.getByLabelText('Age at intake in weeks'));
    expect(screen.getByLabelText('Age at intake in months')).not.toBeChecked();
    expect(screen.queryByLabelText('Age at intake: months')).not.toBeInTheDocument();
  });
});
