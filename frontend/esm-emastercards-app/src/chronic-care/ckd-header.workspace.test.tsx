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
import { CKD_FORMS, CKD_HEADER } from './ckd-concepts';
import { ckdHeader } from './test-ckd-data';
import CkdHeaderWorkspace from './ckd-header.workspace';

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

function setUp({ state = 'EDIT' as 'CREATE' | 'EDIT', header = ckdHeader as typeof ckdHeader | null } = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'ckd', state, initialEncounterUuid: header?.uuid ?? null }),
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

function renderPanel(section: 'start' | 'patientGuardian' | 'etiology' | 'diagnoses' | 'history') {
  render(
    <CkdHeaderWorkspace
      workspaceProps={{ patientUuid: 'p1', section }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-ckd-header-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const agree = () => userEvent.click(within(screen.getByRole('group', { name: /Agrees to follow-up/ })).getByLabelText('Yes'));

describe('CkdHeaderWorkspace', () => {
  it('starts the card with patient and guardian details, the presumed etiology and the diagnoses, none of which is required', async () => {
    setUp({ state: 'CREATE', header: null });
    renderPanel('history');
    expect(screen.getByText('Start the card')).toBeInTheDocument();
    expect(screen.getByText('Presumed Etiology')).toBeInTheDocument();
    await agree();
    await userEvent.click(within(screen.getByRole('group', { name: 'Presumed etiology' })).getByLabelText('Nephrotic'));
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(CKD_FORMS.header);
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: NCD_HEADER.agreesToFollowUp, value: YES },
        { concept: CKD_HEADER.etiology, value: CKD_HEADER.etiologies[3].value },
      ]),
    );
  });

  it('refuses a future etiology date', async () => {
    setUp();
    renderPanel('etiology');
    expect(screen.getByLabelText('Drugs (specify)')).toHaveValue('NSAIDs');
    fireEvent.change(screen.getByLabelText('Etiology: date'), { target: { value: '2099-01-01' } });
    await save();
    expect(screen.getByText('Cannot be in the future')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('asks the TB date, not the year, and hides it for a patient who never had TB', async () => {
    setUp();
    renderPanel('history');
    expect(screen.getByLabelText('TB: date')).toHaveValue('2019-04-01');
    expect(screen.queryByLabelText('TB year')).not.toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('group', { name: 'TB' })).getByLabelText('Never had TB'));
    expect(screen.queryByLabelText('TB: date')).not.toBeInTheDocument();
    await save();
    const tbDate = ckdHeader.obs.find((o) => o.concept === CKD_HEADER.tbDate);
    expect(mockSave.mock.calls[0][1].payload.void).toContain(tbDate.uuid);
  });
});
