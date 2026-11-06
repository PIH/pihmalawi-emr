import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch, usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { YES } from '../art/art-concepts';
import { type ArtEncounter, useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { MH_VISIT } from '../mental-health/mh-concepts';
import { EP_FORMS, EP_VISIT, TRIGGERS } from './ep-concepts';
import { epVisit } from './test-ep-data';
import EpVisitWorkspace from './ep-visit.workspace';

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
const TODAY_VISIT = { uuid: 'visit-today', startDatetime: '2026-11-04T08:00:00.000+0000' };
const earlier = epVisit('v1', '2026-10-08', { seizures: true, count: 2, triggers: ['fever'], meds: [['cbz', 200, 'BID']] });

function setUp({
  state = 'EDIT' as 'CREATE' | 'EDIT' | 'VIEW',
  encounters = [earlier] as Array<ArtEncounter>,
  sameDay = {} as Record<string, Array<{ value: unknown; obsDatetime: string; encounterUuid: string }>>,
} = {}) {
  vi.mocked(useEMastercard).mockReturnValue({ card: card({ key: 'epilepsy', state }), systemLocationsTag: 'Upper Neno', isLoading: false, error: undefined });
  vi.mocked(useCardEncounters).mockReturnValue({ encounters, isLoading: false, error: undefined, mutate: vi.fn() });
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(useSameDayObs).mockReturnValue({ obs: sameDay as any, isLoading: false });
  vi.mocked(usePatient).mockReturnValue({ patient: { gender: 'female', birthDate: '1992-03-12' }, patientUuid: 'p1', isLoading: false, error: null } as any);
  vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
  vi.mocked(usePatientChartStore).mockReturnValue({ visitContext: TODAY_VISIT } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel(encounterUuid?: string) {
  render(
    <EpVisitWorkspace
      workspaceProps={{ patientUuid: 'p1', encounterUuid }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-ep-visit-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const question = (name: string) => within(screen.getByRole('group', { name }));

describe('EpVisitWorkspace', () => {
  it('records a new visit in the O3 visit, with what epilepsy-visit.xml saves', async () => {
    setUp();
    renderPanel();
    await userEvent.click(question('Seizures since last visit').getByLabelText('Yes'));
    fireEvent.change(screen.getByLabelText('Number of seizures'), { target: { value: '3' } });
    await userEvent.click(screen.getByLabelText('Sleep deprivation'));
    await userEvent.click(screen.getByLabelText('Tongue biting'));
    await userEvent.click(screen.getByLabelText('Carbamazepine (CBZ)'));
    fireEvent.change(screen.getByLabelText('Carbamazepine (CBZ) dose'), { target: { value: '200' } });
    await userEvent.selectOptions(screen.getByLabelText('Carbamazepine (CBZ) frequency'), 'BID');
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(EP_FORMS.visit);
    expect(args.visitUuid).toBe('visit-today');
    expect(args.encounterUuid).toBeUndefined();
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: EP_VISIT.anySeizures, value: YES },
        { concept: EP_VISIT.numberOfSeizures, value: 3 },
        { concept: EP_VISIT.trigger, value: TRIGGERS.find((tr) => tr.key === 'sleep').answer },
        { concept: EP_VISIT.silentMarker, value: EP_VISIT.silentMarkers[0].value },
        {
          concept: MH_VISIT.dispensingGroup,
          groupMembers: [
            { concept: MH_VISIT.medication, value: EP_VISIT.medications[0].drug },
            { concept: MH_VISIT.dose, value: 200 },
            { concept: MH_VISIT.frequency, value: MH_VISIT.frequencies[1].value },
          ],
        },
      ]),
    );
  });

  it('the next appointment is not required, but prefilled from the same day', async () => {
    setUp({
      sameDay: { [EP_VISIT.nextAppointment]: [{ value: '2026-12-02T00:00:00.000+0000', obsDatetime: TODAY_VISIT.startDatetime, encounterUuid: 'mh-visit' }] },
    });
    renderPanel();
    expect(screen.getByLabelText('Next appointment')).toHaveValue('2026-12-02');
    fireEvent.change(screen.getByLabelText('Next appointment'), { target: { value: '' } });
    await save();
    expect(mockSave).toHaveBeenCalled();
  });

  it('edits a visit, voiding only what changed', async () => {
    setUp();
    renderPanel('v1');
    expect(screen.getByLabelText('Fever')).toBeChecked();
    await userEvent.click(screen.getByLabelText('Fever'));
    await save();
    const fever = earlier.obs.find((o) => o.concept === EP_VISIT.trigger);
    expect(mockSave.mock.calls[0][1].encounterUuid).toBe('v1');
    expect(mockSave.mock.calls[0][1].payload).toEqual({ add: [], void: [fever.uuid] });
  });

  it('refuses a second visit on the same day', async () => {
    setUp({ encounters: [epVisit('v2', '2026-11-04')] });
    renderPanel();
    await save();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('enters a past visit on an earlier day, in the visit of that day', async () => {
    setUp();
    vi.mocked(openmrsFetch).mockResolvedValueOnce({
      data: { results: [{ uuid: 'visit-oct', startDatetime: '2026-10-20T09:00:00.000+0000', stopDatetime: '2026-10-20T15:00:00.000+0000' }] },
    } as any);
    renderPanel();
    expect(screen.getByText('Recorded in the current visit. Choose an earlier date to enter a past visit.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Visit date'), { target: { value: '2026-10-20' } });
    expect(screen.getByText('Entered as a past visit on this date.')).toBeInTheDocument();
    await save();
    expect(mockSave.mock.calls[0][1].visitUuid).toBe('visit-oct');
    expect(mockSave.mock.calls[0][1].datetime).toContain('2026-10-20');
  });

  it('refuses a past visit on a day that already has one', async () => {
    setUp();
    renderPanel();
    fireEvent.change(screen.getByLabelText('Visit date'), { target: { value: '2026-10-08' } });
    await save();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('refuses a visit date in the future', async () => {
    setUp();
    renderPanel();
    fireEvent.change(screen.getByLabelText('Visit date'), { target: { value: '2099-01-01' } });
    await save();
    expect(screen.getByText('Cannot be in the future')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('an edited visit keeps its date', () => {
    setUp();
    renderPanel('v1');
    expect(screen.getByLabelText('Visit date')).toHaveValue('08-Oct-2026');
    expect(screen.getByLabelText('Visit date')).toHaveAttribute('readonly');
  });

  it('is read-only until the card is started', () => {
    setUp({ state: 'CREATE' });
    renderPanel();
    expect(screen.queryByRole('button', { name: 'Save and close' })).not.toBeInTheDocument();
  });
});
