import { type Locator, type Page, expect } from '@playwright/test';

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

// ---------------------------------------------------------------------------
// Verification notes (Task 11) — expanding header-mastercard.spec.ts to cover
// the rest of art-emastercard.xml's fields. Confirmed against a live
// instance by dumping `page.content()` for a freshly-opened create form
// (real `eligibleHivArtPatient` fixture patient, female by default — see
// `createPatient`'s default `gender: 'F'` — so the `Preg/Breastf` field,
// which is gated by `velocityTest="$patient.gender == 'F'"`, does render).
//
// 1. EVERY date field in this form except art-visit.xml's `appointmentDate`
//    renders as a readonly jQuery-UI-datepicker input with NO id'd wrapping
//    <span> at all (only `guardianNameField` has an explicit `id` anywhere
//    in art-emastercard.xml). That means the byId branch's datepicker
//    handling (Task 9/10) never actually fires for any of this form's own
//    date fields — they all fall into the plain-label fallback branch,
//    which used to blindly call `.fill()` and would have failed (readonly
//    input) for all of them. Extracted the datepicker-vs-plain-input
//    dispatch into `fillInputOrDatePicker` and made the fallback branch use
//    it too, instead of only the byId branch.
//
// 2. Transfer-In Date and Child HCC no. live in the page header (inside the
//    `<h4>`, outside `table.data-entry-table` entirely), each shaped as
//    `<b>Label: </b><b>...input...</b>` — sibling `<b>` tags, not a `<td>`
//    pair. `inputCellFor`'s `following-sibling::td[1]` xpath cannot match
//    this. Added `fillHeaderField`, using `following-sibling::b[1]` instead.
//    Confirmed live: Transfer-In Date renders as a readonly datepicker
//    (`id="wN-display"`), Child HCC no. as a plain text input — both go
//    through `fillInputOrDatePicker` so either shape works.
//
// 3. Labels containing an XML `<br/>` (`HIV-related<br/> diseases`,
//    `Urine LAM/<br/>Crag Result`) render with the `<br/>` contributing no
//    text at all — confirmed via the dumped DOM the rendered `<td>`'s own
//    text is exactly the concatenation of the surrounding text nodes
//    (`"HIV-related diseases"` — one space, from the leading space in the
//    XML's `<br/> diseases`; `"Urine LAM/Crag Result"` — no space, since
//    neither text node around that `<br/>` has one). `getByText(..., {
//    exact: true })` matches this concatenated string directly; no special
//    handling needed beyond using the right literal string.
//
// 4. The "Pres" checkbox shares WHO Stage's own `<td>` (no separate label).
//    `selectRadio`'s `inputCellFor(groupLabel).getByLabel(optionLabel, {
//    exact: true }).check()` already generalizes to this: calling
//    `selectRadio('WHO Stage', 'Pres')` targets the checkbox fine, since
//    `.getByLabel().check()` works on `<input type="checkbox">` exactly like
//    `<input type="radio">`, and both live in the same `<td>` reached by the
//    same "WHO Stage" label lookup.
//
// 5. `style="no_yes"` (KS) renders as an ordinary two-option radio pair with
//    labels "N"/"Y" (values `"false"`/`"true"` rather than concept-id
//    numbers, but that's invisible to `selectRadio`) — confirmed live, no
//    new handling needed; `selectRadio('KS', 'Y')` just works.
//
// 6. CD4 (`$cd4Count` / `$cd4Pct`) shares one `<td>` labeled "CD4" via the
//    exact same `.left-cell` / `.right-cell` shape Height/Weight already
//    use — added a second magic-string branch in `fillField` following that
//    same pattern (`'CD4Count'` / `'CD4Pct'`).
//
// 7. "Last ARVs (drug, date)" (`$lastArvsTaken` then `$lastArvsDate`) is the
//    one row where TWO obs share a single `<td>` with no sub-labels or
//    left/right-cell wrapper spans at all — just two bare `<input>`s back to
//    back. Targeted positionally by input order within that one cell
//    (`'LastArvsDrug'` / `'LastArvsDate'` magic-string branches, same style
//    as CD4/Height/Weight above).
//
// 8. Several rows have a SECOND data `<td>` with no label of its own,
//    immediately after a real labeled cell in the same `<tr>`
//    (confirmatory-test-type radio after "Test Date"; ART education date
//    after "ART educat. done"; TB treatment start date after "TB treatm.";
//    first-line ARV start date after "ART Regimens"). These are reached
//    reliably (not ambiguous — anchored to a real, unique row label) via a
//    new `cellAt(label, n)` helper generalizing `inputCellFor` to the nth
//    following `<td>` sibling, exposed through an optional `cellIndex` param
//    on `fillField`/`selectRadio` (default 1, i.e. today's existing
//    behavior, unchanged for every existing call site).
//
// 9. ART Regimens rows 2 and 3 (`$artRegimen2`/`$artRegimen3` +
//    `$alternativeFirstLineArvStartDate`/`$secondLineArvStartDate`) have a
//    genuinely empty `<td></td>` where a label would be — no text to anchor
//    a lookup to at all, only sibling-row position relative to the "ART
//    Regimens" `<th>`. Per the brief's own guidance, skipped these two rows
//    as not worth a fragile positional selector — filling regimen 1 (which
//    IS reliably labeled) already exercises this section's real behavior
//    (dropdown + paired start date).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Verification notes (Task 13) — expanding visit-mastercard.spec.ts to cover
// the rest of art-visit.xml's data-entry fields. Confirmed against a live
// instance the same way as Tasks 8-11: dumping the rendered
// `table.visit-edit-table`'s `innerHTML` for a freshly-opened "Enter New ART
// Visit" flowsheet (real `eligibleHivArtPatient` fixture patient), then
// actually filling and saving the form and checking the resulting REST
// `encounter`/`obs`.
//
// 1. Systolic BP / Diastolic BP (`systolicBPInput`/`diastolicBPInput`) are
//    plain `<input>`s wrapped in id'd `<span>`s, same shape as
//    `heightInput`/`weightInput` (Task 10 note 2) — no new handling needed,
//    `fillField`'s existing byId path just works.
//
// 2. Pregnant/Breastfeed. (`pregnantBf`) — the brief (per the XML's
//    `style="checkbox"`) expected a checkbox letting BOTH "Preg" and "Bf" be
//    selected. It does NOT render that way: confirmed live it's an ordinary
//    single-select `<select id="w16"><option value="">/<option>Preg</option>
//    <option>Bf</option></select>` wrapped in `<span id="pregnantBf">` — only
//    one of the two answers can ever be chosen. `selectDropdown('pregnantBf',
//    'Preg')` (the existing helper, already handling this exact id/select
//    shape) is what this needs, not a checkbox-specific check.
//
// 3. TB Status (Curr.)* — confirmed live this does NOT render as a single
//    mutually-exclusive radio group despite the row's "No"/"Yes"/"noRx"/"Rx"
//    look. Each of the 4 XML `<obs style="radio">` tags gets rendered as an
//    `<input type="checkbox">` (not radio!) with its OWN distinct `name`
//    attribute (`w18`/`w20`/`w22`/`w24`) — htmlformentry does not group
//    same-concept radios sharing no common `name` here, so all 4 toggle
//    completely independently; nothing stops a user from checking both "No"
//    and "Yes" at once. All 4 share the row's single `<td>` though (no
//    separate label per option, "Suspected"/"Confirmed" are plain `<b>`
//    text, not obs labels), so the existing `selectRadio(groupLabel,
//    optionLabel)` — which just does `cellAt(label).getByLabel(optionLabel,
//    {exact:true}).check()` — reaches any one of the 4 fine by its rendered
//    label text ("No"/"Yes"/"noRx"/"Rx", all unique within that cell).
//    `.check()` works identically on a checkbox or radio input, so no new
//    method was needed. The test below selects "Yes" only, and the resulting
//    encounter shows exactly one "TB status: TB suspected" obs — confirming
//    single-selection is what a real user would do even though the widget
//    doesn't enforce it.
//
// 4. Side Effects (Current) — same "6 independent `<input
//    type=checkbox>`s, each its own `name`, sharing one `<td>`" shape as TB
//    Status, but genuinely meant to be multi-select per the XML's
//    `style="checkbox"`. The row's own `<th>` text is the labels'
//    "Side Effects (Current)" PLUS its child `<span>`'s "Specifiy Other In
//    Notes" concatenated with NO space (same pattern as Task 11 note 3) —
//    confirmed live the exact rendered text is
//    "Side Effects (Current)Specifiy Other In Notes". `selectRadio` called
//    twice with that literal label and two different option labels (e.g.
//    "PN" then "SK") checks both independently, and the resulting encounter
//    shows two separate "Malawi ART side effects: ..." obs, one per
//    selection — confirming they don't clobber each other.
//
// 5. Pill Count (`pillCount`) — explicit id wrapping a plain `<input>`, same
//    shape as note 1. Displays in the REST obs as "Amount of drug brought to
//    clinic: <value>" (the underlying concept's own name, not "Pill Count").
//
// 6. Doses Missed — no explicit id (confirmed: a bare `<obs
//    conceptId="$dosesMissed"/>` with no `id` attribute in the XML, and no
//    id in the rendered DOM either), reached via `fillField`'s plain-label
//    fallback branch using the row's own `<th>` text "Doses Missed" — already
//    generalizes, no new handling needed. Displays as "Number of HIV drug
//    doses missed: <value>".
//
// 7. ARVs given — "To:" field. Confirmed live this is a REAL two-option
//    `<input type="radio">` pair (`name="w46"`, values "false"/"true",
//    labels "P"/"G") sharing the SAME single `<td>` as `noTabletsGiven` (the
//    XML's `<th>ARVs given</th><td>No. of tablets: <obs .../> To: <obs
//    style="no_yes" .../></td>` has only one `<td>` for the whole row, not
//    two). "ARVs given" as a `<th>` text is unique on the rendered page (verified
//    via `getByText(..., {exact:true}).count() === 1`), and label text "P"/"G"
//    is unique too, so the existing `selectRadio('ARVs given', 'G')` (default
//    `cellIndex` of 1, i.e. the row's one and only `<td>`) reaches it with no
//    new code — `.getByLabel('G', {exact:true})` inside that cell finds only
//    the "To:" radio, not `noTabletsGiven`'s plain number input. Confirmed
//    live the underlying concept's real REST display name is "Responsible
//    person present" (NOT "ARVs given to" or similar) — e.g. "Responsible
//    person present: true" for "G".
//
// 8. CPT/IPT Given — the 5 repeated `<obsgroup>`s render with only ONE `<td>`
//    for the WHOLE "CPT/IPT Given" row (all 5 groups + their "No. of pills"
//    inputs are siblings inside it, separated by `<br>`), each group's own
//    "given" toggle rendering as a SINGLE-OPTION `<input type="radio">`
//    wrapped in `<span id="ctx"|"inh"|"rfp"|"rfp/inh"|"pyridoxine">`
//    (id'd on the span, matching `guardianNameField`'s shape from Task 9 note
//    1) with its own distinct `name`, so checking one never affects another.
//    Note `id="rfp/inh"` contains a literal `/`, which is not valid
//    unescaped bare-`#id` CSS selector syntax — the new
//    `checkCptIptGiven`/`fillCptIptPills` helpers below always use an
//    attribute selector (`[id="..."]`) rather than `#${id}` for this reason
//    (unlike `fillField`'s `ID_LIKE`-gated byId path, which would reject
//    `rfp/inh` outright since it fails that regex).
//
//    IMPORTANTLY: each group's own "No. of pills" input (`conceptId=
//    $hivPreventiveTherapyPills`, no XML `required` attribute at all) still
//    renders with `checkNumber(..., true, ...)` — required=true — for EVERY
//    ONE of the 5 groups, REGARDLESS of whether that group's own toggle is
//    checked. Confirmed live: leaving any of the 5 "No. of pills" inputs
//    blank leaves `.submitButton` permanently disabled, even for groups whose
//    toggle was never touched. This is unlike the row's own toggle, which is
//    never required. Practical effect: filling only 1-2 of the 5 groups'
//    toggles (chosen: CTX 960 and RFP/INH (3HP), which also exercises the
//    `rfp/inh` slash-in-id case) still requires filling all 5 pills inputs —
//    the other 3 get `0`. The REST display for a toggled group concatenates
//    the pills value with the given drug's own concept name, e.g.
//    "HIV Preventive Therapy Construct: 30.0, Trimethoprim and
//    sulfamethoxazole" (CTX) / "...: 12.0, 3HP (Rifapentine and Isoniazid)"
//    (RFP/INH) — confirmed live; an untouched group shows just
//    "...: 0.0" with no drug name, which is why the assertions below anchor
//    on the drug-name half of the string, not just the number.
//
// 9. Filling all of the above (many more fields than the original 6-field
//    test) intermittently left `.submitButton` permanently disabled even
//    though every required field had a valid value — confirmed NOT a
//    field-order or missing-field bug: dumping every visible
//    `span.field-error` right after filling showed exactly one, on
//    `noTabletsGiven`'s own error span (id `w43` in one observed render),
//    reading "Required" — while the field it belongs to (`w44`) already
//    held "30". Root cause is a genuine race in art-visit.xml's OWN legacy
//    JS (see Task 10 verification note 4's `checkNoTabletsGiven`): a
//    one-shot `setInterval` armed the first time `#noTabletsGiven`'s error
//    span exists in the DOM fires ~1s later and unconditionally paints
//    "Required" onto it, with NO re-check of the field's actual value at
//    that point — it only exists to surface the error for a user who
//    genuinely left the field blank. A fast fill (whether by this test or,
//    in principle, a fast typist) can "win" against that timer, so the
//    stale error still gets painted on afterwards and never clears itself,
//    since nothing re-fires `validateNoTabletsGiven()` after that point.
//    Confirmed live: waiting out the timer (~1.6s) and then dispatching a
//    real `change` event on the input (`.fill()` with the value already
//    unchanged does NOT dispatch one) reliably clears it by re-running the
//    form's own validator. `save()` below does this defensively whenever
//    `#noTabletsGiven` exists, so it's harmless for the original 6-field
//    test too (just an extra ~1.6s), and self-contained rather than
//    depending on every caller to remember it.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Verification notes (NCD Other pilot, this plan's Task 3) — extending this
// shared page object to a SECOND program's mastercard
// (content/configuration/backend_configuration/htmlforms/ncd-other-emastercard.xml),
// confirmed against a live instance the same way as the ART pilot's own
// notes above: reading the XML in full, then dumping the rendered DOM for a
// freshly-opened create form (real `eligibleNcdOtherPatient` fixture
// patient) and for the "Create new" dashboard link.
//
// The three additions here (`openCreateAtUrl`, `checkById`, `selectDropdown`'s
// `cellIndex` param) plus two `fillField` magic-string branches
// (`otherComorbidity`/`nonCodedDxText`) are all this program needed beyond
// what already existed — every other field on ncd-other-emastercard.xml
// (Patient Phone, Guardian Name/Phone/relation, "Agrees to FUP", the
// "PatientHistory"-row fields, ECHO/ECG) reuses `fillField`/`selectRadio`/
// `selectDropdown`/`fillHeaderField` completely unchanged. Full detail on
// each new/changed piece is in e2e/pages/ncd-other-mastercard-page.ts's own
// verification notes, since the NCD-Other-specific field list lives there,
// not in this generic, program-agnostic file.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Verification notes (Cardiac and Vascular Disease pilot) — extending this
// shared page object to a further Chronic Care Program condition
// (content/configuration/backend_configuration/htmlforms/cardiac-and-vascular-disease-emastercard.xml
// and cardiac-and-vascular-disease-visit.xml), confirmed against a live
// instance the same way as every prior pilot: reading both XML files in
// full, then dumping the rendered DOM (`page.content()`/`innerHTML()`) for a
// freshly-opened create form (real `eligibleCardiacAndVascularDiseasePatient`
// fixture patient), and actually filling and saving each form and checking
// the resulting REST `encounter`/`obs`.
//
// 1. Three new generic helpers added below, `checkByLabel`,
//    `selectRadioInWrappedLabelRow`, and `fillFieldAfterLabel` — all already
//    independently needed by this form's own quirks (repeated-medication
//    checkboxes reached only by their real `<label>` text; a
//    `<th><span class="rotate">Took medication today?</span></th>`
//    wrapped-label row on the visit form, same hang-risk shape documented
//    for other forms' own wrapped labels — `getByText(label,{exact:true})`
//    on a wrapped `<th>` matches the INNER `<span>`, which has no
//    `following-sibling::td` of its own, so a `cellAt`-based lookup never
//    resolves and hangs to the test timeout rather than erroring; and a
//    free-text field with no id or label of its own, reached only via a
//    sibling labelled checkbox).
//
// 2. One new `fillField` magic-string branch, `familyPlanningOtherSpecify`
//    — see that branch's own comment.
//
// 3. See cardiac-and-vascular-disease-mastercard-page.ts's own verification
//    notes for this form's field list, including two confirmed, genuine
//    DUPLICATE-id content bugs (worth a ticket): `id="aspName"`/`id="dose-
//    asp"`/`id="asp-doseUnit"`/`id="route-asp"`/`id="asp-frequencyCoded"`/
//    `id="duration-asp"`/`id="durationUnit-asp"` are reused verbatim on BOTH
//    the Aspirin row and the Benzathine PCN row of cardiac-and-vascular-
//    disease-visit.xml (the latter block was evidently copy-pasted from the
//    former without updating any id), and the Spironolactone concept's own
//    `dose_<uuid>`/etc. ids collide between the Diuretic repeat's own SPIRO
//    option and the form's separate standalone "Spironolactone" row (same
//    underlying concept, reused in two different rows). Confirmed live via
//    `page.locator('[id="dose-asp"]').count()` === 2 and
//    `getByLabel('SPIRO', {exact:true})` matching 2 elements (a Playwright
//    strictness violation). This pilot's own field-filling function skips
//    Benzathine PCN's and the standalone Spironolactone row's own dosing
//    sub-fields for this reason (same "not worth a fragile positional
//    selector for a genuine content defect" call the ART pilot's own Task 11
//    note 9 already established for its two unlabeled ART Regimen rows) —
//    Benzathine PCN's own checkbox IS still checked (reachable via its own
//    unique label text), and the Diuretic row itself is filled with a
//    different (non-colliding) drug.
// ---------------------------------------------------------------------------

const MASTERCARD_LOCATION_NAME = 'Neno District Hospital';
const HEIGHT_WEIGHT_ROW_LABEL = 'Height/ Wgt.';
const CD4_ROW_LABEL = 'CD4';
const LAST_ARVS_ROW_LABEL = 'Last ARVs (drug, date)';
const BLOOD_PRESSURE_ROW_LABEL = 'Blood Pressure';
// Real DOM ids used by this form/its siblings are always simple identifier
// tokens; plain-text row labels (which can contain spaces/punctuation, and
// are not valid bare CSS selector text) never match this — see the
// `ID_LIKE` guard comments on `fillField`/`selectDropdown` below. Allows a
// leading digit (unlike a strict CSS identifier) — Cardiac and Vascular
// Disease pilot's Cardiomyopathy diagnosis row renders with a real, macro-
// substituted UUID id (e.g. `6569659a-977f-11e1-8993-905e29aff6c1-dx`, see
// mastercard-page.ts's own "Cardiac and Vascular Disease pilot" note above)
// that starts with a digit — confirmed live this is a genuine DOM id, not a
// plain-text label (which would contain spaces `\w` already excludes). The
// byId lookups below use an attribute selector (`[id="..."]`), not `#id`,
// specifically so a leading-digit id like this doesn't throw a CSS
// SyntaxError (`#6569...` is not a valid CSS identifier — confirmed live).
const ID_LIKE = /^[\w][\w-]*$/;

export class MastercardFormPage {
  constructor(private page: Page) {}

  static async openCreate(page: Page, patientUuid: string, encounterDate: string): Promise<MastercardFormPage> {
    return MastercardFormPage.openCreateAtUrl(page, MastercardGatePage.buildCreateUrl(patientUuid, encounterDate));
  }

  // Extracted from `openCreate` (NCD Other pilot, Task 3) so a second
  // program's differently-shaped create URL (a different headerForm and
  // flowsheet list — see e2e/pages/ncd-other-mastercard-page.ts's
  // `NcdOtherMastercardGatePage.buildCreateUrl`) can reuse the same
  // "navigate + pick a default location" steps without duplicating them.
  // `openCreate`'s own behavior/signature is unchanged.
  static async openCreateAtUrl(page: Page, url: string): Promise<MastercardFormPage> {
    await page.goto(url);
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
  // label immediately to the input's left in the same table row (or the
  // `cellIndex`-th `<td>` sibling after it, for a second, unlabeled data
  // cell in the same row — see Task 11 verification note 8).
  async fillField(labelOrId: string, value: string, cellIndex = 1): Promise<void> {
    // Task 11 addition: real DOM ids are always simple identifier tokens
    // (`guardianNameField`, `appointmentDate`, ...) — the new plain-text
    // labels this task added (e.g. "Age at Init. (yrs)") contain spaces and
    // punctuation that would make a false match here, so only attempt the
    // byId path for id-shaped strings. An attribute selector (`[id="..."]`),
    // not `#id`, is used so a leading-digit id (see `ID_LIKE`'s own comment)
    // doesn't throw a CSS SyntaxError.
    if (ID_LIKE.test(labelOrId)) {
      const byId = this.page.locator(`[id="${labelOrId}"]`);
      if (await byId.count()) {
        const tagName = await byId.first().evaluate((el) => el.tagName.toLowerCase());
        if (tagName === 'input' || tagName === 'textarea') {
          await byId.first().fill(value);
          return;
        }

        await this.fillInputOrDatePicker(byId.first().locator('input').first(), value);
        return;
      }
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

    if (/^cd4count$/i.test(labelOrId) || /^cd4pct$/i.test(labelOrId)) {
      // Same left-cell/right-cell shape as Height/Weight above, under the
      // shared "CD4" row label — see Task 11 verification note 6.
      const cellClass = /^cd4count$/i.test(labelOrId) ? 'left-cell' : 'right-cell';
      await this.rowFor(CD4_ROW_LABEL).locator(`.${cellClass} input`).fill(value);
      return;
    }

    if (/^othercomorbidity$/i.test(labelOrId)) {
      // NCD Other's "Other:" comorbidity free-text input (see
      // ncd-other-mastercard-page.ts's Task 3 verification note 4) is a bare
      // `<input type="text">` with no id or label of its own, sharing the
      // rowspan'd "Comorbidities" `<td>` with 3 checkboxes — it's the only
      // `input[type="text"]` in that cell, unlike `fillField`'s generic
      // fallback below (`input, textarea` `.first()`), which would instead
      // grab the first checkbox and fail (`.fill()` refuses a checkbox).
      await this.cellAt('Comorbidities', 1).locator('input[type="text"]').first().fill(value);
      return;
    }

    if (/^noncodeddxtext$/i.test(labelOrId)) {
      // NCD Other's "Other non-coded" diagnosis free-text answer (see
      // ncd-other-mastercard-page.ts's Task 3 verification note 4) is a bare
      // `<input type="text">` immediately following the `nonCoded-dx`
      // checkbox's own id'd `<span>`, inside the SAME `<td>` — same
      // "sibling input after an id'd span" shape `fillCptIptPills` already
      // targets, just named for this context instead of CPT/IPT.
      await this.page.locator('[id="nonCoded-dx"]').locator('xpath=following-sibling::input[1]').fill(value);
      return;
    }

    if (/^systolicbp$/i.test(labelOrId) || /^diastolicbp$/i.test(labelOrId)) {
      // NCD Other Visit's "Blood Pressure" row (ncd-other-visit.xml) renders
      // two bare, unwrapped <input>s back to back in one <td> separated by a
      // literal "/" text node — same "two inputs, one td, positional" shape
      // as `LastArvsDrug`/`LastArvsDate` below (unlike ART's own
      // systolicBPInput/diastolicBPInput, which DO have explicit ids — see
      // Task 13's verification note 1 on that form). Targeted by input order
      // within the row, same as Last ARVs.
      const inputIndex = /^systolicbp$/i.test(labelOrId) ? 0 : 1;
      await this.inputCellFor(BLOOD_PRESSURE_ROW_LABEL).locator('input').nth(inputIndex).fill(value);
      return;
    }

    if (/^familyplanningotherspecify$/i.test(labelOrId)) {
      // Cardiac and Vascular Disease header's Family Planning "Other"
      // checkbox has a `showCommentField="true" commentFieldLabel="(specify):"`
      // free-text input sharing the "Family planning:" `<td>` — same
      // "no id/label of its own, only <td> text label fallback via the row's
      // one real <th>" shape as `otherComorbidity` above, and the ONLY
      // `input[type="text"]` in that cell (the other 3 fields in the cell
      // are checkboxes) — see cardiac-and-vascular-disease-mastercard-page.ts's
      // own verification notes.
      await this.cellAt('Family planning:', 1).locator('input[type="text"]').first().fill(value);
      return;
    }

    if (/^lastarvsdrug$/i.test(labelOrId) || /^lastarvsdate$/i.test(labelOrId)) {
      // "Last ARVs (drug, date)" has two bare, unwrapped <input>s back to
      // back in one <td> — targeted by input order — see Task 11
      // verification note 7.
      const inputIndex = /^lastarvsdrug$/i.test(labelOrId) ? 0 : 1;
      await this.fillInputOrDatePicker(
        this.inputCellFor(LAST_ARVS_ROW_LABEL).locator('input').nth(inputIndex),
        value,
      );
      return;
    }

    await this.fillInputOrDatePicker(this.cellAt(labelOrId, cellIndex).locator('input, textarea').first(), value);
  }

  // Fills a value into `input`, using htmlformentry's own datepicker JS API
  // if it's a readonly jQuery-UI-datepicker field (nearly every date field
  // in this form — see Task 11 verification note 1), or a plain `.fill()`
  // otherwise.
  private async fillInputOrDatePicker(input: Locator, value: string): Promise<void> {
    const isDatePicker = await input.evaluate((el) => el.classList.contains('hasDatepicker'));
    if (!isDatePicker) {
      await input.fill(value);
      return;
    }

    // Readonly jQuery-UI-datepicker-driven field (e.g. art-visit.xml's
    // `appointmentDate`, and — new in Task 11 — nearly every date field in
    // art-emastercard.xml itself). Playwright's fill() refuses readonly
    // inputs, so drive htmlformentry's own `setDatePickerValue()` global
    // directly, then fire the `change` events real interaction would (some
    // forms' own scripts hook `change` on these fields).
    await input.evaluate((el, val) => {
      const display = el as HTMLInputElement;
      const hidden = display.parentElement?.querySelector('input[type=hidden]') as HTMLInputElement | null;
      // @ts-expect-error - global provided by htmlformentry's static JS (htmlFormEntry.js)
      window.setDatePickerValue(`#${display.id}`, val);
      display.dispatchEvent(new Event('change', { bubbles: true }));
      hidden?.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }

  // Fills a field in the page header (the `<h4>`, outside
  // `table.data-entry-table` entirely) whose label is a sibling `<b>` tag,
  // not a `<td>` — e.g. "Transfer-In Date: " / "Child HCC no: " — see Task
  // 11 verification note 2.
  async fillHeaderField(labelText: string, value: string): Promise<void> {
    await this.fillInputOrDatePicker(
      this.page.getByText(labelText, { exact: true }).locator('xpath=following-sibling::b[1]//input').first(),
      value,
    );
  }

  async selectRadio(groupLabel: string, optionLabel: string, cellIndex = 1): Promise<void> {
    await this.cellAt(groupLabel, cellIndex).getByLabel(optionLabel, { exact: true }).check();
  }

  // Checks one CPT/IPT obsgroup's own "given" toggle — a single-option
  // radio wrapped in a `<span id="ctx"|"inh"|"rfp"|"rfp/inh"|"pyridoxine">`
  // — see Task 13 verification note 8. Uses an attribute selector rather
  // than `#${id}` since `rfp/inh`'s `/` isn't valid unescaped bare-`#id` CSS
  // selector syntax.
  async checkCptIptGiven(id: string): Promise<void> {
    await this.page.locator(`[id="${id}"]`).locator('input[type="radio"]').first().check();
  }

  // Fills the "No. of pills" input immediately following a CPT/IPT group's
  // id'd toggle span — the only reliable anchor, since "No. of pills" text
  // itself repeats 5x with no id of its own — see Task 13 verification note
  // 8. Required for ALL 5 groups regardless of whether that group's toggle
  // is checked (confirmed live), so this is called for every group, not
  // just the ones `checkCptIptGiven` is also called for.
  async fillCptIptPills(id: string, value: string): Promise<void> {
    await this.page.locator(`[id="${id}"]`).locator('xpath=following-sibling::input[1]').fill(value);
  }

  // Checks a checkbox field addressed by real DOM id (NCD Other pilot,
  // Task 3) — e.g. `rheumatoid-dx`/`cirrhosis-dx`/`deepV-dx`/`sickle-dx`/
  // `nonCoded-dx`, each an id'd `<span>` wrapping a checkbox (same shape as
  // `guardianNameField`), not a plain input `fillField`'s byId path can
  // `.fill()`, and not the `input[type="radio"]` `checkCptIptGiven` targets.
  // Each of these pairs with a `data-toggle-target` date field that starts
  // `disabled` and is enabled by the page's own JS the moment this checkbox
  // is checked — see ncd-other-mastercard-page.ts's Task 3 verification note
  // 3. This shape (an id'd toggle checkbox paired with a disabled date
  // field) recurs across several other chronic-care mastercard forms
  // (epilepsy/CKD/cardiac-and-vascular-disease/...), so it's kept here as a
  // shared helper rather than an NCD-Other-only one.
  async checkById(id: string): Promise<void> {
    await this.page.locator(`[id="${id}"]`).locator('input[type="checkbox"]').first().check();
  }

  // Handles `<select>` fields either by real DOM id (e.g. `visitLocation`,
  // `artRegimenObs` — both wrap a `<select>` in an id'd `<span>`, same shape
  // as fillField's by-id fields) or, falling back, by the plain-text label
  // immediately to the select's left in the same table row (or the
  // `cellIndex`-th `<td>` sibling after it, for a select sharing a row with
  // other fields at a non-1 position — NCD Other pilot, Task 3 addition,
  // mirroring `fillField`/`selectRadio`'s existing `cellIndex` param; default
  // of 1 keeps every prior call site's behavior unchanged).
  async selectDropdown(labelOrId: string, optionLabel: string, cellIndex = 1): Promise<void> {
    // See the `ID_LIKE` guard comment in `fillField` — same reasoning
    // applies here (e.g. the Task 11 label "ART Regimens" has a space), plus
    // the same attribute-selector-not-`#id` reasoning for leading-digit ids.
    if (ID_LIKE.test(labelOrId)) {
      const byId = this.page.locator(`[id="${labelOrId}"] select`);
      if (await byId.count()) {
        await byId.first().selectOption({ label: optionLabel });
        return;
      }
    }
    await this.cellAt(labelOrId, cellIndex).locator('select').first().selectOption({ label: optionLabel });
  }

  // Checks a checkbox (or radio) by its own real, non-empty accessible
  // label — Cardiac and Vascular Disease pilot's repeated-medication rows
  // (e.g. cardiac-and-vascular-disease-visit.xml's Diuretic/ACE-I/BB/CCB/
  // Statins `<repeat>` blocks, whose own checkbox has no id, only a real
  // `<label>` matching the repeat's own drug abbreviation — confirmed live
  // unique per drug, except a genuine content collision documented in this
  // file's own "Cardiac and Vascular Disease pilot" note above). Used for
  // fields with a real `<label for="...">` but no id of their own at all
  // (unlike `checkById`, which needs a stable id on a wrapping element).
  async checkByLabel(label: string): Promise<void> {
    await this.page.getByLabel(label, { exact: true }).check();
  }

  // Same intent as `selectRadio`, but for rows whose <th>/<td> label text is
  // wrapped in an inline element (e.g. cardiac-and-vascular-disease-visit.xml's
  // `<th><span class="rotate">Took medication today?</span></th>` — any
  // wrapping tag) — see this file's own "Cardiac and Vascular Disease pilot"
  // note above. Matches the exact <th>/<td> itself via an xpath
  // `normalize-space(.)` text check (tag-agnostic of anything nested inside
  // it), unlike `cellAt`'s `getByText(...)`, which returns the INNERMOST
  // matching element (the wrapper, not the `<th>`) and so cannot reach the
  // `<th>`'s own `following-sibling::td` — that failure mode is a silent
  // HANG (the locator never resolves), not an error, so use this helper
  // defensively for ANY row whose <th>/<td> label isn't a bare text node,
  // not just ones already confirmed to hang.
  async selectRadioInWrappedLabelRow(labelText: string, optionLabel: string, cellIndex = 1): Promise<void> {
    await this.page
      .locator(`xpath=//*[self::th or self::td][normalize-space(.)="${labelText}"]`)
      .locator(`xpath=following-sibling::td[${cellIndex}]`)
      .getByLabel(optionLabel, { exact: true })
      .check();
  }

  // Fills the bare <input> immediately following (as an element sibling,
  // possibly with an intervening plain-text node) the wrapping <span> of a
  // labelled control (checkbox/radio) with exact accessible name `label` —
  // Cardiac and Vascular Disease pilot's "Other medications" (non-coded)
  // row on the visit form: its free-text "please specify:" input has no id
  // of its own, and its checkbox (unlike Aspirin's own `aspName`) has no id
  // either — only a real `<label>` (the XML's own literal
  // `answerLabel="Other, "`). Same "sibling input right after a wrapping
  // span" shape `fillCptIptPills`/NCD Other's `nonCodedDxText` branch
  // already established, anchored via label instead of id since there's no
  // id here at all.
  async fillFieldAfterLabel(label: string, value: string): Promise<void> {
    await this.fillInputOrDatePicker(
      this.page.getByLabel(label, { exact: true }).locator('xpath=ancestor::span[1]/following-sibling::input[1]'),
      value,
    );
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
    // art-visit.xml's own bundled JS has a stale-"Required"-error mechanism
    // on `noTabletsGiven` that can repaint AFTER it's been cleared, not just
    // before — see Task 14 verification note 10 for the full evidence (a
    // live trace under real parallel load caught the error reappearing on a
    // correctly-filled field between a verified clear and the click that
    // immediately followed it, something a single clear-then-click could
    // never observe or recover from). Rather than model this third-party
    // script's exact timing (its full source isn't in this repo), retry the
    // whole clear-and-click sequence: `.click()` only ever dispatches a
    // real click once the button is actually visible/enabled/stable, so a
    // short per-attempt timeout that throws means zero clicks happened —
    // safe to re-clear and retry with no double-submit risk. A no-op
    // clear step (aside from the `count()` check) for forms without this
    // field (e.g. the header form).
    const noTabletsGivenInput = this.page.locator('#noTabletsGiven input').first();
    const hasNoTabletsGiven = (await noTabletsGivenInput.count()) > 0;
    const submitButton = this.page.locator('.submitButton').first();

    for (let attempt = 1; attempt <= 6; attempt++) {
      if (hasNoTabletsGiven) {
        await noTabletsGivenInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
      }
      try {
        await submitButton.click({ timeout: 3000 });
        return;
      } catch (e) {
        if (attempt === 6) {
          throw new Error(
            `submitButton never became clickable after 6 retries (likely noTabletsGiven's stale 'Required' error) — see save()'s verification note. Original: ${e}`,
          );
        }
        // Button still disabled — the stale error was (re)painted after our
        // clear. No click was dispatched (click() only clicks once
        // actionable), so it's safe to re-clear and retry.
      }
    }
  }

  async expectSaveSuccess(): Promise<void> {
    // See verification note 4 above — this is an in-place re-render, not a
    // navigation, so we assert on DOM content rather than a URL change.
    await expect(this.page.getByText(/back to dashboard/i)).toBeVisible();
  }

  // The leaf <td> (or <th> — e.g. "TB treatm." / "ART Regimens", both <th>
  // elements — `getByText` matches either) whose OWN text is exactly
  // `label` — `exact: true` is what keeps this from matching an ancestor
  // <tr>/<table> that also contains it (see verification note 2 above) —
  // followed by its immediate next <td> sibling, which is where
  // htmlformentry always renders that field's input/radio group.
  private inputCellFor(label: string) {
    return this.cellAt(label, 1);
  }

  // Generalizes `inputCellFor` to the `n`-th following <td> sibling, for a
  // second (or third) data cell in the same row that has no label of its
  // own — anchored to the row's one real, unique label rather than to raw
  // DOM position — see Task 11 verification note 8.
  private cellAt(label: string, n: number) {
    return this.page.getByText(label, { exact: true }).locator(`xpath=following-sibling::td[${n}]`);
  }

  private rowFor(label: string) {
    return this.page.getByText(label, { exact: true }).locator('xpath=ancestor::tr[1]');
  }
}
