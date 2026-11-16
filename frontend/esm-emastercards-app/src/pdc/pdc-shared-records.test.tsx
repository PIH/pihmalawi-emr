import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCardEncounters } from '../art/art.resource';
import { encounter, obs } from '../chronic-care/test-htn-data';
import { launchPdcSharedPanel } from './launch-pdc-shared-panel';
import { PDC_SHARED, PDC_SHARED_FORMS } from './pdc-shared-forms';
import PdcSharedRecords from './pdc-shared-records.component';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useCardEncounters: vi.fn(),
}));
const mockLaunch = vi.fn();
vi.mock('./launch-pdc-shared-panel', () => ({ launchPdcSharedPanel: vi.fn(), useLaunchPdcSharedPanel: () => mockLaunch }));

const hearing = encounter('pdc-hearing-1', '2026-08-20', [
  obs(PDC_SHARED.leftEar, PDC_SHARED.passFail[0].value),
  obs(PDC_SHARED.rightEar, PDC_SHARED.passFail[1].value),
]);
const hospitalisation = encounter('pdc-hosp-1', '2026-09-01', [obs(PDC_SHARED.lengthOfStay, 4), obs(PDC_SHARED.admissionReason, 'Seizures')]);

function setUp() {
  vi.mocked(useCardEncounters).mockImplementation((_p, form) => ({
    encounters: form === PDC_SHARED_FORMS.hearing ? [hearing] : form === PDC_SHARED_FORMS.hospitalisation ? [hospitalisation] : [],
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }));
}

describe('PdcSharedRecords', () => {
  it('shows each shared form as a table, with the length of stay older hospitalisations hold', () => {
    setUp();
    render(<PdcSharedRecords patientUuid="p1" cardKey="pdc-developmental-delay" canRecord canEdit />);
    ['Hospitalisation History', 'Complications', 'Vision Test', 'Hearing Test', 'Radiology Screening'].forEach((name) =>
      expect(screen.getByRole('region', { name })).toBeInTheDocument(),
    );
    const hearingRow = within(screen.getByRole('table', { name: 'Hearing Test' })).getAllByRole('row')[1];
    expect(hearingRow).toHaveTextContent('20-Aug-2026PassFail');
    expect(within(screen.getByRole('table', { name: 'Hospitalisation History' })).getByText('4 days')).toBeInTheDocument();
  });

  it('records and edits each in its panel, from the card showing them', async () => {
    setUp();
    render(<PdcSharedRecords patientUuid="p1" cardKey="pdc-developmental-delay" canRecord canEdit />);
    const hearingCard = within(screen.getByRole('region', { name: 'Hearing Test' }));
    await userEvent.click(hearingCard.getByRole('button', { name: 'Record' }));
    expect(mockLaunch).toHaveBeenCalledWith('hearing');
    await userEvent.click(hearingCard.getByRole('button', { name: 'Edit' }));
    expect(launchPdcSharedPanel).toHaveBeenCalledWith({ patientUuid: 'p1', form: 'hearing', cardKey: 'pdc-developmental-delay', encounterUuid: hearing.uuid });
  });

  it('offers neither until the card can be changed', () => {
    setUp();
    render(<PdcSharedRecords patientUuid="p1" cardKey="pdc-developmental-delay" canRecord={false} canEdit={false} />);
    expect(screen.queryByRole('button', { name: 'Record' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });
});
