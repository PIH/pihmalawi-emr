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

  it('shows the vitals header on the patient summary and vitals pages', () => {
    for (const page of ['patient-summary', 'vitals-and-biometrics', 'visits']) {
      goTo(`/openmrs/spa/patient/patient-uuid/chart/${page}`);
      const { unmount } = render(<VitalsHeaderOnSomePages patientUuid="patient-uuid" />);
      expect(screen.getByText('slot pihmalawi-vitals-header-slot')).toBeInTheDocument();
      unmount();
    }
  });

  it('hides it on the Programs, Enrolments, eMastercards and card pages, as the cards show their own headlines', () => {
    for (const page of ['programs', 'Programs', 'enrolments', 'eMastercards', 'hivCare', 'mentalHealth', 'chronicCare', 'chronicCare?card=ckd']) {
      goTo(`/openmrs/spa/patient/patient-uuid/chart/${page}`);
      const { unmount } = render(<VitalsHeaderOnSomePages patientUuid="patient-uuid" />);
      expect(screen.queryByText('slot pihmalawi-vitals-header-slot')).not.toBeInTheDocument();
      unmount();
    }
  });

  it('follows the user from page to page', () => {
    goTo('/openmrs/spa/patient/patient-uuid/chart/patient-summary');
    render(<VitalsHeaderOnSomePages patientUuid="patient-uuid" />);
    expect(screen.getByText('slot pihmalawi-vitals-header-slot')).toBeInTheDocument();

    act(() => {
      goTo('/openmrs/spa/patient/patient-uuid/chart/enrolments');
      window.dispatchEvent(new Event('single-spa:routing-event'));
    });
    expect(screen.queryByText('slot pihmalawi-vitals-header-slot')).not.toBeInTheDocument();
  });

  it('hides the patient banner\'s Show more / Show less button on the programs, enrolments, eMastercards and card pages only', () => {
    for (const page of ['programs', 'enrolments', 'eMastercards', 'hivCare', 'mentalHealth', 'chronicCare']) {
      goTo(`/openmrs/spa/patient/patient-uuid/chart/${page}`);
      const { unmount } = render(<VitalsHeaderOnSomePages patientUuid="patient-uuid" />);
      expect(screen.getByTestId('hide-banner-details')).toHaveTextContent('[data-extension-slot-name="patient-header-slot"]');
      unmount();
    }
    goTo('/openmrs/spa/patient/patient-uuid/chart/patient-summary');
    render(<VitalsHeaderOnSomePages patientUuid="patient-uuid" />);
    expect(screen.queryByTestId('hide-banner-details')).not.toBeInTheDocument();
  });

  it('the style hides only the banner\'s chevron button', () => {
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

