import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { card } from '../test-cards';
import { useCardEncounters, useEMastercard } from '../art/art.resource';
import { launchPdcPanel } from './launch-pdc-panel';
import { pdcHeader } from './test-pdc-data';
import PdcCard from './pdc-card.component';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
}));
vi.mock('./launch-pdc-panel', () => ({ launchPdcPanel: vi.fn() }));

function withData(state: 'CREATE' | 'EDIT' | 'VIEW', header = pdcHeader as typeof pdcHeader | null) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({
      key: 'pdc',
      group: 'Pediatric Development Clinic Record',
      label: 'PDC eMastercard',
      state,
      initialEncounterUuid: header?.uuid ?? null,
      enrolment: {
        uuid: 'pp1',
        program: 'Pediatric Development Clinic Program',
        dateEnrolled: '2026-03-12',
        dateCompleted: null,
        location: { uuid: 'neno-dh', display: 'Neno District Hospital' },
        state: { name: 'On treatment', startDate: '2026-03-12' },
      },
    }),
    systemLocationsTag: null,
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockReturnValue({ encounters: header ? [header] : [], isLoading: false, error: undefined, mutate: vi.fn() });
}

const renderCard = () => render(<PdcCard patientUuid="p1" title="Pediatric Development (PDC)" />);

describe('PdcCard', () => {
  it('names the card, with the state of its treatment workflow', () => {
    withData('EDIT');
    renderCard();
    expect(screen.getByText('PDC patient card · version 2 · On treatment since 12-Mar-2026 at Neno District Hospital')).toBeInTheDocument();
  });

  it('shows the headline: conditions at enrolment, reasons for referral, age at intake and treatment status', () => {
    withData('EDIT');
    renderCard();
    const headline = within(screen.getByRole('region', { name: 'PDC at a glance' }));
    expect(headline.getByText('HIE, Low birth weight')).toBeInTheDocument();
    expect(headline.getByText('HIE, CNS infection')).toBeInTheDocument();
    expect(headline.getByText('52 weeks')).toBeInTheDocument();
    expect(headline.getByText('On treatment')).toBeInTheDocument();
  });

  it('lists the reasons for referral, with what a CNS infection was, and the types of feed of their group', () => {
    withData('EDIT');
    renderCard();
    const referral = within(screen.getByRole('region', { name: 'Referral' }));
    expect(referral.getByText('CNS infection (meningitis)')).toBeInTheDocument();
    expect(referral.getByText('Health center')).toBeInTheDocument();
    const history = within(screen.getByRole('region', { name: 'History of Illness and Feeding' }));
    expect(history.getByText('Breast milk, Solids')).toBeInTheDocument();
    const patient = within(screen.getByRole('region', { name: 'Patient and Guardian Details' }));
    expect(patient.getByText('Weeks · 52')).toBeInTheDocument();
  });

  it('edits each section in its panel, and starts the card until it has a header', async () => {
    withData('EDIT');
    const { unmount } = renderCard();
    await userEvent.click(within(screen.getByRole('region', { name: 'Summary' })).getByRole('button', { name: 'Edit' }));
    expect(launchPdcPanel).toHaveBeenCalledWith({ patientUuid: 'p1', section: 'summary' });
    unmount();
    withData('CREATE', null);
    renderCard();
    expect(screen.getByText(/Start the card first/)).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('region', { name: 'Referral' })).getByRole('button', { name: 'Start the card' }));
    expect(launchPdcPanel).toHaveBeenCalledWith({ patientUuid: 'p1', section: 'start' });
  });

  it('is read-only when the card can only be viewed', () => {
    withData('VIEW');
    renderCard();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });
});
