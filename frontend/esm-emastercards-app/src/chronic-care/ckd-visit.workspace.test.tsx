import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { YES } from '../art/art-concepts';
import { type ArtEncounter, useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { MH_VISIT } from '../mental-health/mh-concepts';
import { CKD_FORMS, CKD_VISIT } from './ckd-concepts';
import { ckdHeader, ckdVisit } from './test-ckd-data';
import CkdVisitWorkspace from './ckd-visit.workspace';

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
const earlier = ckdVisit('v1', '2026-10-08', { gfr: 45, meds: [['furosemide', 40, 'OD']] });

function setUp({ header = ckdHeader as ArtEncounter, encounters = [earlier] as Array<ArtEncounter> } = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'ckd', state: 'EDIT', initialEncounterUuid: header.uuid }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: form.encounterType === CKD_FORMS.header.encounterType ? [header] : encounters,
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }));
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(useSameDayObs).mockReturnValue({ obs: {}, isLoading: false });
  vi.mocked(usePatient).mockReturnValue({ patient: { birthDate: '1980-03-12' }, patientUuid: 'p1', isLoading: false, error: null } as any);
  vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
  vi.mocked(usePatientChartStore).mockReturnValue({ visitContext: TODAY_VISIT } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel(encounterUuid?: string) {
  render(
    <CkdVisitWorkspace
      workspaceProps={{ patientUuid: 'p1', encounterUuid }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-ckd-visit-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const question = (name: string) => within(screen.getByRole('group', { name }));

describe('CkdVisitWorkspace', () => {
  it('records a new visit in the O3 visit, with what chronic-kidney-disease-visit.xml saves', async () => {
    setUp();
    renderPanel();
    expect(screen.getByText('Record chronic kidney disease visit')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/GFR/), { target: { value: '38' } });
    await userEvent.selectOptions(screen.getByLabelText('Urine protein'), '++');
    await userEvent.click(question('Confusion').getByLabelText('No'));
    await userEvent.click(question('Conjunctiva').getByLabelText('Pale'));
    await userEvent.click(question('CKD stage').getByLabelText('3'));
    await userEvent.click(question('Diet recommendations').getByLabelText('Low potassium'));
    await userEvent.click(screen.getByLabelText('Other'));
    fireEvent.change(screen.getByLabelText('Other medication: specify'), { target: { value: 'Sodium bicarbonate' } });
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(CKD_FORMS.visit);
    expect(args.visitUuid).toBe('visit-today');
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: CKD_VISIT.gfr, value: 38 },
        { concept: CKD_VISIT.urineProtein, value: CKD_VISIT.urineProteinAnswers[3].value },
        { concept: CKD_VISIT.symptoms[0].concept, value: CKD_VISIT.no },
        { concept: CKD_VISIT.conjunctiva, value: CKD_VISIT.conjunctivaAnswers[1].value },
        { concept: CKD_VISIT.ckdStage, value: CKD_VISIT.ckdStages[1].value },
        { concept: CKD_VISIT.diet, value: CKD_VISIT.diets[1].value },
        {
          concept: MH_VISIT.dispensingGroup,
          groupMembers: [
            { concept: MH_VISIT.medication, value: CKD_VISIT.medications.find((m) => m.key === 'other').drug },
            { concept: CKD_VISIT.otherMedication, value: 'Sodium bicarbonate' },
          ],
        },
      ]),
    );
  });

  it('shows a GFR that must be whole while it is typed, and refuses to save it', async () => {
    setUp();
    renderPanel();
    fireEvent.change(screen.getByLabelText(/GFR/), { target: { value: '38.5' } });
    expect(screen.getByText('Must be a whole number')).toBeInTheDocument();
    await save();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('edits a visit, voiding only what changed', async () => {
    setUp();
    renderPanel('v1');
    expect(screen.getByLabelText('Furosemide (FURO)')).toBeChecked();
    await userEvent.click(screen.getByLabelText('Furosemide (FURO)'));
    await save();
    const group = earlier.obs.find((o) => o.concept === MH_VISIT.dispensingGroup);
    expect(mockSave.mock.calls[0][1].payload).toEqual({ add: [], void: [group.uuid] });
  });
});
