import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard, useLocationsTagged, useSameDayObs } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { HIE_FORMS, HIE_VISIT, MODERATE_MALNUTRITION } from './hie-concepts';
import { YES } from './pdc-concepts';
import { hieHeader, hieVisit } from './test-hie-data';
import { CONDITION_WORKSPACES } from './pdc-condition-workspaces';

const HieVisitWorkspace = CONDITION_WORKSPACES['pdc-developmental-delay'].visit;

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
const earlier = hieVisit('v1', '2026-10-08', { wfa: 70, hypo: true });

function setUp({ encounters = [earlier] as Array<ArtEncounter> } = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'pdc-developmental-delay', state: 'EDIT', initialEncounterUuid: hieHeader.uuid }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => ({
    encounters: form.encounterType === HIE_FORMS.header.encounterType ? [hieHeader] : encounters,
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }));
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(useSameDayObs).mockReturnValue({ obs: {}, isLoading: false });
  vi.mocked(usePatient).mockReturnValue({ patient: { birthDate: '2025-03-12' }, patientUuid: 'p1', isLoading: false, error: null } as any);
  vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
  vi.mocked(usePatientChartStore).mockReturnValue({ visitContext: TODAY_VISIT } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel(encounterUuid?: string) {
  render(
    <HieVisitWorkspace
      workspaceProps={{ patientUuid: 'p1', encounterUuid }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-hie-visit-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));
const question = (name: string) => within(screen.getByRole('group', { name }));
const concept = (list: Array<{ key: string; concept: string }>, key: string) => list.find((x) => x.key === key).concept;

describe('HieVisitWorkspace', () => {
  it('records a new visit in the O3 visit, with what developmental-delay-visit.xml saves, each set question in a group of its own', async () => {
    setUp();
    renderPanel();
    expect(screen.getByText('Record HIE / developmental delay visit')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/MUAC/), { target: { value: '12.5' } });
    fireEvent.change(screen.getByLabelText(/Weight for age/), { target: { value: '72' } });
    await userEvent.click(question('Malnutrition').getByLabelText('Moderate'));
    await userEvent.click(question('Hyper').getByLabelText('Yes'));
    await userEvent.click(question('Cup').getByLabelText('Yes'));
    await userEvent.click(question('Physiotherapy').getByLabelText('Yes'));
    await userEvent.click(question('If referred out, to').getByLabelText('Palliative care'));
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(HIE_FORMS.visit);
    expect(args.visitUuid).toBe('visit-today');
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: HIE_VISIT.muac, value: 12.5 },
        { concept: HIE_VISIT.weightForAgeGroup, groupMembers: [{ concept: HIE_VISIT.numericValue, value: 72 }] },
        { concept: HIE_VISIT.malnutrition, value: MODERATE_MALNUTRITION },
        { concept: HIE_VISIT.toneGroup, groupMembers: [{ concept: concept(HIE_VISIT.tone, 'toneHyper'), value: YES }] },
        { concept: HIE_VISIT.feedingGroup, groupMembers: [{ concept: concept(HIE_VISIT.feeding, 'feedingCup'), value: YES }] },
        { concept: concept(HIE_VISIT.plan, 'physiotherapy'), value: YES },
        { concept: HIE_VISIT.referredToGroup, groupMembers: [{ concept: HIE_VISIT.referredOut, value: HIE_VISIT.referredToAnswers[1].value }] },
      ]),
    );
  });

  it('refuses a W/A with decimals, as its concept does', async () => {
    setUp();
    renderPanel();
    fireEvent.change(screen.getByLabelText(/Weight for age/), { target: { value: '72.5' } });
    expect(screen.getByText('Must be a whole number')).toBeInTheDocument();
    await save();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('edits a visit, replacing only the tone group that changed', async () => {
    setUp();
    renderPanel('v1');
    expect(question('Hypo').getByLabelText('Yes')).toBeChecked();
    await userEvent.click(question('Hypo').getByLabelText('No'));
    await save();
    const hypoGroup = earlier.obs.find(
      (o) => o.concept === HIE_VISIT.toneGroup && o.groupMembers[0].concept === concept(HIE_VISIT.tone, 'toneHypo'),
    );
    expect(mockSave.mock.calls[0][1].payload).toEqual({
      add: [{ concept: HIE_VISIT.toneGroup, groupMembers: [{ concept: concept(HIE_VISIT.tone, 'toneHypo'), value: HIE_VISIT.no }] }],
      void: [hypoGroup.uuid],
    });
  });
});
