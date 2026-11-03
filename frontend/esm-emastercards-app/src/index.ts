import { defineConfigSchema, getAsyncLifecycle, getSyncLifecycle } from '@openmrs/esm-framework';
import emastercardsDashboardLinkComponent from './dashboard/emastercards-dashboard-link.component';
import enrolmentsDashboardLinkComponent from './enrolments/enrolments-dashboard-link.component';
import { configSchema } from './config-schema';

const moduleName = '@pihmalawi/esm-emastercards-app';

const options = {
  featureName: 'pihmalawi-emastercards',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const emastercardsDashboardLink = getSyncLifecycle(emastercardsDashboardLinkComponent, options);

export const emastercardsDashboard = getAsyncLifecycle(
  () => import('./dashboard/emastercards-dashboard.component'),
  options,
);

export const flowsheetWorkspace = getAsyncLifecycle(() => import('./workspace/flowsheet.workspace'), options);

/** Opened by the chart's "Edit this encounter": shows the eMastercard the encounter belongs to */
export const encounterEditWorkspace = getAsyncLifecycle(() => import('./workspace/encounter-edit.workspace'), options);

export const enrolmentsDashboardLink = getSyncLifecycle(enrolmentsDashboardLinkComponent, options);

export const enrolmentsDashboard = getAsyncLifecycle(() => import('./enrolments/enrolments-dashboard.component'), options);

/** Enrolls, changes state or exits, for the Enrolments page's program cards */
export const enrolmentWorkspace = getAsyncLifecycle(() => import('./enrolments/enrolment.workspace'), options);

/** The vitals and biometrics header, on every chart page but those in pagesWithoutVitalsHeader */
export const vitalsHeaderOnSomePages = getAsyncLifecycle(
  () => import('./vitals-header/vitals-header-on-some-pages.extension'),
  options,
);

/** Each vital and biometric from the latest time it was recorded, for the vitals header */
export const latestVitals = getAsyncLifecycle(() => import('./vitals-header/latest-vitals.extension'), options);

/** The latest viral load and CD4 count, under the vitals header, for patients in the HIV program */
export const hivSummary = getAsyncLifecycle(() => import('./vitals-header/hiv-summary.extension'), options);
