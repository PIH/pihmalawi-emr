import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { HTN_FORMS, HTN_QUARTERLY_LABS } from './htn-concepts';
import HtnQuarterlyLabsWorkspace from './htn-quarterly-labs.workspace';

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
vi.mock('@openmrs/esm-patient-common-lib', () => ({
  usePatientChartStore: vi.fn(),
}));

const mockSave = vi.mocked(saveEncounter);

describe('HtnQuarterlyLabsWorkspace', () => {
  it("saves the HIV test's sample date as the test's date, as the form's script does", async () => {
    vi.mocked(useEMastercard).mockReturnValue({
      card: card({ key: 'htn-dm', state: 'EDIT' }),
      systemLocationsTag: 'Upper Neno',
      isLoading: false,
      error: undefined,
    });
    vi.mocked(useCardEncounters).mockReturnValue({
      encounters: [],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });
    vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
    vi.mocked(useSameDayObs).mockReturnValue({ obs: {}, isLoading: false });
    vi.mocked(usePatient).mockReturnValue({
      patient: { birthDate: '1960-03-12' },
      patientUuid: 'p1',
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useSession).mockReturnValue({
      sessionLocation: { uuid: 'neno-dh' },
    } as any);
    vi.mocked(usePatientChartStore).mockReturnValue({
      visitContext: {
        uuid: 'visit-today',
        startDatetime: '2026-11-04T08:00:00.000+0000',
      },
    } as any);
    mockSave.mockResolvedValue({ uuid: 'saved' });
    render(
      <HtnQuarterlyLabsWorkspace
        workspaceProps={{ patientUuid: 'p1' }}
        groupProps={null}
        windowProps={null}
        closeWorkspace={vi.fn()}
        launchChildWorkspace={vi.fn()}
        workspaceName="pihmalawi-htn-quarterly-labs-workspace"
        windowName="pihmalawi-emastercard-window"
        isRootWorkspace
        showActionMenu={false}
      />,
    );
    expect(screen.queryByLabelText('HIV sample date')).not.toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('group', { name: 'HIV test result' })).getByLabelText('Non-reactive'));
    await userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(HTN_FORMS.quarterlyLabs);
    expect(args.payload.add).toEqual([
      {
        concept: HTN_QUARTERLY_LABS.hivTestGroup,
        groupMembers: [
          {
            concept: HTN_QUARTERLY_LABS.hivResult,
            value: HTN_QUARTERLY_LABS.hivResults[1].value,
          },
          { concept: HTN_QUARTERLY_LABS.hivSampleDate, value: '2026-11-04' },
        ],
      },
    ]);
  });
});
