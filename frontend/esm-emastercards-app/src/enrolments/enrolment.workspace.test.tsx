import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch } from '@openmrs/esm-framework';
import { chronicCare, chronicCareEnrolledInHtnDm } from './test-programs';
import { type EnrolmentMode } from './enrolments.resource';
import EnrolmentWorkspace from './enrolment.workspace';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

function renderPanel(program, mode: EnrolmentMode, closeWorkspace = vi.fn()) {
  render(
    <EnrolmentWorkspace
      workspaceProps={{ program, mode, patientUuid: 'patient-uuid' }}
      groupProps={null}
      windowProps={null}
      closeWorkspace={closeWorkspace}
      launchChildWorkspace={vi.fn()}
      workspaceName="pihmalawi-enrolment-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
  return closeWorkspace;
}

function postedBodies() {
  return mockOpenmrsFetch.mock.calls.filter(([, init]) => init?.method === 'POST').map(([url, init]) => [url, init.body]);
}

describe('EnrolmentWorkspace', () => {
  beforeEach(() => {
    mockOpenmrsFetch.mockImplementation((url: string) =>
      Promise.resolve({
        data: url.includes('/location') ? { results: [{ uuid: 'neno', display: 'Neno District Hospital' }] } : {},
      } as any),
    );
  });

  it('enrols in only the conditions chosen, each in its own state', async () => {
    const closeWorkspace = renderPanel(chronicCare(), 'enrol');

    await userEvent.click(screen.getByRole('checkbox', { name: 'Chronic Lung Disease' }));
    await userEvent.selectOptions(screen.getByLabelText('Chronic Lung Disease state'), 'asthma-on-treatment');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(closeWorkspace).toHaveBeenCalled());
    const [[url, body]] = postedBodies();
    expect(url).toContain('/pihmalawi/quickprograms/enrol');
    expect(body).toMatchObject({ patient: 'patient-uuid', program: 'chronic-care', states: ['asthma-on-treatment'] });
  });

  it('asks where to for a transfer out, and warns that exiting ends the whole enrolment', async () => {
    renderPanel(chronicCareEnrolledInHtnDm(), 'exit');

    expect(screen.getByText('This ends the whole Chronic Care Program enrolment.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Transferred to')).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Exit with'), 'htn-dm-transferred');
    expect(screen.getByLabelText('Transferred to')).toBeInTheDocument();
  });

  it('keeps the panel open with the server message when saving fails', async () => {
    mockOpenmrsFetch.mockImplementation((url: string, init?: any) =>
      init?.method === 'POST'
        ? Promise.reject({ responseBody: { error: { message: 'The date can’t be in the future' } } })
        : Promise.resolve({ data: { results: [] } } as any),
    );
    const closeWorkspace = renderPanel(chronicCareEnrolledInHtnDm(), 'change');

    await userEvent.selectOptions(screen.getByLabelText('Hypertension and Diabetes state'), 'htn-dm-advanced');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('The date can’t be in the future')).toBeInTheDocument();
    expect(closeWorkspace).not.toHaveBeenCalled();
  });

  it('counts a condition whose state is chosen as ticked', async () => {
    const closeWorkspace = renderPanel(chronicCare(), 'enrol');

    await userEvent.selectOptions(screen.getByLabelText('Chronic Lung Disease state'), 'asthma-on-treatment');
    expect(screen.getByRole('checkbox', { name: 'Chronic Lung Disease' })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(closeWorkspace).toHaveBeenCalled());
    expect(postedBodies()[0][1]).toMatchObject({ states: ['asthma-on-treatment'] });
  });

  it('asks for a state for a ticked condition without one', async () => {
    const closeWorkspace = renderPanel(chronicCare(), 'enrol');

    await userEvent.click(screen.getByRole('checkbox', { name: 'Hypertension and Diabetes' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Choose a state for Hypertension and Diabetes')).toBeInTheDocument();
    expect(postedBodies()).toEqual([]);
    expect(closeWorkspace).not.toHaveBeenCalled();
  });

  it('changes several conditions in one request', async () => {
    const program = chronicCareEnrolledInHtnDm();
    program.workflows[1] = {
      ...program.workflows[1],
      open: true,
      currentState: { uuid: 'asthma-on-treatment', name: 'On treatment', startDate: '2026-11-02' },
      enrolStates: [],
      changeStates: [{ uuid: 'asthma-advanced', name: 'In advanced care' }],
    };
    const closeWorkspace = renderPanel(program, 'change');

    await userEvent.selectOptions(screen.getByLabelText('Hypertension and Diabetes state'), 'htn-dm-advanced');
    await userEvent.selectOptions(screen.getByLabelText('Chronic Lung Disease state'), 'asthma-advanced');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(closeWorkspace).toHaveBeenCalled());
    const posts = postedBodies();
    expect(posts).toHaveLength(1);
    expect(posts[0][0]).toContain('/pihmalawi/quickprograms/change');
    expect(posts[0][1]).toMatchObject({ patientProgram: 'enrolment-uuid', states: ['htn-dm-advanced', 'asthma-advanced'] });
  });
});

