import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { card } from '../test-cards';
import { type ArtEncounter, useCardEncounters, useEMastercard, useObsOnDays } from '../art/art.resource';
import { PDC_FORMS } from './pdc-concepts';
import { launchConditionPanel } from './launch-pdc-condition-panel';
import { OTHER_DIAGNOSIS_CONDITION } from './other-diagnosis-condition';
import { OTHER_DIAGNOSIS_FORMS } from './other-diagnosis-concepts';
import { otherDiagnosisHeader, otherDiagnosisLabs, otherDiagnosisVisit } from './test-other-diagnosis-data';
import { pdcHeader } from './test-pdc-data';
import PdcConditionCard from './pdc-condition-card.component';

vi.mock('../art/art.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../art/art.resource')>()),
  useEMastercard: vi.fn(),
  useCardEncounters: vi.fn(),
  useObsOnDays: vi.fn(),
}));
const mockLaunch = vi.fn();
vi.mock('./launch-pdc-condition-panel', () => ({ launchConditionPanel: vi.fn(), useLaunchConditionPanel: () => mockLaunch }));

const visits = [
  otherDiagnosisVisit('v2', '2026-10-08', { moderate: true, convulsions: true, poorSuck: true }),
  otherDiagnosisVisit('v1', '2026-09-10'),
];

type Data = Partial<Record<keyof typeof OTHER_DIAGNOSIS_FORMS | 'pdc', Array<ArtEncounter>>>;

function withData(state: 'CREATE' | 'EDIT', data: Data = {}) {
  vi.mocked(useEMastercard).mockReturnValue({
    card: card({ key: 'pdc-other-diagnosis', state, initialEncounterUuid: data.header?.[0]?.uuid ?? null }),
    systemLocationsTag: null,
    isLoading: false,
    error: undefined,
  });
  vi.mocked(useCardEncounters).mockImplementation((_patient, form) => {
    const key =
      form.encounterType === PDC_FORMS.header.encounterType
        ? 'pdc'
        : (Object.keys(OTHER_DIAGNOSIS_FORMS) as Array<keyof typeof OTHER_DIAGNOSIS_FORMS>).find((k) => OTHER_DIAGNOSIS_FORMS[k].encounterType === form.encounterType);
    return { encounters: data[key] ?? [], isLoading: false, error: undefined, mutate: vi.fn() };
  });
  vi.mocked(useObsOnDays).mockReturnValue({});
}

const everything: Data = { header: [otherDiagnosisHeader], visit: visits, labs: [otherDiagnosisLabs], pdc: [pdcHeader] };
const renderCard = () => render(<PdcConditionCard condition={OTHER_DIAGNOSIS_CONDITION} patientUuid="p1" title="Pediatric Development (PDC)" />);

describe('PdcConditionCard for other diagnosis', () => {
  it('names the card, flags moderate malnutrition and has only the patient and guardian details in its header', () => {
    withData('EDIT', everything);
    renderCard();
    expect(screen.getByText(/^Other diagnosis patient card · version 2/)).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Other diagnosis at a glance' })).getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Patient and Guardian Details' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Patient Overview' })).not.toBeInTheDocument();
  });

  it('shows head circumference, convulsions treatment and feeding concerns of the latest visits', () => {
    withData('EDIT', everything);
    renderCard();
    const monitoring = within(screen.getByRole('region', { name: 'Monitoring' }));
    expect(within(monitoring.getByRole('row', { name: /Feeding concerns/ })).getByText('Poor suck, Refuses to feed')).toBeInTheDocument();
    expect(within(monitoring.getByRole('row', { name: /Drug and dose/ })).getByText('Phenobarbitone 15 mg BD, dose adjusted')).toBeInTheDocument();
    const table = within(screen.getByRole('table', { name: 'Other Diagnosis Visits' }));
    expect(table.getAllByText('Group counselling')).toHaveLength(2);
    expect(table.getAllByText('Review in 3 months')).toHaveLength(2);
  });

  it('shows HB on its own date, and edits lab tests in their panel', async () => {
    withData('EDIT', everything);
    renderCard();
    const tests = within(screen.getByRole('region', { name: 'Laboratory Tests' }));
    expect(tests.getByText('11.4 g/dL · 02-Oct-2026')).toBeInTheDocument();
    await userEvent.click(tests.getByRole('button', { name: 'Edit' }));
    expect(launchConditionPanel).toHaveBeenCalledWith(OTHER_DIAGNOSIS_CONDITION, 'labs', { patientUuid: 'p1', encounterUuid: otherDiagnosisLabs.uuid });
  });

  it('has the records every PDC condition card shares', () => {
    withData('EDIT', everything);
    renderCard();
    expect(screen.getByRole('region', { name: 'Radiology Screening' })).toBeInTheDocument();
  });
});
