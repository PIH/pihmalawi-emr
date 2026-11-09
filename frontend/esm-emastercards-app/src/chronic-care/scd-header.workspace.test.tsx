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
import { SCD_FORMS, SCD_HEADER } from './scd-concepts';
import { scdHeader } from './test-scd-data';
import ScdHeaderWorkspace from './scd-header.workspace';

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

function setUp({ state = 'EDIT' as 'CREATE' | 'EDIT', header = scdHeader as typeof scdHeader | null } = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'scd', state, initialEncounterUuid: header?.uuid ?? null }),
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

function renderPanel(section: 'start' | 'patientGuardian' | 'diagnosis' | 'history' | 'referral') {
  render(
    <ScdHeaderWorkspace
      workspaceProps={{ patientUuid: 'p1', section }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-scd-header-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const agree = () => userEvent.click(within(screen.getByRole('group', { name: /Agrees to follow-up/ })).getByLabelText('Yes'));

describe('ScdHeaderWorkspace', () => {
  it('starts the card with patient and guardian details and the diagnosis, saving sickle cell disease as the form does', async () => {
    setUp({ state: 'CREATE', header: null });
    renderPanel('referral');
    expect(screen.getByText('Start the card')).toBeInTheDocument();
    expect(screen.queryByLabelText('Diagnosis')).not.toBeInTheDocument();
    await agree();
    fireEvent.change(screen.getByLabelText(/Date of diagnosis/), { target: { value: '2024-04-20' } });
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(SCD_FORMS.header);
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: NCD_HEADER.agreesToFollowUp, value: YES },
        {
          concept: SCD_HEADER.diagnosisGroup,
          groupMembers: [
            { concept: SCD_HEADER.diagnosis, value: SCD_HEADER.sickleCellDisease },
            { concept: SCD_HEADER.diagnosisDate, value: '2024-04-20' },
          ],
        },
      ]),
    );
  });

  it('cannot start the card without the date of diagnosis, which the form requires', async () => {
    setUp({ state: 'CREATE', header: null });
    renderPanel('start');
    await agree();
    await save();
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('shows the reasons for referral, with what an Other one was', () => {
    setUp();
    renderPanel('referral');
    expect(within(screen.getByRole('group', { name: 'Reasons for referral' })).getByLabelText('OPD')).toBeChecked();
    expect(screen.getByLabelText('Other')).toBeChecked();
    expect(screen.getByLabelText('Other reason: specify')).toHaveValue('School nurse');
  });

  it('editing the tests never voids the diagnosis', async () => {
    setUp();
    renderPanel('diagnosis');
    expect(screen.getByLabelText(/Date of diagnosis/)).toHaveValue('2024-04-20');
    await userEvent.click(within(screen.getByRole('group', { name: 'Microscopy' })).getByLabelText('Yes'));
    await save();
    expect(mockSave.mock.calls[0][1].payload).toEqual({ add: [{ concept: SCD_HEADER.tests[0].concept, value: YES }], void: [] });
  });

  it("asks each test's date only once the test is answered Yes, and clears it when it is answered No", async () => {
    setUp();
    renderPanel('diagnosis');
    expect(screen.queryByLabelText('Microscopy: date')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Rapid test: date')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Hb electrophoresis: date')).toHaveValue('2024-04-18');
    await userEvent.click(within(screen.getByRole('group', { name: 'Microscopy' })).getByLabelText('Yes'));
    expect(screen.getByLabelText('Microscopy: date')).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('group', { name: 'Hb electrophoresis' })).getByLabelText('No'));
    expect(screen.queryByLabelText('Hb electrophoresis: date')).not.toBeInTheDocument();
    await save();
    const date = scdHeader.obs.find((o) => o.concept === SCD_HEADER.tests[2].date);
    expect(mockSave.mock.calls[0][1].payload.void).toContain(date.uuid);
  });
});
