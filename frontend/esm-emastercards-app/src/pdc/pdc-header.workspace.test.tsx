import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch, useSession } from '@openmrs/esm-framework';
import { card } from '../test-cards';
import { useCardEncounters, useEMastercard, useLocationsTagged } from '../art/art.resource';
import { saveEncounter } from '../art/obs-diff';
import { useCarriedPatientGuardian } from '../shared/patient-guardian';
import { CNS_INFECTION, MONTHS, OTHER_DIAGNOSIS, PDC_FORMS, PDC_HEADER as H, WEEKS, YES } from './pdc-concepts';
import { pdcHeader } from './test-pdc-data';
import PdcHeaderWorkspace from './pdc-header.workspace';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
  useLocationsTagged: vi.fn(),
}));
vi.mock('../art/obs-diff', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/obs-diff')>()),
  saveEncounter: vi.fn(),
}));
vi.mock('../shared/patient-guardian', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../shared/patient-guardian')>()),
  useCarriedPatientGuardian: vi.fn(),
}));

const mockSave = vi.mocked(saveEncounter);

function setUp({ state = 'EDIT' as 'CREATE' | 'EDIT', header = pdcHeader as typeof pdcHeader | null } = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'pdc', state, initialEncounterUuid: header?.uuid ?? null }),
    systemLocationsTag: 'Upper Neno',
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockReturnValue({ encounters: header ? [header] : [], isLoading: false, error: undefined, mutate: vi.fn() });
  vi.mocked(useLocationsTagged).mockReturnValue([{ uuid: 'neno-dh', display: 'Neno District Hospital' }]);
  vi.mocked(useCarriedPatientGuardian).mockReturnValue({ carried: {}, isLoading: false });
  vi.mocked(useSession).mockReturnValue({ sessionLocation: { uuid: 'neno-dh' } } as any);
  vi.mocked(openmrsFetch).mockResolvedValue({ data: { results: [] } } as any);
  mockSave.mockResolvedValue({ uuid: 'saved' });
}

function renderPanel(section: string) {
  render(
    <PdcHeaderWorkspace
      workspaceProps={{ patientUuid: 'p1', section: section as any }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-pdc-header-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save and close' }));

describe('PdcHeaderWorkspace', () => {
  it('starts the card with the patient details, the referral and the conditions; reasons each in their group', async () => {
    setUp({ state: 'CREATE', header: null });
    renderPanel('start');
    expect(screen.getByText('Patient and Guardian Details')).toBeInTheDocument();
    expect(screen.getByText('Referral')).toBeInTheDocument();
    expect(screen.getByText('Conditions at Enrolment')).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('group', { name: /Agrees to follow-up/ })).getByLabelText('Yes'));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Weeks' }));
    fireEvent.change(screen.getByLabelText(/Age at intake \(weeks\)/), { target: { value: '10' } });
    // the referral's reason, listed before the conditions at enrolment
    await userEvent.click(screen.getAllByRole('checkbox', { name: 'Hydrocephalus' })[0]);
    await save();
    const [form, args] = mockSave.mock.calls[0];
    expect(form).toBe(PDC_FORMS.header);
    expect(args.payload.add).toEqual(
      expect.arrayContaining([
        { concept: H.agreesToFollowUp, value: YES },
        {
          concept: H.ageAtIntakeGroup,
          groupMembers: [
            { concept: H.timeUnits, value: WEEKS },
            { concept: H.ageOfChild, value: 10 },
          ],
        },
        { concept: H.reasonForReferralGroup, groupMembers: [{ concept: H.reasonForReferral, value: '26071668-6ad4-4d30-b661-a7a07cece1ac' }] },
      ]),
    );
  });

  it('ticking months clears the age in weeks, as the form does', async () => {
    setUp();
    renderPanel('patientGuardian');
    expect(screen.getByRole('checkbox', { name: 'Weeks' })).toBeChecked();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Months' }));
    expect(screen.getByRole('checkbox', { name: 'Weeks' })).not.toBeChecked();
    fireEvent.change(screen.getByLabelText(/Age at intake \(months\)/), { target: { value: '12' } });
    await save();
    const { payload } = mockSave.mock.calls[0][1];
    expect(payload.add).toEqual([
      {
        concept: H.ageAtIntakeGroup,
        groupMembers: [
          { concept: H.timeUnits, value: MONTHS },
          { concept: H.ageOfChild, value: 12 },
        ],
      },
    ]);
    expect(payload.void).toHaveLength(1);
  });

  it('specifies a CNS infection and an Other condition, each in its own comment', async () => {
    setUp();
    renderPanel('conditions');
    await userEvent.click(screen.getByRole('checkbox', { name: 'CNS infection' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Other' }));
    fireEvent.change(screen.getByLabelText('Specify: CNS infection'), { target: { value: 'meningitis' } });
    fireEvent.change(screen.getByLabelText('Specify: Other'), { target: { value: 'rickets' } });
    await save();
    expect(mockSave.mock.calls[0][1].payload.add).toEqual([
      { concept: H.diagnosis, value: CNS_INFECTION, comment: 'meningitis' },
      { concept: H.diagnosis, value: OTHER_DIAGNOSIS, comment: 'rickets' },
    ]);
  });

  it('asks the date of enrolment only while Enrolled in PDC is Yes, clearing it otherwise', async () => {
    setUp();
    renderPanel('summary');
    expect(screen.getByLabelText(/Date of enrolment/)).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('group', { name: 'Enrolled in PDC' })).getByLabelText('No'));
    expect(screen.queryByLabelText(/Date of enrolment/)).not.toBeInTheDocument();
    await save();
    expect(mockSave.mock.calls[0][1].payload.void).toHaveLength(2);
  });
});
