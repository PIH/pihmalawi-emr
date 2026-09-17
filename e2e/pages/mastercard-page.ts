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

// ---------------------------------------------------------------------------
// Verification notes (Task 10) — confirmed against a live instance the same
// way as Tasks 8/9, entering an ART Visit (art-visit.xml) flowsheet against
// a patient with an existing ART_INITIAL header encounter.
//
// 1. `openCreate` cannot be called a second time to reach the visit form.
//    Once a header (ART_INITIAL) encounter exists, `flowsheet.page` renders
//    the header in its READ-ONLY view (no `#mastercardLocation select` at
//    all — confirmed by a 3-minute Playwright timeout waiting for it), with
//    the flowsheets (viral load tests / ART follow-up testing / ART visit)
//    listed below it as "Enter New <Form Name>" action links, each with its
//    own default-to-today date field. The visit form is reached by clicking
//    "Enter New ART Visit" on that SAME already-loaded page (confirmed via
//    `flowsheet.js`'s `flowsheet.enterVisit`, which does an in-place AJAX
//    swap — `jq('#flowsheet-edit-section-'+fs.index).html(data)` — the URL
//    never changes) — see `enterNewFlowsheet` below.
//
// 2. `heightInput`/`weightInput` DO have explicit ids in art-visit.xml
//    (unlike art-emastercard.xml's same-named fields, which do NOT — see
//    Task 9 note 1) — confirmed via both the XML source and the rendered
//    DOM. Both still wrap a plain `<input>` in a `<span id="...">`, same
//    shape `fillField` already handled for `guardianNameField`.
//
// 3. `appointmentDate` DOES have an explicit id in art-visit.xml
//    (`<obs conceptId="$nextAppt" id="appointmentDate" .../>`), confirming
//    the brief's claim for this field specifically — but it renders as a
//    READONLY jQuery-UI-datepicker-driven `<input class="hasDatepicker"
//    readonly>` plus a hidden ISO-format field, not a plain fillable input.
//    Playwright's `.fill()` refuses readonly inputs, so `fillField` below
//    drives htmlformentry's own global `setDatePickerValue()` (defined in
//    `htmlFormEntry.js`) directly instead, then dispatches `change` on both
//    the display and hidden inputs (art-visit.xml's own script hooks
//    `change` on this field for "same-day next-appointment" lookups).
//
// 4. Saving the visit form additionally requires two fields the brief's
//    placeholder didn't mention, enforced by art-visit.xml's own
//    `beforeValidation` JS (not marked `required` in the XML, so this is
//    JS-only, not standard htmlformentry validation):
//      - `artRegimenObs` (ART Regimen `<select>`) — required non-blank.
//      - `noTabletsGiven` (the "No. of tablets" input under "ARVs given")
//        — required non-blank.
//    The rendered `.submitButton` is left `disabled` until these clear.
//    `visitLocation` (like the header's `mastercardLocation`) is also
//    blank-by-default and required (an `encounterLocation` tag, same as the
//    header) — `selectDropdown` below handles both `<select>` fields.
//
// 5. The visit form's save button is NOT labeled "Save". art-emastercard.xml
//    defines its own `<button class="submitButton confirm">Save</button>`,
//    but art-visit.xml uses a bare `<submit/>` tag, which htmlformentry
//    renders with its default label: `<input type="button"
//    class="submitButton" value="Enter Form">`. The brief's/Task 9's
//    `getByRole('button', { name: /save/i })` never matches this. Both
//    forms' submit controls DO share the stable `.submitButton` class, so
//    `save()` below was changed to target that instead of the label text —
//    confirmed this doesn't break the header form's save (same class is on
//    its `<button>` too).
//
// 6. On successful save, `flowsheet.js`'s `successFunction` →
//    `loadIntoFlowsheet(..., showVisitTable=true)` → `toggleViewFlowsheet()`
//    hides the edit section and RE-SHOWS `#header-section` (and its
//    "Back to Dashboard" link) — the same in-place re-render pattern as the
//    header form, confirming `expectSaveSuccess()` (unchanged) also works
//    for the visit form.
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
        return;
      }

      const input = byId.first().locator('input').first();
      const isDatePicker = await input.evaluate((el) => el.classList.contains('hasDatepicker'));
      if (isDatePicker) {
        // Readonly jQuery-UI-datepicker-driven field (e.g. art-visit.xml's
        // `appointmentDate` — see verification note 3 above). Playwright's
        // fill() refuses readonly inputs, so drive htmlformentry's own
        // `setDatePickerValue()` global directly, then fire the `change`
        // events real interaction would (some forms' own scripts hook
        // `change` on these fields).
        await byId.first().evaluate((el, val) => {
          const display = el.querySelector('input') as HTMLInputElement;
          const hidden = el.querySelector('input[type=hidden]') as HTMLInputElement | null;
          // @ts-expect-error - global provided by htmlformentry's static JS (htmlFormEntry.js)
          window.setDatePickerValue(`#${display.id}`, val);
          display.dispatchEvent(new Event('change', { bubbles: true }));
          hidden?.dispatchEvent(new Event('change', { bubbles: true }));
        }, value);
        return;
      }

      await input.fill(value);
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

  // Handles `<select>` fields either by real DOM id (e.g. `visitLocation`,
  // `artRegimenObs` — both wrap a `<select>` in an id'd `<span>`, same shape
  // as fillField's by-id fields) or, falling back, by the plain-text label
  // immediately to the select's left in the same table row.
  async selectDropdown(labelOrId: string, optionLabel: string): Promise<void> {
    const byId = this.page.locator(`#${labelOrId} select`);
    if (await byId.count()) {
      await byId.first().selectOption({ label: optionLabel });
      return;
    }
    await this.inputCellFor(labelOrId).locator('select').first().selectOption({ label: optionLabel });
  }

  // Reaches a flowsheet form (e.g. "ART Visit") from an already-loaded
  // mastercard page that already has a saved header encounter — see
  // verification note 1 above. `openCreate` cannot be called a second time
  // for this: once a header encounter exists, the page renders it
  // read-only with no edit fields at all, only these "Enter New <label>"
  // links below it. This performs an in-place AJAX swap on the SAME page
  // (the URL never changes), matching the header form's own save behavior.
  async enterNewFlowsheet(formLabel: string): Promise<void> {
    await this.page
      .locator('a.form-action-link', { hasText: `Enter New ${formLabel}` })
      .first()
      .click();
    // This is an in-place AJAX swap, not a navigation, so `waitForLoadState`
    // is unreliable here — it can resolve between round trips before the
    // form's own DOM has actually been inserted (observed as a race:
    // `#visitLocation select`'s `count()` returning 0 immediately after
    // `networkidle` resolved). Wait for the always-present submit control
    // instead, since every flowsheet form renders one.
    await this.page.locator('.submitButton').first().waitFor({ state: 'attached' });
  }

  async save(): Promise<void> {
    // `.submitButton` is the stable class htmlformentry always applies to
    // its generated submit control, regardless of visible label — see
    // verification note 5 above (art-visit.xml's bare `<submit/>` renders
    // as "Enter Form", not "Save").
    await this.page.locator('.submitButton').first().click();
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
