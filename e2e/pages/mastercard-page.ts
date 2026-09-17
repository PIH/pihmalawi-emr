import { type Page, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Verification notes (Task 8) — confirmed against a live instance
// (http://localhost:8080/openmrs) two ways: (1) reading
// omod/src/main/java/org/openmrs/module/pihmalawi/web/taglibs/EMastercardAccessTag.java
// (the JSP tag `malawiPatientDashboard.jsp:122` uses to render this row —
// `<pihmalawi:eMastercardAccess ... form="ART eMastercard" .../>`), and
// (2) observing patientDashboard.form's rendered output at each of the three
// gating stages for a real test patient created via the REST API. NOT
// guessed from the brief's placeholder selector.
//
// 1. The brief guessed the "Create new" link would be an
//    `a[href*="flowsheet.page"][href*="art-emastercard"]`. It is NOT.
//    `EMastercardAccessTag.createNewCardHtmlTag` (the branch taken when all
//    gates pass and no ART_INITIAL encounter exists yet) renders:
//      <a onclick="window.location.href='/openmrs/htmlformentryui/htmlform/
//        flowsheet.page?...&patientId=<id>&encounterDate=' +
//        $j.datepicker.formatDate(...)">Create new ART eMastercard</a>
//    — there is NO `href` ATTRIBUTE at all on this element (confirmed via
//    `elementHandle.outerHTML` on a live eligible patient). A
//    `[href*=...]` selector will never match it. The reliable signal is the
//    literal link TEXT "Create new " + Form.getName(), and the ART
//    eMastercard form's name is exactly "ART eMastercard" (confirmed via the
//    same tag's "Not available: ..." messages below, which embed the same
//    `f.getName()`).
//
// 2. The three gating stages actually observed live, all inside
//    `<div class="portlet" id="pihmalawi.malawiPatientDashboard">` in the row
//    labeled "ART Patient Card:" (that label itself is static JSP markup,
//    distinct from the tag's dynamic second cell):
//      - No program enrollment yet:
//        "Not available: Inactive program state (ART eMastercard)"
//      - Enrolled in HIV Program / On antiretrovirals, but no ARV Number
//        identifier yet: "Not available: No identifier (ART eMastercard)"
//      - ARV Number identifier added at the enrollment's location:
//        "Create new ART eMastercard" onclick link, `.isVisible()` true.
//    This matches docs/program-eligibility-rules.md exactly.
//
// 3. The real rendered URL's `patientId` param is the LEGACY INTEGER patient
//    id (`p.getPatientId()`), not a UUID — e.g. observed
//    "...&patientId=109&encounterDate=...". `buildCreateUrl` below still
//    takes a UUID, per this task's brief/interface (Task 9's job is the
//    actual form-filling page and will need to reconcile this — flagging it
//    here as a real discrepancy from the brief. This task's spec never
//    navigates to the URL, only checks the dashboard link's VISIBILITY, so
//    it isn't exercised here).
//
// RESOLVED in Task 9: `flowsheet.page`'s `patientId` request param does NOT
// require the legacy integer id — it transparently accepts a UUID string
// too. Confirmed live: navigated straight to
// `MastercardGatePage.buildCreateUrl(realPatientUuid, today)` (no id lookup
// at all) for a patient created via the `eligibleHivArtPatient` fixture, and
// the rendered form showed that exact patient's name ("AutoArt Pilot") and
// ARV Reg no. The submitted form's hidden `personId` field (and the
// post-submit `successUrl`) both resolved to that patient's real legacy
// integer id (e.g. `personId=123`), proving OpenMRS/Spring's parameter
// binding for this controller resolves a UUID `patientId` param to the
// correct Patient just like it does an integer one. No code change needed —
// `buildCreateUrl` and `MastercardFormPage.openCreate` below both pass the
// UUID straight through.
// ---------------------------------------------------------------------------

export class MastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: 'file:configuration/htmlforms/art-emastercard.xml',
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    params.append('flowsheets', 'file:configuration/htmlforms/viral-load-tests.xml');
    params.append('flowsheets', 'file:configuration/htmlforms/art-follow-up-testing.xml');
    params.append('flowsheets', 'file:configuration/htmlforms/art-visit.xml');
    // No leading slash — see playwright.config.ts's baseURL comment. Callers
    // pass this straight to page.goto(), which resolves it against baseURL.
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }

  static async isCreateLinkVisibleOnDashboard(page: Page, patientUuid: string): Promise<boolean> {
    // No leading slash — see playwright.config.ts's baseURL comment.
    await page.goto(`patientDashboard.form?patientId=${patientUuid}`);
    await page.waitForLoadState('networkidle');
    return page
      .locator('#pihmalawi\\.malawiPatientDashboard a')
      .filter({ hasText: /Create new ART eMastercard/i })
      .first()
      .isVisible()
      .catch(() => false);
  }
}

// ---------------------------------------------------------------------------
// Verification notes (Task 9) — confirmed against a live instance the same
// way as Task 8: reading the rendered DOM directly (`page.content()`) for a
// real eligible test patient at the URL `MastercardGatePage.buildCreateUrl`
// produces, and by actually filling and saving the form and checking the
// resulting REST `encounter`/`obs`.
//
// 1. Field ids — the brief (citing docs/program-eligibility-rules.md's
//    source research) claimed `heightInput`/`weightInput` are explicit ids
//    in the XML. They are NOT. Checked both the rendered DOM and the source
//    (content/configuration/backend_configuration/htmlforms/art-emastercard.xml):
//    height/weight are plain `<obsreference conceptId="$height/$weight" />`
//    tags with no `id` attribute at all — htmlformentry assigns them opaque,
//    render-order-dependent ids (e.g. `w42`/`w44` in one observed render)
//    that cannot be relied on across renders. Only `guardianNameField` has
//    an explicit id in the XML (`<obs id="guardianNameField" .../>`), and
//    even that one is NOT on the `<input>` itself — htmlformentry renders it
//    as a wrapping `<span id="guardianNameField">` around a plain
//    `<input id="w14">`. `fillField` below handles both cases.
//
// 2. Radio groups render as real `<input type="radio" id="wNN_k">` +
//    `<label for="wNN_k">optionText</label>` pairs grouped by a shared
//    `name="wNN"`, inside the single `<td>` immediately following the
//    group's plain-text label `<td>` in the same table row — there is no
//    wrapping element or id tying the group to its label. Observed exact
//    rendered option text:
//      - "Agrees to FUP" (the brief's "Patient agrees to follow-up" is the
//        underlying concept name, not the rendered label): options are
//        exactly "N" / "Y", not "No" / "Yes".
//      - "WHO Stage": options are bare "1" / "2" / "3" / "4" (a "Pres"
//        checkbox for presumptive staging shares the same table cell but is
//        a separate field), not "Stage 1" etc.
//    Nested tables mean a naive `tr:has-text(groupLabel)` (the brief's
//    approach) matches an ancestor row wrapping unrelated fields, not the
//    specific row — `selectRadio`/`fillField` below instead find the exact
//    leaf `<td>` whose OWN text equals the label (`exact: true`) and then
//    take its immediate next `<td>` sibling.
//
// 3. The header form also has a required "Location" `<select>` (wrapped in
//    `<span id="mastercardLocation">`) that is blank by default. Submitting
//    with it blank leaves the page in edit mode with a "required" marker and
//    creates no encounter at all — confirmed by deliberately omitting it
//    first. `openCreate` always selects a default location so callers don't
//    need to know this to use the class.
//
// 4. On successful save, the page does an in-place AJAX re-render (the URL
//    does not change) into a read-only view: the "Save" button disappears
//    and "Back to Dashboard" / "Edit Header" / "Print" controls appear.
//    Confirmed the resulting encounter is type ART_INITIAL with obs matching
//    every field filled (e.g. "Height (cm): 165.0", "Weight (kg): 60.0",
//    "Follow up agreement: Yes", "WHO stage: WHO stage I adult and peds").
//
// 5. Saving a real ART_INITIAL encounter against the shared
//    `eligibleHivArtPatient` fixture required a fixture-teardown fix (see
//    e2e/commands/encounter-operations.ts and e2e/core/test.ts): purging a
//    patient with encounters/obs attached 500s on FK constraints unless obs
//    are purged, then the encounter, before the patient.
// ---------------------------------------------------------------------------

const MASTERCARD_LOCATION_NAME = 'Neno District Hospital';
const HEIGHT_WEIGHT_ROW_LABEL = 'Height/ Wgt.';

export class MastercardFormPage {
  constructor(private page: Page) {}

  static async openCreate(page: Page, patientUuid: string, encounterDate: string): Promise<MastercardFormPage> {
    await page.goto(MastercardGatePage.buildCreateUrl(patientUuid, encounterDate));
    await page.waitForLoadState('networkidle');

    // Required — see verification note 3 above. Defaults to the same
    // location the `eligibleHivArtPatient` fixture assigns the ARV Number
    // identifier at, which keeps this out of every caller's way.
    await page.locator('#mastercardLocation select').selectOption({ label: MASTERCARD_LOCATION_NAME });

    return new MastercardFormPage(page);
  }

  // Fills a field either by real DOM id (explicit-id obs fields like
  // `guardianNameField`, whose id is on a wrapping <span>, not the <input>
  // itself — see verification note 1 above) or, for fields with no id at
  // all (the overwhelming majority — see the same note), by the plain-text
  // label immediately to the input's left in the same table row.
  async fillField(labelOrId: string, value: string): Promise<void> {
    const byId = this.page.locator(`#${labelOrId}`);
    if (await byId.count()) {
      const tagName = await byId.first().evaluate((el) => el.tagName.toLowerCase());
      if (tagName === 'input' || tagName === 'textarea') {
        await byId.first().fill(value);
      } else {
        await byId.first().locator('input').first().fill(value);
      }
      return;
    }

    if (/^height$/i.test(labelOrId) || /^weight$/i.test(labelOrId)) {
      // Height and Weight share a single "Height/ Wgt." label cell with two
      // side-by-side inputs (.left-cell = height cm, .right-cell = weight
      // kg) — there is no separate per-field label to bind to (verification
      // note 1 above).
      const cellClass = /^height$/i.test(labelOrId) ? 'left-cell' : 'right-cell';
      await this.rowFor(HEIGHT_WEIGHT_ROW_LABEL).locator(`.${cellClass} input`).fill(value);
      return;
    }

    await this.inputCellFor(labelOrId).locator('input, textarea').first().fill(value);
  }

  async selectRadio(groupLabel: string, optionLabel: string): Promise<void> {
    await this.inputCellFor(groupLabel).getByLabel(optionLabel, { exact: true }).check();
  }

  async save(): Promise<void> {
    await this.page.getByRole('button', { name: /save/i }).click();
  }

  async expectSaveSuccess(): Promise<void> {
    // See verification note 4 above — this is an in-place re-render, not a
    // navigation, so we assert on DOM content rather than a URL change.
    await expect(this.page.getByText(/back to dashboard/i)).toBeVisible();
  }

  // The leaf <td> whose OWN text is exactly `label` — `exact: true` is what
  // keeps this from matching an ancestor <tr>/<table> that also contains it
  // (see verification note 2 above) — followed by its immediate next <td>
  // sibling, which is where htmlformentry always renders that field's
  // input/radio group.
  private inputCellFor(label: string) {
    return this.page.getByText(label, { exact: true }).locator('xpath=following-sibling::td[1]');
  }

  private rowFor(label: string) {
    return this.page.getByText(label, { exact: true }).locator('xpath=ancestor::tr[1]');
  }
}
