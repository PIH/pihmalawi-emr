import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// Verification notes (Cardiac and Vascular Disease pilot, header form) —
// confirmed against a live instance the same way as every prior pilot:
// reading
// content/configuration/backend_configuration/htmlforms/cardiac-and-vascular-disease-emastercard.xml
// in full, then (1) dumping `patientDashboard.form`'s rendered "Create new
// Cardiac and Vascular Disease eMastercard" link's `onclick` for a real
// `eligibleCardiacAndVascularDiseasePatient` fixture patient, and (2)
// dumping `table.data-entry-table`'s innerHTML for a freshly-opened create
// form at the resulting URL.
//
// 1. The dashboard's link has NO `href` attribute (same shape as every prior
//    pilot's link), and its `onclick` embeds a LARGER flowsheet list than
//    any prior pilot — see docs/program-eligibility-rules.md's own "Cardiac
//    and Vascular Disease" launch URL note for the full, confirmed list
//    (three imaging-result forms not named after the condition at all, plus
//    the condition's own lab/hospitalization-history forms). `buildCreateUrl`
//    below reproduces that exact list even though most of it is out of this
//    pilot's scope, since `flowsheet.page` needs the real flowsheet list to
//    render the "Enter New Cardiac and Vascular Disease Visit" action link
//    at all (same requirement NCD Other's/Chronic Lung Disease's own notes
//    already established).
//
// 2. Diagnoses — 17 obsgroups across 6 `<tr>`s (all class `dx-checkbox-item`,
//    gating the same "Must enter at least one diagnosis!" JS validation
//    already documented for NCD Other/Chronic Lung Disease/Hypertension and
//    Diabetes), each a toggle checkbox paired with a `data-toggle-target`
//    date that starts `disabled` until checked. ALL 17 are checked (+ dates
//    filled) below for full field coverage. One genuine, minor content
//    oddity found while confirming ids live: the XML's first diagnosis
//    (Cardiomyopathy) has `id="$cardiomyopathy-dx"` — i.e. it accidentally
//    references the `cardiomyopathy` MACRO (a concept uuid) inside what was
//    clearly meant to be a literal id, unlike every other diagnosis row's
//    id (`dilated-dx`, `cad-dx`, etc., all literal strings with no `$`).
//    htmlformentry's macro substitution matches `$cardiomyopathy` as a
//    substring wherever it appears — including inside `$cardiomyopathy-dx`
//    — so the rendered id/data-toggle-source/data-toggle-target for this ONE
//    row are all consistently
//    `6569659a-977f-11e1-8993-905e29aff6c1-dx`/`...-dx-date` (the concept
//    uuid, not a readable string) — confirmed live via the rendered DOM.
//    This still FUNCTIONS correctly (the substitution is at least internally
//    consistent across id/data-toggle-source/data-toggle-target), so it's
//    not a real defect, just an inconsistent, harder-to-read id — worth a
//    doc/content cleanup ticket, not a behavior fix. `CARDIOMYOPATHY_DX_ID`
//    below hardcodes the resulting id rather than guessing a cleaner one.
//
// 3. Comorbidities (CKD/Diabetes/Hypertension, independent checkboxes with
//    real labels matching each answer concept's own short name) + an
//    "Other: " free-text input sharing the same rowspan-free `<td>` — same
//    shape NCD Other's own Comorbidities row already established
//    (`otherComorbidity` in mastercard-page.ts). All 3 checkboxes + the free
//    text are filled, same "independent checkboxes, fill them all" choice
//    NCD Other's own pilot made.
//
// 4. Family planning: (OC (pills)/Depo (injection)/None/Other) — 4
//    independent checkboxes in their own `<td>`, sharing the row with
//    Comorbidities. The "Other" checkbox has
//    `showCommentField="true" commentFieldLabel="(specify):"`, which renders
//    as literal text "(specify): " followed by a bare, unwrapped, un-toggled
//    (not `disabled` by default — confirmed live) `<input>` — same "no
//    id/label of its own, only <td> text fallback, ONE input[type=text] in
//    the cell" shape as `otherComorbidity` — added a new
//    `familyPlanningOtherSpecify` magic-string branch to `fillField` in
//    mastercard-page.ts reusing that identical mechanism. All 4 checkboxes
//    are filled (same "fill every independent checkbox" choice as note 3).
//
// 5. "Patient<br/>History &#38;<br/>Exposures" — confirmed live (dumping
//    `page.locator('th').allTextContents()`) the rendered, Playwright-
//    normalized text is exactly "PatientHistory &Exposures" — identical
//    shape and identical resulting string to the Chronic Lung Disease
//    pilot's own "PatientHistory &Exposures" row (see that file's own
//    verification note 3) — same cellIndex layout too (1: HIV + Date Test,
//    2: ART Start Date, 3: TB, 4: Year, TB Year range-validated
//    1950.0-2050.0, confirmed live via the rendered `checkNumber(...)` call).
//
// 6. ECHO/ECG (Imaging Results) — identical shape to NCD Other's own
//    ECHO/ECG rows (Date at cellIndex 1, Result at cellIndex 2; ECHO's
//    Result is free text, ECG's is a `<select>`; both rows' Date fields
//    reuse the SAME underlying concept, `$echoEcgDate`, confirmed in the
//    XML's own macros — not a bug, just a shared field).
//
// 7. "Outcome" (`fn.currentProgramWorkflowStatus(16)...`) and "CHW Name" are
//    both pure read-only lookups with no backing obs — same as every prior
//    pilot's equivalent rows — intentionally not filled. "Outcome" renders
//    empty for a workflow status lookup that doesn't resolve for the CHF
//    workflow (a pre-existing, likely copy-pasted `currentProgramWorkflowStatus`
//    argument), but since this row has no backing obs at all, it doesn't
//    affect saving or any assertion and isn't in this pilot's scope to fix.
// ---------------------------------------------------------------------------

const CHF_HEADER_FORM = 'file:configuration/htmlforms/cardiac-and-vascular-disease-emastercard.xml';
const CHF_FLOWSHEETS = [
  'file:configuration/htmlforms/echocardiogram-ultrasound-imaging-results.xml',
  'file:configuration/htmlforms/electrocardiographic-ekg-imaging-results.xml',
  'file:configuration/htmlforms/chest-x-ray-cxr-imaging-results.xml',
  'file:configuration/htmlforms/cardiac-and-vascular-disease-quarterly-laboratory-tests.xml',
  'file:configuration/htmlforms/cardiac-and-vascular-disease-frequency-per-protocol-laboratory-tests.xml',
  'file:configuration/htmlforms/cardiac-and-vascular-disease-hospitalization-history.xml',
  'file:configuration/htmlforms/cardiac-and-vascular-disease-visit.xml',
];

export class CardiacAndVascularDiseaseMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: CHF_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of CHF_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    // No leading slash — see playwright.config.ts's baseURL comment (same
    // reasoning as MastercardGatePage.buildCreateUrl).
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

// See verification note 2 above for why this one diagnosis's real rendered
// id is the concept uuid + "-dx", not a readable string like every other
// diagnosis row's id.
const CARDIOMYOPATHY_DX_ID = '6569659a-977f-11e1-8993-905e29aff6c1-dx';

// The other 16 diagnoses all have literal, readable ids — {id, dateId}
// pairs in the same top-to-bottom, left-to-right order the form renders
// them, sourced directly from cardiac-and-vascular-disease-emastercard.xml's
// own `data-toggle-source`/`data-toggle-target` attributes (never invented).
// A loop is used here (unlike prior pilots' explicit per-field calls) simply
// because this form has an unusually large number of structurally identical
// diagnosis rows (17, vs. NCD Other's 5 or Hypertension and Diabetes's 10) —
// every other field on this form is still filled with an explicit call
// below, same as every prior pilot.
const OTHER_DIAGNOSES: Array<{ id: string; dateId: string }> = [
  { id: 'dilated-dx', dateId: 'dilated-dx-date' },
  { id: 'cad-dx', dateId: 'cad-dx-date' },
  { id: 'afib-dx', dateId: 'afib-dx-date' },
  { id: 'restrict-dx', dateId: 'restrict-dx-date' },
  { id: 'pe-dx', dateId: 'pe-dx-date' },
  { id: 'rheumatic-dx', dateId: 'rheumatic-dx-date' },
  { id: 'stroke-dx', dateId: 'stroke-dx-date' },
  { id: 'dvt-dx', dateId: 'dvt-dx-date' },
  { id: 'valvular-dx', dateId: 'valvular-dx-date' },
  { id: 'rightVentricularFailure-dx', dateId: 'rightVentricularFailure-dx-date' },
  { id: 'congenital-dx', dateId: 'congenital-dx-date' },
  { id: 'htnHeartDisease-dx', dateId: 'htnHeartDisease-dx-date' },
  { id: 'unknown-dx', dateId: 'unknown-dx-date' },
  { id: 'pericarditis-dx', dateId: 'pericarditis-dx-date' },
  { id: 'ischemicHeartDisease-dx', dateId: 'ischemicHeartDisease-dx-date' },
];

// Fills every editable field on cardiac-and-vascular-disease-emastercard.xml's
// header form. The literal values used below are asserted against in
// e2e/specs/cardiac-and-vascular-disease/header-mastercard.spec.ts — keep
// that spec's assertions in sync if any value here changes. Exported
// standalone (not a save — callers decide when/whether to save), same
// pattern as every prior pilot's own `fill*HeaderForm`.
export async function fillCardiacAndVascularDiseaseHeaderForm(
  form: MastercardFormPage,
  encounterDate: string,
): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);

  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('guardianNameField', 'Grace Banda');
  await form.fillField('Guardian Phone', '0993334444');
  await form.fillField('Guardian relation to patient', 'Mother');
  await form.selectRadio('Agrees to FUP', 'Y');

  // Diagnoses — all 17 obsgroups, each toggle checkbox checked BEFORE its
  // paired date is filled, same order every prior pilot's diagnosis rows
  // used. See verification note 2 above for the Cardiomyopathy id oddity.
  await form.checkById(CARDIOMYOPATHY_DX_ID);
  await form.fillField(`${CARDIOMYOPATHY_DX_ID}-date`, encounterDate);

  for (const { id, dateId } of OTHER_DIAGNOSES) {
    await form.checkById(id);
    await form.fillField(dateId, encounterDate);
  }

  await form.checkById('otherCheckbox-dx');
  await form.fillField('other-dx', 'Unspecified cardiac condition');
  await form.fillField('other-dx-date', encounterDate);

  // Comorbidities — see verification note 3 above.
  await form.selectRadio('Comorbidities', 'Chronic kidney disease');
  await form.selectRadio('Comorbidities', 'Diabetes');
  await form.selectRadio('Comorbidities', 'Hypertension');
  await form.fillField('otherComorbidity', 'Chronic liver disease');

  // Family planning: — see verification note 4 above.
  await form.selectRadio('Family planning:', 'OC (pills)');
  await form.selectRadio('Family planning:', 'Depo (injection)');
  await form.selectRadio('Family planning:', 'None');
  await form.selectRadio('Family planning:', 'Other');
  await form.fillField('familyPlanningOtherSpecify', 'Condoms');

  // Patient History & Exposures row — see verification note 5 above for the
  // exact rendered label text and this row's cellIndex layout.
  const PATIENT_HISTORY_EXPOSURES_ROW_LABEL = 'PatientHistory &Exposures';
  await form.selectDropdown(PATIENT_HISTORY_EXPOSURES_ROW_LABEL, 'Reactive', 1);
  await form.fillField(PATIENT_HISTORY_EXPOSURES_ROW_LABEL, encounterDate, 1);
  await form.fillField(PATIENT_HISTORY_EXPOSURES_ROW_LABEL, encounterDate, 2);
  await form.selectDropdown(PATIENT_HISTORY_EXPOSURES_ROW_LABEL, 'smear pos', 3);
  await form.fillField(PATIENT_HISTORY_EXPOSURES_ROW_LABEL, encounterDate.slice(0, 4), 4);

  // Imaging Results — see verification note 6 above.
  await form.fillField('ECHO', encounterDate, 1);
  await form.fillField('ECHO', 'Normal echo result', 2);
  await form.fillField('ECG', encounterDate, 1);
  await form.selectDropdown('ECG', 'Normal', 2);
}

// Fills only the minimum fields needed to save a CHF_INITIAL header
// encounter: "Agrees to FUP" + one diagnosis checkbox (matching NCD Other's/
// Chronic Lung Disease's own "Must enter at least one diagnosis!" minimum —
// confirmed live this form's own bundled JS enforces the exact same gate).
// Used ONLY by visit-mastercard.spec.ts's `beforeEach`, which needs a saved
// header encounter as a prerequisite, not the header encounter's own
// content. header-mastercard.spec.ts still uses the full
// `fillCardiacAndVascularDiseaseHeaderForm` since it asserts on that form's
// field values.
export async function fillCardiacAndVascularDiseaseHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.selectRadio('Agrees to FUP', 'Y');
  await form.checkById(CARDIOMYOPATHY_DX_ID);
}

// ---------------------------------------------------------------------------
// Verification notes (Cardiac and Vascular Disease pilot, visit form) —
// confirmed against a live instance by reading
// content/configuration/backend_configuration/htmlforms/cardiac-and-vascular-disease-visit.xml
// in full, then dumping `table.visit-edit-table`'s rendered `innerHTML` for
// a freshly-opened "Enter New Cardiac and Vascular Disease Visit" flowsheet
// against a real, saved header encounter
// (`eligibleCardiacAndVascularDiseasePatient` fixture patient), then
// actually filling and saving the form and checking the resulting REST
// `encounter`/`obs`.
//
// 1. Height/Weight (`heightInput`/`weightInput`) both explicit ids, BOTH
//    required (confirmed live via the rendered `checkNumber(this, errId,
//    true, ...)`) — same as Hypertension and Diabetes's/Chronic Lung
//    Disease's own visit forms. `fillField`'s existing byId path handles
//    them unchanged.
//
// 2. Blood Pressure — two bare, unwrapped `<obsreference>`s in ONE `<td>`
//    under a `<th>Blood Pressure</th>` (no id on either input), separated by
//    a literal "/" — the EXACT same row label text NCD Other's own visit
//    form already uses ("Blood Pressure"), so `fillField('systolicBP', ...)`
//    /`fillField('diastolicBP', ...)` (the existing magic-string branch in
//    mastercard-page.ts, keyed off `BLOOD_PRESSURE_ROW_LABEL`) reach this
//    form's own fields with zero new code.
//
// 3. Weight change/Heart Rate/% SPO2 — bare `<obs>` tags with no id, reached
//    via `fillField`'s existing plain-label fallback.
//
// 4. Orthopnea/Dyspnea on exertion/Dry cough/Fatigue (4-option
//    Increase/Decrease/Same/None radios), Oedema (None/LE/Gen), Volume
//    status (Hypo/Euvol/Hyper), Alcohol/Tobacco (Current/Never/Stopped) all
//    render as genuine, correctly mutually-exclusive radio groups with
//    plain (unwrapped) `<th>` labels — `selectRadio` reaches them with no
//    new handling.
//
// 5. Several two-option Yes/No radio rows (Hospitalized since last visit for
//    NCD, Bibasilar crackles, JVP Elevated, Salt or Fluid restricted,
//    Concern for depression or anxiety, Diet - Salt or Fluid, Palliative
//    Referral, Request CHW F/U, Took medication today?) render their SECOND
//    option's label with a LEADING SPACE (" No") whenever the XML's own
//    `answerLabels="Yes, No"` has a space after the comma — confirmed live
//    (e.g. `<label for="w34_1"> No</label>`) — the exact same
//    comma-space-becomes-part-of-the-label behavior already documented
//    elsewhere in this pilot family. `Hospitalized since last visit for
//    NCD` itself uses `answerLabels="Yes,No"` (no space) and renders
//    cleanly. Rather than special-case the " No" (leading space) string
//    everywhere, every one of these rows below selects "Yes" (never
//    affected by the quirk), which still exercises the real radio-group
//    behavior; NYHA stage similarly avoids " IV" (`answerLabels="I,II,III,
//    IV"` — same quirk) by selecting "II" instead. One additional,
//    separate, harmless inconsistency found live: Mental Health Referral's
//    own `<obs>` uses `answerLabel="Yes, No"` (singular attribute — a typo;
//    the real attribute is `answerLabels`), which htmlformentry silently
//    ignores, falling back to each answer concept's own short name — which
//    happens to literally be "Yes"/"No" already, so this typo has NO visible
//    effect (confirmed live: this row renders "Yes"/"No" with no leading
//    space, unlike every other `answerLabels="Yes, No"` row) — worth a doc
//    cleanup ticket for consistency, not a behavior bug.
//
// 6. Medications — Aspirin (single drug, fully id'd: `dose-asp`/
//    `asp-doseUnit`/`route-asp`/`asp-frequencyCoded`/`duration-asp`/
//    `durationUnit-asp`, checkbox id `aspName`) and the "Other medications"
//    non-coded row (`_noncodedText`-suffixed ids, checkbox label "Other, "
//    with a trailing comma-space — same as Chronic Lung Disease's own
//    "Other, " row — free-text "please specify:" input has no id, reached
//    via the existing `fillFieldAfterLabel('Other, ', ...)` helper) are both
//    filled in full. The Diuretic/ACE-I/BB/CCB/Statins `<repeat>` rows each
//    offer 2-3 drugs sharing one `dose_<conceptUuid>`/etc. id shape (same as
//    Chronic Lung Disease's own single-drug repeats) — ONE representative,
//    NON-colliding drug per row is filled (HCTZ/ENAL/ATEN/AML/Atorvastatin
//    — see `fillMedicationDose`'s own call sites below), same "sample one
//    drug per class" choice Hypertension and Diabetes's own multi-drug
//    repeats made. Benzathine PCN's own checkbox is checked (reachable via
//    its unique label "Benzathine PCN"), but its dosing sub-fields are
//    skipped, and the standalone "Spironolactone" row (separate from the
//    Diuretic repeat's own SPIRO option) is skipped entirely — BOTH are
//    genuine duplicate-id/duplicate-label content defects documented in
//    mastercard-page.ts's own "Cardiac and Vascular Disease pilot" note
//    above, not selector gaps.
//
// 7. "Took medication today?" — `<th><span class="rotate">Took medication
//    today?</span></th>`, the exact wrapped-label shape documented in
//    mastercard-page.ts's own note above — reached via the new
//    `selectRadioInWrappedLabelRow` helper.
//
// 8. Next appointment (`appointmentDate`) has an explicit id, renders as the
//    same readonly jQuery-UI-datepicker input every prior pilot's own
//    `appointmentDate` does, and is REQUIRED (confirmed live: a visible
//    "Required" error renders on this field before any other field is
//    touched) — `fillField`'s existing `fillInputOrDatePicker` path handles
//    it with no new code.
// ---------------------------------------------------------------------------

interface MedicationDoseDetails {
  dose: string;
  doseUnit: string;
  route: string;
  frequency: string;
  duration: string;
  durationUnit: string;
}

// Fills one drug's dose/route/frequency/duration fields via its
// `{field}_<conceptUuidOrNoncodedText>` id shape — see verification note 6
// above.
async function fillMedicationDose(
  form: MastercardFormPage,
  idSuffix: string,
  details: MedicationDoseDetails,
): Promise<void> {
  await form.fillField(`dose_${idSuffix}`, details.dose);
  await form.selectDropdown(`doseUnit_${idSuffix}`, details.doseUnit);
  await form.selectDropdown(`route_${idSuffix}`, details.route);
  await form.selectDropdown(`frequencyCoded_${idSuffix}`, details.frequency);
  await form.fillField(`duration_${idSuffix}`, details.duration);
  await form.selectDropdown(`durationUnit_${idSuffix}`, details.durationUnit);
}

// Concept UUIDs for the representative (non-colliding) drug picked from each
// multi-drug `<repeat>` row — sourced from cardiac-and-vascular-disease-visit.xml's
// own `<macros>` block (never invented) — see verification note 6 above.
const HYDROCHLOROTHIAZIDE_UUID = '65588df6-977f-11e1-8993-905e29aff6c1'; // Diuretic: HCTZ
const ENALAPRIL_UUID = '65588cde-977f-11e1-8993-905e29aff6c1'; // ACE-I: ENAL
const ATENOLOL_UUID = '65635d58-977f-11e1-8993-905e29aff6c1'; // BB: ATEN
const AMLODIPINE_UUID = '65635ef2-977f-11e1-8993-905e29aff6c1'; // CCB: AML
const ATORVASTATIN_UUID = '657aefc2-977f-11e1-8993-905e29aff6c1'; // Statins: Atorvastatin

// Fills every editable field on cardiac-and-vascular-disease-visit.xml's own
// data-entry (visit) form. The literal values used below are asserted
// against in e2e/specs/cardiac-and-vascular-disease/visit-mastercard.spec.ts
// — keep that spec's assertions in sync if any value here changes.
export async function fillCardiacAndVascularDiseaseVisitForm(
  form: MastercardFormPage,
  opts: { appointmentDate: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');

  await form.fillField('heightInput', '165');
  await form.fillField('weightInput', '70');
  await form.fillField('Weight change', 'Lost 2kg since last visit');
  await form.fillField('systolicBP', '130');
  await form.fillField('diastolicBP', '85');
  await form.fillField('Heart Rate', '78');
  await form.fillField('% SPO2', '97');

  await form.selectRadio('Orthopnea', 'Increase');
  await form.selectRadio('Dyspnea on exertion', 'Decrease');
  await form.selectRadio('Dry cough', 'Same');
  await form.selectRadio('Fatigue', 'None');
  // "Yes" — avoids the leading-space " No" label quirk, see verification
  // note 5 above.
  await form.selectRadio('Hospitalized since last visit for NCD', 'Yes');
  await form.selectRadio('Oedema', 'LE');
  await form.selectRadio('Bibasilar crackles', 'Yes');
  await form.selectRadio('JVP Elevated', 'Yes');
  await form.selectRadio('Volume status', 'Euvol');
  // "II" — avoids the leading-space " IV" label quirk, see verification
  // note 5 above.
  await form.selectRadio('NYHA stage', 'II');
  await form.selectRadio('Alcohol', 'Stopped');
  await form.selectRadio('Tobacco', 'Never');
  await form.selectRadio('Salt or Fluid restricted', 'Yes');
  await form.selectRadio('Concern for depression or anxiety', 'Yes');

  // Aspirin — single drug, fully id'd, but NOT via the `{field}_<uuid>`
  // shape `fillMedicationDose` assumes: confirmed live its own ids are
  // literal, asymmetric strings (`dose-asp`, `asp-doseUnit`, `route-asp`,
  // `asp-frequencyCoded`, `duration-asp`, `durationUnit-asp` — hyphenated,
  // and the "asp" prefix/suffix position isn't even consistent between
  // them), left over from before this markup was templated into a
  // `<repeat>` for the other drug classes — see verification note 6 above.
  await form.checkById('aspName');
  await form.fillField('dose-asp', '1');
  await form.selectDropdown('asp-doseUnit', 'tablet');
  await form.selectDropdown('route-asp', 'Oral');
  await form.selectDropdown('asp-frequencyCoded', 'OD');
  await form.fillField('duration-asp', '30');
  await form.selectDropdown('durationUnit-asp', 'Days');

  // Diuretic — one representative (non-colliding) drug, see verification
  // note 6 above.
  await form.checkByLabel('HCTZ');
  await fillMedicationDose(form, HYDROCHLOROTHIAZIDE_UUID, {
    dose: '25',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'OD',
    duration: '30',
    durationUnit: 'Days',
  });

  // ACE-I.
  await form.checkByLabel('ENAL');
  await fillMedicationDose(form, ENALAPRIL_UUID, {
    dose: '5',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'BID',
    duration: '30',
    durationUnit: 'Days',
  });

  // BB.
  await form.checkByLabel('ATEN');
  await fillMedicationDose(form, ATENOLOL_UUID, {
    dose: '50',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'OD',
    duration: '30',
    durationUnit: 'Days',
  });

  // CCB.
  await form.checkByLabel('AML');
  await fillMedicationDose(form, AMLODIPINE_UUID, {
    dose: '10',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'OD',
    duration: '30',
    durationUnit: 'Days',
  });

  // Spironolactone (standalone row) — SKIPPED. Its own `dose_<uuid>`/etc.
  // ids and checkbox label ("SPIRO") are both genuine duplicates of the
  // Diuretic repeat's own SPIRO option (same underlying concept reused in
  // two rows) — see mastercard-page.ts's own "Cardiac and Vascular Disease
  // pilot" note above for the confirmed-live evidence
  // (`getByLabel('SPIRO', {exact:true})` matches 2 elements). Not filled to
  // avoid a fragile positional selector for a genuine content defect.

  // Statins.
  await form.checkByLabel('Atorvastatin');
  await fillMedicationDose(form, ATORVASTATIN_UUID, {
    dose: '20',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'OD',
    duration: '30',
    durationUnit: 'Days',
  });

  // Benzathine PCN — checkbox only (reachable via its own unique label);
  // its dosing sub-fields are SKIPPED — genuine duplicate ids with the
  // Aspirin row (`dose-asp`/`asp-doseUnit`/etc.), see mastercard-page.ts's
  // own note above.
  await form.checkByLabel('Benzathine PCN');

  // Other medications (non-coded) — see verification note 6 above.
  await form.checkByLabel('Other, ');
  await form.fillFieldAfterLabel('Other, ', 'Digoxin');
  await fillMedicationDose(form, 'noncodedText', {
    dose: '3',
    doseUnit: 'mL',
    route: 'IV',
    frequency: 'PRN',
    duration: '5',
    durationUnit: 'Days',
  });

  await form.selectRadioInWrappedLabelRow('Took medication today?', 'Yes');
  await form.selectRadio('Diet - Salt or Fluid', 'Yes');
  await form.selectRadio('Mental Health Referral', 'Yes');
  await form.selectRadio('Palliative Referral', 'Yes');
  await form.selectRadio('Request CHW F/U', 'Yes');

  await form.fillField('appointmentDate', opts.appointmentDate);
}
