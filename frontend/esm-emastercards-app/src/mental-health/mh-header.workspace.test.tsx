import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch, usePatient, useSession } from '@openmrs/esm-framework';
import { card } from '../test-cards';
import { YES } from '../art/art-concepts';
import { useCardEncounters, useEMastercard, useLocationsTagged } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { CURRENT, EXPOSURE, MH_FORMS, MH_HEADER } from './mh-concepts';
import { mhHeader } from './test-mh-data';
import MhHeaderWorkspace from './mh-header.workspace';

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

const mockSave = vi.mocked(saveEncounter);

function setUp({ state = 'EDIT' as 'CREATE' | 'EDIT' | 'VIEW' | 'UNAVAILABLE', header = mhHeader as typeof mhHeader | null } = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'mental-health', state, initialEncounterUuid: header?.uuid ?? null, message: state === 'UNAVAILABLE' ? 'Multiple forms found' : null }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockReturnValue({ encounters: header ? [header] : [], isLoading: false, error: undefined, mutate: vi.fn() });
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(usePatient).mockReturnValue({ patient: { gender: 'female' }, patientUuid: 'p1', isLoading: false, error: null } as any);
  vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
  vi.mocked(openmrsFetch).mockResolvedValue({ data: { results: [] } } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel(section: 'start' | 'patientGuardian' | 'diagnoses' | 'presentingFeatures' | 'historyExposures') {
  render(
    <MhHeaderWorkspace
      workspaceProps={{ patientUuid: 'p1', section }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-mh-header-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));

describe('MhHeaderWorkspace', () => {
  it('start panel asks follow-up and diagnoses, and creates the header', async () => {
    setUp({ state: 'CREATE', header: null });
    renderPanel('start');
    expect(screen.queryByLabelText('Guardian name')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Schizophrenia'));
    fireEvent.change(screen.getByLabelText('Schizophrenia date'), { target: { value: '2025-03-12' } });
    await userEvent.click(screen.getByLabelText('Yes'));
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(MH_FORMS.header);
    expect(args.encounterUuid).toBeUndefined();
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: MH_HEADER.agreesToFollowUp, value: YES },
        {
          concept: MH_HEADER.diagnosisGroup,
          groupMembers: [
            { concept: MH_HEADER.diagnosis, value: MH_HEADER.diagnoses[0].answer },
            { concept: MH_HEADER.diagnosisDate, value: '2025-03-12' },
          ],
        },
      ]),
    );
  });

  it('any section opens the start panel while there is no header', () => {
    setUp({ state: 'CREATE', header: null });
    renderPanel('historyExposures');
    expect(screen.getByLabelText('Schizophrenia')).toBeInTheDocument();
    expect(screen.queryByText('Family history: epilepsy')).not.toBeInTheDocument();
  });

  it('start panel refuses without a diagnosis', async () => {
    setUp({ state: 'CREATE', header: null });
    renderPanel('start');
    await userEvent.click(screen.getByLabelText('Yes'));
    await save();
    expect(screen.getByText('Must enter at least one diagnosis!')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('a ticked diagnosis without a date is refused', async () => {
    setUp();
    renderPanel('diagnoses');
    await userEvent.click(screen.getByLabelText('Anxiety disorder'));
    await save();
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('editing History and exposures never voids a diagnosis', async () => {
    setUp();
    renderPanel('historyExposures');
    await userEvent.click(screen.getAllByLabelText('Current')[0]);
    await save();
    const [, args] = mockSave.mock.calls[0];
    const alcoholGroup = mhHeader.obs.find((o) => o.concept === EXPOSURE.alcoholGroup);
    expect(args.encounterUuid).toBe(mhHeader.uuid);
    expect(args.payload.void).toEqual([alcoholGroup.uuid]);
    expect(args.payload.add).toEqual([{ concept: EXPOSURE.alcoholGroup, groupMembers: [{ concept: EXPOSURE.alcoholHistory, value: CURRENT }] }]);
  });

  it('an older header without a diagnosis can still save Patient and guardian', async () => {
    setUp({ header: { ...mhHeader, obs: mhHeader.obs.filter((o) => o.concept !== MH_HEADER.diagnosisGroup) } });
    renderPanel('patientGuardian');
    fireEvent.change(screen.getByLabelText('Guardian phone'), { target: { value: '0999' } });
    await save();
    expect(screen.queryByText('Must enter at least one diagnosis!')).not.toBeInTheDocument();
    expect(mockSave.mock.calls[0][1].payload.add).toEqual([{ concept: MH_HEADER.guardianPhone, value: '0999' }]);
  });

  it('agrees to follow-up is required in Patient and guardian', async () => {
    setUp({ header: { ...mhHeader, obs: mhHeader.obs.filter((o) => o.concept !== MH_HEADER.agreesToFollowUp) } });
    renderPanel('patientGuardian');
    await save();
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('the Other presenting feature takes its specify text as the comment', async () => {
    setUp();
    renderPanel('presentingFeatures');
    await userEvent.click(screen.getByLabelText('Other'));
    fireEvent.change(screen.getByLabelText('Other date'), { target: { value: '2025-03-01' } });
    fireEvent.change(screen.getByLabelText('Specify'), { target: { value: 'insomnia' } });
    await save();
    const group = mockSave.mock.calls[0][1].payload.add[0];
    expect(group.groupMembers[0]).toEqual({ concept: MH_HEADER.presentingFeature, value: MH_HEADER.presentingFeatures[5].answer, comment: 'insomnia' });
  });

  it('refuses when UNAVAILABLE', () => {
    setUp({ state: 'UNAVAILABLE' });
    renderPanel('diagnoses');
    expect(screen.getByText('Multiple forms found')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save and close' })).not.toBeInTheDocument();
  });

  it('read-only in VIEW', () => {
    setUp({ state: 'VIEW' });
    renderPanel('patientGuardian');
    expect(screen.queryByRole('button', { name: 'Save and close' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Guardian name')).toHaveAttribute('readonly');
  });
});
