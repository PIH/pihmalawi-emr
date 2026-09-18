import { type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Verification notes (Task 8) — confirmed against a live instance
// (http://localhost:8080/openmrs) by creating a real test patient via the
// REST API, loading `patientDashboard.form?patientId=<uuid>` in headless
// Playwright, and dumping `page.content()` — NOT guessed from the task
// brief's placeholder code. Several things differ from the brief's
// assumptions; called out explicitly.
//
// 1. Widget container: `<div class="portlet" id="pihmalawi.quickPrograms">`
//    — a DOTTED id, must be escaped as `#pihmalawi\\.quickPrograms` in a CSS
//    selector. There is no `.quickPrograms` class anywhere (the brief's
//    `'#quickProgramsPortlet, .quickPrograms'` fallback selector matches
//    neither).
//
// 2. Layout: one `<tr>` per PROGRAM (not per program+state, and there is NO
//    single <select> for "state" at all — the brief's
//    `getByRole('combobox', { name: /state|status/i })` has nothing to
//    match). The label cell reads e.g. "HIV Program:" (title case, trailing
//    colon — NOT "HIV PROGRAM" as the brief's spec originally passed). The
//    row's second `<td>` contains one whole `<form>` PER CANDIDATE INITIAL
//    STATE the program's workflow(s) offer: for HIV Program, with no
//    existing enrollment, there are two sibling forms — one for "Exposed
//    Child (Continue)" and one for "On antiretrovirals" (the real display
//    text for what docs/program-eligibility-rules.md's ON_ARVS_STATE_UUID
//    calls "On ARVs" — this is the concept's own short name, not a
//    workflow-state alias). You pick the state by picking which FORM to
//    submit, not by selecting an option. Each form has:
//      - a fixed hidden `programworkflowStateId` input (no select)
//      - submit button `<input type="submit" value="Enroll"
//        id="quickEnrollSubmitButton-<stateId>">`
//      - a `dateEnrolled` text input (`id="dateEnrolled-<stateId>"`,
//        `name="dateEnrolled"`), prefilled with today's date in MM/DD/YYYY,
//        with the same `onclick="showCalendar(this)"` jQuery-UI
//        datepicker-overlay behavior as Task 7's date fields — same
//        hide-after-fill workaround needed here.
//      - a `<select name="locationId">` (no id) listing all locations by
//        name, e.g. "Neno District Hospital".
//    `enroll()` therefore locates the program's row by its label text, then
//    within that row's fields cell locates the ONE form whose visible text
//    contains the requested state name, and fills/clicks within that form
//    only.
//
// 3. Verified live: submitting the "On antiretrovirals" form for a fresh
//    patient at "Neno District Hospital" 302-redirects back to
//    `patientDashboard.form` (per the form's hidden `returnPage` input), and
//    the ART mastercard gate then reads "Not available: No identifier (ART
//    eMastercard)" — i.e. enrollment alone is not sufficient, exactly per
//    docs/program-eligibility-rules.md. See mastercard-page.ts for the gate
//    check itself.
//
// 4. changeState(): once already enrolled, the row's enroll-forms are
//    replaced by (a) a genuine POST `transferredOutToLocation.form` form and
//    (b) one `<input type="button" value="Complete"
//    onclick="changeToState(patientProgramId, workflowId, stateId,
//    dateFieldName)">` per reachable next state, each followed by plain text
//    "with <StateName> on <dateInput> at <location>" — confirmed directly
//    against a real enrolled patient's rendered row. This matches
//    docs/program-eligibility-rules.md's note that changing state is a
//    DWR/AJAX call (`changeToState(...)` -> `refreshPage()`), not a form
//    POST: there is no `<form>` wrapping these buttons at all. This task's
//    spec only exercises the initial-enrollment path above, so the
//    click-and-wait-for-refresh behavior below is UNVERIFIED end-to-end —
//    only the button/label markup shape was confirmed live.
// ---------------------------------------------------------------------------

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Converts an ISO 'YYYY-MM-DD' date to the 'MM/DD/YYYY' format this instance's date fields expect. */
function toUsDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${month}/${day}/${year}`;
}

/** Force-hides the jQuery UI datepicker overlay opened by filling a date field — it otherwise intercepts later clicks. */
async function hideDatepicker(page: Page): Promise<void> {
  await page.evaluate(() => {
    const el = document.getElementById('ui-datepicker-div');
    if (el) {
      (el as HTMLElement).style.display = 'none';
    }
  });
}

/** Builds a safe XPath string literal for a value that may itself contain quotes. */
function xpathLiteral(value: string): string {
  if (!value.includes("'")) {
    return `'${value}'`;
  }
  if (!value.includes('"')) {
    return `"${value}"`;
  }
  return `concat(${value.split("'").map((part) => `'${part}'`).join(`, "'", `)})`;
}

export class QuickProgramsPage {
  constructor(private page: Page) {}

  static async openForPatient(page: Page, patientUuid: string): Promise<QuickProgramsPage> {
    // No leading slash — see playwright.config.ts's baseURL comment.
    await page.goto(`patientDashboard.form?patientId=${patientUuid}`);
    await page.waitForLoadState('networkidle');
    return new QuickProgramsPage(page);
  }

  /** Locates the program's <tr> by its label cell text (e.g. "HIV Program:"), case-insensitive with an optional trailing colon. */
  private programRow(programName: string) {
    const widget = this.page.locator('#pihmalawi\\.quickPrograms');
    const labelCell = widget
      .locator('td')
      .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(programName)}\\s*:?\\s*$`, 'i') })
      .first();
    return labelCell.locator('xpath=..');
  }

  async enroll(opts: {
    programName: string;
    initialStateName: string;
    locationName: string;
    dateEnrolled: string;
  }): Promise<void> {
    const row = this.programRow(opts.programName);
    const fieldsCell = row.locator('td').nth(1);
    const form = fieldsCell
      .locator('form')
      .filter({ hasText: new RegExp(escapeRegExp(opts.initialStateName), 'i') })
      .first();

    await form.locator('input[name="dateEnrolled"]').fill(toUsDate(opts.dateEnrolled));
    await hideDatepicker(this.page);
    await form.locator('select[name="locationId"]').selectOption({ label: opts.locationName });
    await form.locator('input[type="submit"]').click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * UNVERIFIED end-to-end — see file header note 4. The button/label
   * selector is grounded in real observed markup; the click-triggered
   * DWR-refresh behavior is not exercised by this task's spec.
   */
  async changeState(opts: { newStateName: string }): Promise<void> {
    const widget = this.page.locator('#pihmalawi\\.quickPrograms');
    const button = widget
      .locator(
        `xpath=.//input[@type="button" and @value="Complete"][contains(following-sibling::text()[1], ${xpathLiteral(opts.newStateName)})]`,
      )
      .first();
    await button.click();
    await this.page.waitForLoadState('networkidle');
  }
}
