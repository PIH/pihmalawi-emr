import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { ExtensionSlot, getDefaultsFromConfigSchema, useConfig } from '@openmrs/esm-framework';
import { configSchema } from '../config-schema';
import VitalsHeaderOnSomePages, { HIDE_BANNER_DETAILS } from './vitals-header-on-some-pages.extension';

const mockExtensionSlot = vi.mocked(ExtensionSlot);
const mockUseConfig = vi.mocked(useConfig);

function goTo(path: string) {
  window.history.pushState({}, '', path);
}

describe('VitalsHeaderOnSomePages', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue(getDefaultsFromConfigSchema(configSchema));
    mockExtensionSlot.mockImplementation(({ name }) => <div>slot {name}</div>);
  });

  const pages = ['', 'Patient Summary', 'patient-summary', 'vitals-and-biometrics', 'Visits', 'programs', 'enrolments', 'hivCare', 'chronicCare'];

  it('by default shows no vitals header on any page: the patient summary shows the vitals in a card of its own', () => {
    for (const page of pages) {
      goTo(`/openmrs/spa/patient/patient-uuid/chart/${page}`);
      const { unmount } = render(<VitalsHeaderOnSomePages patientUuid="patient-uuid" />);
      expect(screen.queryByText('slot pihmalawi-vitals-header-slot')).not.toBeInTheDocument();
      unmount();
    }
  });

  it("by default hides the banner's Show more / Show less button on every page, the chart's own address too", () => {
    for (const page of pages) {
      goTo(`/openmrs/spa/patient/patient-uuid/chart/${page}`);
      const { unmount } = render(<VitalsHeaderOnSomePages patientUuid="patient-uuid" />);
      expect(screen.getByTestId('hide-banner-details')).toHaveTextContent('[data-extension-slot-name="patient-header-slot"]');
      unmount();
    }
  });

  it('can still be configured page by page, following the user from page to page', () => {
    mockUseConfig.mockReturnValue({ pagesWithoutVitalsHeader: ['enrolments'], pagesWithoutBannerDetails: ['enrolments'] } as never);
    goTo('/openmrs/spa/patient/patient-uuid/chart/visits');
    render(<VitalsHeaderOnSomePages patientUuid="patient-uuid" />);
    expect(screen.getByText('slot pihmalawi-vitals-header-slot')).toBeInTheDocument();
    expect(screen.queryByTestId('hide-banner-details')).not.toBeInTheDocument();

    act(() => {
      goTo('/openmrs/spa/patient/patient-uuid/chart/enrolments');
      window.dispatchEvent(new Event('single-spa:routing-event'));
    });
    expect(screen.queryByText('slot pihmalawi-vitals-header-slot')).not.toBeInTheDocument();
    expect(screen.getByTestId('hide-banner-details')).toBeInTheDocument();
  });

  it("the style hides only the banner's chevron button", () => {
    document.body.innerHTML = `
      <div data-extension-slot-name="patient-header-slot">
        <button id="toggle">Show more<svg><use href="#omrs-icon-chevron-down"></use></svg></button>
        <button id="other">Start visit</button>
      </div>
      <button id="elsewhere">More<svg><use href="#omrs-icon-chevron-down"></use></svg></button>`;
    const matched = Array.from(document.querySelectorAll(HIDE_BANNER_DETAILS.replace(' { display: none; }', ''))).map((e) => e.id);
    expect(matched).toEqual(['toggle']);
  });
});
