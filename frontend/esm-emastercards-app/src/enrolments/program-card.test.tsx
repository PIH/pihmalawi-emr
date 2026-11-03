import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { chronicCare, chronicCareEnrolledInHtnDm } from './test-programs';
import ProgramCard from './program-card.component';

const mockLaunchWorkspace2 = vi.mocked(launchWorkspace2);

describe('ProgramCard', () => {
  it('offers to enrol a patient who is not enrolled', async () => {
    render(<ProgramCard program={chronicCare()} patientUuid="patient-uuid" />);

    expect(screen.getByRole('heading', { name: 'Chronic Care Program' })).toBeInTheDocument();
    expect(screen.getByText('Not enrolled')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Enrol' }));
    expect(mockLaunchWorkspace2).toHaveBeenCalledWith(
      'pihmalawi-enrolment-workspace',
      expect.objectContaining({ mode: 'enrol', patientUuid: 'patient-uuid' }),
    );
  });

  it("shows each condition's state, and offers to change it, add a condition or exit", () => {
    render(<ProgramCard program={chronicCareEnrolledInHtnDm()} patientUuid="patient-uuid" />);

    expect(screen.getByText('Enrolled 02-Nov-2026 at Neno District Hospital')).toBeInTheDocument();
    expect(screen.getByText('Hypertension and Diabetes: On treatment since 02-Nov-2026')).toBeInTheDocument();
    for (const name of ['Change state', 'Add condition', 'Exit']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Enrol' })).not.toBeInTheDocument();
  });

  it('shows the last enrolment of a patient no longer enrolled', () => {
    render(
      <ProgramCard
        program={chronicCare({
          lastEnrolment: {
            uuid: 'old',
            dateEnrolled: '2025-01-05',
            dateCompleted: '2026-02-05',
            location: { uuid: 'neno', display: 'Neno District Hospital' },
            exitState: { uuid: 'died', name: 'Patient died' },
          },
        })}
        patientUuid="patient-uuid"
      />,
    );

    expect(screen.getByText('Not enrolled')).toBeInTheDocument();
    expect(
      screen.getByText('Last enrolled 05-Jan-2025 at Neno District Hospital, ended 05-Feb-2026 (Patient died)'),
    ).toBeInTheDocument();
  });

  it('offers nothing when Quick Programs has nothing available', () => {
    render(<ProgramCard program={chronicCare({ available: false })} patientUuid="patient-uuid" />);

    expect(screen.getByText('Not available')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers nothing to a user who may not edit patients', () => {
    render(<ProgramCard program={chronicCare({ canEdit: false })} patientUuid="patient-uuid" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers to set the state of an enrolment that has none', () => {
    render(
      <ProgramCard
        program={chronicCare({
          key: 'tb',
          label: 'TB Program',
          multipleWorkflows: false,
          enrolment: { uuid: 'tb-enrolment', dateEnrolled: '2026-11-02', location: { uuid: 'neno', display: 'Neno District Hospital' } },
          workflows: [{ uuid: 'tb-workflow', name: 'TB treatment status', open: false, currentState: null, enrolStates: [], changeStates: [] }],
          enrolStates: [{ uuid: 'tb-on-treatment', name: 'On treatment' }],
        })}
        patientUuid="patient-uuid"
      />,
    );

    expect(screen.getByRole('button', { name: 'Set state' })).toBeInTheDocument();
  });
});

