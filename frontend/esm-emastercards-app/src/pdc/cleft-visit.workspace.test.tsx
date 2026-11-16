import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { CLEFT_FORMS, CLEFT_VISIT as V } from './cleft-concepts';
import { NO, YES } from './pdc-concepts';
import { cleftHeader, cleftVisit } from './test-cleft-data';
import { CONDITION_WORKSPACES } from './pdc-condition-workspaces';

const CleftVisitWorkspace = CONDITION_WORKSPACES['pdc-cleft-lip-palate'].visit;

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
const earlier = cleftVisit('v1', '2026-10-08', { earPain: true, surgery: '2026-12-01T00:00:00.000+0000' });

function setUp({ encounters = [earlier] as Array<ArtEncounter> } = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'pdc-cleft-lip-palate', state: 'EDIT', initialEncounterUuid: cleftHeader.uuid }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: form.encounterType === CLEFT_FORMS.header.encounterType ? [cleftHeader] : encounters,
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }));
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(useSameDayObs).mockReturnValue({ obs: {}, isLoading: false });
  vi.mocked(usePatient).mockReturnValue({ patient: { birthDate: '2025-03-12' }, patientUuid: 'p1', isLoading: false, error: null } as any);
  vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
  vi.mocked(usePatientChartStore).mockReturnValue({ visitContext: { uuid: 'visit-today', startDatetime: '2026-11-04T08:00:00.000+0000' } } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel(encounterUuid?: string) {
  render(
    <CleftVisitWorkspace
      workspaceProps={{ patientUuid: 'p1', encounterUuid }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-cleft-visit-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const question = (name: string) => within(screen.getByRole('group', { name }));
const concept = (list: Array<{ key: string; concept: string }>, key: string) => list.find((x) => x.key === key).concept;

const plan = (key: string) => V.plan.find((x) => x.key === key).concept;

describe('the cleft lip / palate visit panel', () => {
  it('records a visit with what cleft-lip-palate-visit.xml saves: its own plan concepts, ear pain in its set, surgery in the future', async () => {
    setUp({ encounters: [] });
    renderPanel();
    expect(screen.getByText('Record cleft lip / palate visit')).toBeInTheDocument();
    await userEvent.click(question('Heart murmur').getByLabelText('Yes'));
    await userEvent.click(question('Ear pain').getByLabelText('Yes'));
    await userEvent.click(question('Surgery scheduled').getByLabelText('Yes'));
    fireEvent.change(screen.getByLabelText('Date of surgery'), { target: { value: '2027-01-15' } });
    await userEvent.click(question('Feeding counselling').getByLabelText('Yes'));
    await userEvent.click(question('POSER').getByLabelText('No'));
    fireEvent.change(screen.getByLabelText('Plan'), { target: { value: 'Refer for repair' } });
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(CLEFT_FORMS.visit);
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: V.heartMurmur, value: YES },
        { concept: V.earGroup, groupMembers: [{ concept: concept(V.ear, 'earPain'), value: YES }] },
        { concept: V.surgeryGroup, groupMembers: [{ concept: V.surgeryScheduled, value: YES }, { concept: V.surgeryDate, value: '2027-01-15' }] },
        { concept: plan('feedingCounselling'), value: YES },
        { concept: V.poser, value: NO },
        { concept: V.planNotes, value: 'Refer for repair' },
      ]),
    );
  });

  it('edits a visit, replacing only the ear group that changed', async () => {
    setUp();
    renderPanel('v1');
    expect(question('Ear pain').getByLabelText('Yes')).toBeChecked();
    expect(screen.getByLabelText('Date of surgery')).toHaveValue('2026-12-01');
    await userEvent.click(question('Ear pain').getByLabelText('No'));
    await save();
    const pain = earlier.obs.find((o) => o.concept === V.earGroup && o.groupMembers[0].concept === concept(V.ear, 'earPain'));
    expect(mockSave.mock.calls[0][1].payload).toEqual({
      add: [{ concept: V.earGroup, groupMembers: [{ concept: concept(V.ear, 'earPain'), value: NO }] }],
      void: [pain.uuid],
    });
  });
});
