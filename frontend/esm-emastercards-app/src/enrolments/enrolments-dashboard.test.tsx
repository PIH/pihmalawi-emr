import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { useQuickPrograms } from './enrolments.resource';
import { chronicCare, hivOnArt, tbCompleted } from './test-programs';
import EnrolmentsDashboard from './enrolments-dashboard.component';

vi.mock('./enrolments.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./enrolments.resource')>()),
  useQuickPrograms: vi.fn(),
}));

const nutrition = chronicCare({
  key: 'nutrition',
  label: 'Nutrition Program',
  multipleWorkflows: false,
  workflows: [],
  enrolStates: [{ uuid: 'n', name: 'On treatment' }],
});
const palliative = chronicCare({ key: 'palliative-care', label: 'Palliative Care Program', available: false });

function withPrograms(programs = [chronicCare(), hivOnArt(), tbCompleted(), nutrition, palliative]) {
  vi.mocked(useQuickPrograms).mockReturnValue({ programs, error: undefined, isLoading: false, mutate: vi.fn() } as never);
}

describe('EnrolmentsDashboard', () => {
  it('shows the active programs, then the completed ones, each in its own card', () => {
    withPrograms();
    render(<EnrolmentsDashboard patientUuid="p1" />);

    expect(screen.getByRole('heading', { name: 'Enrolments' })).toBeInTheDocument();
    const cards = screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'));
    expect(cards).toEqual(['HIV Program', 'TB Program', 'Not enrolled']);
  });

  it('lists the programs the patient was never enrolled in in one card, each with Enrol', async () => {
    withPrograms();
    render(<EnrolmentsDashboard patientUuid="p1" />);

    const notEnrolled = within(screen.getByRole('region', { name: 'Not enrolled' }));
    expect(notEnrolled.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Chronic Care ProgramEnrol',
      'Nutrition ProgramEnrol',
      'Palliative Care ProgramNot available',
    ]);
    await userEvent.click(notEnrolled.getByRole('button', { name: 'Enrol in Nutrition Program' }));
    expect(vi.mocked(launchWorkspace2)).toHaveBeenCalledWith(
      'pihmalawi-enrolment-workspace',
      expect.objectContaining({ mode: 'enrol', program: expect.objectContaining({ key: 'nutrition' }) }),
    );
  });

  it('offers Enrol in a program for each program the patient can be enrolled in', async () => {
    withPrograms();
    render(<EnrolmentsDashboard patientUuid="p1" />);

    await userEvent.click(screen.getByRole('button', { name: 'Enrol in a program' }));
    expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Chronic Care Program', 'TB Program', 'Nutrition Program']);
  });

  it('has no Not enrolled card when the patient is in every program', () => {
    withPrograms([hivOnArt()]);
    render(<EnrolmentsDashboard patientUuid="p1" />);

    expect(screen.queryByRole('region', { name: 'Not enrolled' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enrol in a program' })).not.toBeInTheDocument();
  });
});
