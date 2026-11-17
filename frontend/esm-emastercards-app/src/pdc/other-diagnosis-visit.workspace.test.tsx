import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { OTHER_DIAGNOSIS_FORMS, OTHER_DIAGNOSIS_VISIT as V } from './other-diagnosis-concepts';
import { HIE_VISIT } from './hie-concepts';
import { TRISOMY_MODERATE_MALNUTRITION } from './trisomy-concepts';
import { NO, YES } from './pdc-concepts';
import { otherDiagnosisHeader, otherDiagnosisVisit } from './test-other-diagnosis-data';
import { CONDITION_WORKSPACES } from './pdc-condition-workspaces';

const OtherDiagnosisVisitWorkspace = CONDITION_WORKSPACES['pdc-other-diagnosis'].visit;

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
const earlier = otherDiagnosisVisit('v1', '2026-10-08', { convulsions: true });

function setUp({ encounters = [earlier] as Array<ArtEncounter> } = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'pdc-other-diagnosis', state: 'EDIT', initialEncounterUuid: otherDiagnosisHeader.uuid }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: form.encounterType === OTHER_DIAGNOSIS_FORMS.header.encounterType ? [otherDiagnosisHeader] : encounters,
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
    <OtherDiagnosisVisitWorkspace
      workspaceProps={{ patientUuid: 'p1', encounterUuid }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-other-diagnosis-visit-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const question = (name: string) => within(screen.getByRole('group', { name }));
const concept = (list: Array<{ key: string; concept: string }>, key: string) => list.find((x) => x.key === key).concept;


describe('the other diagnosis visit panel', () => {
  it('records a visit with what other-diagnosis-visit.xml saves: ages, head circumference, convulsions, feeding concerns, group counselling', async () => {
    setUp({ encounters: [] });
    renderPanel();
    expect(screen.getByText('Record other diagnosis visit')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Age adjusted'), { target: { value: '16' } });
    fireEvent.change(screen.getByLabelText(/Head circumference/), { target: { value: '45' } });
    await userEvent.click(question('Malnutrition').getByLabelText('Moderate'));
    await userEvent.click(question('Complications since last visit').getByLabelText('No'));
    await userEvent.click(question('Convulsions since last visit').getByLabelText('Yes'));
    await userEvent.click(question('Poor suck').getByLabelText('Yes'));
    await userEvent.click(question('Group counselling').getByLabelText('Yes'));
    await userEvent.click(question('POSER').getByLabelText('No'));
    fireEvent.change(screen.getByLabelText('Plan'), { target: { value: 'Refer to physio' } });
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(OTHER_DIAGNOSIS_FORMS.visit);
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: V.ageAdjusted, value: 16 },
        { concept: V.headCircumference, value: 45 },
        { concept: HIE_VISIT.malnutrition, value: TRISOMY_MODERATE_MALNUTRITION },
        { concept: V.complicationsSinceLastVisit, value: NO },
        { concept: V.convulsionsSinceLastVisit, value: YES },
        { concept: concept(V.feedingConcerns, 'poorSuck'), value: YES },
        { concept: V.groupCounselling, value: YES },
        { concept: concept(HIE_VISIT.plan, 'referredToPoser'), value: NO },
        { concept: V.planNotes, value: 'Refer to physio' },
      ]),
    );
  });

  it('edits a visit, replacing only the answer that changed', async () => {
    setUp();
    renderPanel('v1');
    expect(question('Convulsions since last visit').getByLabelText('Yes')).toBeChecked();
    expect(screen.getByLabelText('Drug and dose')).toHaveValue('Phenobarbitone 15 mg BD');
    await userEvent.click(question('Convulsions since last visit').getByLabelText('No'));
    await save();
    const old = earlier.obs.find((o) => o.concept === V.convulsionsSinceLastVisit);
    expect(mockSave.mock.calls[0][1].payload).toEqual({ add: [{ concept: V.convulsionsSinceLastVisit, value: NO }], void: [old.uuid] });
  });
});
