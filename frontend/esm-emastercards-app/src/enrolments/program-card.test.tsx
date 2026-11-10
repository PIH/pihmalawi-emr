import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { chronicCare, chronicCareEnrolledInHtnDm, hivOnArt, tbCompleted } from './test-programs';
import ProgramCard from './program-card.component';

const mockLaunchWorkspace2 = vi.mocked(launchWorkspace2);

/** The card's label and value pairs, e.g. [['State', 'On antiretrovirals'], …] */
const fields = () => {
  const items = within(screen.getByRole('region')).getAllByRole('term');
  return items.map((dt) => [dt.textContent, dt.nextElementSibling?.textContent]);
};

describe('ProgramCard', () => {
  it("shows an active single-workflow program's state, since when, where and its page", () => {
    render(<ProgramCard program={hivOnArt()} patientUuid="patient-uuid" />);

    expect(screen.getByRole('heading', { name: 'HIV Program' })).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(fields()).toEqual([
      ['State', 'On antiretrovirals'],
      ['Since', '18-Feb-2019'],
      ['Enrolled', '18-Feb-2019'],
      ['Location', 'Neno District Hospital'],
      ['Page', 'HIV Care'],
    ]);
    expect(screen.getByRole('link', { name: 'HIV Care' })).toHaveAttribute('href', expect.stringContaining('patient/patient-uuid/chart/hivCare'));
  });

  it("shows each condition's state, and offers to change it, add a condition or exit", async () => {
    render(<ProgramCard program={chronicCareEnrolledInHtnDm()} patientUuid="patient-uuid" />);

    expect(fields()).toEqual([
      ['Hypertension and Diabetes', 'On treatment · 02-Nov-2026'],
      ['Enrolled', '02-Nov-2026'],
      ['Location', 'Neno District Hospital'],
      ['Page', 'Chronic Care'],
    ]);
    for (const name of ['Change state', 'Add condition', 'Exit program']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    await userEvent.click(screen.getByRole('button', { name: 'Exit program' }));
    expect(mockLaunchWorkspace2).toHaveBeenCalledWith('pihmalawi-enrolment-workspace', expect.objectContaining({ mode: 'exit' }));
  });

  it('shows a completed program with its outcome and dates, and offers to enrol again', async () => {
    render(<ProgramCard program={tbCompleted()} patientUuid="patient-uuid" />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(fields()).toEqual([
      ['Outcome', 'Treatment complete'],
      ['Dates', '03-Mar-2021 – 01-Sep-2021'],
      ['Location', 'Neno District Hospital'],
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'Enrol again' }));
    expect(mockLaunchWorkspace2).toHaveBeenCalledWith('pihmalawi-enrolment-workspace', expect.objectContaining({ mode: 'enrol' }));
  });

  it('shows Treatment completed for an enrolment completed with no outcome recorded', () => {
    const tb = tbCompleted();
    render(<ProgramCard program={{ ...tb, lastEnrolment: { ...tb.lastEnrolment, exitState: null } }} patientUuid="patient-uuid" />);

    expect(fields()[0]).toEqual(['Outcome', 'Treatment completed']);
  });

  it('offers nothing when Quick Programs has nothing available', () => {
    render(<ProgramCard program={hivOnArt({ available: false })} patientUuid="patient-uuid" />);

    expect(screen.getByText('Not available')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers nothing to a user who may not edit patients', () => {
    render(<ProgramCard program={hivOnArt({ canEdit: false })} patientUuid="patient-uuid" />);

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
