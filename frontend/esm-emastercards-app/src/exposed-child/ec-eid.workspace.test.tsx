import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch, usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { EC_EID, EC_FORMS } from './ec-concepts';
import EcEidWorkspace from './ec-eid.workspace';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
  useLocationsTagged: vi.fn(),
  useSameDayObs: vi.fn(),
}));
vi.mock('../art/obs-diff', async (importOriginal) => ({ ...(await importOriginal<typeof import('../art/obs-diff')>()), saveEncounter: vi.fn() }));
vi.mock('@openmrs/esm-patient-common-lib', () => ({ usePatientChartStore: vi.fn() }));

describe('EcEidWorkspace', () => {
  it("records an EID test in its group, the lab locations offered from the concept's answers", async () => {
    vi.mocked(useEMastercard).mockReturnValue({
      card: card({ key: 'exposed-child', state: 'EDIT' }),
      systemLocationsTag: 'Upper Neno',
      isLoading: false,
      error: undefined,
    });
    vi.mocked(useCardEncounters).mockReturnValue({ encounters: [], isLoading: false, error: undefined, mutate: vi.fn() });
    vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
    vi.mocked(useSameDayObs).mockReturnValue({ obs: {}, isLoading: false });
    vi.mocked(usePatient).mockReturnValue({ patient: { birthDate: '2026-01-01' }, patientUuid: 'p1', isLoading: false, error: null } as any);
    vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
    vi.mocked(usePatientChartStore).mockReturnValue({ visitContext: { uuid: 'visit-today', startDatetime: '2026-11-04T08:00:00.000+0000' } } as any);
    vi.mocked(openmrsFetch).mockResolvedValue({ data: { answers: [{ uuid: 'lab-1', display: 'Neno District Hospital Lab' }] } } as any);
    vi.mocked(saveEncounter).mockResolvedValue({ uuid: 'saved' });
    render(
      <EcEidWorkspace
        workspaceProps={{ patientUuid: 'p1' }}
        groupProps={null}
        windowProps={null}
        closeWorkspace={vi.fn()}
        launchChildWorkspace={vi.fn()}
        workspaceName="pihmalawi-ec-eid-workspace"
        windowName="pihmalawi-emastercard-window"
        isRootWorkspace
        showActionMenu={false}
      />,
    );
    await userEvent.selectOptions(await screen.findByLabelText('Lab location'), 'Neno District Hospital Lab');
    await userEvent.click(within(screen.getByRole('group', { name: 'Test type' })).getByLabelText('DBS'));
    await userEvent.click(within(screen.getByRole('group', { name: 'HIV result' })).getByLabelText('Negative'));
    await userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
    const [form, args] = vi.mocked(saveEncounter).mock.calls[0];
    expect(form).toBe(EC_FORMS.eid);
    expect(args.payload.add).toEqual([
      {
        concept: EC_EID.testGroup,
        groupMembers: [
          { concept: EC_EID.labLocation, value: 'lab-1' },
          { concept: EC_EID.testType, value: EC_EID.testTypes[0].value },
          { concept: EC_EID.result, value: EC_EID.results[0].value },
        ],
      },
    ]);
  });
});
