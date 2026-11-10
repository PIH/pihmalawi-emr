import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { NO, YES } from '../art/art-concepts';
import { type ArtEncounter, useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { EC_FORMS, EC_VISIT } from './ec-concepts';
import { ecHeader, ecVisit } from './test-ec-data';
import EcVisitWorkspace from './ec-visit.workspace';

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
const earlier = ecVisit('v1', '2026-10-08', { status: 0, cpt: 30 });

function setUp({
  header = ecHeader as ArtEncounter,
  encounters = [earlier] as Array<ArtEncounter>,
  sameDay = {} as Record<string, Array<{ value: unknown; obsDatetime: string; encounterUuid: string }>>,
} = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'exposed-child', state: 'EDIT', initialEncounterUuid: header.uuid }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: form.encounterType === EC_FORMS.header.encounterType ? [header] : encounters,
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
    <EcVisitWorkspace
      workspaceProps={{ patientUuid: 'p1', encounterUuid }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-ec-visit-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const question = (name: string) => within(screen.getByRole('group', { name }));

describe('EcVisitWorkspace', () => {
  it('records a new visit in the O3 visit, with what exposed-child-visit.xml saves', async () => {
    setUp();
    renderPanel();
    expect(screen.getByText('Record exposed child visit')).toBeInTheDocument();
    await userEvent.click(question('Wasting/malnutrition').getByLabelText('Moderate'));
    await userEvent.click(question('Mother status').getByLabelText('On ART'));
    await userEvent.click(question('Clinical monitoring').getByLabelText('Sick'));
    await userEvent.click(question('HIV infection').getByLabelText('A: Not infected'));
    fireEvent.change(screen.getByLabelText(/CPT/), { target: { value: '30' } });
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(EC_FORMS.visit);
    expect(args.visitUuid).toBe('visit-today');
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: EC_VISIT.wasting, value: EC_VISIT.wastingAnswers[1].value },
        { concept: EC_VISIT.motherStatus.concept, value: EC_VISIT.motherStatus.answers[1].value },
        { concept: EC_VISIT.clinicalMonitoring, value: EC_VISIT.clinicalMonitoringAnswers[1].value },
        { concept: EC_VISIT.childHivStatus, value: EC_VISIT.childHivStatuses[0].value },
        { concept: EC_VISIT.cpt, value: 30 },
      ]),
    );
  });

  it('shows the breastfeeding recorded the same day, without saving it again', async () => {
    setUp({
      sameDay: {
        [EC_VISIT.breastfeeding]: [{ value: EC_VISIT.breastfeedingAnswers[0].value, obsDatetime: TODAY_VISIT.startDatetime, encounterUuid: 'other' }],
      },
    });
    renderPanel();
    await userEvent.click(question('Clinical monitoring').getByLabelText('NAD'));
    await save();
    expect(mockSave.mock.calls[0][1].payload.add.map((o) => o.concept)).not.toContain(EC_VISIT.breastfeeding);
  });

  it('shows CPT tablets that must be whole while they are typed', () => {
    setUp();
    renderPanel();
    fireEvent.change(screen.getByLabelText(/CPT/), { target: { value: '2.5' } });
    expect(screen.getByText('Must be a whole number')).toBeInTheDocument();
  });
});
