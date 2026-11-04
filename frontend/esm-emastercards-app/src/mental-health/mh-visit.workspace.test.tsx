import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { YES } from '../art/art-concepts';
import { type ArtEncounter, useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { FINDINGS, MH_FORMS, MH_VISIT } from './mh-concepts';
import { mhVisit } from './test-mh-data';
import MhVisitWorkspace from './mh-visit.workspace';

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
const earlier = mhVisit('v1', '2026-10-08', { present: [FINDINGS.hallucinations], absent: [FINDINGS.hallucinations], meds: [['ris', 2, 'BID']] });

function setUp({
  state = 'EDIT' as 'CREATE' | 'EDIT' | 'VIEW',
  encounters = [earlier] as Array<ArtEncounter>,
  sameDay = {} as Record<string, Array<{ value: unknown; obsDatetime: string; encounterUuid: string }>>,
} = {}) {
  vi.mocked(useEMastercard).mockReturnValue({ card: card({ key: 'mental-health', state }), systemLocationsTag: 'Upper Neno', isLoading: false, error: undefined });
  vi.mocked(useCardEncounters).mockReturnValue({ encounters, isLoading: false, error: undefined, mutate: vi.fn() });
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(useSameDayObs).mockReturnValue({ obs: sameDay as any, isLoading: false });
  vi.mocked(usePatient).mockReturnValue({ patient: { gender: 'female', birthDate: '1992-03-12' }, patientUuid: 'p1', isLoading: false, error: null } as any);
  vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
  vi.mocked(usePatientChartStore).mockReturnValue({ visitContext: TODAY_VISIT } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel(encounterUuid?: string) {
  render(
    <MhVisitWorkspace
      workspaceProps={{ patientUuid: 'p1', encounterUuid }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-mh-visit-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const finding = (name: string) => within(screen.getByRole('group', { name }));
const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const setNext = (date: string) => fireEvent.change(screen.getByLabelText('Next appointment *'), { target: { value: date } });

describe('MhVisitWorkspace', () => {
  it('records a new visit in the O3 visit', async () => {
    setUp();
    renderPanel();
    await userEvent.click(finding('Hallucinations').getByLabelText('Yes'));
    await userEvent.click(within(screen.getByRole('group', { name: 'Patient stable?' })).getByLabelText('Yes'));
    await userEvent.click(screen.getByLabelText('Risperidone (RIS)'));
    fireEvent.change(screen.getByLabelText('Risperidone (RIS) dose'), { target: { value: '2' } });
    await userEvent.selectOptions(screen.getByLabelText('Risperidone (RIS) unit'), 'mg');
    await userEvent.selectOptions(screen.getByLabelText('Risperidone (RIS) frequency'), 'BID');
    setNext('2026-12-02');
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(MH_FORMS.visit);
    expect(args.visitUuid).toBe('visit-today');
    expect(args.encounterUuid).toBeUndefined();
    expect(args.datetime).toBe(TODAY_VISIT.startDatetime);
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: MH_VISIT.msePresent, value: FINDINGS.hallucinations },
        { concept: MH_VISIT.stable, value: YES },
        { concept: MH_VISIT.nextAppointment, value: '2026-12-02' },
        {
          concept: MH_VISIT.dispensingGroup,
          groupMembers: [
            { concept: MH_VISIT.medication, value: MH_VISIT.medications[5].drug },
            { concept: MH_VISIT.dose, value: 2 },
            { concept: MH_VISIT.doseUnit, value: MH_VISIT.doseUnits[0].value },
            { concept: MH_VISIT.frequency, value: MH_VISIT.frequencies[1].value },
          ],
        },
      ]),
    );
  });

  it('MSE Yes and No clear each other', async () => {
    setUp();
    renderPanel();
    await userEvent.click(finding('Delusions').getByLabelText('Yes'));
    await userEvent.click(finding('Delusions').getByLabelText('No'));
    setNext('2026-12-02');
    await save();
    const add = mockSave.mock.calls[0][1].payload.add;
    expect(add).toContainEqual({ concept: MH_VISIT.mseAbsent, value: FINDINGS.delusions });
    expect(add).not.toContainEqual({ concept: MH_VISIT.msePresent, value: FINDINGS.delusions });
  });

  it('an older visit with both present and absent shows Yes, and saving keeps one', async () => {
    setUp({ encounters: [earlier] });
    renderPanel('v1');
    expect(finding('Hallucinations').getByLabelText('Yes')).toBeChecked();
    await save();
    const absent = earlier.obs.find((o) => o.concept === MH_VISIT.mseAbsent);
    expect(mockSave.mock.calls[0][1].payload.void).toEqual([absent.uuid]);
  });

  it('height, weight and PHQ-9 are read-only when recorded the same day', () => {
    setUp({ sameDay: { [MH_VISIT.weight]: [{ value: 61, obsDatetime: '2026-11-04T08:30:00.000+0000', encounterUuid: 'vitals' }] } });
    renderPanel();
    expect(screen.getByLabelText('Weight')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Weight')).toHaveValue(61);
    expect(screen.getByLabelText('Height')).not.toHaveAttribute('readonly');
  });

  it('next appointment is prefilled from the same day', () => {
    setUp({ sameDay: { [MH_VISIT.nextAppointment]: [{ value: '2026-12-02T00:00:00.000+0000', obsDatetime: '2026-11-04T08:30:00.000+0000', encounterUuid: 'art' }] } });
    renderPanel();
    expect(screen.getByLabelText('Next appointment *')).toHaveValue('2026-12-02');
  });

  it('next appointment is required', async () => {
    setUp();
    renderPanel();
    await save();
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('next appointment cannot be before the visit', async () => {
    setUp();
    renderPanel();
    setNext('2026-10-01');
    await save();
    expect(screen.getByText('Cannot be in the past')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('refuses a second visit on the same day', async () => {
    setUp({ encounters: [mhVisit('v-today', '2026-11-04', {})] });
    renderPanel();
    setNext('2026-12-02');
    await save();
    expect(mockSave).not.toHaveBeenCalled();
    expect(screen.getByText(/duplicate encounter/)).toBeInTheDocument();
  });

  it('opens blank for a new visit while editing another', () => {
    setUp();
    renderPanel();
    expect(finding('Hallucinations').getByLabelText('Yes')).not.toBeChecked();
    expect(screen.getByLabelText('Risperidone (RIS)')).not.toBeChecked();
    expect(screen.getByLabelText('Next appointment *')).toHaveValue('');
  });

  it('warns when an adult height is far from earlier ones', async () => {
    const heights = [160, 161, 160].map((h, i) => ({ ...mhVisit(`h${i}`, `2026-0${i + 1}-10`, {}), obs: [{ uuid: `ho${i}`, concept: MH_VISIT.height, value: h, obsDatetime: '2026-01-10' }] }));
    setUp({ encounters: heights as Array<ArtEncounter> });
    renderPanel();
    fireEvent.change(screen.getByLabelText('Height'), { target: { value: '150' } });
    expect(await screen.findByText('Adult height is an outlier please check!')).toBeInTheDocument();
  });

  it('is read-only unless the card can be edited', () => {
    setUp({ state: 'VIEW' });
    renderPanel('v1');
    expect(screen.queryByRole('button', { name: 'Save and close' })).not.toBeInTheDocument();
  });
});
