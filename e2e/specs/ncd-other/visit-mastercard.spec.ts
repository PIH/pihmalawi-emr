import { test, expect } from '../../core';
import { MastercardFormPage, NcdOtherMastercardGatePage, fillNcdOtherHeaderForm } from '../../pages';
import { NCD_OTHER_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

// ---------------------------------------------------------------------------
// Verification notes (this plan's Task 4) — extending the shared page
// objects to ncd-other-visit.xml's own visit tab. Confirmed against a live
// instance the same way as every prior task: reading the XML in full, then
// (1) dumping `table.visit-edit-table`'s rendered `innerHTML` for a freshly
// opened "Enter New NCD Other Visit" flowsheet against a real, saved NCD
// Other header encounter (`eligibleNcdOtherPatient` fixture patient), and
// (2) actually filling and saving the form and checking the resulting REST
// `encounter`/`obs`.
//
// 1. Height/Weight (`heightInput`/`weightInput`) have explicit ids on their
//    own separate rows here — unlike ART's header form's same-named fields
//    (no id at all) and unlike this same program's OWN header form's
//    Height/Weight (shared "Height/ Wgt." row, `.left-cell`/`.right-cell`).
//    `fillField`'s existing byId path just works, no new handling needed.
//
// 2. Blood Pressure — the XML's two `<obsreference>` tags for systolic/
//    diastolic have NO id at all (unlike ART's own `systolicBPInput`/
//    `diastolicBPInput`, which do). Confirmed live they render as two bare
//    `<input>`s back to back in ONE `<td>` under the "Blood Pressure" `<th>`,
//    separated only by a literal "/" text node — the exact same
//    "two inputs, one td, positional" shape `fillField`'s existing
//    `LastArvsDrug`/`LastArvsDate` branch already handles for a different
//    row. Added two new magic-string branches (`systolicBP`/`diastolicBP`)
//    to `fillField` in `mastercard-page.ts` reusing that identical mechanism
//    (targeting by input order within the row), rather than a new method.
//
// 3. Weight Change, Heart Rate, Blood Oxygen Saturation, Number of fruit/veg
//    portions, Days/week of exercise, Medications, Comments — all bare
//    `<obs>` tags with no id, reached via `fillField`'s existing plain-label
//    fallback using each row's own unique `<th>` text (verified each is the
//    row's ENTIRE text, so `exact: true` matches without ambiguity — no
//    `<br/>`-concatenation or nested-table quirks on any of these rows).
//
// 4. Tobacco use / Alcohol use — each XML `style="radio"` `<obs>` (single tag
//    with `answerConceptIds`/`answerLabels`) renders as a REAL, correctly
//    mutually-exclusive radio group (`name="w22"`/`name="w24"` respectively)
//    with labels "Current"/"Never"/"Stopped" — unlike ART/this program's own
//    header form's independent-checkbox quirks, this is a genuine single
//    radio group here. `selectRadio` reaches it with no new handling.
//
// 5. Hospitalized since last visit for NCD? / Medications changed — BOTH
//    render as a real two-option radio group, but the XML's own
//    `answerLabels="No, Yes"` / `answerConceptIds="$yesAnswer,$noAnswer"`
//    are paired POSITIONALLY (1st label with 1st concept, 2nd with 2nd),
//    which means the rendered "No" label is wired to the `yesAnswer`
//    concept (legacy id 8347, display "Yes") and the rendered "Yes" label
//    (rendered with a leading space, " Yes") is wired to `noAnswer` (id
//    4797, display "No") — backwards from what the label text suggests.
//    Confirmed live by selecting each and reading the real REST `display`:
//    selecting the "No" radio produced "Patient hospitalized since last
//    visit: Yes"; selecting the "Yes" radio on the other row produced "Has
//    the treatment changed at this visit?: No". This is a genuine quirk in
//    ncd-other-visit.xml itself (same swapped-pairing bug on both rows), not
//    a selector bug — the test below selects one label per row and asserts
//    the ACTUAL (swapped) resulting display, not the label clicked.
//
// 6. Next appointment (`appointmentDate`) has an explicit id and renders as
//    the same readonly jQuery-UI-datepicker input ART's own `appointmentDate`
//    does — `fillField`'s existing `fillInputOrDatePicker` path (already
//    generalized in Task 11) handles it with no new code.
//
// 7. Next appointment Location — a real two-option radio group, "Advanced"/
//    "IC3" (IC3 rendered with a leading space, " IC3"), CORRECTLY paired
//    this time (`answerConceptIds="$advancedLocation,$ic3Location"` matches
//    `answerLabels="Advanced, IC3"` positionally in the expected order) —
//    confirmed live selecting "Advanced" produces "Next appointment
//    location: Advanced NCD clinic". `selectRadio` needs no new handling.
//
// 8. Visit Date/Visit Location: Visit Date's only editable representation is
//    a `display:none`-wrapped `<encounterDate>` pre-filled from the
//    `encounterDate` URL param (same non-editable-in-practice shape as every
//    other mastercard form here) — not filled directly. Visit Location
//    (`visitLocation`, an `encounterLocation` tag) IS required and blank by
//    default, same as every other flowsheet/header form's own location
//    field — `selectDropdown('visitLocation', ...)` handles it with no new
//    code, and its value is verified via the saved encounter's own
//    `location.display` (an encounter attribute, not an obs).
// ---------------------------------------------------------------------------

// A visit mastercard is only meaningful once a header (NCD_OTHER_INITIAL)
// encounter exists — same reasoning as ART's own visit-mastercard.spec.ts
// (see MastercardFormPage's Task 10 verification note 1). This beforeEach
// creates that header first, on the same `page` the test itself receives,
// since reaching the visit form requires continuing on that same
// already-loaded page (`enterNewFlowsheet`), not a fresh `openCreateAtUrl`
// navigation. Reuses Task 3's `fillNcdOtherHeaderForm` rather than
// duplicating its field list — same pattern as header-mastercard.spec.ts.
test.describe('NCD Other visit mastercard', () => {
  test.beforeEach(async ({ page, eligibleNcdOtherPatient }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);
    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      NcdOtherMastercardGatePage.buildCreateUrl(eligibleNcdOtherPatient.uuid, encounterDate),
    );
    await fillNcdOtherHeaderForm(headerForm, encounterDate);
    await headerForm.save();
    await headerForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as NCD_OTHER_FOLLOWUP', async ({
    page,
    api,
    eligibleNcdOtherPatient,
  }) => {
    // Continues on the same `page` the beforeEach already navigated and
    // saved a header encounter on — see verification note above for why
    // `openCreateAtUrl` can't be called again here.
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('NCD Other Visit');

    await visitForm.selectDropdown('visitLocation', 'Neno District Hospital');
    await visitForm.fillField('heightInput', '165');
    await visitForm.fillField('weightInput', '70');
    await visitForm.fillField('Weight Change', 'Lost 2kg since last visit');
    await visitForm.fillField('systolicBP', '130');
    await visitForm.fillField('diastolicBP', '85');
    await visitForm.fillField('Heart Rate', '78');
    await visitForm.fillField('Blood Oxygen Saturation (% SPO2)', '97');
    await visitForm.selectRadio('Tobacco use', 'Current');
    await visitForm.selectRadio('Alcohol use', 'Stopped');
    await visitForm.fillField('Number of fruit and vegetable portions', '3');
    await visitForm.fillField('Days per week with 30 minutes of exercise', '4');
    // See verification note 5 above — the rendered "No" label is wired to
    // the "Yes" concept for this row.
    await visitForm.selectRadio('Hospitalized since last visit for NCD?', 'No');
    await visitForm.fillField('Medications', 'Amlodipine 5mg daily');
    // Same swapped-pairing quirk as above, on this row's "Yes" label.
    await visitForm.selectRadio('Medications changed', 'Yes');
    await visitForm.fillField('Comments', 'Patient reports improved symptoms');
    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await visitForm.fillField('appointmentDate', appointmentDate);
    await visitForm.selectRadio('Next appointment Location', 'Advanced');

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligibleNcdOtherPatient.uuid}&encounterType=${NCD_OTHER_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);

    // Visit Location is the encounter's own `location` attribute, not an
    // obs — see verification note 8 above.
    expect(results[0].location?.display).toMatch(/neno district hospital/i);

    // Every assertion below checks the ACTUAL rendered REST `display`
    // string, confirmed live by first saving this exact form and dumping the
    // real encounter's obs (per docs/e2e-adding-a-program-playbook.md's
    // method) — never a presence-only check. Several concepts' own display
    // names differ from the XML's row label (e.g. Heart Rate's concept is
    // "Pulse", Number of fruit/veg portions' is "Number of servings of
    // fruits and vegetables consumed per day", Days/week of exercise's is
    // "Days per week of moderate exercise") — confirmed live, not assumed.
    const obs = results[0].obs as Array<{ display: string }>;

    expect(obs.some((o) => /height \(cm\).*165/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /weight \(kg\).*70/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /weight change.*lost 2kg since last visit/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /systolic blood pressure.*130/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /diastolic blood pressure.*85/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /pulse.*78/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /blood oxygen saturation.*97/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /smoking history.*currently/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /history of alcohol use.*in the past/i.test(o.display))).toBeTruthy();
    expect(
      obs.some((o) => /fruits and vegetables consumed per day.*3/i.test(o.display)),
    ).toBeTruthy();
    expect(obs.some((o) => /days per week of moderate exercise.*4/i.test(o.display))).toBeTruthy();
    // Swapped-pairing quirk (verification note 5): selecting "No" above
    // actually records the "Yes" concept.
    expect(obs.some((o) => /hospitalized since last visit.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /medications dispensed.*amlodipine 5mg daily/i.test(o.display))).toBeTruthy();
    // Swapped-pairing quirk (verification note 5): selecting "Yes" above
    // actually records the "No" concept.
    expect(obs.some((o) => /treatment changed at this visit.*no/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /general comment.*patient reports improved symptoms/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => new RegExp(`appointment date.*${appointmentDate}`, 'i').test(o.display))).toBeTruthy();
    expect(obs.some((o) => /next appointment location.*advanced ncd clinic/i.test(o.display))).toBeTruthy();
  });
});
