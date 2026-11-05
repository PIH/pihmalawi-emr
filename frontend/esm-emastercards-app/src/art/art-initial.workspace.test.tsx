import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch, usePatient, useSession } from '@openmrs/esm-framework';
import { card } from '../test-cards';
import { ART_INITIAL, YES } from './art-concepts';
import { useArtCard, useArtEncounters, useLocationsTagged, useSameDayObs } from './art.resource';
import { saveArtEncounter } from './obs-diff';
import { initial } from './test-art-data';
import { useCarriedPatientGuardian } from '../shared/patient-guardian';
import ArtInitialWorkspace from './art-initial.workspace';

vi.mock('../shared/patient-guardian', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../shared/patient-guardian')>()),
  useCarriedPatientGuardian: vi.fn(),
}));

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

const mockSave = vi.mocked(saveArtEncounter);

function setUp({ state = 'EDIT' as 'CREATE' | 'EDIT' | 'VIEW' | 'UNAVAILABLE', withHeader = true, gender = 'female', sameDay = {}, carried = {} } = {}) {
  vi.mocked(useCarriedPatientGuardian).mockReturnValue({ carried, isLoading: false });
  vi.mocked(useArtCard).mockReturnValue({
    card: card({ state, initialEncounterUuid: withHeader ? initial.uuid : null, message: state === 'UNAVAILABLE' ? 'Multiple ART eMastercard forms found' : null }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useArtEncounters).mockReturnValue({ encounters: withHeader ? [initial] : [], isLoading: false, error: undefined, mutate: vi.fn() });
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(useSameDayObs).mockReturnValue({ obs: sameDay as any, isLoading: false });
  vi.mocked(usePatient).mockReturnValue({ patient: { gender, birthDate: '1992-03-12' }, patientUuid: 'p1', isLoading: false, error: null } as any);
  vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
  vi.mocked(openmrsFetch).mockResolvedValue({
    data: { results: [{ personA: { display: 'Test Chw' }, relationshipType: { uuid: ART_INITIAL.chwRelationshipType } }] },
  } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel(section: 'status' | 'confirmatoryTest' | 'patientGuardian' | 'regimens') {
  render(
    <ArtInitialWorkspace
      workspaceProps={{ patientUuid: 'p1', section }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-art-initial-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));

describe('ArtInitialWorkspace', () => {
  it('each section shows only its fields', () => {
    setUp();
    renderPanel('confirmatoryTest');
    expect(screen.getByLabelText('Link ID / HTC serial no.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Guardian name')).not.toBeInTheDocument();
    expect(screen.queryByText('WHO stage')).not.toBeInTheDocument();
  });

  it("fills in patient and guardian from the patient's other cards", () => {
    setUp({ state: 'CREATE', withHeader: false, carried: { guardianName: { value: 'Mh Guardian', from: 'Mental Health eMastercard' } } });
    renderPanel('patientGuardian');
    expect(screen.getByLabelText('Guardian name')).toHaveValue('Mh Guardian');
    expect(screen.getByText('Patient and guardian details were filled in from Mental Health eMastercard. Check them, then save.')).toBeInTheDocument();
  });

  it("starting the card from another section also saves the other cards' patient and guardian details", async () => {
    setUp({
      state: 'CREATE',
      withHeader: false,
      carried: {
        patientPhone: { value: 888123456, from: 'Mental Health eMastercard' },
        guardianName: { value: 'Mh Guardian', from: 'Mental Health eMastercard' },
      },
    });
    renderPanel('confirmatoryTest');
    expect(
      screen.getByText('Patient and guardian details from Mental Health eMastercard will be saved with this card: Patient phone, Guardian name.'),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Link ID / HTC serial no.'), { target: { value: 'HTC-1' } });
    await save();
    expect(mockSave.mock.calls[0][1].payload.add).toEqual(
      expect.arrayContaining([
        { concept: ART_INITIAL.linkId, value: 'HTC-1' },
        { concept: ART_INITIAL.patientPhone, value: '888123456' },
        { concept: ART_INITIAL.guardianName, value: 'Mh Guardian' },
      ]),
    );
  });

  it("never overwrites the card's own patient and guardian answers", () => {
    setUp({ carried: { guardianName: { value: 'Mh Guardian', from: 'Mental Health eMastercard' } } });
    renderPanel('patientGuardian');
    expect(screen.getByLabelText('Guardian name')).toHaveValue('Test Guardian');
  });

  it("saving a section never voids another section's obs", async () => {
    setUp();
    renderPanel('confirmatoryTest');
    fireEvent.change(screen.getByLabelText('Link ID / HTC serial no.'), { target: { value: 'HTC-1' } });
    await save();
    const [kind, args] = mockSave.mock.calls[0];
    expect(kind).toBe('initial');
    expect(args.encounterUuid).toBe(initial.uuid);
    expect(args.payload).toEqual({ add: [{ concept: ART_INITIAL.linkId, value: 'HTC-1' }], void: [] });
  });

  it('creates the initial encounter when none exists, dated today at the session location', async () => {
    setUp({ state: 'CREATE', withHeader: false });
    renderPanel('status');
    await userEvent.click(screen.getByLabelText('Stage 3'));
    await save();
    const [, args] = mockSave.mock.calls[0];
    expect(args.encounterUuid).toBeUndefined();
    expect(args.visitUuid).toBeUndefined();
    expect(args.datetime).toBe(new Date().toISOString().slice(0, 10));
    expect(args.locationUuid).toBe('neno-dh');
    expect(args.payload.add).toEqual([{ concept: ART_INITIAL.whoStage, value: ART_INITIAL.whoStageAnswers.stage3 }]);
  });

  it('agrees to follow-up is required only in patientGuardian', async () => {
    setUp({ state: 'CREATE', withHeader: false });
    renderPanel('patientGuardian');
    await save();
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
    await userEvent.click(screen.getByLabelText('Yes'));
    await save();
    expect(mockSave.mock.calls[0][1].payload.add).toContainEqual({ concept: ART_INITIAL.agreesToFollowUp, value: YES });
  });

  it('height and weight are read-only when a same-day value exists', () => {
    setUp({
      sameDay: { [ART_INITIAL.height]: [{ value: 162, obsDatetime: '2019-02-18T08:00:00.000+0000', encounterUuid: 'vitals' }] },
    });
    renderPanel('status');
    expect(screen.getByLabelText('Height')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Height')).toHaveValue(162);
    expect(screen.getByLabelText('Weight')).not.toHaveAttribute('readonly');
  });

  it('shows pregnant/breastfeeding only for female patients', () => {
    setUp({ gender: 'male' });
    renderPanel('status');
    expect(screen.queryByText('Pregnant / breastfeeding')).not.toBeInTheDocument();
  });

  it('regimens offers the 44 options with start dates', () => {
    setUp();
    renderPanel('regimens');
    const firstLine = screen.getByLabelText('First line');
    expect(firstLine.querySelectorAll('option')).toHaveLength(45);
    expect(screen.getByLabelText('First line start date')).toHaveValue('2019-02-18');
    expect(screen.getByLabelText('Second line')).toBeInTheDocument();
  });

  it('refuses to open when the card is UNAVAILABLE', () => {
    setUp({ state: 'UNAVAILABLE' });
    renderPanel('status');
    expect(screen.getByText('Multiple ART eMastercard forms found')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save and close' })).not.toBeInTheDocument();
  });

  it('is read-only when the card is VIEW', () => {
    setUp({ state: 'VIEW' });
    renderPanel('confirmatoryTest');
    expect(screen.queryByRole('button', { name: 'Save and close' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Link ID / HTC serial no.')).toHaveAttribute('readonly');
  });

  it('CHW is read-only from the relationship', async () => {
    setUp();
    renderPanel('patientGuardian');
    expect(await screen.findByText('Test Chw')).toBeInTheDocument();
  });

  it('demographics link to registration edit', () => {
    setUp();
    renderPanel('patientGuardian');
    expect(screen.getByRole('link', { name: /Edit name, address and other details/ })).toHaveAttribute(
      'href',
      expect.stringContaining('patient/p1/edit'),
    );
  });

  it('refuses dates in the future where the form does', async () => {
    setUp();
    renderPanel('status');
    fireEvent.change(screen.getByLabelText('CD4 date'), { target: { value: '2099-01-01' } });
    await save();
    expect(screen.getByText('Cannot be in the future')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('edits the one header there is even when the card does not name it yet', async () => {
    setUp({ state: 'CREATE' });
    vi.mocked(useArtCard).mockReturnValue({ card: card({ state: 'CREATE', initialEncounterUuid: null }), systemLocationsTag: 'Upper Neno', isLoading: false, error: undefined });
    renderPanel('confirmatoryTest');
    fireEvent.change(screen.getByLabelText('Link ID / HTC serial no.'), { target: { value: 'HTC-2' } });
    await save();
    expect(mockSave.mock.calls[0][1].encounterUuid).toBe(initial.uuid);
  });
});
