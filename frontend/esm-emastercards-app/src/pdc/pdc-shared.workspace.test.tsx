import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { encounter, obs } from '../chronic-care/test-htn-data';
import { YES } from './pdc-concepts';
import { PDC_SHARED, PDC_SHARED_FORMS, type PdcSharedForm } from './pdc-shared-forms';
import PdcSharedWorkspace from './pdc-shared.workspace';

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
const hospitalisation = encounter('pdc-hosp-1', '2026-09-01', [
  obs(PDC_SHARED.dischargeDate, '2026-09-05T00:00:00.000+0000'),
  obs(PDC_SHARED.lengthOfStay, 4),
  obs(PDC_SHARED.admissionReason, 'Seizures'),
]);

function setUp(encounters: Array<ArtEncounter> = []) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'pdc-developmental-delay', state: 'EDIT' }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockReturnValue({ encounters, isLoading: false, error: undefined, mutate: vi.fn() });
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(useSameDayObs).mockReturnValue({ obs: {}, isLoading: false });
  vi.mocked(usePatient).mockReturnValue({ patient: { birthDate: '2025-03-12' }, patientUuid: 'p1', isLoading: false, error: null } as any);
  vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
  vi.mocked(usePatientChartStore).mockReturnValue({ visitContext: { uuid: 'visit-today', startDatetime: '2026-11-04T08:00:00.000+0000' } } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel(form: PdcSharedForm, encounterUuid?: string) {
  render(
    <PdcSharedWorkspace
      workspaceProps={{ patientUuid: 'p1', form, cardKey: 'pdc-developmental-delay', encounterUuid }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-pdc-shared-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));

describe('PdcSharedWorkspace', () => {
  it('records a hospitalisation on its admission date, with a discharge date that may be in the future', async () => {
    setUp();
    renderPanel('hospitalisation');
    expect(screen.getByText('Record hospitalisation')).toBeInTheDocument();
    expect(screen.getByLabelText(/Date of admission/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Date of discharge'), { target: { value: '2099-01-01' } });
    fireEvent.change(screen.getByLabelText('Reason for admission'), { target: { value: 'Pneumonia' } });
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(PDC_SHARED_FORMS.hospitalisation);
    expect(args.payload.add).toEqual([
      { concept: PDC_SHARED.dischargeDate, value: '2099-01-01' },
      { concept: PDC_SHARED.admissionReason, value: 'Pneumonia' },
    ]);
  });

  it('edits a hospitalisation without touching the length of stay the form never asks', async () => {
    setUp([hospitalisation]);
    renderPanel('hospitalisation', hospitalisation.uuid);
    fireEvent.change(screen.getByLabelText('Reason for admission'), { target: { value: 'Seizures, status' } });
    await save();
    const reason = hospitalisation.obs.find((o) => o.concept === PDC_SHARED.admissionReason);
    expect(mockSave.mock.calls[0][1].payload).toEqual({
      add: [{ concept: PDC_SHARED.admissionReason, value: 'Seizures, status' }],
      void: [reason.uuid],
    });
  });

  it('refuses a complication in the future', async () => {
    setUp();
    renderPanel('complications');
    fireEvent.change(screen.getByLabelText('Date of complication'), { target: { value: '2099-01-01' } });
    await save();
    expect(screen.getByText('Cannot be in the future')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("records a vision test, its referral in the form's Referred Out group", async () => {
    setUp();
    renderPanel('vision');
    await userEvent.click(within(screen.getByRole('group', { name: 'Test result' })).getByLabelText('Fail'));
    await userEvent.click(within(screen.getByRole('group', { name: 'Referred out' })).getByLabelText('Yes'));
    await save();
    expect(mockSave.mock.calls[0][1].payload.add).toEqual([
      { concept: PDC_SHARED.visionResult, value: PDC_SHARED.passFail[1].value },
      { concept: PDC_SHARED.referredOutGroup, groupMembers: [{ concept: PDC_SHARED.referredOut, value: YES }] },
    ]);
  });
});
