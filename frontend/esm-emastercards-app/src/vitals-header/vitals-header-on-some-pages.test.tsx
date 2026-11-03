import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { ExtensionSlot, getDefaultsFromConfigSchema, useConfig } from '@openmrs/esm-framework';
import { configSchema } from '../config-schema';
import VitalsHeaderOnSomePages from './vitals-header-on-some-pages.extension';

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

  it('hides it on the Programs, Enrolments and eMastercards pages', () => {
    for (const page of ['programs', 'Programs', 'enrolments', 'eMastercards']) {
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
});
