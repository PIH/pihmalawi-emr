import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { card } from '../test-cards';
import EMastercardRow from './emastercard-row.component';

const mockLaunchWorkspace2 = vi.mocked(launchWorkspace2);

describe('EMastercardRow', () => {
  it('offers to create a card on a date, today by default', async () => {
    render(<EMastercardRow card={card({ state: 'CREATE' })} patientUuid="patient-uuid" />);

    expect(screen.getByLabelText('Encounter date')).toHaveValue(dayjs().format('YYYY-MM-DD'));
    await userEvent.click(screen.getByRole('button', { name: 'Create new ART eMastercard' }));

    expect(mockLaunchWorkspace2).toHaveBeenCalledWith(
      'pihmalawi-emastercard-flowsheet-workspace',
      expect.objectContaining({
        patientUuid: 'patient-uuid',
        url: expect.stringContaining(`&embedded=true&encounterDate=${dayjs().format('YYYY-MM-DD')}`),
      }),
    );
  });

  it('offers to edit an existing card, with when it was created, last visited and the appointment', () => {
    render(
      <EMastercardRow
        card={card({
          state: 'EDIT',
          created: '2026-01-05',
          lastVisit: '2026-02-05',
          lastVisitLocation: 'Neno District Hospital',
          appointment: '2026-03-05',
        })}
        patientUuid="patient-uuid"
      />,
    );

    expect(screen.getByRole('button', { name: 'Edit ART eMastercard' })).toBeInTheDocument();
    expect(
      screen.getByText('Created: 05-Jan-2026, Visited: 05-Feb-2026 at Neno District Hospital, Appointment: 05-Mar-2026'),
    ).toBeInTheDocument();
  });

  it('opens a card the user may only view read-only, and says why', async () => {
    render(
      <EMastercardRow
        card={card({ state: 'VIEW', created: '2026-01-05', message: 'Readonly: Inactive program state' })}
        patientUuid="patient-uuid"
      />,
    );

    expect(screen.getByText('Created: 05-Jan-2026, Visited: no, Appointment: none')).toBeInTheDocument();
    expect(screen.getByText('Readonly: Inactive program state')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'View ART eMastercard' }));
    expect(mockLaunchWorkspace2).toHaveBeenCalledWith(
      'pihmalawi-emastercard-flowsheet-workspace',
      expect.objectContaining({ url: expect.stringContaining('&embedded=true&viewOnly=true') }),
    );
  });

  it('shows why an unavailable card is not available, with nothing to click', () => {
    render(
      <EMastercardRow
        card={card({ state: 'UNAVAILABLE', message: 'Not available: Inactive program state (ART eMastercard)' })}
        patientUuid="patient-uuid"
      />,
    );

    expect(screen.getByText('Not available: Inactive program state (ART eMastercard)')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
