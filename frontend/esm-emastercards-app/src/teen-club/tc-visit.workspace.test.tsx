import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { NO, YES } from '../art/art-concepts';
import { type ArtEncounter, useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { TC_FORMS, TC_VISIT } from './tc-concepts';
import { tcHeader, tcVisit } from './test-tc-data';
import TcVisitWorkspace from './tc-visit.workspace';

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
const earlier = tcVisit('v1', '2026-10-08', { sti: '-' });

function setUp({
  header = tcHeader as ArtEncounter,
  encounters = [earlier] as Array<ArtEncounter>,
  sameDay = {} as Record<string, Array<{ value: unknown; obsDatetime: string; encounterUuid: string }>>,
} = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'teen-club', state: 'EDIT', initialEncounterUuid: header.uuid }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: form.encounterType === TC_FORMS.header.encounterType ? [header] : encounters,
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }));
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(useSameDayObs).mockReturnValue({ obs: sameDay as any, isLoading: false });
  vi.mocked(usePatient).mockReturnValue({ patient: { birthDate: '1980-03-12' }, patientUuid: 'p1', isLoading: false, error: null } as any);
  vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
  vi.mocked(usePatientChartStore).mockReturnValue({ visitContext: TODAY_VISIT } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel(encounterUuid?: string) {
  render(
    <TcVisitWorkspace
      workspaceProps={{ patientUuid: 'p1', encounterUuid }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-tc-visit-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const question = (name: string) => within(screen.getByRole('group', { name }));

describe('TcVisitWorkspace', () => {
  it('records a new visit in the O3 visit, with what teen-club-visit.xml saves, hospitalised under its own concept', async () => {
    setUp();
    renderPanel();
    expect(screen.getByText('Record teen club visit')).toBeInTheDocument();
    await userEvent.click(question('TB screening outcome').getByLabelText('-'));
    await userEvent.click(question('Sputum collected').getByLabelText('No'));
    await userEvent.click(question('Nutrition screening outcome for MUAC normal').getByLabelText('No'));
    await userEvent.click(question('Mental health screened').getByLabelText('Yes'));
    await userEvent.click(question('STI screening outcome').getByLabelText('+'));
    await userEvent.click(question('Hospitalised').getByLabelText('Yes'));
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(TC_FORMS.visit);
    expect(args.visitUuid).toBe('visit-today');
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: TC_VISIT.tbScreeningOutcome, value: TC_VISIT.outcomes[1].value },
        { concept: TC_VISIT.sputumCollected, value: NO },
        { concept: TC_VISIT.muacNormal, value: NO },
        { concept: TC_VISIT.mentalHealthScreened, value: YES },
        { concept: TC_VISIT.stiScreeningOutcome, value: TC_VISIT.outcomes[0].value },
        { concept: TC_VISIT.hospitalised, value: YES },
      ]),
    );
  });

  it('shows the TB status recorded the same day, e.g. at the ART visit, without saving it again', async () => {
    setUp({
      sameDay: { [TC_VISIT.tbStatus]: [{ value: TC_VISIT.tbStatuses[1].value, obsDatetime: TODAY_VISIT.startDatetime, encounterUuid: 'art-visit' }] },
    });
    renderPanel();
    await userEvent.click(question('Mental health screened').getByLabelText('No'));
    await save();
    expect(mockSave.mock.calls[0][1].payload.add.map((o) => o.concept)).not.toContain(TC_VISIT.tbStatus);
  });

  it('edits a visit, replacing only what changed', async () => {
    setUp();
    renderPanel('v1');
    await userEvent.click(question('STI screening outcome').getByLabelText('+'));
    await save();
    const sti = earlier.obs.find((o) => o.concept === TC_VISIT.stiScreeningOutcome);
    expect(mockSave.mock.calls[0][1].payload).toEqual({
      add: [{ concept: TC_VISIT.stiScreeningOutcome, value: TC_VISIT.outcomes[0].value }],
      void: [sti.uuid],
    });
  });
});
