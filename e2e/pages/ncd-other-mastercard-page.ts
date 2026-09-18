import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// Verification notes (NCD Other pilot, Task 3) — confirmed against a live
// instance the same way as the ART pilot's mastercard-page.ts: reading
// content/configuration/backend_configuration/htmlforms/ncd-other-emastercard.xml
// in full, then (1) dumping `patientDashboard.form`'s rendered "Create new"
// link for a real `eligibleNcdOtherPatient` fixture patient, and (2) dumping
// `table.data-entry-table`'s innerHTML for a freshly-opened create form at
// the resulting URL. Not guessed from the JSP tag or the XML alone.
//
// 1. The dashboard's "Create new NCD Other eMastercard" link has NO `href`
//    attribute (same shape as ART's link — see MastercardGatePage's own
//    Task 8 note 1), and its `onclick` embeds:
//      headerForm=file:configuration/htmlforms/ncd-other-emastercard.xml
//      flowsheets=file:configuration/htmlforms/ncd-other-quarterly-laboratory-tests.xml
//      flowsheets=file:configuration/htmlforms/ncd-other-annual-laboratory-tests.xml
//      flowsheets=file:configuration/htmlforms/ncd-other-hospitalization-history.xml
//      flowsheets=file:configuration/htmlforms/ncd-other-visit.xml
//      dashboardUrl=legacyui&customizationProvider=pihmalawi&customizationFragment=mastercard
//      patientId=<legacy integer id>&encounterDate=...
//    — a completely different headerForm and flowsheet list than ART's, so
//    `MastercardGatePage.buildCreateUrl` (ART-hardcoded) isn't reused;
//    `NcdOtherMastercardGatePage.buildCreateUrl` below mirrors its shape.
//    Confirmed live (passing the fixture patient's real UUID as `patientId`,
//    per the same UUID-transparently-accepted resolution ART's own Task 9
//    already established) that this renders the real NCD Other header form
//    for that exact patient.
//
// 2. Every field below reuses `MastercardFormPage`'s existing generic
//    helpers with no changes needed EXCEPT the three additions documented in
//    mastercard-page.ts's own "NCD Other pilot" note block
//    (`openCreateAtUrl`, `checkById`, `selectDropdown`'s `cellIndex` param)
//    plus two `fillField` magic-string branches (`otherComorbidity` /
//    `nonCodedDxText`).
//
// 3. Diagnosis toggle checkboxes (`rheumatoid-dx`/`cirrhosis-dx`/`deepV-dx`/
//    `sickle-dx`/`nonCoded-dx`) each pair with a `data-toggle-target` date
//    field (`*-date`) that renders DISABLED by default — confirmed live via
//    `isDisabled()` before/after checking the paired checkbox (true ->
//    false). The page's own bundled JS (wiring not in this repo's own
//    scripts — confirmed NOT `validate_dx_fields.js`'s `.dx-selected`
//    selector, which doesn't match this form's `dx-checkbox-item` class;
//    the actual enabling logic lives in the htmlformentryui/customization
//    bundle) removes `disabled` the moment the checkbox is checked. Checking
//    the box before filling its date matches real user behavior (a user
//    can't type into a disabled field at all), so each pair below is
//    checked, then filled, in that order.
//
// 4. "Other:" comorbidity free-text (`$otherComorbidity`) and the "Other
//    non-coded" diagnosis's free-text answer (`$otherDxText`) both render as
//    bare, unlabeled `<input type="text">`s with no id of their own (the
//    rendered `id="wNN"` is opaque/render-order-dependent) and no distinct
//    `<td>`/label to anchor a plain-text lookup to either:
//      - `$otherComorbidity` is a sibling of 3 checkboxes inside one
//        rowspan="5" `<td>` under the "Comorbidities" `<th>` — it's the
//        ONLY `input[type="text"]` in that cell (`fillField`'s generic
//        `input, textarea` `.first()` fallback would instead grab the first
//        checkbox and throw, since `.fill()` refuses a checkbox).
//      - `$otherDxText` is a sibling `<input>` immediately following the
//        `nonCoded-dx` checkbox's own id'd `<span>`, inside the SAME `<td>`
//        — the exact same "sibling input right after an id'd span" shape
//        `fillCptIptPills` already targets (`[id="..."]` +
//        `following-sibling::input[1]`), just needed under a
//        non-CPT/IPT-specific name here.
//    Both reached via new `fillField` magic-string branches
//    (`otherComorbidity`/`nonCodedDxText`), matching this file's own
//    height/weight/CD4/LastArvs precedent for exactly this kind of
//    no-label, no-id quirk, rather than new methods.
//
// 5. HIV status + Date Test (cellIndex 1), ART Start Date (cellIndex 2), TB
//    status (cellIndex 3), TB Date (cellIndex 4) all share ONE table row
//    anchored by the row's own `<th>` text "Patient<br/>History" — rendered
//    as "PatientHistory" with NO space (the same `<br/>`-contributes-nothing
//    rule as ART's Task 11 note 3: the XML's `Patient<br/>History` has no
//    whitespace text node on either side of the `<br/>`). "HIV" and "Date
//    Test" further share a SINGLE `<td>` (cellIndex 1) with no `<td>`
//    boundary between them — confirmed live `fillField`/`selectDropdown`'s
//    existing lookups (`.locator('select')` / `.locator('input, textarea')
//    .first()`) still resolve unambiguously, since a `<select>` isn't
//    matched by an `input`/`textarea` locator, so there's exactly one
//    `<select>` (the HIV dropdown) and exactly one true `<input>` (the Date
//    Test datepicker) in that cell.
//
// 6. ECHO/ECG (Imaging Results) each render as `<th>ECHO</th>`/`<th>ECG</th>`
//    followed by their own two `<td>`s (Date at cellIndex 1, Result at
//    cellIndex 2). ECHO's Result (`$echoImagingResult`) is a plain text
//    input; ECG's Result (`$ecgResult`) is a `<select>` — both concepts
//    despite the identical row shape. Both reached with zero new code via
//    the existing cellIndex mechanism (`fillField`'s for ECHO's Result,
//    `selectDropdown`'s new `cellIndex` param for ECG's).
//
// 7. The "Outcome" row (`fn.currentProgramWorkflowStatus(16)...`) and "CHW
//    Name" (a `<lookup complexExpression=.../>` over the patient's
//    relationships) are both pure read-only lookups with no backing obs at
//    all — confirmed in the XML (no `<obs>`/`<obsgroup>` tag) and in the
//    rendered DOM (plain text, no `<input>`/`<select>` anywhere in either
//    cell) — intentionally not filled, same as ART's equivalent read-only
//    "Patient Name"/"Sex, DOB"/"Physical Address" rows.
// ---------------------------------------------------------------------------

const NCD_OTHER_HEADER_FORM = 'file:configuration/htmlforms/ncd-other-emastercard.xml';
const NCD_OTHER_FLOWSHEETS = [
  'file:configuration/htmlforms/ncd-other-quarterly-laboratory-tests.xml',
  'file:configuration/htmlforms/ncd-other-annual-laboratory-tests.xml',
  'file:configuration/htmlforms/ncd-other-hospitalization-history.xml',
  'file:configuration/htmlforms/ncd-other-visit.xml',
];

export class NcdOtherMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: NCD_OTHER_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of NCD_OTHER_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    // No leading slash — see playwright.config.ts's baseURL comment (same
    // reasoning as MastercardGatePage.buildCreateUrl).
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

// Fills every editable field on ncd-other-emastercard.xml's header form. The
// literal values used below (names, phone numbers, diagnosis text, etc.) are
// asserted against in e2e/specs/ncd-other/header-mastercard.spec.ts — keep
// that spec's assertions in sync if any value here changes.
// Exported standalone (not a save — callers decide when/whether to save) so
// this exact field-filling logic is reusable by both this task's own spec
// AND a later visit-mastercard spec that just needs *a* saved NCD_OTHER
// header encounter to continue from (mirroring how the ART pilot's
// visit-mastercard.spec.ts's `beforeEach` reuses `MastercardFormPage`
// without duplicating header-mastercard.spec.ts's field list) — callers
// call `form.save()`/`form.expectSaveSuccess()` themselves afterward, same
// as every other MastercardFormPage caller.
export async function fillNcdOtherHeaderForm(form: MastercardFormPage, encounterDate: string): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);

  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('guardianNameField', 'Grace Banda');
  await form.fillField('Guardian Phone', '0993334444');
  await form.fillField('Guardian relation to patient', 'Mother');
  await form.selectRadio('Agrees to FUP', 'Y');

  // Diagnoses — each toggle checkbox is checked BEFORE its paired date is
  // filled (see verification note 3 above).
  await form.checkById('rheumatoid-dx');
  await form.fillField('rheumatoid-dx-date', encounterDate);

  await form.selectRadio('Comorbidities', 'Hypertension');
  await form.selectRadio('Comorbidities', 'Diabetes');
  await form.selectRadio('Comorbidities', 'Chronic kidney disease');
  await form.fillField('otherComorbidity', 'Chronic liver disease');

  await form.checkById('cirrhosis-dx');
  await form.fillField('cirrhosis-dx-date', encounterDate);

  await form.checkById('deepV-dx');
  await form.fillField('deepV-dx-date', encounterDate);

  await form.checkById('sickle-dx');
  await form.fillField('sickle-dx-date', encounterDate);

  await form.checkById('nonCoded-dx');
  await form.fillField('nonCodedDxText', 'Unspecified chronic condition');
  await form.fillField('nonCoded-dx-date', encounterDate);

  // Patient History row — see verification note 5 above for the
  // "PatientHistory" cellIndex layout (1: HIV + Date Test, 2: ART Start
  // Date, 3: TB, 4: TB Date).
  await form.selectDropdown('PatientHistory', 'Reactive', 1);
  await form.fillField('PatientHistory', encounterDate, 1);
  await form.fillField('PatientHistory', encounterDate, 2);
  await form.selectDropdown('PatientHistory', 'smear pos', 3);
  await form.fillField('PatientHistory', encounterDate, 4);

  // Imaging Results — see verification note 6 above.
  await form.fillField('ECHO', encounterDate, 1);
  await form.fillField('ECHO', 'Normal echo result', 2);
  await form.fillField('ECG', encounterDate, 1);
  await form.selectDropdown('ECG', 'Normal', 2);
}

// Fills only the minimum fields needed to save an NCD_OTHER header
// encounter. Unlike ART's header form (where "Agrees to FUP" alone is
// enough), NCD Other's own bundled JS (`setupChronicCareDiagnosisValidation`/
// `ensureDiagnosisChecked` in omod/.../resources/scripts/mastercard.js) also
// keeps `.submitButton` disabled with "Must enter at least one diagnosis!"
// until at least one of the 5 `.dx-checkbox-item` diagnosis checkboxes
// (rheumatoid-dx/cirrhosis-dx/deepV-dx/sickle-dx/nonCoded-dx) is checked —
// confirmed live (this exact error appeared with only "Agrees to FUP"
// filled). Checking `rheumatoid-dx` alone (its paired `rheumatoid-dx-date`
// has no `required` XML attribute and isn't needed) clears it. So the true
// minimum is: "Agrees to FUP" + one diagnosis checkbox — confirmed live this
// saves successfully with no other fields filled. Used ONLY by
// visit-mastercard.spec.ts's `beforeEach`, which needs a saved header
// encounter as a prerequisite, not the header encounter's own content.
// header-mastercard.spec.ts still uses `fillNcdOtherHeaderForm` (the full
// fill) above, since it asserts on that form's own field values.
export async function fillNcdOtherHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.selectRadio('Agrees to FUP', 'Y');
  await form.checkById('rheumatoid-dx');
}
