import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch } from '@openmrs/esm-framework';
import { card } from '../test-cards';
import { useEMastercards } from '../emastercards.resource';
import { ART_FORMS } from '../art/art-concepts';
import EncounterEditWorkspace from './encounter-edit.workspace';

vi.mock('../emastercards.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../emastercards.resource')>()),
  useEMastercards: vi.fn(),
}));

vi.mock('../art/art-visit.workspace', () => ({
  default: ({ workspaceProps }) => <p>Native ART visit panel for {workspaceProps.encounterUuid}</p>,
}));
vi.mock('../art/art-initial.workspace', () => ({
  default: ({ workspaceProps }) => <p>Native card header panel: {workspaceProps.section}</p>,
}));

const mockUseEMastercards = vi.mocked(useEMastercards);
const mockOpenmrsFetch = vi.mocked(openmrsFetch);

const SHARED_FORM = 'aaaaaaaa-0000-0000-0000-000000000001';

function renderWorkspace(encounterUuid = 'encounter-uuid') {
  return render(
    <EncounterEditWorkspace
      workspaceProps={{ form: { uuid: SHARED_FORM }, encounterUuid }}
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

  it('encounter-edit opens the native ART panel for ART encounter types and the flowsheet for others', async () => {
    withCards(card({ key: 'art', state: 'EDIT' }));
    mockOpenmrsFetch.mockResolvedValue({
      data: { uuid: 'art-visit-uuid', form: { uuid: 'z-deprecated-form' }, encounterType: { uuid: ART_FORMS.visit.encounterType } },
    } as any);
    renderWorkspace('art-visit-uuid');
    expect(await screen.findByText('Native ART visit panel for art-visit-uuid')).toBeInTheDocument();
    expect(screen.queryByTitle('ART eMastercard')).not.toBeInTheDocument();
  });

  it('asks which part of the card header to edit for an ART initial encounter', async () => {
    withCards(card({ key: 'art', state: 'EDIT' }));
    mockOpenmrsFetch.mockResolvedValue({
      data: { uuid: 'art-initial-uuid', form: null, encounterType: { uuid: ART_FORMS.initial.encounterType } },
    } as any);
    renderWorkspace('art-initial-uuid');
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmatory HIV test' }));
    expect(screen.getByText('Native card header panel: confirmatoryTest')).toBeInTheDocument();
  });
});
