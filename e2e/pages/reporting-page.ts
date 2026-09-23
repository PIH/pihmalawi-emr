import { type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Verification notes (Task 12) — confirmed against a live instance
// (http://localhost:8080/openmrs) by actually running "HIV - Cohort Report"
// (uuid c64afef1-2ccc-44d5-9504-eb5c8d6e3892) from the "Reporting" link in
// the page banner, NOT guessed from the brief's placeholder code.
//
// 1. The brief guessed the run form lives at
//    `module/reporting/reports/runReport.form?reportId=...`. The real path
//    (found via the rendered "Reporting" banner link ->
//    `module/reporting/dashboard/index.form` -> its "HIV - Cohort Report"
//    link) is `module/reporting/run/runReport.form?reportId=...` — "run/",
//    not "reports/".
//
// 2. Form fields have no `<label>` elements at all (plain `<td>End
//    date:</td><td><input .../></td>` markup), so `getByLabel` (the brief's
//    guess) never matches. The real fields:
//      - End date: `#userEnteredParamendDate`, a plain text input (not a
//        native date input) paired with a legacy dojo-style calendar
//        popup. It parses its value with
//        `org.openmrs.module.htmlwidgets.web.handler.DateHandler`, which
//        (confirmed by triggering its exact `IllegalArgumentException` live)
//        expects **MM/dd/yyyy** — e.g. "09/17/2026" for 17 Sep 2026 — NOT
//        the ISO `yyyy-MM-dd` the brief's example builds with
//        `toISOString().slice(0, 10)`, and NOT `dd/MM/yyyy` despite the
//        instance's locale link reading "English (United Kingdom)".
//      - Location: `select[name="userEnteredParams[location]"]` (its `id`
//        is the same bracketed string, which can't be used as a CSS `#id`
//        selector without escaping, so the `name` attribute selector is
//        used instead). `selectOption({ label })` matches fine despite the
//        rendered option text's surrounding whitespace/newlines (Playwright
//        normalizes whitespace for label matching).
//      - Submit: `input[type="submit"][value="Request Report"]` — there is
//        no button whose accessible name is "run" (the brief's guess).
//
// 3. This page is protected by OWASP CSRFGuard (`WEB-INF/csrfguard.js` /
//    `csrfguard.properties`, bundled with this OpenMRS deployment, entirely
//    unrelated to pihmalawi-emr's own code). The hidden
//    `input[name="OWASP-CSRFTOKEN"]` field is rendered EMPTY by the server
//    and is only populated client-side, asynchronously, by an
//    `addEvent(window, 'DOMContentLoaded', ...)` handler in csrfguard.js
//    that injects the session's real master token into every form on the
//    page. Submitting before that handler has run sends an empty token and
//    is unconditionally rejected — confirmed live and reproduced in the
//    server log as:
//      "potential cross-site request forgery (CSRF) attack thwarted
//       (...error:Request Token does not match the Master Token)"
//    In practice this injection is usually near-instant (<1s) but was also
//    observed, repeatedly, to sometimes never complete within several
//    minutes on a single page load (a real, reproducible flakiness in the
//    bundled CSRFGuard version in this container — not something caused by
//    this test suite). `gotoRunReportForm` below works around this the same
//    way a patient human user effectively does just by not clicking
//    instantly: it waits for the token field to become non-empty, and
//    retries the navigation (a fresh page load gets a fresh async injection
//    attempt) up to `maxAttempts` times before giving up.
//
// 4. A successful submission (valid token + valid date format) is a real
//    HTTP redirect (302) to
//    `module/reporting/reports/reportHistoryOpen.form?uuid=<reportRequestUuid>`
//    — i.e. running a report is fundamentally ASYNCHRONOUS: the report is
//    queued and evaluated by a background thread, and the UI polls
//    `module/reporting/reports/loadReportStatus.form?uuid=...` (confirmed
//    via `reportHistoryOpen.jsp`'s own `loadReportStatus()` JS, which polls
//    this same URL every 3 seconds until a terminal status) for a small
//    JSON payload: `{"status": "...", "log": [...]}`. `waitForCompletion`
//    below polls that same JSON endpoint directly (via `page.request`)
//    rather than relying on the page's own jQuery show/hide-driven status
//    `<span>`s, which is both simpler and avoids any dependency on jQuery
//    animation timing.
//
// 5. `HIVCohortReport.constructReportDesigns()` (api/src/main/java/.../
//    reporting/reports/HIVCohortReport.java) defines only ONE ReportDesign
//    — `createExcelTemplateDesign(...)`, an Excel template renderer, with no
//    HTML/webpage renderer at all. This confirms the brief's fallback
//    expectation: a successful run's output is a downloaded Excel file, not
//    an on-page HTML table. `reportHistoryOpen.jsp` renders the download
//    trigger, once the request reaches status COMPLETED/SAVED, as a plain
//    link: `<a href=".../reports/viewReport.form?uuid=..." target="__new">
//    View Report</a>`. `downloadExcelOutput` below clicks that link while
//    listening for a `download` event on the browser context (per the
//    brief's own `page.waitForEvent('download')` contingency note).
//
// 6. This report's dataset (`hiv-cohort-report.sql`) is a `SqlFileDataSetDefinition` configured
//    with `connectionPropertyFile=warehouse-connection.properties`
//    (api/src/main/java/.../reporting/reports/HIVCohortReport.java) — a SEPARATE database
//    connection, pointed at a "data warehouse" schema (`mw_patient`, `omrs_patient_identifier`,
//    `last_facility_outcome`, `lookup_location`, the `create_last_art_outcome_at_facility` stored
//    procedure) built by an external ETL pipeline (apzu-etl/petl) in a different PIH repository.
//    See art-report.spec.ts for how this suite gets that properties file and a fresh ETL run in
//    place before requesting this report.
// ---------------------------------------------------------------------------

export type ReportRequestStatus =
  | 'REQUESTED'
  | 'SCHEDULED'
  | 'SCHEDULE_COMPLETED'
  | 'PROCESSING'
  | 'FAILED'
  | 'COMPLETED'
  | 'SAVED';

const TERMINAL_STATUSES: ReportRequestStatus[] = ['FAILED', 'COMPLETED', 'SAVED', 'SCHEDULE_COMPLETED'];

// yyyy-MM-dd (what every other fixture/spec in this suite builds via
// `new Date().toISOString().slice(0, 10)`) -> MM/dd/yyyy, which is what this
// report's date field actually requires — see verification note 2 above.
function toReportDateFormat(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${month}/${day}/${year}`;
}

export class ReportingPage {
  private constructor(
    private page: Page,
    private reportRequestUuid: string,
  ) {}

  static async runReport(
    page: Page,
    opts: { reportUuid: string; endDate: string; locationName: string },
  ): Promise<ReportingPage> {
    // No leading slash — see playwright.config.ts's baseURL comment.
    const runReportUrl = `module/reporting/run/runReport.form?reportId=${opts.reportUuid}`;
    await ReportingPage.gotoRunReportForm(page, runReportUrl);

    await page.locator('#userEnteredParamendDate').fill(toReportDateFormat(opts.endDate));
    await page.locator('select[name="userEnteredParams[location]"]').selectOption({ label: opts.locationName });

    await Promise.all([
      page.waitForURL(/reportHistoryOpen\.form/),
      page.locator('input[type="submit"][value="Request Report"]').click(),
    ]);

    const uuid = new URL(page.url()).searchParams.get('uuid');
    if (!uuid) {
      throw new Error(`Expected a reportRequest uuid in the post-submit URL, got: ${page.url()}`);
    }
    return new ReportingPage(page, uuid);
  }

  // Works around the CSRFGuard token-injection race described in
  // verification note 3 above: waits for the hidden CSRF field to be
  // populated, retrying the navigation itself (not just the wait) since a
  // fresh page load gets a fresh, independent injection attempt.
  private static async gotoRunReportForm(page: Page, url: string, maxAttempts = 10): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await page.goto(url);
      const tokenInjected = await page
        .waitForFunction(
          () => {
            const el = document.querySelector('input[name="OWASP-CSRFTOKEN"]') as HTMLInputElement | null;
            return !!el && el.value.length > 0;
          },
          { timeout: 3000 },
        )
        .then(() => true)
        .catch(() => false);
      if (tokenInjected) {
        return;
      }
    }
    throw new Error(
      `CSRFGuard's client-side token was never injected into the run-report form after ${maxAttempts} attempts`,
    );
  }

  // Polls the same JSON status endpoint reportHistoryOpen.jsp's own JS polls
  // — see verification note 4 above — until a terminal status is reached.
  async waitForCompletion(timeoutMs = 60000): Promise<{ status: ReportRequestStatus; log: string[] }> {
    const deadline = Date.now() + timeoutMs;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { status, log } = await this.getStatus();
      if (TERMINAL_STATUSES.includes(status)) {
        return { status, log };
      }
      if (Date.now() > deadline) {
        throw new Error(
          `Report request ${this.reportRequestUuid} did not reach a terminal status within ${timeoutMs}ms ` +
            `(last status: ${status})`,
        );
      }
      await this.page.waitForTimeout(1000);
    }
  }

  async getStatus(): Promise<{ status: ReportRequestStatus; log: string[] }> {
    // No leading slash — see playwright.config.ts's baseURL comment.
    const res = await this.page.request.get(
      `module/reporting/reports/loadReportStatus.form?uuid=${this.reportRequestUuid}`,
    );
    const data = await res.json();
    return { status: data.status, log: data.log ?? [] };
  }

  // Only meaningful once waitForCompletion() has resolved with status
  // COMPLETED or SAVED — see verification note 5 above.
  async downloadExcelOutput(): Promise<Buffer> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.locator('a[href*="viewReport.form"]', { hasText: /view report/i }).click(),
    ]);
    const stream = await download.createReadStream();
    if (!stream) {
      throw new Error('Download produced no readable stream');
    }
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }
}
