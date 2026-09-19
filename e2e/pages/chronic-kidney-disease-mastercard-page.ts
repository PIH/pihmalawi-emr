import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// Verification notes (Chronic Kidney Disease pilot, header form) — confirmed
// against a live instance the same way as every prior pilot: reading
// content/configuration/backend_configuration/htmlforms/chronic-kidney-disease-emastercard.xml
// in full, then (1) dumping `patientDashboard.form`'s rendered "Create new
// Chronic Kidney Disease eMastercard" link's `onclick` for a real
// `eligibleChronicKidneyDiseasePatient` fixture patient, and (2) dumping
// `table.data-entry-table`'s innerHTML for a freshly-opened create form at
// the resulting URL.
//
// 1. The dashboard link has NO `href` attribute (same shape as every prior
//    pilot's link), and its `onclick` embeds the flowsheet list confirmed in
//    docs/program-eligibility-rules.md's own "Chronic Kidney Disease" launch
//    URL section (quarterly/annual laboratory tests, imaging results,
//    hospitalization history, then the visit form last) — `buildCreateUrl`
//    below reproduces that exact list even though most of it is out of this
//    pilot's scope (see the task brief's explicit scope note), since
//    `flowsheet.page` needs the real flowsheet list to render the "Enter New
//    Chronic Kidney Disease Visit" action link at all (same requirement
//    every prior Chronic Care Program pilot's own notes already
//    established).
//
// 2. "Presumed etiology" — 6 independent checkboxes (Hypertension, Diabetes,
//    HIV, Nephrotic, Others, Unknown) plus 2 free-text fields ("Drugs
//    (specify)"/"Others (specify)") share ONE `<td>`, with a single shared
//    "Date" field (`ckd-etiology-date`) in the following `<td>` (both
//    `rowspan="4"`, so they're only 2 real `<td>`s even though 4 diagnosis
//    rows are drawn alongside them). See mastercard-page.ts's own "Chronic
//    Kidney Disease pilot" verification notes 1-3 for the full detail
//    (duplicate "Hypertension"/"Diabetes" labels vs. the diagnosis section
//    below, the `data-toggle-source="ckd-dx"` id that doesn't match anything
//    but still works, and the 2 new `ckdEtiologyDrugs`/`ckdEtiologyOther`
//    `fillField` branches). All 6 checkboxes + both free-text fields + the
//    shared date are filled below for full field coverage — none of them
//    are mutually exclusive (a patient can genuinely have multiple presumed
//    etiologies), confirmed live nothing disables one when another is
//    checked.
//
// 3. CHF/Hypertension/Diabetes/Other diagnoses — 4 `obsgroup`s, each with a
//    real, stable id (`chf-dx`/`htn-dx`/`diabetes-dx`/`other-dx`, each
//    wrapped in an id'd `<span class="dx-checkbox-item">`) paired with its
//    own `-date` id — same `checkById`/`fillField`(byId) shape ART's/NCD
//    Other's own diagnosis rows already established. Confirmed live these 4
//    checkboxes carry the `dx-checkbox-item` class that gates the "Must
//    enter at least one diagnosis!" validation
//    (`setupChronicCareDiagnosisValidation` in mastercard.js) — the
//    "Presumed etiology" checkboxes do NOT carry this class (confirmed via
//    the rendered DOM), so only these 4 are subject to that gate.
//
// 4. "PatientHistory" row — HIV dropdown + Date Test (cellIndex 1, sharing
//    one `<td>`), ART Start Date (cellIndex 2), History of Dialysis
//    (cellIndex 3 — a real Text-datatype concept per REST, rendered as a
//    bare text input, not a Yes/No control despite the label sounding
//    boolean — confirmed live and via `GET
//    /ws/rest/v1/concept/8dcb0708-feb4-44e8-bdb8-ed90be94c4d0`), Date of
//    Dialysis (cellIndex 4) — all reached via `fillField`/`selectDropdown`'s
//    existing `cellIndex` param, zero new code (same shape Cardiac and
//    Vascular Disease's/Chronic Lung Disease's own "PatientHistory..." rows
//    already established). TB dropdown + Date (a SEPARATE `<tr>`, no `<th>`
//    of its own) needed the new `fillFieldInNextRow`/`selectDropdownInNextRow`
//    helpers — see mastercard-page.ts's own verification note 4.
//
// 5. "Outcome" is a pure read-only workflow-status lookup with no backing
//    obs (same as every prior pilot's equivalent row) — confirmed live it
//    renders as "()" (empty) for this workflow, same "pre-existing,
//    non-resolving `currentProgramWorkflowStatus` argument, not this
//    pilot's scope to fix" call the Cardiac and Vascular Disease pilot's own
//    verification note 7 already made for its own Outcome row. "CHW Name"
//    is likewise a pure read-only relationship lookup with no backing obs.
//    Neither is filled.
// ---------------------------------------------------------------------------

const CKD_HEADER_FORM = 'file:configuration/htmlforms/chronic-kidney-disease-emastercard.xml';
const CKD_FLOWSHEETS = [
  'file:configuration/htmlforms/chronic-kidney-disease-quarterly-laboratory-tests.xml',
  'file:configuration/htmlforms/chronic-kidney-disease-annual-laboratory-tests.xml',
  'file:configuration/htmlforms/chronic-kidney-disease-imaging-results.xml',
  'file:configuration/htmlforms/chronic-kidney-disease-hospitalization-history.xml',
  'file:configuration/htmlforms/chronic-kidney-disease-visit.xml',
];

export class ChronicKidneyDiseaseMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: CKD_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of CKD_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    // No leading slash — see playwright.config.ts's baseURL comment (same
    // reasoning as MastercardGatePage.buildCreateUrl).
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

// Fills every editable field on chronic-kidney-disease-emastercard.xml's
// header form. The literal values used below are asserted against in
// e2e/specs/chronic-kidney-disease/header-mastercard.spec.ts — keep that
// spec's assertions in sync if any value here changes.
export async function fillChronicKidneyDiseaseHeaderForm(
  form: MastercardFormPage,
  encounterDate: string,
): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);

  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('guardianNameField', 'Grace Banda');
  await form.fillField('Guardian Phone', '0993334444');
  await form.fillField('Guardian relation to patient', 'Mother');
  await form.selectRadio('Agrees to FUP', 'Y');

  // Presumed etiology — see verification note 2 above.
  await form.selectRadio('Presumedetiology', 'Hypertension');
  await form.selectRadio('Presumedetiology', 'Diabetes');
  await form.selectRadio('Presumedetiology', 'HIV');
  await form.selectRadio('Presumedetiology', 'Nephrotic');
  await form.fillField('ckdEtiologyDrugs', 'Ibuprofen (NSAID)');
  await form.fillField('ckdEtiologyOther', 'Unspecified nephrotoxic exposure');
  await form.selectRadio('Presumedetiology', 'Others');
  await form.selectRadio('Presumedetiology', 'Unknown');
  await form.fillField('ckd-etiology-date', encounterDate);

  // Diagnoses — see verification note 3 above.
  await form.checkById('chf-dx');
  await form.fillField('chf-dx-date', encounterDate);
  await form.checkById('htn-dx');
  await form.fillField('htn-dx-date', encounterDate);
  await form.checkById('diabetes-dx');
  await form.fillField('diabetes-dx-date', encounterDate);
  await form.checkById('other-dx');
  await form.fillField('other-dx-date', encounterDate);

  // PatientHistory row — see verification note 4 above.
  await form.selectDropdown('PatientHistory', 'Reactive', 1);
  await form.fillField('PatientHistory', encounterDate, 1);
  await form.fillField('PatientHistory', encounterDate, 2);
  await form.fillField('PatientHistory', 'None reported', 3);
  await form.fillField('PatientHistory', encounterDate, 4);
  await form.selectDropdownInNextRow('PatientHistory', 'smear pos', 1);
  await form.fillFieldInNextRow('PatientHistory', encounterDate, 2);
}

// Fills only the minimum fields needed to save a CKD_INITIAL header
// encounter: "Agrees to FUP" + one diagnosis checkbox (matching every prior
// Chronic Care Program pilot's own "Must enter at least one diagnosis!"
// minimum — confirmed live this form's own bundled JS enforces the same
// gate for the `dx-checkbox-item`-classed diagnosis checkboxes, see
// verification note 3 above). Used ONLY by visit-mastercard.spec.ts's
// `beforeEach`, which needs a saved header encounter as a prerequisite, not
// the header encounter's own content. header-mastercard.spec.ts still uses
// the full `fillChronicKidneyDiseaseHeaderForm` since it asserts on that
// form's field values.
export async function fillChronicKidneyDiseaseHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.selectRadio('Agrees to FUP', 'Y');
  await form.checkById('chf-dx');
}

// ---------------------------------------------------------------------------
// Verification notes (Chronic Kidney Disease pilot, visit form) — confirmed
// against a live instance by reading
// content/configuration/backend_configuration/htmlforms/chronic-kidney-disease-visit.xml
// in full, then dumping `table.visit-edit-table`'s rendered `innerHTML` for
// a freshly-opened "Enter New Chronic Kidney Disease Visit" flowsheet
// against a real, saved header encounter (`eligibleChronicKidneyDiseasePatient`
// fixture patient), then actually filling and saving the form and checking
// the resulting REST `encounter`/`obs`.
//
// 1. Height/Weight (`heightInput`/`weightInput`) both explicit ids, BOTH
//    required with range validation (10.0-228.0 cm / 0.0-250.0 kg,
//    confirmed live via the rendered `checkNumber(this, errId, true, ...)`)
//    — same shape every prior Chronic Care pilot's own visit form already
//    established. `fillField`'s existing byId path handles them unchanged.
//
// 2. Blood Pressure — two bare, unwrapped `<obsreference>`s in ONE `<td>`
//    under a `<th>Blood Pressure</th>` (no id on either input), separated by
//    a literal "/" — the SAME row label text ("Blood Pressure") NCD
//    Other's/Cardiac and Vascular Disease's own visit forms already use, so
//    `fillField('systolicBP', ...)`/`fillField('diastolicBP', ...)` (the
//    existing magic-string branch in mastercard-page.ts) reach this form's
//    own fields with zero new code.
//
// 3. Weight change/GFR/Heart Rate/Creatinine/Other (symptoms) — each a bare
//    `<input>` in its own `<td>`, sibling to a real, unique `<th>` — reached
//    via `fillField`'s existing plain-label fallback, zero new code. Weight
//    change has NO `onblur="checkNumber(...)"` at all (unlike every other
//    numeric field on this form), confirmed live it's a genuine Text-
//    datatype concept, not numeric — filled with a short free-text
//    description rather than a bare number.
//
// 4. Urine protein/Edema (5-option No/Trace/+/++/+++ radios), Confusion/
//    Fatigue/Nausea/Anorexia/Pruritus/Ascites/NSAID use (2-option Yes/No),
//    Conjunctiva (Pink/Pale), Tobacco use/Alcohol use (Current/Never/
//    Stopped), CKD stage (1-2/3/4-5), and Diet recommendations (Low Sodium/
//    Low potassium/Low protein/High calories) all render as genuine,
//    correctly mutually-exclusive radio groups with plain (unwrapped)
//    `<th>` labels — `selectRadio` reaches them with no new handling. Same
//    "answerLabels=&quot;X, Y&quot; renders the SECOND option with a
//    leading space" quirk every prior pilot already documented (e.g.
//    `<label for="w26_1"> No</label>`) is present here too (Confusion/
//    Fatigue/Nausea/Anorexia/Pruritus/Ascites/Conjunctiva/Diet
//    recommendations' 2nd-4th options) — avoided the same way every prior
//    pilot did, by always selecting an option NEVER affected by the quirk
//    (the FIRST option in each such group: "Yes", "Pink", "Low Sodium").
//    Urine protein/Edema/NSAID use/Tobacco use/Alcohol use/CKD stage all use
//    `answerLabels` with NO space after each comma and render cleanly with
//    no leading-space option at all.
//
// 5. Diuretic/ACE-I/BB/CCB — each a `<repeat>` of 2-3 drugs, EVERY drug's
//    checkbox/dose/route/frequency/duration ids built from ITS OWN concept
//    uuid (`dose_<uuid>`/`doseUnit_<uuid>`/etc., confirmed live via the
//    rendered DOM) — UNLIKE Cardiac and Vascular Disease's own visit form,
//    there is NO separate hardcoded-id "Aspirin"-style row here at all, and
//    confirmed live every drug label (HCTZ/FURO/SPIRO/ENAL/CAPT/LISIN/ATEN/
//    BIS/PROP/AML/NIF) is UNIQUE on the page (`grep`-counted from the
//    rendered DOM) — no genuine duplicate-id/duplicate-label defect on this
//    form's medication rows at all. Each drug's dose section starts hidden
//    (`style="display:none"`, toggled by the checkbox's own `togglehide="..."`
//    attribute — a different attribute name than the `toggle="..."`
//    attribute Cardiac and Vascular Disease's own visit form uses for the
//    same purpose, but functionally identical: check the checkbox FIRST,
//    which reveals the section, before filling its own dose fields).
//    Following every prior multi-drug-repeat pilot's own established
//    convention (Hypertension and Diabetes/Chronic Lung Disease/Cardiac and
//    Vascular Disease), ONE representative drug per class is filled (not
//    all 2-3), since every option is structurally identical and filling all
//    of them would only re-exercise the same repeat/toggle behavior
//    redundantly, not any genuinely different code path.
//
// 6. "Other medications" (non-coded) — single row, no `<repeat>`. Its
//    checkbox has no id (only a real `<label>`, the XML's own literal
//    `answerLabel="Other, "` with a trailing comma-space), reached via
//    `checkByLabel('Other, ')`; its free-text "please specify:" input,
//    also with no id, shares the SAME `<td>` as the checkbox's own wrapping
//    `<span>` — reached via the new `fillFieldAfterLabel` helper (see
//    mastercard-page.ts's own comment). Its own dose fields use the fixed
//    `noncodedText` id suffix (`dose_noncodedText`/etc.), same convention
//    every prior pilot's own "Other" medication row already established.
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
// `{field}_<conceptUuidOrNoncodedText>` id shape — see verification note 5
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

// Concept UUIDs for the representative drug picked from each multi-drug
// `<repeat>` row — sourced from chronic-kidney-disease-visit.xml's own
// `<macros>` block (never invented) — see verification note 5 above.
const HYDROCHLOROTHIAZIDE_UUID = '65588df6-977f-11e1-8993-905e29aff6c1'; // Diuretic: HCTZ
const ENALAPRIL_UUID = '65588cde-977f-11e1-8993-905e29aff6c1'; // ACE-I: ENAL
const ATENOLOL_UUID = '65635d58-977f-11e1-8993-905e29aff6c1'; // BB: ATEN
const AMLODIPINE_UUID = '65635ef2-977f-11e1-8993-905e29aff6c1'; // CCB: AML

// Fills every editable field on chronic-kidney-disease-visit.xml's own
// data-entry (visit) form. The literal values used below are asserted
// against in e2e/specs/chronic-kidney-disease/visit-mastercard.spec.ts —
// keep that spec's assertions in sync if any value here changes.
export async function fillChronicKidneyDiseaseVisitForm(
  form: MastercardFormPage,
  opts: { appointmentDate: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');

  await form.fillField('heightInput', '165');
  await form.fillField('weightInput', '70');
  await form.fillField('Weight change', 'Lost 1kg since last visit');
  await form.fillField('systolicBP', '130');
  await form.fillField('diastolicBP', '85');
  await form.fillField('GFR', '55');
  await form.fillField('Heart Rate', '78');
  await form.fillField('Creatinine', '1.4');

  await form.selectRadio('Urine protein', 'Trace');
  await form.selectRadio('Confusion', 'Yes');
  await form.selectRadio('Fatigue', 'Yes');
  await form.selectRadio('Nausea', 'Yes');
  await form.selectRadio('Anorexia', 'Yes');
  await form.selectRadio('Pruritus', 'Yes');
  await form.selectRadio('Conjunctiva', 'Pink');
  await form.selectRadio('Ascites', 'Yes');
  await form.selectRadio('Edema', 'Trace');
  await form.fillField('Other', 'Mild pedal oedema noted');
  await form.selectRadio('CKD stage', '3');
  await form.selectRadio('NSAID use', 'Yes');
  await form.selectRadio('Tobacco use', 'Stopped');
  await form.selectRadio('Alcohol use', 'Never');

  // Diuretic — one representative drug, see verification note 5 above.
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

  // Other medications (non-coded) — see verification note 6 above.
  await form.checkByLabel('Other, ');
  await form.fillFieldAfterLabel('Other, ', 'Sodium bicarbonate');
  await fillMedicationDose(form, 'noncodedText', {
    dose: '500',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'TID',
    duration: '30',
    durationUnit: 'Days',
  });

  await form.selectRadioInWrappedLabelRow('Took medication today?', 'Yes');
  await form.selectRadio('Diet recommendations', 'Low Sodium');

  await form.fillField('appointmentDate', opts.appointmentDate);
}
