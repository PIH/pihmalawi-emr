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
//    section). Confirmed live via `patientDashboard.form` for a real
//    `eligibleSickleCellDiseasePatient` fixture patient: the link renders, is
//    visible, and its `onclick` matches `buildCreateUrl` below exactly. This
//    pilot's specs still always use `MastercardFormPage.openCreateAtUrl`
//    directly rather than clicking that dashboard link — same as every other
//    condition's own specs.
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
//    Diagnosis Date blank leaves `.submitButton` permanently disabled). Its
//    underlying `<obs>` carries the id `diagnosisDate`. `fillField('diagnosisDate',
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
  await form.fillField('diagnosisDate', encounterDate);

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
  await form.fillField('diagnosisDate', encounterDate);
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
// 0. This form's 5 medication rows (Malaria Prophylaxis/Folic Acid/
//    Hydroxyurea/BZN/Other) are each a SINGLE, independent, non-repeated
//    medication, not several alternatives within one class like every prior
//    Chronic Care pilot's own multi-drug `<repeat>` rows (CKD/Chronic Lung
//    Disease/Cardiac and Vascular Disease's own "one representative drug per
//    class" convention) — so all 5 (SP/FCD/HYD/BZN/Other) are filled for
//    full coverage, none skipped. Each drug's own dose/route/frequency/
//    duration fields carry a unique, real id suffix (`_malaria`/`_folic`/
//    `_hydroxyurea`/`_bzn`, plus the pre-existing `_noncodedText` for
//    "Other") — reached directly via `fillField`/`selectDropdown`'s existing
//    byId path, no row-scoping needed.
//
// 1. "Other" medication (non-coded) — its own ids (`chf_noncodedText_med`/
//    `dose_noncodedText`/etc.) are unchanged from every other Chronic Care
//    pilot's own "Other" row. Its free-text "please specify:" input has no
//    id of its own (only the checkbox does), reached via the existing
//    `fillFieldAfterLabel` (Chronic Kidney Disease pilot's helper) — same
//    shape, ported unchanged.
//
// 2. `visitDate` (the form's own hidden, internal encounter-date tracking
//    field — NOT a user-facing row) and `appointmentDate` ("Next
//    appointment") both use htmlformentry's readonly-datepicker shape
//    (`class="hasDatepicker"` on their display `<input>`), same as every
//    other Chronic Care pilot's own visit form — reached via `fillField`'s
//    existing byId + datepicker-dispatch path, no new helper needed.
//    `visitDate` is REQUIRED (leaving it unset renders a permanent
//    "Required" error on it and the encounter silently fails to save with
//    no other visible error at all — confirmed live) even though it has no
//    visible row of its own; `appointmentDate` also has an explicit id and
//    is filled for the same "Next appointment" field every prior pilot's
//    own visit form has.
// ---------------------------------------------------------------------------

interface MedicationDoseDetails {
  dose: string;
  doseUnit: string;
  route: string;
  frequency: string;
  duration: string;
  durationUnit: string;
}

// Fills one drug's dose/route/frequency/duration fields, addressed by that
// drug's own unique id suffix (`malaria`/`folic`/`hydroxyurea`/`bzn`) — see
// verification note 0 above.
async function fillScdMedicationDose(
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

// Fills every editable field on sickle-cell-disease-visit.xml's own
// data-entry (visit) form. The literal values used below are asserted
// against in e2e/specs/sickle-cell-disease/visit-mastercard.spec.ts — keep
// that spec's assertions in sync if any value here changes.
export async function fillSickleCellDiseaseVisitForm(
  form: MastercardFormPage,
  opts: { encounterDate: string; appointmentDate: string },
): Promise<void> {
  // Internal visit-date tracking field — required, but not a visible row —
  // see verification note 2 above.
  await form.fillField('visitDate', opts.encounterDate);

  await form.selectDropdown('visitLocation', 'Neno District Hospital', 1);

  await form.fillField('heightInput', '120');
  await form.fillField('weightInput', '25');
  await form.fillField('BMI/MUAC', '17.4');
  await form.fillField('systolicBP', '110');
  await form.fillField('diastolicBP', '70');
  await form.fillField('Heart Rate', '88');
  // HB's own onblur validator (`checkNumber`) rejects a decimal here despite
  // no explicit min/max being set on it — confirmed live ("Not an integer"),
  // so an integer value is used (unlike Height/Weight/BP/Temperature, which
  // all accept decimals).
  await form.fillField('HB', '10');
  await form.fillField('%SPO2', '97');
  await form.fillField('Temperature', '36.8');

  await form.selectRadio('Hospitalized since last visit for SCD', 'Y', 1);
  await form.selectRadio('In School', 'Y', 1);
  await form.selectRadio('Pain', 'Y', 1);
  await form.selectRadio('Fever', 'N', 1);
  await form.selectRadio('Medication Rx', 'Y', 1);
  await form.selectRadio('Antibiotics Rx', 'Y', 1);
  await form.selectRadio('Medication Side Effects?', 'N', 1);
  await form.selectRadio('Jaundice', 'Y', 1);
  await form.selectRadio('Irregular Conjunctiva', 'N', 1);
  await form.selectRadio('Abnormal Lungs Exam', 'N', 1);
  await form.selectRadio('Ascites', 'N', 1);
  await form.selectRadio('Enlarged Spleen', 'Y', 1);
  await form.selectRadio('Enlarged Liver', 'N', 1);

  // 5 independent, single-drug medication rows — see verification note 0
  // above (all 5 filled, not "one representative per class" — these aren't
  // alternatives within one class).
  await form.checkByLabel('SP');
  await fillScdMedicationDose(form, 'malaria', {
    dose: '500',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'OD',
    duration: '5',
    durationUnit: 'Days',
  });

  await form.checkByLabel('FCD');
  await fillScdMedicationDose(form, 'folic', {
    dose: '5',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'OD',
    duration: '30',
    durationUnit: 'Days',
  });

  await form.checkByLabel('HYD');
  await fillScdMedicationDose(form, 'hydroxyurea', {
    dose: '500',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'BID',
    duration: '30',
    durationUnit: 'Days',
  });

  await form.checkByLabel('BZN');
  await fillScdMedicationDose(form, 'bzn', {
    dose: '1.2',
    doseUnit: 'mL',
    route: 'IV',
    frequency: 'STAT',
    duration: '1',
    durationUnit: 'Days',
  });

  // Other medication (non-coded) — real, unique ids, no collision — see
  // verification note 1 above.
  await form.checkByLabel('Other, ');
  await form.fillFieldAfterLabel('Other, ', 'Ibuprofen');
  await form.fillField('dose_noncodedText', '200');
  await form.selectDropdown('doseUnit_noncodedText', 'mg');
  await form.selectDropdown('route_noncodedText', 'Oral');
  await form.selectDropdown('frequencyCoded_noncodedText', 'TID');
  await form.fillField('duration_noncodedText', '3');
  await form.selectDropdown('durationUnit_noncodedText', 'Days');

  // Next appointment — see verification note 2 above.
  await form.fillField('appointmentDate', opts.appointmentDate);
}
