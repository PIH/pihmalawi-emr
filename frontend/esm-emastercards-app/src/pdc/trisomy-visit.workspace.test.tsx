import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { TRISOMY_FORMS, TRISOMY_MODERATE_MALNUTRITION, TRISOMY_VISIT as V } from './trisomy-concepts';
import { YES } from './pdc-concepts';
import { trisomyHeader, trisomyVisit } from './test-trisomy-data';
import { CONDITION_WORKSPACES } from './pdc-condition-workspaces';

const TrisomyVisitWorkspace = CONDITION_WORKSPACES['pdc-trisomy'].visit;

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
const earlier = trisomyVisit('v1', '2026-10-08', { apnoea: true });

function setUp({ encounters = [earlier] as Array<ArtEncounter> } = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'pdc-trisomy', state: 'EDIT', initialEncounterUuid: trisomyHeader.uuid }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: form.encounterType === TRISOMY_FORMS.header.encounterType ? [trisomyHeader] : encounters,
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
    <TrisomyVisitWorkspace
      workspaceProps={{ patientUuid: 'p1', encounterUuid }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-trisomy-visit-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const question = (name: string) => within(screen.getByRole('group', { name }));
const concept = (list: Array<{ key: string; concept: string }>, key: string) => list.find((x) => x.key === key).concept;

describe('the trisomy 21 visit panel', () => {
  it('records a visit with what pdc-trisomy-21-visit.xml saves: its moderate malnutrition, and ear and extremities pain each in its own set', async () => {
    setUp();
    renderPanel();
    expect(screen.getByText('Record trisomy 21 visit')).toBeInTheDocument();
    await userEvent.click(question('Malnutrition').getByLabelText('Moderate'));
    await userEvent.click(question('Ear pain').getByLabelText('Yes'));
    await userEvent.click(question('Extremities pain').getByLabelText('No'));
    await userEvent.click(question('Vomiting').getByLabelText('Yes'));
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(TRISOMY_FORMS.visit);
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: V.malnutrition, value: TRISOMY_MODERATE_MALNUTRITION },
        { concept: V.earGroup, groupMembers: [{ concept: concept(V.ear, 'earPain'), value: YES }] },
        { concept: V.extremitiesGroup, groupMembers: [{ concept: concept(V.extremities, 'extremitiesPain'), value: V.no }] },
        { concept: V.vomiting, value: YES },
      ]),
    );
  });

  it('edits a visit, replacing only the sleep group that changed', async () => {
    setUp();
    renderPanel('v1');
    expect(question('Apnoea').getByLabelText('Yes')).toBeChecked();
    await userEvent.click(question('Apnoea').getByLabelText('No'));
    await save();
    const apnoea = earlier.obs.find((o) => o.concept === V.sleepGroup && o.groupMembers[0].concept === concept(V.sleep, 'apnoea'));
    expect(mockSave.mock.calls[0][1].payload).toEqual({
      add: [{ concept: V.sleepGroup, groupMembers: [{ concept: concept(V.sleep, 'apnoea'), value: V.no }] }],
      void: [apnoea.uuid],
    });
  });
});
