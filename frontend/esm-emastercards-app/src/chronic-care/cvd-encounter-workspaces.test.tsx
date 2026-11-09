import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { CVD_ECHO, CVD_FORMS } from './cvd-concepts';
import { CvdEchoWorkspace } from './cvd-encounter-workspaces';

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

describe('CvdEchoWorkspace', () => {
  it('records an echocardiogram as echocardiogram-ultrasound-imaging-results.xml does', async () => {
    vi.mocked(useEMastercard).mockReturnValue({
      card: card({ key: 'chf', state: 'EDIT' }),
      systemLocationsTag: 'Upper Neno',
      isLoading: false,
      error: undefined,
    });
    vi.mocked(useCardEncounters).mockReturnValue({ encounters: [], isLoading: false, error: undefined, mutate: vi.fn() });
    vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
    vi.mocked(useSameDayObs).mockReturnValue({ obs: {}, isLoading: false });
    vi.mocked(usePatient).mockReturnValue({ patient: { birthDate: '1970-01-01' }, patientUuid: 'p1', isLoading: false, error: null } as any);
    vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
    vi.mocked(usePatientChartStore).mockReturnValue({ visitContext: { uuid: 'visit-today', startDatetime: '2026-11-04T08:00:00.000+0000' } } as any);
    vi.mocked(saveEncounter).mockResolvedValue({ uuid: 'saved' });
    render(
      <CvdEchoWorkspace
        workspaceProps={{ patientUuid: 'p1' }}
        groupProps={null}
        windowProps={null}
        closeWorkspace={vi.fn()}
        launchChildWorkspace={vi.fn()}
        workspaceName="pihmalawi-cvd-echo-workspace"
        windowName="pihmalawi-emastercard-window"
        isRootWorkspace
        showActionMenu={false}
      />,
    );
    expect(screen.getByText('Record echocardiogram')).toBeInTheDocument();
    await userEvent.click(
      within(screen.getByRole('group', { name: 'Left ventricular systolic function (LVSF)' })).getByLabelText('Severely reduced'),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
    const [form, args] = vi.mocked(saveEncounter).mock.calls[0];
    expect(form).toBe(CVD_FORMS.echo);
    expect(args.visitUuid).toBe('visit-today');
    expect(args.payload.add).toEqual([{ concept: CVD_ECHO.lvsf, value: CVD_ECHO.lvsfAnswers[2].value }]);
  });
});
