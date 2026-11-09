import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { YES } from '../art/art-concepts';
import { type ArtEncounter, useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { NCO_FORMS, NCO_VISIT } from './nco-concepts';
import { ncoHeader, ncoVisit } from './test-nco-data';
import NcoVisitWorkspace from './nco-visit.workspace';

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
const earlier = ncoVisit('v1', '2026-10-08', { medications: 'Methotrexate 7.5 mg weekly' });

function setUp({ header = ncoHeader as ArtEncounter, encounters = [earlier] as Array<ArtEncounter> } = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'ncd-other', state: 'EDIT', initialEncounterUuid: header.uuid }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: form.encounterType === NCO_FORMS.header.encounterType ? [header] : encounters,
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
    <NcoVisitWorkspace
      workspaceProps={{ patientUuid: 'p1', encounterUuid }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-nco-visit-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const question = (name: string) => within(screen.getByRole('group', { name }));

describe('NcoVisitWorkspace', () => {
  it('records a new visit in the O3 visit, with what ncd-other-visit.xml saves', async () => {
    setUp();
    renderPanel();
    expect(screen.getByText('Record NCD other visit')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/SpO2/), { target: { value: '96' } });
    await userEvent.click(question('Tobacco').getByLabelText('Never'));
    fireEvent.change(screen.getByLabelText('Medications'), { target: { value: 'Prednisolone 5 mg' } });
    await userEvent.click(question('Medications changed').getByLabelText('Yes'));
    await userEvent.click(question('Next appointment location').getByLabelText('IC3'));
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(NCO_FORMS.visit);
    expect(args.visitUuid).toBe('visit-today');
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: NCO_VISIT.spo2, value: 96 },
        { concept: NCO_VISIT.tobacco, value: NCO_VISIT.useAnswers[1].value },
        { concept: NCO_VISIT.medications, value: 'Prednisolone 5 mg' },
        { concept: NCO_VISIT.medicationsChanged, value: YES },
        { concept: NCO_VISIT.nextAppointmentLocation, value: NCO_VISIT.nextAppointmentLocations[1].value },
      ]),
    );
  });

  it('shows exercise days outside 0 to 7 while they are typed, and refuses to save them', async () => {
    setUp();
    renderPanel();
    fireEvent.change(screen.getByLabelText('Days per week with 30 minutes of exercise'), { target: { value: '9' } });
    expect(screen.getByText('Must be between 0 and 7')).toBeInTheDocument();
    await save();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('edits a visit, replacing only what changed', async () => {
    setUp();
    renderPanel('v1');
    expect(screen.getByLabelText('Medications')).toHaveValue('Methotrexate 7.5 mg weekly');
    fireEvent.change(screen.getByLabelText('Medications'), { target: { value: 'Methotrexate 10 mg weekly' } });
    await save();
    const medications = earlier.obs.find((o) => o.concept === NCO_VISIT.medications);
    expect(mockSave.mock.calls[0][1].payload).toEqual({
      add: [{ concept: NCO_VISIT.medications, value: 'Methotrexate 10 mg weekly' }],
      void: [medications.uuid],
    });
  });
});
