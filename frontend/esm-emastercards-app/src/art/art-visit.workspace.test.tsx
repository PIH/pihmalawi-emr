import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { ART_VISIT } from './art-concepts';
import { type ArtEncounter, useArtCard, useArtEncounters, useLocationsTagged, useSameDayObs } from './art.resource';
import { saveArtEncounter } from './obs-diff';
import { regimen, visits } from './test-art-data';
import ArtVisitWorkspace from './art-visit.workspace';

vi.mock('./art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./art.resource')>()),
  useArtCard: vi.fn(),
  useArtEncounters: vi.fn(),
  useLocationsTagged: vi.fn(),
  useSameDayObs: vi.fn(),
}));
vi.mock('./obs-diff', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./obs-diff')>()),
  saveArtEncounter: vi.fn(),
}));
vi.mock('@openmrs/esm-patient-common-lib', () => ({ usePatientChartStore: vi.fn() }));

const mockSave = vi.mocked(saveArtEncounter);
const TODAY_VISIT = { uuid: 'visit-today', startDatetime: '2026-11-04T08:00:00.000+0000' };

function setUp({
  state = 'EDIT' as 'CREATE' | 'EDIT' | 'VIEW' | 'UNAVAILABLE',
  gender = 'female',
  encounters = visits,
  sameDay = {} as Record<string, Array<{ value: unknown; obsDatetime: string; encounterUuid: string }>>,
} = {}) {
  vi.mocked(useArtCard).mockReturnValue({ card: card({ state }), systemLocationsTag: 'Upper Neno', isLoading: false, error: undefined });
  vi.mocked(useArtEncounters).mockReturnValue({ encounters, isLoading: false, error: undefined, mutate: vi.fn() });
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(useSameDayObs).mockReturnValue({ obs: sameDay as any, isLoading: false });
  vi.mocked(usePatient).mockReturnValue({
    patient: { gender, birthDate: '1992-03-12' },
    patientUuid: 'p1',
    isLoading: false,
    error: null,
  } as any);
  vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
  vi.mocked(usePatientChartStore).mockReturnValue({ visitContext: TODAY_VISIT } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel(encounterUuid?: string, closeWorkspace = vi.fn()) {
  render(
    <ArtVisitWorkspace
      workspaceProps={{ patientUuid: 'p1', encounterUuid }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={closeWorkspace}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-art-visit-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
  return closeWorkspace;
}

async function fillRequired(regimenLabel = '13A') {
  await userEvent.selectOptions(screen.getByLabelText('ART regimen *'), regimenLabel);
  fireEvent.change(screen.getByLabelText('ARVs given (tablets) *'), { target: { value: '90' } });
  fireEvent.change(screen.getByLabelText('Next appointment *'), { target: { value: '2027-02-03' } });
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));

describe('ArtVisitWorkspace', () => {
  it('shows pregnant/breastfeeding only for female patients', () => {
    setUp({ gender: 'female' });
    renderPanel();
    expect(screen.getByText('Pregnant / breastfeeding')).toBeInTheDocument();
  });

  it('hides pregnant/breastfeeding for male patients', () => {
    setUp({ gender: 'male' });
    renderPanel();
    expect(screen.queryByText('Pregnant / breastfeeding')).not.toBeInTheDocument();
  });

  it('prefills height and weight from same-day vitals and allows override; BP read-only when a same-day value exists', () => {
    setUp({
      sameDay: {
        [ART_VISIT.weight]: [{ value: 61, obsDatetime: '2026-11-04T08:10:00.000+0000', encounterUuid: 'vitals' }],
        [ART_VISIT.systolicBp]: [{ value: 128, obsDatetime: '2026-11-04T08:10:00.000+0000', encounterUuid: 'vitals' }],
      },
    });
    renderPanel();
    const weight = screen.getByLabelText('Weight');
    expect(weight).toHaveValue(61);
    expect(weight).not.toHaveAttribute('readonly');
    const systolic = screen.getByLabelText('Systolic BP');
    expect(systolic).toHaveValue(128);
    expect(systolic).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Diastolic BP')).not.toHaveAttribute('readonly');
  });

  it('saves nothing for an unchanged same-day vital', async () => {
    setUp({
      encounters: [],
      sameDay: { [ART_VISIT.weight]: [{ value: 61, obsDatetime: '2026-11-04T08:10:00.000+0000', encounterUuid: 'vitals' }] },
    });
    renderPanel();
    await fillRequired();
    await save();
    const { payload } = mockSave.mock.calls[0][1];
    expect(payload.add.map((o) => o.concept)).not.toContain(ART_VISIT.weight);
  });

  it('blocks save without regimen, ARVs given or next appointment', async () => {
    setUp();
    renderPanel();
    await save();
    expect(mockSave).not.toHaveBeenCalled();
    expect(screen.getAllByText('Required')).toHaveLength(3);
  });

  it('warns on a changed regimen but saves', async () => {
    setUp();
    const close = renderPanel();
    await fillRequired('14A');
    expect(screen.getByText('Regimen is different from regimen at last visit')).toBeInTheDocument();
    await save();
    expect(mockSave).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  it('blocks a regimen given earlier but not last', async () => {
    setUp();
    renderPanel();
    await fillRequired('5A');
    await save();
    expect(screen.getByText('Regimen has been recorded in the past( Mon Jan 10 2022 ) but not on the last visit')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('blocks a second ART visit on the same day', async () => {
    const today = { ...visits[0], uuid: 'today', encounterDatetime: '2026-11-04T09:00:00.000+0000' } as ArtEncounter;
    setUp({ encounters: [today, ...visits] });
    renderPanel();
    await fillRequired();
    await save();
    expect(screen.getByText('Please check the mastercard! This is a duplicate encounter')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('saves CPT/IPT as five groups with pill counts', async () => {
    setUp();
    renderPanel();
    await fillRequired();
    const cptIpt = within(screen.getByRole('group', { name: 'CPT/IPT given' }));
    await userEvent.click(cptIpt.getByLabelText('CTX 960'));
    fireEvent.change(cptIpt.getByLabelText('CTX 960 pills'), { target: { value: '90' } });
    await userEvent.click(cptIpt.getByLabelText('INH 300'));
    fireEvent.change(cptIpt.getByLabelText('INH 300 pills'), { target: { value: '30' } });
    expect(cptIpt.getAllByRole('checkbox')).toHaveLength(5);
    await save();
    const groups = mockSave.mock.calls[0][1].payload.add.filter((o) => o.concept === ART_VISIT.preventiveTherapyGroup);
    expect(groups).toEqual([
      {
        concept: ART_VISIT.preventiveTherapyGroup,
        groupMembers: [
          { concept: ART_VISIT.preventiveTherapyStatus, value: ART_VISIT.preventiveTherapies.ctx },
          { concept: ART_VISIT.preventiveTherapyPills, value: 90 },
        ],
      },
      {
        concept: ART_VISIT.preventiveTherapyGroup,
        groupMembers: [
          { concept: ART_VISIT.preventiveTherapyStatus, value: ART_VISIT.preventiveTherapies.inh },
          { concept: ART_VISIT.preventiveTherapyPills, value: 30 },
        ],
      },
    ]);
  });

  it('prefills next appointment from another same-day encounter', () => {
    setUp({
      sameDay: {
        [ART_VISIT.nextAppointment]: [
          { value: '2027-02-03T00:00:00.000+0000', obsDatetime: '2026-11-04T08:30:00.000+0000', encounterUuid: 'ncd' },
        ],
      },
    });
    renderPanel();
    expect(screen.getByLabelText('Next appointment *')).toHaveValue('2027-02-03');
  });

  it('shows adherence but does not save it', async () => {
    setUp();
    renderPanel();
    await fillRequired();
    fireEvent.change(screen.getByLabelText('Pill count'), { target: { value: '4' } });
    // 90 given on 05-Aug-2026, 4 left 91 days later: 86 of 91 taken
    expect(screen.getByText('Adherence: 95%')).toBeInTheDocument();
    await save();
    const concepts = mockSave.mock.calls[0][1].payload.add.map((o) => o.concept);
    expect(concepts).toContain(ART_VISIT.pillCount);
    expect(concepts).toHaveLength(new Set(concepts).size);
  });

  it("edit mode loads the encounter's values and saves only changes", async () => {
    setUp();
    renderPanel('v3');
    expect(screen.getByLabelText('ART regimen *')).toHaveValue(regimen('13A'));
    expect(screen.getByLabelText('Pill count')).toHaveValue(4);
    fireEvent.change(screen.getByLabelText('Pill count'), { target: { value: '5' } });
    await save();
    const [kind, args] = mockSave.mock.calls[0];
    expect(kind).toBe('visit');
    expect(args.encounterUuid).toBe('v3');
    expect(args.datetime).toBe(visits[0].encounterDatetime);
    const oldPills = visits[0].obs.find((o) => o.concept === ART_VISIT.pillCount);
    expect(args.payload).toEqual({ add: [{ concept: ART_VISIT.pillCount, value: 5 }], void: [oldPills.uuid] });
  });

  it('is read-only when the card is VIEW', () => {
    setUp({ state: 'VIEW' });
    renderPanel('v3');
    expect(screen.queryByRole('button', { name: 'Save and close' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Pill count')).toHaveAttribute('readonly');
  });

  it('saves a new visit in the O3 visit, at its start', async () => {
    setUp();
    renderPanel();
    await fillRequired();
    await save();
    expect(mockSave.mock.calls[0][1]).toMatchObject({
      patientUuid: 'p1',
      visitUuid: 'visit-today',
      datetime: TODAY_VISIT.startDatetime,
      locationUuid: 'neno-dh',
    });
  });
});
