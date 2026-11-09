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
import { CVD_FORMS, CVD_VISIT } from './cvd-concepts';
import { cvdHeader, cvdVisit } from './test-cvd-data';
import CvdVisitWorkspace from './cvd-visit.workspace';

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
const earlier = cvdVisit('v1', '2026-10-08', { nyha: 1, meds: [['furosemide', 40, 'OD']] });

function setUp({ header = cvdHeader as ArtEncounter, encounters = [earlier] as Array<ArtEncounter> } = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'chf', state: 'EDIT', initialEncounterUuid: header.uuid }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: form.encounterType === CVD_FORMS.header.encounterType ? [header] : encounters,
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
    <CvdVisitWorkspace
      workspaceProps={{ patientUuid: 'p1', encounterUuid }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-cvd-visit-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const question = (name: string) => within(screen.getByRole('group', { name }));

describe('CvdVisitWorkspace', () => {
  it('records a new visit in the O3 visit, with what cardiac-and-vascular-disease-visit.xml saves', async () => {
    setUp();
    renderPanel();
    fireEvent.change(screen.getByLabelText(/Heart rate/), { target: { value: '88' } });
    await userEvent.click(question('Orthopnea').getByLabelText('Increase'));
    await userEvent.click(question('Oedema').getByLabelText('Lower extremities'));
    await userEvent.click(question('NYHA class').getByLabelText('III'));
    await userEvent.click(question('Mental health referral').getByLabelText('Yes'));
    await userEvent.click(screen.getByLabelText('Spironolactone (SPIRO)'));
    fireEvent.change(screen.getByLabelText('Spironolactone (SPIRO) dose'), { target: { value: '25' } });
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(CVD_FORMS.visit);
    expect(args.visitUuid).toBe('visit-today');
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: CVD_VISIT.heartRate, value: 88 },
        { concept: CVD_VISIT.symptoms[0].concept, value: CVD_VISIT.levels[0].value },
        { concept: CVD_VISIT.oedema, value: CVD_VISIT.oedemaAnswers[1].value },
        { concept: CVD_VISIT.nyha, value: CVD_VISIT.nyhaClasses[2].value },
        { concept: CVD_VISIT.mentalHealthReferral, value: YES },
        {
          concept: MH_VISIT.dispensingGroup,
          groupMembers: [
            { concept: MH_VISIT.medication, value: CVD_VISIT.medications.find((m) => m.key === 'spironolactone').drug },
            { concept: MH_VISIT.dose, value: 25 },
          ],
        },
      ]),
    );
  });

  it("shows an SpO2 outside its concept's limits while it is typed, and refuses to save it", async () => {
    setUp();
    renderPanel();
    fireEvent.change(screen.getByLabelText(/SpO2/), { target: { value: '120' } });
    expect(screen.getByText('Must be between 30 and 100')).toBeInTheDocument();
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
