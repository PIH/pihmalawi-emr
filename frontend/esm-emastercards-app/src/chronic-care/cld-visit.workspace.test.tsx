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
import { CLD_FORMS, CLD_VISIT } from './cld-concepts';
import { cldHeader, cldVisit, copdOnlyHeader } from './test-cld-data';
import CldVisitWorkspace from './cld-visit.workspace';

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
const earlier = cldVisit('v1', '2026-10-08', { daySymptoms: 3, meds: [['betaAgonist', 2, 'puff(s)', 'BID']] });

function setUp({ header = cldHeader as ArtEncounter, encounters = [earlier] as Array<ArtEncounter> } = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'asthma', state: 'EDIT', initialEncounterUuid: header.uuid }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: form.encounterType === CLD_FORMS.header.encounterType ? [header] : encounters,
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
    <CldVisitWorkspace
      workspaceProps={{ patientUuid: 'p1', encounterUuid }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-cld-visit-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const question = (name: string) => within(screen.getByRole('group', { name }));

describe('CldVisitWorkspace', () => {
  it('records a new visit in the O3 visit, with what chronic-lung-disease-visit.xml saves', async () => {
    setUp();
    renderPanel();
    await userEvent.click(question('Planned visit').getByLabelText('Yes'));
    fireEvent.change(screen.getByLabelText(/Day symptoms/), { target: { value: '2' } });
    await userEvent.click(question('Exacerbation today').getByLabelText('Yes'));
    await userEvent.selectOptions(screen.getByLabelText('Asthma severity'), 'Moderate persistent');
    await userEvent.click(question('Indoor cooking').getByLabelText('Yes'));
    await userEvent.click(screen.getByLabelText('Inhaled steroid'));
    fireEvent.change(screen.getByLabelText('Inhaled steroid dose'), { target: { value: '2' } });
    await userEvent.selectOptions(screen.getByLabelText('Inhaled steroid unit'), 'puff(s)');
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(CLD_FORMS.visit);
    expect(args.visitUuid).toBe('visit-today');
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: CLD_VISIT.plannedVisit, value: true },
        { concept: CLD_VISIT.daySymptoms, value: 2 },
        { concept: CLD_VISIT.exacerbation, value: YES },
        { concept: CLD_VISIT.asthmaSeverity, value: CLD_VISIT.severities[2].value },
        { concept: CLD_VISIT.cooking, value: CLD_VISIT.indoorCookingAnswers[0].value },
        {
          concept: MH_VISIT.dispensingGroup,
          groupMembers: [
            { concept: MH_VISIT.medication, value: CLD_VISIT.medications[1].drug },
            { concept: MH_VISIT.dose, value: 2 },
            { concept: MH_VISIT.doseUnit, value: CLD_VISIT.doseUnits[0].value },
          ],
        },
      ]),
    );
  });

  it('shows a count that must be whole while it is typed, and refuses to save it', async () => {
    setUp();
    renderPanel();
    fireEvent.change(screen.getByLabelText(/Night symptoms/), { target: { value: '1.5' } });
    expect(screen.getByText('Must be a whole number')).toBeInTheDocument();
    await save();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('asks the asthma severity only for asthma', () => {
    setUp({ header: copdOnlyHeader });
    renderPanel();
    expect(screen.queryByLabelText('Asthma severity')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Inhaled B-agonist')).toBeInTheDocument();
  });

  it('edits a visit, voiding only what changed', async () => {
    setUp();
    renderPanel('v1');
    expect(screen.getByLabelText('Inhaled B-agonist')).toBeChecked();
    await userEvent.click(screen.getByLabelText('Inhaled B-agonist'));
    await save();
    const group = earlier.obs.find((o) => o.concept === MH_VISIT.dispensingGroup);
    expect(mockSave.mock.calls[0][1].payload).toEqual({ add: [], void: [group.uuid] });
  });
});
