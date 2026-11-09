import { defineConfigSchema, getAsyncLifecycle, getSyncLifecycle } from '@openmrs/esm-framework';
import emastercardsDashboardLinkComponent from './dashboard/emastercards-dashboard-link.component';
import enrolmentsDashboardLinkComponent from './enrolments/enrolments-dashboard-link.component';
import hivCareDashboardLinkComponent from './art/hiv-care-dashboard-link.component';
import mentalHealthDashboardLinkComponent from './mental-health/mental-health-dashboard-link.component';
import chronicCareDashboardLinkComponent from './chronic-care/chronic-care-dashboard-link.component';
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

export const hivCareDashboardLink = getSyncLifecycle(hivCareDashboardLinkComponent, options);

export const mentalHealthDashboardLink = getSyncLifecycle(mentalHealthDashboardLinkComponent, options);

export const mentalHealthDashboard = getAsyncLifecycle(
  () => import('./mental-health/mental-health-dashboard.component'),
  options,
);

/** The ART patient card, natively: its header sections, regimens, results and ART visits */
export const hivCareDashboard = getAsyncLifecycle(() => import('./art/hiv-care-dashboard.component'), options);

/** Records or edits an ART visit natively */
export const artVisitWorkspace = getAsyncLifecycle(() => import('./art/art-visit.workspace'), options);

/** Edits a section of the ART card header (its ART initial encounter) natively */
export const artInitialWorkspace = getAsyncLifecycle(() => import('./art/art-initial.workspace'), options);

/** Records or edits a viral load test natively */
export const viralLoadWorkspace = getAsyncLifecycle(() => import('./art/viral-load.workspace'), options);

/** Records or edits ART follow-up tests natively */
export const followUpTestingWorkspace = getAsyncLifecycle(() => import('./art/follow-up-testing.workspace'), options);

export const mhHeaderWorkspace = getAsyncLifecycle(() => import('./mental-health/mh-header.workspace'), options);

export const mhVisitWorkspace = getAsyncLifecycle(() => import('./mental-health/mh-visit.workspace'), options);

export const mhScreeningWorkspace = getAsyncLifecycle(() => import('./mental-health/mh-screening.workspace'), options);

/** Edits a section of the epilepsy card header natively */
export const epHeaderWorkspace = getAsyncLifecycle(() => import('./epilepsy/ep-header.workspace'), options);

/** Records or edits an epilepsy visit natively */
export const epVisitWorkspace = getAsyncLifecycle(() => import('./epilepsy/ep-visit.workspace'), options);

export const chronicCareDashboardLink = getSyncLifecycle(chronicCareDashboardLinkComponent, options);

/** The Chronic Care Record: the hypertension and diabetes card natively, the other chronic care cards' flowsheets */
export const chronicCareDashboard = getAsyncLifecycle(() => import('./chronic-care/chronic-care-dashboard.component'), options);

/** Edits a section of the hypertension and diabetes card header natively */
export const htnHeaderWorkspace = getAsyncLifecycle(() => import('./chronic-care/htn-header.workspace'), options);

/** Records or edits a hypertension and diabetes visit natively */
export const htnVisitWorkspace = getAsyncLifecycle(() => import('./chronic-care/htn-visit.workspace'), options);

/** Records or edits the hypertension and diabetes quarterly laboratory tests natively */
export const htnQuarterlyLabsWorkspace = getAsyncLifecycle(() => import('./chronic-care/htn-quarterly-labs.workspace'), options);

/** Records or edits the hypertension and diabetes annual laboratory tests natively */
export const htnAnnualLabsWorkspace = getAsyncLifecycle(() => import('./chronic-care/htn-annual-labs.workspace'), options);

/** Records or edits a hypertension and diabetes hospitalisation natively */
export const htnHospitalisationWorkspace = getAsyncLifecycle(() => import('./chronic-care/htn-hospitalisation.workspace'), options);

/** The vitals and biometrics header, on every chart page but those in pagesWithoutVitalsHeader */
export const vitalsHeaderOnSomePages = getAsyncLifecycle(
  () => import('./vitals-header/vitals-header-on-some-pages.extension'),
  options,
);

/** Each vital and biometric from the latest time it was recorded, for the vitals header */
export const latestVitals = getAsyncLifecycle(() => import('./vitals-header/latest-vitals.extension'), options);

/** The latest viral load and CD4 count, under the vitals header, for patients in the HIV program */
export const hivSummary = getAsyncLifecycle(() => import('./vitals-header/hiv-summary.extension'), options);
