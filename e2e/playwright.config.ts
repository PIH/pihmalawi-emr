import { devices, type PlaywrightTestConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

const config: PlaywrightTestConfig = {
  testDir: './specs',
  timeout: 3 * 60 * 1000,
  expect: {
    timeout: 40 * 1000,
  },
  fullyParallel: true,
  // Still pinned to 1 worker — NOT the same reason as before. The original
  // REST-level concurrency bug (concurrent create-patient-then-enroll chains
  // failing with a spurious "Patient is required") was root-caused to
  // openmrs-module-namephonetics (an unsafe write inside a Hibernate
  // pre-commit hook, not webservices.rest) and a fix was validated directly
  // against this repo's REST API (raw concurrent curl, 0/24 failures) — see
  // ~/environments/claude/2026-09-18-openmrs-rest-concurrency-bug-investigation.md.
  // But re-validating the actual Playwright suite under real parallelism
  // surfaced a SECOND, separate, still-unresolved flake: `save()`'s
  // `expectSaveSuccess()` step can intermittently see the "Back to
  // Dashboard" link stuck at `visibility: hidden` for the full 40s
  // assertion timeout under real parallel load (~1/12 runs observed) — a
  // different mechanism than the noTabletsGiven stale-error race already
  // fixed in mastercard-page.ts's save(). Root cause not yet found. Revisit
  // removing this pin once that second flake is also fixed and the suite
  // has been stress-tested clean across many real-parallel runs.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['junit', { outputFile: 'results.xml' }], ['html']] : [['html']],
  globalSetup: require.resolve('./core/global-setup'),
  use: {
    // Trailing slash is required: Playwright/WHATWG URL resolution treats a
    // baseURL's path as a "file", not a directory, without one — a relative
    // page.goto('admin/foo.form') would otherwise resolve to
    // http://host:port/admin/foo.form, silently dropping "/openmrs".
    baseURL: `${process.env.E2E_BASE_URL}/`,
    storageState: 'storageState.json',
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
