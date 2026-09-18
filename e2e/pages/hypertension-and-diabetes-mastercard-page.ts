import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// Verification notes (Hypertension and Diabetes pilot, header form) —
// confirmed against a live instance the same way as the ART/NCD Other
// pilots: reading
// content/configuration/backend_configuration/htmlforms/hypertension-and-diabetes-emastercard.xml
// in full, then (1) dumping `patientDashboard.form`'s rendered "Create new"
// link's `onclick` for a real `eligibleHypertensionAndDiabetesPatient`
// fixture patient, and (2) dumping `table.data-entry-table`'s innerHTML for a
// freshly-opened create form at the resulting URL. Not guessed from the JSP
// tag, the XML, or docs/program-eligibility-rules.md alone.
//
// 1. The dashboard's "Create new Hypertension and Diabetes eMastercard" link
//    has NO `href` attribute (same shape as every prior pilot's link), and
//    its `onclick` embeds exactly (confirmed live):
//      headerForm=file:configuration/htmlforms/hypertension-and-diabetes-emastercard.xml
//      flowsheets=file:configuration/htmlforms/hypertension-and-diabetes-quarterly-laboratory-tests.xml
//      flowsheets=file:configuration/htmlforms/hypertension-and-diabetes-annual-laboratory-tests.xml
//      flowsheets=file:configuration/htmlforms/hypertension-and-diabetes-hospitalization-history.xml
//      flowsheets=file:configuration/htmlforms/hypertension-and-diabetes-visit.xml
//      dashboardUrl=legacyui&customizationProvider=pihmalawi&customizationFragment=mastercard
//    — matching `EMastercardAccessTag.getNewMasterCardConfiguration`'s
//    `flowsheetForms` map for `ENCOUNTERTYPE_HTN_DIABETES_INITIAL_NAME`
//    exactly. This pilot's specs are scoped to the emastercard + `-visit.xml`
//    flowsheet only (matching the NCD Other pilot's own scope decision) —
//    the quarterly/annual laboratory tests and hospitalization-history
//    flowsheets are out of scope, but `buildCreateUrl` still includes them in
//    the URL since that's what the real dashboard link renders and
//    `flowsheet.page` expects the exact real flowsheet list to reach the
//    "Enter New Hypertension and Diabetes Visit" action link.
//
// 2. Every field below reuses `MastercardFormPage`'s existing generic helpers
//    with one addition: `selectRadioInLabelledCell` (see mastercard-page.ts's
//    own "Hypertension and Diabetes pilot" note block) for the two
//    "Diabetes: "/"Hypertension: " family-history radio groups, whose own
//    label lives in the SAME `<td>` as the radio inputs rather than a
//    sibling cell.
//
// 3. Diagnoses (`diabetes-type-1-dx`/`diabetes-type-2-dx`/`hypertension-dx`)
//    and Complications (`stroke-dx`/`cardio-dx`/`pvd-dx`/`retinopathy-dx`/
//    `neuropathy-dx`/`renal-dx`/`sexdysfx-dx`) each pair with a
//    `data-toggle-target` date field (`*-date`) that renders DISABLED by
//    default, enabled the moment its own checkbox is checked — identical
//    shape to NCD Other's own diagnosis rows (see
//    ncd-other-mastercard-page.ts's verification note 3). Checked before its
//    date is filled, same order, for all 10 rows.
//
// 4. Family History — "Diabetes: " row is `rowspan="2"` (spans the DM1 and
//    DM2 diagnosis rows); "Hypertension: " row is not rowspan'd (shares only
//    the HTN diagnosis row). Both use `selectRadioInLabelledCell` — see
//    mastercard-page.ts's note 1 for how the label text was confirmed live.
//
// 5. "PatientHistory & Complications" row — see mastercard-page.ts's note 3
//    for how the rendered label text was confirmed live via
//    `page.locator('th').allTextContents()`. cellIndex 1: HIV dropdown
//    ("Reactive"/"Non-reactive"/"Unknown") + Date test datepicker, sharing
//    one `<td>`. cellIndex 2: ART Start Date datepicker. cellIndex 3: TB
//    dropdown ("smear pos"/"smear neg"/"EPTB"/"never had TB"). cellIndex 4:
//    Year, a plain numeric input (`checkNumber` validated 1950-2050 per the
//    rendered `onblur` handler).
//
// 6. Confirmed live via the saved encounter's REST `obs`, several concepts'
//    own REST `display` names differ from the XML's `labelText`/rendered
//    label (documented inline in the spec's own assertions, not repeated
//    here — see header-mastercard.spec.ts).
// ---------------------------------------------------------------------------

const HTN_DM_HEADER_FORM = 'file:configuration/htmlforms/hypertension-and-diabetes-emastercard.xml';
const HTN_DM_FLOWSHEETS = [
  'file:configuration/htmlforms/hypertension-and-diabetes-quarterly-laboratory-tests.xml',
  'file:configuration/htmlforms/hypertension-and-diabetes-annual-laboratory-tests.xml',
  'file:configuration/htmlforms/hypertension-and-diabetes-hospitalization-history.xml',
  'file:configuration/htmlforms/hypertension-and-diabetes-visit.xml',
];

export class HypertensionAndDiabetesMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: HTN_DM_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of HTN_DM_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    // No leading slash — see playwright.config.ts's baseURL comment (same
    // reasoning as MastercardGatePage.buildCreateUrl).
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

// Fills every editable field on hypertension-and-diabetes-emastercard.xml's
// header form. The literal values used below are asserted against in
// e2e/specs/hypertension-and-diabetes/header-mastercard.spec.ts — keep that
// spec's assertions in sync if any value here changes. Exported standalone
// (not a save — callers decide when/whether to save), same pattern as
// `fillNcdOtherHeaderForm`, so visit-mastercard.spec.ts's `beforeEach` can
// reach a saved header encounter without duplicating this field list.
export async function fillHypertensionAndDiabetesHeaderForm(
  form: MastercardFormPage,
  encounterDate: string,
): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);

  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('guardianNameField', 'Grace Banda');
  await form.fillField('Guardian Phone', '0993334444');
  await form.fillField('Guardian relation to patient', 'Mother');
  await form.selectRadio('Agrees to FUP', 'Y');

  // Diagnoses — each toggle checkbox is checked BEFORE its paired date is
  // filled (see verification note 3 above). Only ONE of Type 1 DM/Type 2 DM
  // is filled — mastercard.js's `setupHtnDmValidation` DISABLES the sibling
  // diabetes-type checkbox the moment one is checked ("Allow user to select
  // either type 1 or type 2 only for diabetes"), confirmed live (checking
  // `diabetes-type-2-dx` after `diabetes-type-1-dx` times out waiting for an
  // enabled checkbox) — correct real-world behavior (a patient has one
  // diabetes type, not both), not a bug, so this is intentionally not both.
  await form.checkById('diabetes-type-1-dx');
  await form.fillField('diabetes-type-1-dx-date', encounterDate);

  await form.checkById('hypertension-dx');
  await form.fillField('hypertension-dx-date', encounterDate);

  // Family History — see verification note 4 above.
  await form.selectRadioInLabelledCell('Diabetes:', 'Yes');
  await form.selectRadioInLabelledCell('Hypertension:', 'No');

  // Patient History & Complications row — see verification note 5 above.
  await form.selectDropdown('PatientHistory & Complications', 'Reactive', 1);
  await form.fillField('PatientHistory & Complications', encounterDate, 1);
  await form.fillField('PatientHistory & Complications', encounterDate, 2);
  await form.selectDropdown('PatientHistory & Complications', 'smear pos', 3);
  // TB Year is a plain numeric input (not a date), validated 1950-2050 —
  // derived from encounterDate's own year rather than hardcoded.
  await form.fillField('PatientHistory & Complications', encounterDate.slice(0, 4), 4);

  // Complications — each toggle checkbox is checked BEFORE its paired date is
  // filled (see verification note 3 above).
  await form.checkById('stroke-dx');
  await form.fillField('stroke-dx-date', encounterDate);

  await form.checkById('cardio-dx');
  await form.fillField('cardio-dx-date', encounterDate);

  await form.checkById('pvd-dx');
  await form.fillField('pvd-dx-date', encounterDate);

  await form.checkById('retinopathy-dx');
  await form.fillField('retinopathy-dx-date', encounterDate);

  await form.checkById('neuropathy-dx');
  await form.fillField('neuropathy-dx-date', encounterDate);

  await form.checkById('renal-dx');
  await form.fillField('renal-dx-date', encounterDate);

  await form.checkById('sexdysfx-dx');
  await form.fillField('sexdysfx-dx-date', encounterDate);
}

// Fills only the minimum fields needed to save a DIABETES HYPERTENSION
// INITIAL VISIT header encounter. Like NCD Other's own bundled JS
// (`ensureDiagnosisChecked`), this form keeps `.submitButton` disabled with
// "Must enter at least one diagnosis!" until at least one of the 3
// `.dx-checkbox-item` diagnosis checkboxes (diabetes-type-1-dx/
// diabetes-type-2-dx/hypertension-dx — NOT one of the 7 Complications
// checkboxes, which carry `dx-selected` only, not `dx-checkbox-item` — see
// mastercard-page.ts's verification note 2) is checked — confirmed live.
// UNLIKE NCD Other's own diagnosis checkboxes (which carry no `dx-selected`
// class at all), this form's diagnosis/complications checkboxes DO carry
// `dx-selected` — that class is what `validate_dx_fields.js`'s
// `requireDxDate()` (wired up by this form's own `<ifmode mode="EDIT">`
// script block) uses to make a checkbox's PAIRED date field required the
// moment the checkbox is checked. Confirmed live: checking `hypertension-dx`
// alone (without also filling `hypertension-dx-date`) leaves `.submitButton`
// permanently disabled with a "Required" error on that date field. So the
// true minimum here is "Agrees to FUP" + one Diagnoses checkbox + that
// checkbox's own paired date — confirmed live this saves successfully with
// no other fields filled. Used ONLY by visit-mastercard.spec.ts's
// `beforeEach`, which needs a saved header encounter as a prerequisite, not
// the header encounter's own content. header-mastercard.spec.ts still uses
// `fillHypertensionAndDiabetesHeaderForm` (the full fill) above, since it
// asserts on that form's own field values.
export async function fillHypertensionAndDiabetesHeaderMinimum(
  form: MastercardFormPage,
  encounterDate: string,
): Promise<void> {
  await form.selectRadio('Agrees to FUP', 'Y');
  await form.checkById('hypertension-dx');
  await form.fillField('hypertension-dx-date', encounterDate);
}

// ---------------------------------------------------------------------------
// Verification notes (Hypertension and Diabetes pilot, visit form) —
// confirmed against a live instance by reading
// content/configuration/backend_configuration/htmlforms/hypertension-and-diabetes-visit.xml
// in full, then dumping `table.visit-edit-table`'s rendered `innerHTML` for a
// freshly-opened "Enter New Hypertension and Diabetes Visit" flowsheet
// against a real, saved header encounter (`eligibleHypertensionAndDiabetesPatient`
// fixture patient), then actually filling and saving the form and checking
// the resulting REST `encounter`/`obs`.
//
// 1. Height/Weight/HbA1C/Fasting blood sugar are all REQUIRED (confirmed live
//    via the rendered `checkNumber(this, errId, true, ...)` — the 3rd arg is
//    the required flag — unlike this same program's OWN header form's
//    Height/Weight, which are not required, and unlike ART/NCD Other's own
//    visit forms' Height/Weight, which also aren't). Blood pressure/Pulse/
//    fruit-veg-portions/exercise-days/CV-risk are NOT required (`false`).
//    `heightInput`/`weightInput` have explicit ids (`fillField`'s byId path);
//    `hba1c` has an explicit id too; the Fasting blood sugar numeric input
//    has NO id, sharing one `<td>` with the Fasting/Random radio group under
//    the `<th>Fasting blood sugar</th>` — `fillField`'s generic
//    `input, textarea` `.first()` fallback grabs the numeric input correctly
//    since it precedes the radio inputs in DOM order, and `selectRadio`
//    reaches the radio group in the same cell with zero new code.
//
// 2. "Blood pressure" (note lowercase "p" — unlike NCD Other visit's own
//    "Blood Pressure" row) renders the same "two bare inputs, one td,
//    separated by a literal '/' text node" shape — reached via new
//    `htnDmSystolicBP`/`htnDmDiastolicBP` magic-string branches in
//    `fillField` (mastercard-page.ts), since the existing `systolicBP`/
//    `diastolicBP` branches are hardcoded to the differently-cased row label
//    and `getByText(..., {exact:true})` is case-sensitive.
//
// 3. BMI radio ("Below 19"/"19-24.9"/"Above 25") and Tobacco/Alcohol radios
//    (real, correctly mutually-exclusive "Current"/"Never"/"Stopped" groups,
//    unlike this program's own header form's independent-checkbox TB Status
//    quirk from the ART pilot) reuse `selectRadio` unchanged.
//
// 4. "Foot check" packs its 3 sub-rows (Neuropathy/PVD, Deformities, Ulcers)
//    into ONE `<td>` with no sub-`<td>` boundaries at all — each is
//    `<span class="atab">{label}</span><span><obs style="radio"
//    answerConceptIds="$yes,$no"/></span>`, i.e. the label lives in a
//    SIBLING `<span>` immediately before the field's own wrapping `<span>`,
//    a genuinely new shape needing `selectRadioAfterLabelSpan` (see
//    mastercard-page.ts's own comment on it).
//
// 5. "Hospitalized since last visit?" is a SINGLE checkbox with
//    `answerLabel=""` — renders `<label for="wNN"></label>` (empty) followed
//    by the literal, unbound text "Yes". `getByLabel` cannot reach this at
//    all (empty accessible name), and there's no stable id — reached via new
//    `checkCellCheckbox('Hospitalized since last visit?')` (see
//    mastercard-page.ts's own comment on it), anchored on the row's own
//    `<th>` text like every `cellAt`-based helper.
//
// 6. The 7 medication rows (Diabetes Medications/Diuretic/CCB/ACE-I/BB/
//    Statin/Other) each `<repeat>` 2-4 drugs; Aspirin is the one exception,
//    a single non-repeated drug with STABLE, explicit ids (`aspName`,
//    `dose-asp`, `asp-doseUnit`, `route-asp`, `asp-frequencyCoded`,
//    `duration-asp`, `durationUnit-asp`) reached via `checkById`/`fillField`/
//    `selectDropdown`'s existing byId paths unchanged. For the 7 REPEATED
//    rows, each drug's own dose/route/frequency/duration/durationUnit
//    fields render with an id literally containing that drug's concept UUID
//    (`dose_<uuid>`, `doseUnit_<uuid>`, `route_<uuid>`,
//    `frequencyCoded_<uuid>`, `duration_<uuid>`, `durationUnit_<uuid>`) —
//    all valid, `fillField`/`selectDropdown` byId-compatible tokens.
//    IMPORTANTLY, several of these repeats' own macro references have a
//    trailing space in the XML (e.g. `repeat with="['$amlodipine ','AML']"`)
//    — confirmed live this does NOT leak into the rendered id (htmlformentry
//    trims it when resolving `{0}`), so `diab_<uuid>_med`/`dose_<uuid>` etc.
//    are clean, space-free ids — not a bug, no special handling needed.
//    ONE representative drug is filled per row (not every drug in every
//    row): the checkbox's own visible `<label>` text (e.g. "Metformin",
//    "HCTZ", "AML", "LISIN", "PROP", "ATORVA", "HYD" — the repeat's own
//    abbreviation/name, confirmed live unique on the page) is checked via
//    the new `checkByLabel` helper, then that one drug's dose/route/
//    frequency/duration/durationUnit fields are filled via its concept UUID
//    (sourced from this file's own macros, listed below) — mirroring the
//    ART pilot's own CPT/IPT precedent (mastercard-page.ts's Task 13 note 8:
//    sample the repeated near-identical unit, don't exhaustively fill every
//    instance of a `<repeat>`). Unlike CPT/IPT's "No. of pills" (required
//    for ALL 5 groups regardless of checked state), confirmed live NONE of
//    these dose/route/frequency/duration fields are required unless their
//    own row's checkbox is checked (no equivalent always-required JS logic
//    here), so the untouched drugs/rows are safely left entirely blank. The
//    Diuretic row is the one exception: TWO drugs (HCTZ + FURP) are checked
//    and filled simultaneously, to prove the row's repeated obsgroups don't
//    clobber each other when more than one is filled at once — confirmed
//    live via the saved encounter's REST obs showing two independent
//    "Prescription construct" obs, one per drug, matching the same
//    non-collision behavior already confirmed for CPT/IPT.
//
// 7. Next appointment (`appointmentDate`) has an explicit id and renders as
//    the same readonly jQuery-UI-datepicker input ART/NCD Other's own
//    `appointmentDate` does, and is REQUIRED (confirmed live via
//    mastercard.js's `setupAppointmentDateValidation`, same as both prior
//    pilots) — `fillField`'s existing `fillInputOrDatePicker` path handles
//    it with no new code.
// ---------------------------------------------------------------------------

// Concept UUIDs for the one representative drug filled per medication row —
// sourced from hypertension-and-diabetes-visit.xml's own `<macros>` block
// (never invented), used to build each drug's `dose_<uuid>`/`doseUnit_<uuid>`/
// `route_<uuid>`/`frequencyCoded_<uuid>`/`duration_<uuid>`/
// `durationUnit_<uuid>` field ids — see verification note 6 above.
const METFORMIN_UUID = '65694308-977f-11e1-8993-905e29aff6c1';
const HYDROCHLOROTHIAZIDE_UUID = '65588df6-977f-11e1-8993-905e29aff6c1';
const FUROSEMIDE_UUID = '6546003c-977f-11e1-8993-905e29aff6c1';
const AMLODIPINE_UUID = '65635ef2-977f-11e1-8993-905e29aff6c1';
const LISINOPRIL_UUID = '65635a74-977f-11e1-8993-905e29aff6c1';
const PROPRANOLOL_UUID = '65470f18-977f-11e1-8993-905e29aff6c1';
const ATORVASTATIN_UUID = '657aefc2-977f-11e1-8993-905e29aff6c1';
const HYDRALAZINE_UUID = '654b10d6-977f-11e1-8993-905e29aff6c1';

interface MedicationDoseDetails {
  dose: string;
  doseUnit: string;
  route: string;
  frequency: string;
  duration: string;
  durationUnit: string;
}

// Fills one drug's dose/route/frequency/duration fields via its
// `{field}_<conceptUuid>` id shape — see verification note 6 above.
async function fillMedicationDoseByConceptUuid(
  form: MastercardFormPage,
  conceptUuid: string,
  details: MedicationDoseDetails,
): Promise<void> {
  await form.fillField(`dose_${conceptUuid}`, details.dose);
  await form.selectDropdown(`doseUnit_${conceptUuid}`, details.doseUnit);
  await form.selectDropdown(`route_${conceptUuid}`, details.route);
  await form.selectDropdown(`frequencyCoded_${conceptUuid}`, details.frequency);
  await form.fillField(`duration_${conceptUuid}`, details.duration);
  await form.selectDropdown(`durationUnit_${conceptUuid}`, details.durationUnit);
}

// Fills every editable field on hypertension-and-diabetes-visit.xml's own
// data-entry (visit) form. The literal values used below are asserted
// against in e2e/specs/hypertension-and-diabetes/visit-mastercard.spec.ts —
// keep that spec's assertions in sync if any value here changes.
export async function fillHypertensionAndDiabetesVisitForm(
  form: MastercardFormPage,
  opts: { appointmentDate: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');

  await form.fillField('heightInput', '165');
  await form.fillField('weightInput', '70');
  await form.selectRadio('Body Mass Index (BMI)', '19-24.9');

  await form.fillField('htnDmSystolicBP', '130');
  await form.fillField('htnDmDiastolicBP', '85');
  await form.fillField('Pulse rate', '78');

  await form.fillField('hba1c', '6');
  await form.fillField('Fasting blood sugar', '110');
  await form.selectRadio('Fasting blood sugar', 'Fasting');

  await form.selectRadio('Tobacco', 'Current');
  await form.selectRadio('Alcohol', 'Stopped');

  await form.fillField('Number of fruit and vegetable portions', '3');
  await form.fillField('Days per week with 30 minutes of exercise', '4');
  await form.fillField('Cardiovascular risk', '15');
  await form.fillField('Visual acuity', '20/20');

  // Foot check — see verification note 4 above.
  await form.selectRadioAfterLabelSpan('Neuropathy/PVD', 'Yes');
  await form.selectRadioAfterLabelSpan('Deformities', 'No');
  await form.selectRadioAfterLabelSpan('Ulcers', 'No');

  // Hospitalized since last visit? — see verification note 5 above.
  await form.checkCellCheckbox('Hospitalized since last visit?');

  // Medications — one representative drug per row — see verification note 6
  // above for why not every drug in every `<repeat>` is filled.
  await form.checkByLabel('Metformin');
  await fillMedicationDoseByConceptUuid(form, METFORMIN_UUID, {
    dose: '500',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'BID',
    duration: '30',
    durationUnit: 'Days',
  });

  // Diuretic — TWO drugs checked simultaneously in the same repeat row
  // (unlike every other row, which samples only one), to prove the row's
  // repeated obsgroups don't clobber each other when more than one is
  // filled at once — same concurrency concern the ART pilot's own CPT/IPT
  // precedent addressed (mastercard-page.ts's Task 13 note 8).
  await form.checkByLabel('HCTZ');
  await fillMedicationDoseByConceptUuid(form, HYDROCHLOROTHIAZIDE_UUID, {
    dose: '25',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'OD',
    duration: '30',
    durationUnit: 'Days',
  });

  await form.checkByLabel('FURP');
  await fillMedicationDoseByConceptUuid(form, FUROSEMIDE_UUID, {
    dose: '40',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'BID',
    duration: '14',
    durationUnit: 'Days',
  });

  await form.checkByLabel('AML');
  await fillMedicationDoseByConceptUuid(form, AMLODIPINE_UUID, {
    dose: '5',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'OD',
    duration: '30',
    durationUnit: 'Days',
  });

  await form.checkByLabel('LISIN');
  await fillMedicationDoseByConceptUuid(form, LISINOPRIL_UUID, {
    dose: '10',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'OD',
    duration: '30',
    durationUnit: 'Days',
  });

  await form.checkByLabel('PROP');
  await fillMedicationDoseByConceptUuid(form, PROPRANOLOL_UUID, {
    dose: '40',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'BID',
    duration: '30',
    durationUnit: 'Days',
  });

  // Aspirin — the one non-repeated medication row, with stable explicit ids
  // (see verification note 6 above).
  await form.checkById('aspName');
  await form.fillField('dose-asp', '75');
  await form.selectDropdown('asp-doseUnit', 'mg');
  await form.selectDropdown('route-asp', 'Oral');
  await form.selectDropdown('asp-frequencyCoded', 'OD');
  await form.fillField('duration-asp', '30');
  await form.selectDropdown('durationUnit-asp', 'Days');

  await form.checkByLabel('ATORVA');
  await fillMedicationDoseByConceptUuid(form, ATORVASTATIN_UUID, {
    dose: '20',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'OD',
    duration: '30',
    durationUnit: 'Days',
  });

  await form.checkByLabel('HYD');
  await fillMedicationDoseByConceptUuid(form, HYDRALAZINE_UUID, {
    dose: '25',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'TID',
    duration: '30',
    durationUnit: 'Days',
  });

  await form.fillField('appointmentDate', opts.appointmentDate);
}
