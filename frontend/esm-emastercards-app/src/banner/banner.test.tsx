import React from 'react';
import { render, screen } from '@testing-library/react';
import { useQuickPrograms } from '../enrolments/enrolments.resource';
import { chronicCareEnrolledInHtnDm, hivOnArt, tbCompleted } from '../enrolments/test-programs';
import { addressLine, BANNER_STYLE } from './banner.resource';
import PatientAddress from './patient-address.extension';
import ProgramTags from './program-tags.extension';

vi.mock('../enrolments/enrolments.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../enrolments/enrolments.resource')>()),
  useQuickPrograms: vi.fn(),
}));

const inChart = () => window.history.pushState({}, '', '/openmrs/spa/patient/p1/chart/Patient%20Summary');

describe('the banner', () => {
  it("tags each program the patient is enrolled in, not those they've left", () => {
    inChart();
    vi.mocked(useQuickPrograms).mockReturnValue({ programs: [hivOnArt(), chronicCareEnrolledInHtnDm(), tbCompleted()] } as never);
    render(<ProgramTags patientUuid="p1" />);
    expect(screen.getByText('HIV')).toBeInTheDocument();
    expect(screen.getByText('Chronic Care')).toBeInTheDocument();
    expect(screen.queryByText('TB')).not.toBeInTheDocument();
  });

  it('shows no tags outside the patient chart, e.g. in search results', () => {
    window.history.pushState({}, '', '/openmrs/spa/home');
    vi.mocked(useQuickPrograms).mockReturnValue({ programs: [hivOnArt()] } as never);
    const { container } = render(<ProgramTags patientUuid="p1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the age and birth date beside the name, before the program tags', () => {
    inChart();
    vi.mocked(useQuickPrograms).mockReturnValue({ programs: [hivOnArt()] } as never);
    const { container } = render(<ProgramTags patientUuid="p1" patient={{ resourceType: 'Patient', birthDate: '1981-01-01' } as fhir.Patient} />);
    expect(container.textContent).toMatch(/^· \d+ yrs · .*1981HIV$/);
  });

  it("shows each identifier with its type, then the village, TA and district, in place of the banner's own line", () => {
    inChart();
    const patient = {
      resourceType: 'Patient',
      identifier: [
        { value: 'NNO 91003', type: { text: 'ARV Number' } },
        { value: 'NNO 91003 CCC', type: { text: 'Chronic Care Number' } },
      ],
      address: [{ city: 'Chifunga', district: 'Symon', state: 'Neno' }],
    } as fhir.Patient;
    const { container } = render(<PatientAddress patient={patient} />);
    expect(screen.getByText('NNO 91003')).toBeInTheDocument();
    expect(container.textContent).toContain('ARV Number NNO 91003Chronic Care Number NNO 91003 CCCVillage: Chifunga · TA: Symon · District: Neno');
    expect(screen.getByTestId('banner-style')).toHaveTextContent('patient-banner-bottom-slot');
    expect(addressLine({ resourceType: 'Patient' } as fhir.Patient)).toBeNull();
  });

  it("the style hides the banner's own details line but not ours, and nothing outside the chart's banner", () => {
    document.body.innerHTML = `
      <div data-extension-slot-name="patient-header-slot">
        <div><span id="age">45 yrs</span><span id="ids">ARV Number</span><div data-extension-slot-name="patient-banner-bottom-slot" id="ours"></div></div>
      </div>
      <div><span id="elsewhere"></span><div data-extension-slot-name="patient-banner-bottom-slot"></div></div>`;
    const hidden = Array.from(document.querySelectorAll(BANNER_STYLE.replace(' { display: none; }', ''))).map((e) => e.id);
    expect(hidden).toEqual(['age', 'ids']);
  });
});
