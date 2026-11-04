import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch } from '@openmrs/esm-framework';
import { card } from '../test-cards';
import { useEMastercards } from '../emastercards.resource';
import EncounterEditWorkspace from './encounter-edit.workspace';

vi.mock('../emastercards.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../emastercards.resource')>()),
  useEMastercards: vi.fn(),
}));

const mockUseEMastercards = vi.mocked(useEMastercards);
const mockOpenmrsFetch = vi.mocked(openmrsFetch);

const SHARED_FORM = 'aaaaaaaa-0000-0000-0000-000000000001';

function renderWorkspace() {
  return render(
    <EncounterEditWorkspace
      workspaceProps={{ form: { uuid: SHARED_FORM }, encounterUuid: 'encounter-uuid' }}
      groupProps={{ patientUuid: 'patient-uuid' }}
      windowProps={null}
      closeWorkspace={vi.fn()}
      launchChildWorkspace={vi.fn()}
      workspaceName="patient-form-entry-workspace"
      windowName="pihmalawi-emastercard-window"
      isRootWorkspace
      showActionMenu={false}
    />,
  );
}

describe('EncounterEditWorkspace', () => {
  beforeEach(() => {
    mockOpenmrsFetch.mockResolvedValue({
      data: { uuid: 'encounter-uuid', form: { uuid: SHARED_FORM }, encounterType: { uuid: 'some-type' } },
    } as any);
  });

  function withCards(...cards) {
    mockUseEMastercards.mockReturnValue({ systemLocationsTag: null, cards, isLoading: false, error: undefined, mutate: vi.fn() });
  }

  it("opens the encounter's eMastercard", async () => {
    withCards(card({ key: 'art', label: 'ART eMastercard', state: 'EDIT', formUuids: [SHARED_FORM] }));
    renderWorkspace();

    const frame = await screen.findByTitle('ART eMastercard');
    expect(frame.getAttribute('src')).toContain('&embedded=true');
  });

  it('asks which eMastercard to open when the encounter belongs to several', async () => {
    withCards(
      card({ key: 'pdc-trisomy', label: 'PDC Trisomy eMastercard', state: 'EDIT', formUuids: [SHARED_FORM] }),
      card({ key: 'pdc-cleft', label: 'PDC Cleft Lip / Palate eMastercard', state: 'EDIT', formUuids: [SHARED_FORM] }),
    );
    renderWorkspace();

    await userEvent.click(await screen.findByRole('button', { name: 'PDC Cleft Lip / Palate eMastercard' }));
    expect(screen.getByTitle('PDC Cleft Lip / Palate eMastercard')).toBeInTheDocument();
    expect(screen.queryByTitle('PDC Trisomy eMastercard')).not.toBeInTheDocument();
  });

  it('says when the encounter cannot be edited in the chart, with a link to the legacy dashboard', async () => {
    withCards(card({ state: 'UNAVAILABLE', formUuids: [SHARED_FORM] }));
    renderWorkspace();

    expect(await screen.findByText(/This encounter can't be edited here/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /patient dashboard/i })).toHaveAttribute(
      'href',
      expect.stringContaining('patientDashboard.form?patientId=patient-uuid'),
    );
  });
});
