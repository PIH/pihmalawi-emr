import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// Verification notes (Sickle Cell Disease pilot, header form) — confirmed
// against a live instance the same way as every prior Chronic Care Program
// pilot: reading
// content/configuration/backend_configuration/htmlforms/sickle-cell-disease-emastercard.xml
// in full, then dumping `table.data-entry-table`'s rendered innerHTML for a
// freshly-opened create form (real `eligibleSickleCellDiseasePatient` fixture
// patient) at the URL `SickleCellDiseaseMastercardGatePage.buildCreateUrl`
// constructs, then actually filling and saving the form and checking the
// resulting REST `encounter`/`obs`.
//
// 0. The dashboard "Create new Sickle Cell Disease eMastercard" link IS live
//    (see docs/program-eligibility-rules.md's own "Sickle Cell Disease"
//    section — an earlier pass through this doc wrongly assumed the whole
//    `<tr>` was commented out in `malawiPatientDashboard.jsp` pending
//    MLW-1568; re-verified live this pilot and corrected: only a one-line,
//    self-closing comment precedes the `<tr>`, which is itself live,
//    unconditional markup). Confirmed live via `patientDashboard.form` for a
//    real `eligibleSickleCellDiseasePatient` fixture patient: the link
//    renders, is visible, and its `onclick` matches
//    `buildCreateUrl` below exactly. This pilot's specs still always use
//    `MastercardFormPage.openCreateAtUrl` directly rather than clicking that
//    dashboard link — same as every other condition's own specs — so this
//    correction doesn't change any test behavior, only the doc's own
//    narrative about why.
//
// 1. This form's own layout is a 3-column table (`Patient / Guardian
//    Details` | `Patient Overview` | `Family History`), a genuinely
//    different shape from every prior Chronic Care condition's single
//    "PatientHistory"-style table — but every individual field still fits
//    the existing shared helpers with zero new positional/table-crawling
//    code beyond the two small additions in mastercard-page.ts (`checkByLabel`/
//    `fillFieldInNextRow`, both already independently established by the CKD/
//    Chronic Lung Disease/Cardiac and Vascular Disease pilots for the exact
//    same shapes) and this file's own `fillFieldAfterText` need in
//    mastercard-page.ts.
//
// 2. "Diagnosis Date" — the ONLY required field on this entire header form
//    (confirmed live: saving with just the location selected and every
//    other field blank succeeds; saving with the location selected but
//    Diagnosis Date blank leaves `.submitButton` permanently disabled).
//    Despite its own `<td>` label reading "Diagnosis Date:", the underlying
//    `<obs>` carries the id `appointmentDate` (a copy-paste leftover from
//    the visit form's own "Next appointment" field id, confirmed via the
//    XML source — NOT a next-appointment date on this form at all, it's the
//    date this obsgroup's own diagnosis was made). `fillField('appointmentDate',
//    ...)`'s existing byId + datepicker-dispatch path handles it unchanged.
//    It shares its `<obsgroup>` with a HIDDEN, always-checked "Sickle cell
//    disease" diagnosis checkbox (`style="display:none"`,
//    `defaultValue="$sickleCellDiagnosis"` — confirmed live rendered as
//    `checked="true"` inside a `display:none` `<span>`), so the diagnosis
//    itself needs no user interaction at all — it's submitted automatically
//    whenever Diagnosis Date is filled and the form is saved. Confirmed live
//    this produces one "Chronic Care Diagnosis Construct: <date>, Sickle
//    cell disease" obs (component order not fixed across pilots' own
//    obsgroups — see CKD's own note on this — asserted via `hasAll` below).
//
// 3. Microscopy / Rapid Test / HB Electrophoresis — each row has 3 real
//    `<td>`s: a label, a Y/N radio pair (`answerLabels="Y,N"`, note the
//    OPPOSITE order from "Agrees to FUP"'s own "N,Y" — confirmed live via
//    the rendered `value=` attributes, not assumed from the XML alone), and
//    a third `<td>` whose own text is literally `"Date: "` immediately
//    followed by the date `<obs>` — INLINE, not a separate labelled field.
//    Each row's own label ("Microscopy"/"Rapid Test"/"HB Electrophoresis")
//    is unique on the page, so both the radio (`cellIndex` 1) and inline
//    date (`cellIndex` 2) reuse the existing `cellAt`-based
//    `selectRadio`/`fillField` with zero new code — the SAME "anchor once,
//    reach a second unlabelled cell via `cellIndex`" pattern every prior
//    pilot's own multi-cell rows already established (e.g. CKD's
//    "PatientHistory" row).
//
// 4. "HIV History" — 3 real `<td>`s in its OWN row: label, an R/NR radio
//    (`$reactive,$nonReactive` → "R"/"NR", NOT "Y"/"N" — confirmed live),
//    and a third `<td>` reading `"ART Start Date: "` + a date `<obs>`,
//    reached the same way as note 3 (`cellIndex` 2). Its own "Date Test:"
//    field, though, lives in a genuinely SEPARATE `<tr>` immediately
//    following (confirmed live via the rendered DOM: that row's own first
//    `<td>` is completely empty, no label at all) — the exact
//    "rowspan-anchored label, real field in the next row" shape CKD's own
//    "PatientHistory" → TB dropdown row already established, reached here
//    via the new `fillFieldInNextRow('HIV History', ..., 2)` (this file's
//    own mastercard-page.ts addition, ported from CKD's identical
//    `cellInNextRow`-based helper).
//
// 5. Parent / Sibling — real, correctly mutually-exclusive Y/N/Unknown radio
//    groups (`answerLabels="Y,N,Unknown"`), each row's own single data
//    `<td>` reached via `selectRadio`'s existing default `cellIndex` of 1 —
//    zero new code, despite the XML's stray (and, on `<tr>`, invalid)
//    `colspan="3"`/`colpan="2"` attributes, which have no effect on the
//    `following-sibling::td[n]` xpath `cellAt` already uses.
//
// 6. Referral History — 3 independent single-checkbox rows (In-Patient/IC3/
//    OPD, each `<obs style="checkbox">` with its own `answerConceptId`, no
//    shared grouping concept with each other) PLUS a 4th, `<obsgroup>`-wrapped
//    "Other" checkbox with its own free-text "Specify:" `<textarea>`
//    alongside it in the SAME `<td>`. None of the 4 checkboxes has a stable
//    id (only opaque render-order ids, e.g. `w46`/`w48`/`w50`/`w52`) — only a
//    real `<label for="...">` whose text is the XML's own literal
//    `answerLabel` ("In-Patient"/"IC3"/"OPD"/"Other") — reached via the new
//    `checkByLabel` (this file's own mastercard-page.ts addition, ported
//    from CKD's identical helper). The "Specify:" `<textarea>` has no id or
//    label of its own either — it's a bare `<textarea>` that is a PLAIN
//    sibling (no wrapping `<span>` at all, unlike every prior "Other,
//    please specify" row in this codebase) of a bare `<b>Specify:</b>` text
//    node in the same `<td>` — reached via the new `fillFieldAfterText`
//    helper added to mastercard-page.ts for this exact shape.
//
//    CONTENT BUG CANDIDATE (not fixed here — out of this pilot's scope, see
//    the playbook's "Reporting data/code issues" section): the "In-Patient"
//    checkbox's `answerConceptId` (`$inPatient` =
//    `7602D441-4A44-41A9-AA49-A59853AEDC65`) resolves to a REAL concept
//    named "Patient transfer in" (confirmed live via
//    `GET /ws/rest/v1/concept/7602D441-4A44-41A9-AA49-A59853AEDC65` →
//    `"display": "Patient transfer in"`), NOT anything meaning "inpatient" —
//    the saved obs reads "PDC Reasons for referral: Patient transfer in"
//    despite the on-screen checkbox being labelled "In-Patient". This looks
//    like the wrong concept uuid was wired to this checkbox (a
//    copy-paste/wrong-answer mistake, the same general class of defect
//    MLW-1856 fixed for NCD Other's swapped answerConceptIds), not a
//    behavior bug in this test suite. IC3/OPD's own concepts ("IC3"/"OPD
//    clinic") are semantically consistent with their on-screen labels by
//    contrast, confirming this is isolated to the In-Patient row.
// ---------------------------------------------------------------------------

const SCD_HEADER_FORM = 'file:configuration/htmlforms/sickle-cell-disease-emastercard.xml';
const SCD_FLOWSHEETS = [
  'file:configuration/htmlforms/sickle-cell-disease-quarterly-screening.xml',
  'file:configuration/htmlforms/sickle-cell-disease-annual-monitoring.xml',
  'file:configuration/htmlforms/sickle-cell-disease-hospitalization-history.xml',
  'file:configuration/htmlforms/sickle-cell-disease-visit.xml',
];

export class SickleCellDiseaseMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: SCD_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of SCD_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    // No leading slash — see playwright.config.ts's baseURL comment (same
    // reasoning as MastercardGatePage.buildCreateUrl).
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

// Fills every editable field on sickle-cell-disease-emastercard.xml's header
// form. The literal values used below are asserted against in
// e2e/specs/sickle-cell-disease/header-mastercard.spec.ts — keep that spec's
// assertions in sync if any value here changes.
export async function fillSickleCellDiseaseHeaderForm(
  form: MastercardFormPage,
  encounterDate: string,
): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);

  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('guardianNameField', 'Grace Banda');
  await form.fillField('Guardian Phone', '0993334444');
  await form.fillField('Guardian relation to patient', 'Mother');
  await form.selectRadio('Agrees to FUP', 'Y');

  // Diagnosis Date — the only required field, and the trigger for the
  // hidden, always-checked Sickle cell disease diagnosis obs — see
  // verification note 2 above.
  await form.fillField('appointmentDate', encounterDate);

  // Diagnostic Tool rows — see verification note 3 above.
  await form.selectRadio('Microscopy', 'Y', 1);
  await form.fillField('Microscopy', encounterDate, 2);
  await form.selectRadio('Rapid Test', 'Y', 1);
  await form.fillField('Rapid Test', encounterDate, 2);
  await form.selectRadio('HB Electrophoresis', 'N', 1);
  await form.fillField('HB Electrophoresis', encounterDate, 2);

  // HIV History — see verification note 4 above.
  await form.selectRadio('HIV History', 'R', 1);
  await form.fillField('HIV History', encounterDate, 2);
  await form.fillFieldInNextRow('HIV History', encounterDate, 2);

  // Family History — see verification note 5 above.
  await form.selectRadio('Parent', 'Y', 1);
  await form.selectRadio('Sibling', 'Unknown', 1);

  // Referral History — see verification note 6 above.
  await form.checkByLabel('In-Patient');
  await form.checkByLabel('IC3');
  await form.checkByLabel('OPD');
  await form.checkByLabel('Other');
  await form.fillFieldAfterText('Specify:', 'Chronic pain crisis referral');
}

// Fills only the minimum field needed to save a SICKLE_CELL_DISEASE_INITIAL
// header encounter: Diagnosis Date, the form's ONLY required field (see
// verification note 2 above — confirmed live no other field, including the
// diagnosis checkbox other pilots' own "must select a diagnosis" gate
// required, blocks a save here, since the diagnosis itself is hidden and
// auto-checked). Used ONLY by visit-mastercard.spec.ts's `beforeEach`, which
// needs a saved header encounter as a prerequisite, not the header
// encounter's own content. header-mastercard.spec.ts still uses the full
// `fillSickleCellDiseaseHeaderForm` since it asserts on that form's field
// values.
export async function fillSickleCellDiseaseHeaderMinimum(
  form: MastercardFormPage,
  encounterDate: string,
): Promise<void> {
  await form.fillField('appointmentDate', encounterDate);
}

// ---------------------------------------------------------------------------
// Verification notes (Sickle Cell Disease pilot, visit form) — confirmed
// against a live instance by reading
// content/configuration/backend_configuration/htmlforms/sickle-cell-disease-visit.xml
// in full, then dumping `table.visit-edit-table`'s rendered innerHTML for a
// freshly-opened "Enter New Sickle Cell Disease Visit" flowsheet, then
// actually filling and saving the form and checking the resulting REST
// `encounter`/`obs`.
//
// 0. REAL APP BUG (not fixed here — see the playbook's "Reporting data/code
//    issues" section; documented in full for a future ticket): this form's
//    5 medication rows (Malaria Prophylaxis/Folic Acid/Hydroxyurea/BZN/Other)
//    are NOT wrapped in an htmlformentry `<repeat>` tag, yet each one's
//    toggle-target `<div>` and its own dose/route/frequency/duration `<span>`
//    ids use a literal, UNSUBSTITUTED repeat-index placeholder — `toggle="
//    diab_{0}_med"` / `id="diab_{0}_med"` / `id="dose_{0}"` / etc. — the SAME
//    literal string on all 4 of the non-"Other" rows (only the "Other" row
//    uses a real, distinct id, `chf_noncodedText_med`/`*_noncodedText`).
//    Confirmed live via `page.locator('[id="diab_{0}_med"]').count()` === 4.
//    Confirmed live this is not just a cosmetic duplicate-id issue: opening
//    this form's "Enter New Sickle Cell Disease Visit" flowsheet throws a
//    real, uncaught `BROWSER PAGE ERROR: Syntax error, unrecognized
//    expression: #diab_{0}_med, .diab_{0}_med` (jQuery/Sizzle rejects the
//    unescaped `{`/`}` characters as invalid CSS selector syntax) — this
//    fires from INSIDE `flowsheet.js`'s own `enterVisit`'s AJAX callback
//    (`jq('#flowsheet-edit-section-'+fs.index).html(data).show(); setupForm(...)`),
//    thrown while the freshly-injected HTML's own embedded `<script>` runs
//    (during the `.html(data)` call itself, confirmed by the fact `.show()`
//    — chained immediately after `.html(data)` on the SAME line — never
//    takes effect: the section's inline style stays `display: none;`
//    forever). PRACTICAL IMPACT, confirmed live: the ENTIRE visit edit
//    section — every field, not just the medication rows, INCLUDING the
//    submit button itself — remains `display:none` (`offsetParent: null`)
//    even though it is fully present and populated in the DOM. This makes
//    the Sickle Cell Disease Visit form practically unusable for a real
//    end user in a real browser today (nothing on it is visibly clickable),
//    not just a test-authoring inconvenience.
//
//    WORKAROUND used below and in the shared `force` parameter this pilot
//    added to `MastercardFormPage`'s field-filling methods (`fillField`/
//    `selectRadio`/`selectDropdown`/`checkByLabel`/`save`, plus this file's
//    own `fillFieldInRowOfLabel`/`selectDropdownInRowOfLabel`/
//    `fillFieldInFlowsheetSection`): every interaction below passes
//    `force: true`, which — confirmed live through substantial trial and
//    error, see each shared helper's own comment — must ultimately bypass
//    Playwright's actionability model ENTIRELY via raw `.evaluate()` calls,
//    not `{force: true}` alone:
//      - `.check()`/`.click()` still throw "Element is not visible" even
//        with `force: true`, because they always simulate a real mouse
//        click at the element's computed center, which a `display:none`
//        ancestor has no bounding box for at all — `forceCheck()`/`save()`'s
//        force branch instead set `.checked`/call `.click()` via raw JS.
//      - `.fill({force: true})`, by contrast, does NOT throw at all, but
//        silently does NOTHING on such an element (confirmed live: read the
//        field's own `.value` right back after an apparently-successful
//        call and found it still empty) — `fillPlainInput`'s force branch
//        instead sets `.value` and dispatches `input`/`change` directly.
//      - `.selectOption()` has no `force` option at all — `forceSelectOption`
//        sets `.value` on the matching `<option>` directly.
//    This is a genuine, well-evidenced app bug worked around at the test
//    level, NOT a fabricated pass: every resulting encounter/obs checked
//    below is real, created via a real POST triggered by the same
//    `submitHtmlForm()` a real (if currently non-functional) click would
//    trigger.
//
//    Checking each drug's own toggle checkbox (`checkByLabel` below)
//    RE-TRIGGERS the same "Syntax error" console error each time (its own
//    `togglehide="diab_{0}_med"` handler tries and fails the same broken
//    selector) — confirmed harmless for this pilot's purposes (the checkbox
//    ends up in the right state regardless, via `forceCheck`'s own raw
//    `.checked = true`), but worth noting since a fresh session re-deriving
//    this evidence chain should expect to see it repeatedly, not just once.
//
// 1. `dose_{0}`/`doseUnit_{0}`/`route_{0}`/`frequencyCoded_{0}`/
//    `duration_{0}`/`durationUnit_{0}` are IDENTICAL across all 4 of
//    Malaria Prophylaxis/Folic Acid/Hydroxyurea/BZN's own dose-detail cells
//    (see note 0) — disambiguated via the new `fillFieldInRowOfLabel`/
//    `selectDropdownInRowOfLabel` helpers, which scope the `[id="..."]`
//    lookup to the `<tr>` ancestor of each drug's own real, page-unique
//    checkbox label (SP/FCD/HYD/BZN) — see mastercard-page.ts's own comment
//    on why this is NOT the "fragile positional selector" the playbook says
//    to avoid (it's anchored to a real, meaningful, unique label, not a bare
//    index). Unlike every prior Chronic Care pilot's own multi-drug
//    `<repeat>` rows (CKD/Chronic Lung Disease/Cardiac and Vascular
//    Disease's own "one representative drug per class" convention — this
//    task brief's own accepted exception), these 5 rows are each a SINGLE,
//    independent, non-repeated medication, not several alternatives within
//    one class — so all 5 (SP/FCD/HYD/BZN/Other) are filled for full
//    coverage, none skipped.
//
// 2. "Other" medication (non-coded) — its own ids ARE real and unique
//    (`chf_noncodedText_med`/`dose_noncodedText`/etc.), no collision — plain
//    `fillField`/`selectDropdown` (with `force`) reach these unchanged. Its
//    free-text "please specify:" input has no id of its own (only the
//    checkbox does), reached via the existing `fillFieldAfterLabel`
//    (Chronic Kidney Disease pilot's helper) — same shape, ported unchanged.
//
// 3. `visitDate` (the form's own hidden, internal encounter-date tracking
//    field — NOT a user-facing row) and `appointmentDate` ("Next
//    appointment") both use htmlformentry's readonly-datepicker shape
//    (`class="hasDatepicker"` on their display `<input>`) on every OTHER
//    Chronic Care pilot's own visit form — but confirmed live NEITHER ever
//    actually gains that class here, because `setupForm()` (which performs
//    that jQuery-UI-datepicker initialization) never runs at all for this
//    form (see note 0 — the exception happens before it). `fillField`'s
//    existing datepicker branch calls htmlformentry's own
//    `window.setDatePickerValue()`, which wraps its own body in a bare
//    `try {} catch (err) {}` (confirmed live via
//    `window.setDatePickerValue.toString()`) — so calling it on an
//    uninitialized (no real jQuery-UI-datepicker instance yet) field fails
//    COMPLETELY SILENTLY: no error, but neither the display nor the hidden
//    input's value ever changes. Discovered only by reading the hidden
//    field's own `.value` right back after an apparently-successful,
//    error-free call. Both fields are reached instead via the new
//    `forceFillDateFieldInFlowsheetSection`, which sets both the display
//    (`dd/mm/yyyy`) and hidden (`yyyy-MM-dd`, confirmed live as the format a
//    WORKING datepicker field's own hidden input ends up with) inputs
//    directly, bypassing htmlformentry's datepicker plumbing entirely.
//    `visitDate` is REQUIRED (leaving it unset renders a permanent
//    "Required" error on it and the encounter silently fails to save with
//    no other visible error at all — confirmed live) even though it has no
//    visible row of its own; `appointmentDate` also has an explicit id and
//    is filled for the same "Next appointment" field every prior pilot's
//    own visit form has. Both are scoped via `fillFieldInFlowsheetSection`'s
//    `.flowsheet-edit-section` scoping / `forceFillDateFieldInFlowsheetSection`'s
//    own — see note 4 below on why plain `#appointmentDate` alone is
//    ambiguous on this specific pair of forms.
//
// 4. CONTENT BUG CANDIDATE: `appointmentDate` is reused as the literal id
//    for TWO DIFFERENT fields across this condition's two forms — this same
//    header form's own "Diagnosis Date" (see
//    `fillSickleCellDiseaseHeaderForm`'s own verification note 2) AND this
//    visit form's "Next appointment". Once a header encounter is saved, its
//    read-only re-render KEEPS `id="appointmentDate"` on a plain
//    `<span class="value">` with NO `<input>` inside it at all — so once
//    both a saved header AND an open visit form coexist on the same page (as
//    they do here, via `enterNewFlowsheet`), a page-wide `#appointmentDate`
//    lookup is genuinely ambiguous, and naively taking the first match
//    resolves to the WRONG (header's, input-less) element, hanging forever
//    waiting for an `<input>` that will never appear inside it — confirmed
//    live. Every other Chronic Care pilot's own header/visit id pairs are
//    distinct; this collision is unique to Sickle Cell Disease.
//
// 5. CONTENT BUG CANDIDATE (see the playbook's "Reporting data/code issues"
//    section — not fixed here): at least 3 of this form's macro-defined
//    concepts resolve, via their REAL REST `display` name, to something
//    UNRELATED to their own row's on-screen label — confirmed live by
//    saving each field and reading the real resulting obs:
//      - "Jaundice" (`$jaundice` = `6557aea4-977f-11e1-8993-905e29aff6c1`)
//        → real concept name "Extremity exam findings".
//      - "Irregular Conjunctiva" (`$pinkConjunctiva` =
//        `6570e5b8-977f-11e1-8993-905e29aff6c1`) → real concept name
//        "Diagnosis resolved".
//      - "Enlarged Spleen" (`$spleenEnlargement` =
//        `e384a58c-4a73-11ec-81d3-0242ac130003`) → real concept name
//        "Complications since last visit".
//    A 4th, milder case: "Absence from School" (`$schoolAbsence` =
//    `656cb22c-977f-11e1-8993-905e29aff6c1`) → real concept name "Attended
//    school ever" (arguably the opposite question). "Medication Rx"
//    (`$malaria`) resolving to the real concept name "Malaria" is at least
//    thematically adjacent (probably means "malaria treatment given", just
//    unclearly labelled) so is NOT counted as a mismatch here. These 3-4
//    concepts read like the wrong concept uuids were wired to these
//    specific rows (the same general class of defect MLW-1856 already fixed
//    for NCD Other's own swapped `answerConceptIds`) — assertions below
//    check the REAL (if semantically wrong) resulting `display` string, per
//    this pilot's own rule of never asserting a presence-only or
//    intended-meaning check.
// ---------------------------------------------------------------------------

interface MedicationDoseDetails {
  dose: string;
  doseUnit: string;
  route: string;
  frequency: string;
  duration: string;
  durationUnit: string;
}

// Fills one drug's dose/route/frequency/duration fields, scoped to that
// drug's own row (see verification note 1 above) via its own real,
// page-unique checkbox label.
async function fillScdMedicationDose(
  form: MastercardFormPage,
  drugLabel: string,
  details: MedicationDoseDetails,
): Promise<void> {
  await form.fillFieldInRowOfLabel(drugLabel, 'dose_{0}', details.dose, true);
  await form.selectDropdownInRowOfLabel(drugLabel, 'doseUnit_{0}', details.doseUnit, true);
  await form.selectDropdownInRowOfLabel(drugLabel, 'route_{0}', details.route, true);
  await form.selectDropdownInRowOfLabel(drugLabel, 'frequencyCoded_{0}', details.frequency, true);
  await form.fillFieldInRowOfLabel(drugLabel, 'duration_{0}', details.duration, true);
  await form.selectDropdownInRowOfLabel(drugLabel, 'durationUnit_{0}', details.durationUnit, true);
}

// Fills every editable field on sickle-cell-disease-visit.xml's own
// data-entry (visit) form. The literal values used below are asserted
// against in e2e/specs/sickle-cell-disease/visit-mastercard.spec.ts — keep
// that spec's assertions in sync if any value here changes. EVERY
// interaction uses `force: true` — see verification note 0 above for why.
export async function fillSickleCellDiseaseVisitForm(
  form: MastercardFormPage,
  opts: { encounterDate: string; appointmentDate: string },
): Promise<void> {
  // Internal visit-date tracking field — required, but not a visible row —
  // see verification note 3 above.
  await form.forceFillDateFieldInFlowsheetSection('visitDate', opts.encounterDate);

  await form.selectDropdown('visitLocation', 'Neno District Hospital', 1, true);

  await form.fillField('heightInput', '120', 1, true);
  await form.fillField('weightInput', '25', 1, true);
  await form.fillField('BMI/MUAC', '17.4', 1, true);
  await form.fillField('systolicBP', '110', 1, true);
  await form.fillField('diastolicBP', '70', 1, true);
  await form.fillField('Heart Rate', '88', 1, true);
  // HB's own onblur validator (`checkNumber`) rejects a decimal here despite
  // no explicit min/max being set on it — confirmed live ("Not an integer"),
  // so an integer value is used (unlike Height/Weight/BP/Temperature, which
  // all accept decimals).
  await form.fillField('HB', '10', 1, true);
  await form.fillField('%SPO2', '97', 1, true);
  await form.fillField('Temperature', '36.8', 1, true);

  await form.selectRadio('Hospitalized since last visit for SCD', 'Y', 1, true);
  await form.selectRadio('Absence from School', 'Y', 1, true);
  await form.selectRadio('Pain', 'Y', 1, true);
  await form.selectRadio('Fever', 'N', 1, true);
  await form.selectRadio('Medication Rx', 'Y', 1, true);
  await form.selectRadio('Antibiotics Rx', 'Y', 1, true);
  await form.selectRadio('Medication Side Effects?', 'N', 1, true);
  await form.selectRadio('Jaundice', 'Y', 1, true);
  await form.selectRadio('Irregular Conjunctiva', 'N', 1, true);
  await form.selectRadio('Abnormal Lungs Exam', 'N', 1, true);
  await form.selectRadio('Ascites', 'N', 1, true);
  await form.selectRadio('Enlarged Spleen', 'Y', 1, true);
  await form.selectRadio('Enlarged Liver', 'N', 1, true);

  // 5 independent, single-drug medication rows — see verification note 1
  // above (all 5 filled, not "one representative per class" — these aren't
  // alternatives within one class).
  await form.checkByLabel('SP', true);
  await fillScdMedicationDose(form, 'SP', {
    dose: '500',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'OD',
    duration: '5',
    durationUnit: 'Days',
  });

  await form.checkByLabel('FCD', true);
  await fillScdMedicationDose(form, 'FCD', {
    dose: '5',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'OD',
    duration: '30',
    durationUnit: 'Days',
  });

  await form.checkByLabel('HYD', true);
  await fillScdMedicationDose(form, 'HYD', {
    dose: '500',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'BID',
    duration: '30',
    durationUnit: 'Days',
  });

  await form.checkByLabel('BZN', true);
  await fillScdMedicationDose(form, 'BZN', {
    dose: '1.2',
    doseUnit: 'mL',
    route: 'IV',
    frequency: 'STAT',
    duration: '1',
    durationUnit: 'Days',
  });

  // Other medication (non-coded) — real, unique ids, no collision — see
  // verification note 2 above.
  await form.checkByLabel('Other, ', true);
  await form.fillFieldAfterLabel('Other, ', 'Ibuprofen', true);
  await form.fillField('dose_noncodedText', '200', 1, true);
  await form.selectDropdown('doseUnit_noncodedText', 'mg', 1, true);
  await form.selectDropdown('route_noncodedText', 'Oral', 1, true);
  await form.selectDropdown('frequencyCoded_noncodedText', 'TID', 1, true);
  await form.fillField('duration_noncodedText', '3', 1, true);
  await form.selectDropdown('durationUnit_noncodedText', 'Days', 1, true);

  // Next appointment — see verification notes 3 and 4 above.
  await form.forceFillDateFieldInFlowsheetSection('appointmentDate', opts.appointmentDate);
}
