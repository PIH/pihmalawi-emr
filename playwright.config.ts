import { devices, type PlaywrightTestConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

const config: PlaywrightTestConfig = {
  testDir: './e2e/specs',
  timeout: 3 * 60 * 1000,
  expect: {
    timeout: 40 * 1000,
  },
  fullyParallel: true,
  // Pinned to 1 worker: this OpenMRS instance's webservices.rest stack has a
  // verified concurrency bug under simultaneous multi-step REST writes (e.g.
  // two concurrent create-patient-then-enroll chains) — reproduced directly
  // via raw concurrent curl requests, outside Playwright entirely, ~50%
  // failure rate ("Patient is required" on a POST that demonstrably included
  // a valid patient uuid). Not a bug in this test suite's code. Revisit if
  // the underlying OpenMRS/webservices.rest race is ever root-caused and fixed.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['junit', { outputFile: 'results.xml' }], ['html']] : [['html']],
  globalSetup: require.resolve('./e2e/core/global-setup'),
  use: {
    // Trailing slash is required: Playwright/WHATWG URL resolution treats a
    // baseURL's path as a "file", not a directory, without one — a relative
    // page.goto('admin/foo.form') would otherwise resolve to
    // http://host:port/admin/foo.form, silently dropping "/openmrs".
    baseURL: `${process.env.E2E_BASE_URL}/`,
    storageState: 'e2e/storageState.json',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
};

export default config;
