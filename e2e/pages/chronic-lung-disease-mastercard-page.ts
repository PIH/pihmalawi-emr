import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// Verification notes (Chronic Lung Disease pilot, header form) — confirmed
// against a live instance the same way as the ART/NCD Other/Hypertension and
// Diabetes pilots: reading
// content/configuration/backend_configuration/htmlforms/chronic-lung-disease-emastercard.xml
// in full, then (1) dumping `patientDashboard.form`'s rendered "Create new"
// link's `onclick` for a real `eligibleChronicLungDiseasePatient` fixture
// patient, and (2) dumping `table.data-entry-table`'s innerHTML for a
// freshly-opened create form at the resulting URL. Not guessed from the JSP
// tag, the XML, or docs/program-eligibility-rules.md alone.
//
// 1. The dashboard's "Create new Chronic Lung Disease eMastercard" link has
//    NO `href` attribute (same shape as every prior pilot's link), and its
//    `onclick` embeds exactly (confirmed live):
//      headerForm=file:configuration/htmlforms/chronic-lung-disease-emastercard.xml
//      flowsheets=file:configuration/htmlforms/chronic-lung-disease-visit.xml
//      flowsheets=file:configuration/htmlforms/chronic-lung-disease-peak-flow.xml
//      flowsheets=file:configuration/htmlforms/chronic-lung-disease-hospitalization.xml
//      dashboardUrl=legacyui&customizationProvider=pihmalawi&customizationFragment=mastercard
//    — matching `EMastercardAccessTag.getNewMasterCardConfiguration`'s
//    `flowsheetForms` map for `ENCOUNTERTYPE_ASTHMA_INITIAL_NAME` exactly
//    (also confirmed by reading that Java map directly, since deriving the
//    URL by dumping the dashboard link doesn't require the app's own gate
//    to already be satisfied by an existing header — see
//    docs/program-eligibility-rules.md's own "Chronic Lung Disease" launch
//    URL note). This pilot's specs are scoped to the emastercard + `-visit.xml`
//    flowsheet only (matching the NCD Other/Hypertension and Diabetes
//    pilots' own scope decisions) — the peak-flow and hospitalization
//    flowsheets are out of scope, but `buildCreateUrl` still includes them
//    in the URL since that's what the real dashboard link renders and
//    `flowsheet.page` expects the exact real flowsheet list to reach the
//    "Enter New Chronic Lung Disease Visit" action link.
//
// 2. Every field below reuses `MastercardFormPage`'s existing generic
//    helpers, plus the five additions documented in mastercard-page.ts's own
//    "Chronic Lung Disease pilot" note block (`checkByLabel`,
//    `selectDropdownInRow`, `fillFieldAfterLabelledControl`,
//    `selectRadioInWrappedLabelRow`, `checkCellCheckbox`) and 4 new
//    `fillField` magic-string branches (`betaAgonistDaily`/`Weekly`/
//    `Monthly`/`Yearly`, visit form only).
// ---------------------------------------------------------------------------

const ASTHMA_HEADER_FORM = 'file:configuration/htmlforms/chronic-lung-disease-emastercard.xml';
const ASTHMA_FLOWSHEETS = [
  'file:configuration/htmlforms/chronic-lung-disease-visit.xml',
  'file:configuration/htmlforms/chronic-lung-disease-peak-flow.xml',
  'file:configuration/htmlforms/chronic-lung-disease-hospitalization.xml',
];

export class ChronicLungDiseaseMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: ASTHMA_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of ASTHMA_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    // No leading slash — see playwright.config.ts's baseURL comment (same
    // reasoning as MastercardGatePage.buildCreateUrl).
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

// Fills every editable field on chronic-lung-disease-emastercard.xml's
// header form. The literal values used below are asserted against in
// e2e/specs/chronic-lung-disease/header-mastercard.spec.ts — keep that
// spec's assertions in sync if any value here changes. Exported standalone
// (not a save — callers decide when/whether to save), same pattern as
// `fillNcdOtherHeaderForm`/`fillHypertensionAndDiabetesHeaderForm`, so
// visit-mastercard.spec.ts's `beforeEach` can reach a saved header encounter
// without duplicating this field list.
export async function fillChronicLungDiseaseHeaderForm(
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
  // filled, same order every prior pilot's diagnosis rows used. Unlike
  // Hypertension and Diabetes's own diagnosis checkboxes, this form's don't
  // require the paired date to save (no `dx-selected` class — see
  // mastercard-page.ts's own verification note 1), but it's still filled
  // here since header-mastercard.spec.ts asserts on it.
  await form.checkByLabel('Asthma');
  await form.fillField('asthma-dx-date', encounterDate);

  await form.checkByLabel('COPD');
  await form.fillField('copd-dx-date', encounterDate);

  // Family History — see mastercard-page.ts's own verification note 2.
  await form.selectDropdownInRow('Asthma', 'Y');
  await form.selectDropdownInRow('COPD', 'N');

  // "PatientHistory &Exposures" row — see mastercard-page.ts's own
  // verification note 3 for the exact rendered (no-space-before-"Exposures")
  // label text and this row's cellIndex layout (1: HIV + Date Test, 2: ART
  // Start Date, 3: TB, 4: Year).
  const PATIENT_HISTORY_EXPOSURES_ROW_LABEL = 'PatientHistory &Exposures';
  await form.selectDropdown(PATIENT_HISTORY_EXPOSURES_ROW_LABEL, 'Reactive', 1);
  await form.fillField(PATIENT_HISTORY_EXPOSURES_ROW_LABEL, encounterDate, 1);
  await form.fillField(PATIENT_HISTORY_EXPOSURES_ROW_LABEL, encounterDate, 2);
  await form.selectDropdown(PATIENT_HISTORY_EXPOSURES_ROW_LABEL, 'smear pos', 3);
  await form.fillField(PATIENT_HISTORY_EXPOSURES_ROW_LABEL, encounterDate.slice(0, 4), 4);

  // Chronic dry cough + Duration/Age at onset — see mastercard-page.ts's own
  // verification note 4.
  await form.checkByLabel('Chronic dry cough');
  await form.fillFieldAfterLabelledControl('Chronic dry cough', '6', 0);
  await form.fillFieldAfterLabelledControl('Chronic dry cough', '30', 1);

  // TB contact exposure.
  await form.checkByLabel('TB contact');
  await form.fillField('tb-expo-date', encounterDate);

  // Cooking / Smoking / Occupation — "Cooking" is a real, unique <td> label
  // (unlike Family History's Asthma/COPD rows), so `fillField`'s existing
  // cellIndex mechanism reaches the Date field (cellIndex 3: Indoor/Outdoor
  // checkboxes at 1, Smoking checkbox at 2, Date at 3) with no new code.
  // Indoor and Outdoor are two INDEPENDENT checkboxes on this concept (not a
  // radio group, unlike the visit form's own cookingLocation field) —
  // confirmed live nothing in the XML or rendered JS enforces exclusivity
  // (both can be checked at once and both save as independent obs), so both
  // are filled here for full field coverage, unlike Type1/Type2 Diabetes on
  // Hypertension and Diabetes's own header form, where the app's OWN JS
  // disables the sibling checkbox once one is checked (a genuine
  // mutual-exclusion case, not just a coverage choice).
  await form.checkByLabel('Indoor');
  await form.checkByLabel('Outdoor');
  await form.checkByLabel('Smoking');
  await form.fillField('Cooking', encounterDate, 3);

  // Occupation shares a row with the "Second hand smoking" exposure
  // checkbox — see mastercard-page.ts's own verification note 2.
  await form.selectDropdownInRow('Second hand smoking', 'Employed');
  // Confirmed live this obsgroup's own answer displays as "Exposed to
  // second hand smoke?" (the same underlying concept the visit form's own
  // "Passive smoking" field uses), NOT "Second hand smoking" (the XML's own
  // `answerLabel`) — see the spec's own assertion comment.
  await form.checkByLabel('Second hand smoking');
  await form.fillField('shsmoke-expo-date', encounterDate);

  await form.checkByLabel('Occupational exposure');
  await form.fillField('occ-expo-date', encounterDate);
}

// Fills only the minimum fields needed to save an ASTHMA_INITIAL header
// encounter: "Agrees to FUP" + one diagnosis checkbox (`asthma-dx`). Unlike
// Hypertension and Diabetes's own diagnosis checkboxes (which require their
// paired date once checked — see mastercard-page.ts's own verification note
// 1), this form's diagnosis checkboxes carry only `dx-checkbox-item` (not
// `dx-selected`), so no date is required — confirmed live this saves
// successfully with no other fields filled, same as NCD Other's own minimum.
// Used ONLY by visit-mastercard.spec.ts's `beforeEach`, which needs a saved
// header encounter as a prerequisite, not the header encounter's own
// content. header-mastercard.spec.ts still uses
// `fillChronicLungDiseaseHeaderForm` (the full fill) above, since it asserts
// on that form's own field values.
export async function fillChronicLungDiseaseHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.selectRadio('Agrees to FUP', 'Y');
  await form.checkByLabel('Asthma');
}

// ---------------------------------------------------------------------------
// Verification notes (Chronic Lung Disease pilot, visit form) — confirmed
// against a live instance by reading
// content/configuration/backend_configuration/htmlforms/chronic-lung-disease-visit.xml
// in full, then dumping `table.visit-edit-table`'s rendered `innerHTML` for a
// freshly-opened "Enter New Chronic Lung Disease Visit" flowsheet against a
// real, saved header encounter (`eligibleChronicLungDiseasePatient` fixture
// patient), then actually filling and saving the form and checking the
// resulting REST `encounter`/`obs`.
//
// 1. Height/Weight (`heightInput`/`weightInput`) have explicit ids and are
//    BOTH required (confirmed live via the rendered `checkNumber(this,
//    errId, true, ...)` — same "required" quirk Hypertension and Diabetes's
//    own visit form has for these two fields, unlike ART/NCD Other's own
//    visit forms). `fillField`'s existing byId path handles them unchanged.
//
// 2. "Planned Visit?"/"Indoor cooking"/"Passive smoking" — see
//    mastercard-page.ts's own verification note 6 for the
//    wrapped-`<th>`-label quirk (a `<font>` tag for the first two, a `<span
//    class="rotate">` for the third) that needed
//    `selectRadioInWrappedLabelRow` for ALL THREE — the `<span
//    class="rotate">` case was missed on the first implementation pass
//    (used the plain `selectRadio` instead) and reproduced live as a full
//    test-timeout HANG, not an error, since `cellAt`'s `getByText(...)`
//    locator for a wrapped label never resolves at all (see
//    mastercard-page.ts's note 6 for why). All three render as genuine
//    Yes/No radio groups; "Yes" is filled for Planned Visit/Indoor cooking,
//    "No" for Passive smoking (Indoor cooking's "Yes" selects `$indoor`,
//    confirmed live via the saved obs's own display — see the spec's own
//    assertion comment).
//
// 3. Day/Night symptoms, Smoking (# cigarettes/day), Other dx, Comments —
//    all bare `<obs>` tags with no id, reached via `fillField`'s existing
//    plain-label fallback using each row's own unique `<th>` text.
//
// 4. Beta-agonist inhaler use: frequency — see mastercard-page.ts's own
//    verification note 5 for the 4-independent-inputs-in-one-cell shape.
//
// 5. Steroid inhaler daily?/Exacerbation today? — genuine, correctly
//    mutually-exclusive Yes/No radio groups with a bare (unwrapped) `<th>`
//    label — `selectRadio` reaches them with no new handling.
//
// 6. Asthma severity — a real `<select>` (Intermittent/Mild persistent/
//    Moderate persistent/Severe persistent/Severe Uncontrolled) —
//    `selectDropdown` reaches it with no new handling.
//
// 7. COPD (this form's OWN row, NOT the header form's obsgroup'd diagnosis)
//    — see mastercard-page.ts's own verification note 7 for the
//    empty-accessible-name checkbox needing `checkCellCheckbox`. Saves as a
//    single plain obs ("Chronic care diagnosis: Chronic obstructive
//    pulmonary disease"), unlike the header form's obsgroup'd version.
//
// 8. The 4 medication rows (Inhaled B-agonist/Inhaled steroid/Oral steroid,
//    each a `<repeat>` of one drug here — unlike Hypertension and Diabetes's
//    own multi-drug repeats — plus a 4th, non-repeated "Other" non-coded
//    row) each toggle a `div[style=display:none]` via a `togglehide`
//    attribute (not `toggle` — confirmed live in the rendered DOM, though
//    functionally identical: checking the row's own checkbox reveals its
//    dose/route/frequency/duration fields). All 4 rows were filled
//    (unlike Hypertension and Diabetes's own pilot, which sampled one
//    representative drug per row plus a 2-drug row to prove
//    non-collision — here every row already has a fixed, single drug so
//    filling every row already exercises the full field inventory with no
//    sampling needed) and confirmed live to save as 4 independent
//    "Prescription construct" obsgroups with no cross-contamination — see
//    mastercard-page.ts's own verification note 8. Each drug's own
//    dose/doseUnit/route/frequencyCoded/duration/durationUnit fields are
//    reached via `{field}_<conceptUuid>` ids (repeated drugs) or
//    `{field}_noncodedText` ids (the "Other" row) — both already
//    `fillField`/`selectDropdown` byId-compatible. The "Other" row's own
//    "please specify:" free-text input has NO id (unlike the dose fields),
//    reached via the new `fillFieldAfterLabel` helper (mastercard-page.ts) —
//    see that method's own comment. Confirmed live NONE of these fields are
//    required unless their own row's checkbox is checked (leaving 3 of 4
//    rows unchecked while filling only 1 still saves cleanly) — NOT the
//    CPT/IPT-style "always required" quirk.
//
// 9. Next appointment (`appointmentDate`) has an explicit id, renders as the
//    same readonly jQuery-UI-datepicker input every prior pilot's own
//    `appointmentDate` does, and is REQUIRED (confirmed live: a visible
//    "Required" error renders on this field even before any other field is
//    touched) — `fillField`'s existing `fillInputOrDatePicker` path handles
//    it with no new code.
// ---------------------------------------------------------------------------

// Concept UUIDs for the 3 repeated (single-drug) medication rows — sourced
// from chronic-lung-disease-visit.xml's own `<macros>` block (never
// invented), used to build each drug's `dose_<uuid>`/`doseUnit_<uuid>`/
// `route_<uuid>`/`frequencyCoded_<uuid>`/`duration_<uuid>`/
// `durationUnit_<uuid>` field ids — see verification note 8 above.
const B_AGONIST_INHALED_UUID = '60ae316c-c15f-11e5-9912-ba0be0483c18';
const STEROID_INHALED_UUID = '60ae3554-c15f-11e5-9912-ba0be0483c18';
const STEROID_ORAL_UUID = '60ae373e-c15f-11e5-9912-ba0be0483c18';

interface MedicationDoseDetails {
  dose: string;
  doseUnit: string;
  route: string;
  frequency: string;
  duration: string;
  durationUnit: string;
}

// Fills one drug's dose/route/frequency/duration fields via its
// `{field}_<conceptUuidOrNoncodedText>` id shape — see verification note 8
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

// Fills every editable field on chronic-lung-disease-visit.xml's own
// data-entry (visit) form. The literal values used below are asserted
// against in e2e/specs/chronic-lung-disease/visit-mastercard.spec.ts — keep
// that spec's assertions in sync if any value here changes.
export async function fillChronicLungDiseaseVisitForm(
  form: MastercardFormPage,
  opts: { appointmentDate: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');
  await form.selectRadioInWrappedLabelRow('Planned Visit?', 'Yes');

  await form.fillField('heightInput', '160');
  await form.fillField('weightInput', '55');
  await form.fillField('Day symptoms', '2');
  await form.fillField('Night symptoms', '1');

  await form.fillField('betaAgonistDaily', '1');
  await form.fillField('betaAgonistWeekly', '2');
  await form.fillField('betaAgonistMonthly', '3');
  await form.fillField('betaAgonistYearly', '4');

  await form.selectRadio('Steroid inhaler daily?', 'Yes');
  await form.fillField('Smoking', '0');
  await form.selectRadioInWrappedLabelRow('Passive smoking', 'No');
  await form.selectRadioInWrappedLabelRow('Indoor cooking', 'Yes');
  await form.selectRadio('Exacerbation today?', 'No');
  await form.selectDropdown('Asthma severity', 'Mild persistent');
  await form.checkCellCheckbox('COPD');
  await form.fillField('Other dx', 'Bronchiectasis');

  // Medications — all 4 rows filled (see verification note 8 above for why
  // this pilot doesn't need to sample a subset the way Hypertension and
  // Diabetes's own multi-drug repeats did).
  await form.checkByLabel('Inhaled B-agonist');
  await fillMedicationDose(form, B_AGONIST_INHALED_UUID, {
    dose: '2',
    doseUnit: 'puff(s)',
    route: 'Oral',
    frequency: 'BID',
    duration: '30',
    durationUnit: 'Days',
  });

  await form.checkByLabel('Inhaled steroid');
  await fillMedicationDose(form, STEROID_INHALED_UUID, {
    dose: '1',
    doseUnit: 'puff(s)',
    route: 'Oral',
    frequency: 'OD',
    duration: '30',
    durationUnit: 'Days',
  });

  await form.checkByLabel('Oral steroid');
  await fillMedicationDose(form, STEROID_ORAL_UUID, {
    dose: '5',
    doseUnit: 'mg',
    route: 'Oral',
    frequency: 'OD',
    duration: '7',
    durationUnit: 'Days',
  });

  // "Other" non-coded medication — a single, non-repeated row with stable
  // `_noncodedText`-suffixed ids (see verification note 8 above). Its own
  // checkbox label is the XML's literal `answerLabel="Other, "` (trailing
  // comma-space) — confirmed live `checkByLabel` still matches it exactly.
  await form.checkByLabel('Other, ');
  await form.fillFieldAfterLabel('Other, ', 'Nebulized saline');
  await fillMedicationDose(form, 'noncodedText', {
    dose: '3',
    doseUnit: 'mL',
    route: 'IV',
    frequency: 'PRN',
    duration: '5',
    durationUnit: 'Days',
  });

  await form.fillField('Comments', 'Some comments');
  await form.fillField('appointmentDate', opts.appointmentDate);
}
