import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePatient, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { card } from '../test-cards';
import { FOLLOW_UP_TESTING } from './art-concepts';
import { useArtCard, useArtEncounters, useLocationsTagged, useSameDayObs } from './art.resource';
import { saveArtEncounter } from './obs-diff';
import FollowUpTestingWorkspace from './follow-up-testing.workspace';

vi.mock('./art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./art.resource')>()),
  useArtCard: vi.fn(),
  useArtEncounters: vi.fn(),
  useLocationsTagged: vi.fn(),
  useSameDayObs: vi.fn(),
}));
vi.mock('./obs-diff', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./obs-diff')>()),
  saveArtEncounter: vi.fn(),
}));
vi.mock('@openmrs/esm-patient-common-lib', () => ({ usePatientChartStore: vi.fn() }));

const mockSave = vi.mocked(saveArtEncounter);

function setUp(sameDay = {}) {
  vi.mocked(useArtCard).mockReturnValue({ card: card({ state: 'EDIT' }), systemLocationsTag: 'Upper Neno', isLoading: false, error: undefined });
  vi.mocked(useArtEncounters).mockReturnValue({ encounters: [], isLoading: false, error: undefined, mutate: vi.fn() });
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(useSameDayObs).mockReturnValue({ obs: sameDay as any, isLoading: false });
  vi.mocked(usePatient).mockReturnValue({ patient: { gender: 'female' }, patientUuid: 'p1', isLoading: false, error: null } as any);
  vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
  vi.mocked(usePatientChartStore).mockReturnValue({
    visitContext: { uuid: 'visit-today', startDatetime: '2026-11-04T08:00:00.000+0000' },
  } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel() {
  render(
    <FollowUpTestingWorkspace
      workspaceProps={{ patientUuid: 'p1' }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-art-follow-up-testing-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

describe('FollowUpTestingWorkspace', () => {
  it('saves CD4 count and %, PHQ-9 and the glucose group', async () => {
    setUp();
    renderPanel();
    fireEvent.change(screen.getByLabelText('PHQ-9 score'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('CD4 count'), { target: { value: '540' } });
    fireEvent.change(screen.getByLabelText('CD4 %'), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText('Serum glucose'), { target: { value: '6.1' } });
    await userEvent.click(screen.getByLabelText('Fasting'));
    await userEvent.click(screen.getByRole('button', { name: 'Save and close' }));

    const [kind, args] = mockSave.mock.calls[0];
    expect(kind).toBe('followUpTesting');
    expect(args.locationUuid).toBe('neno-dh');
    expect(args.payload.add).toEqual([
      { concept: FOLLOW_UP_TESTING.phq9Score, value: 4 },
      { concept: FOLLOW_UP_TESTING.cd4Count, value: 540 },
      { concept: FOLLOW_UP_TESTING.cd4Percent, value: 25 },
      {
        concept: FOLLOW_UP_TESTING.glucoseGroup,
        groupMembers: [
          { concept: FOLLOW_UP_TESTING.serumGlucose, value: 6.1 },
          { concept: FOLLOW_UP_TESTING.glucoseTestType, value: FOLLOW_UP_TESTING.glucoseTestTypeAnswers.fasting },
        ],
      },
    ]);
  });

  it('glucose is read-only when a same-day value exists', () => {
    setUp({ [FOLLOW_UP_TESTING.serumGlucose]: [{ value: 5.4, obsDatetime: '2026-11-04T08:10:00.000+0000', encounterUuid: 'ncd' }] });
    renderPanel();
    expect(screen.getByLabelText('Serum glucose')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Serum glucose')).toHaveValue(5.4);
  });

  it('offers the tagged locations', () => {
    setUp();
    renderPanel();
    expect(useLocationsTagged).toHaveBeenCalledWith('Upper Neno');
  });
});
