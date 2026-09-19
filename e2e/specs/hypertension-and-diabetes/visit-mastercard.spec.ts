import { test, expect } from '../../core';
import {
  MastercardFormPage,
  HypertensionAndDiabetesMastercardGatePage,
  fillHypertensionAndDiabetesHeaderMinimum,
  fillHypertensionAndDiabetesVisitForm,
} from '../../pages';
import { DIABETES_HYPERTENSION_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

// A visit mastercard is only meaningful once a header (DIABETES HYPERTENSION
// INITIAL VISIT) encounter exists — same reasoning as the ART/NCD Other
// pilots' own visit-mastercard.spec.ts files (see MastercardFormPage's ART
// verification note on this). This beforeEach creates that header first, on
// the same `page` the test itself receives, since reaching the visit form
// requires continuing on that same already-loaded page (`enterNewFlowsheet`),
// not a fresh `openCreateAtUrl` navigation. Uses
// `fillHypertensionAndDiabetesHeaderMinimum` (just "Agrees to FUP" + one
// diagnosis checkbox + its paired date — see that function's own doc
// comment for why the date is also required here, unlike NCD Other's
// equivalent) rather than the full `fillHypertensionAndDiabetesHeaderForm`,
// since all this beforeEach needs is *a* saved header encounter to continue
// from, not any particular content on it. header-mastercard.spec.ts still
// uses the full fill since it asserts on that form's own field values.
test.describe('Hypertension and Diabetes visit mastercard', () => {
  test.beforeEach(async ({ page, eligibleHypertensionAndDiabetesPatient }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);
    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      HypertensionAndDiabetesMastercardGatePage.buildCreateUrl(eligibleHypertensionAndDiabetesPatient.uuid, encounterDate),
    );
    await fillHypertensionAndDiabetesHeaderMinimum(headerForm, encounterDate);
    await headerForm.save();
    await headerForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as DIABETES HYPERTENSION FOLLOWUP', async ({
    page,
    api,
    eligibleHypertensionAndDiabetesPatient,
  }) => {
    // Continues on the same `page` the beforeEach already navigated and
    // saved a header encounter on — see this file's own top comment for why
    // `openCreateAtUrl` can't be called again here.
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('Hypertension and Diabetes Visit');

    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillHypertensionAndDiabetesVisitForm(visitForm, { appointmentDate });

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligibleHypertensionAndDiabetesPatient.uuid}&encounterType=${DIABETES_HYPERTENSION_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);

    // Visit Location is the encounter's own `location` attribute, not an
    // obs — same as the ART/NCD Other pilots' own visit forms.
    expect(results[0].location?.display).toMatch(/neno district hospital/i);

    // Every assertion below checks the ACTUAL rendered REST `display`
    // string, confirmed live by first saving this exact form (via a
    // standalone Playwright verification script per
    // docs/e2e-adding-a-program-playbook.md's method) and dumping the real
    // encounter's obs — never a presence-only check. Several concepts' own
    // display names differ from the XML's row label (e.g. Pulse rate's
    // concept is "Pulse", HbA1C's is "Glycated hemoglobin", Fasting blood
    // sugar's is "Serum glucose", Tobacco's "Current" answer displays as
    // "Currently", Alcohol's "Stopped" answer displays as "In the past",
    // "19-24.9" (BMI) displays as "Normal", Foot check's "Neuropathy/PVD"
    // concept is "Neuropathy and Peripheral Vascular Disease", "Deformities"
    // is "Deformity of foot", "Ulcers" is "Foot ulcer or infection",
    // "Hospitalized since last visit?" is "Patient hospitalized since last
    // visit", every medication row shares the single concept name
    // "Prescription construct") — confirmed live, not assumed.
    const obs = results[0].obs as Array<{ display: string }>;
    const hasAll = (display: string, patterns: RegExp[]) => patterns.every((p) => p.test(display));

    expect(obs.some((o) => /height \(cm\).*165/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /weight \(kg\).*70/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /body mass index, coded.*normal/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /systolic blood pressure.*130/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /diastolic blood pressure.*85/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /pulse.*78/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /glycated hemoglobin.*6/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /serum glucose.*110/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /blood sugar test type.*fasting/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /smoking history.*currently/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /history of alcohol use.*in the past/i.test(o.display))).toBeTruthy();
    expect(
      obs.some((o) => /fruits and vegetables consumed per day.*3/i.test(o.display)),
    ).toBeTruthy();
    expect(obs.some((o) => /days per week of moderate exercise.*4/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /cardiovascular risk score.*15/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /visual acuity \(text\).*20\/20/i.test(o.display))).toBeTruthy();

    // Foot check.
    expect(obs.some((o) => /neuropathy and peripheral vascular disease.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /deformity of foot.*no/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /foot ulcer or infection.*no/i.test(o.display))).toBeTruthy();

    expect(obs.some((o) => /patient hospitalized since last visit.*yes/i.test(o.display))).toBeTruthy();

    // Medications — each an independent "Prescription construct" obsgroup.
    // The concatenated child-obs order is NOT stable (confirmed live: e.g.
    // one save rendered "Prescription construct: Lisinopril, Milligram,
    // Oral, 30, Days, 10.0, Once a day (od)" while another rendered
    // "Prescription construct: 30, Three a day (tds), Oral, 25.0,
    // Hydralazine, Days, Milligram") — same non-stable-ordering behavior
    // already confirmed for CPT/IPT (ART pilot) and the diagnosis obsgroups
    // (NCD Other/this program's own header form), so each assertion checks
    // the drug name, dose, route, frequency, and duration as INDEPENDENT
    // substring checks rather than one ordered regex.
    expect(
      obs.some((o) =>
        hasAll(o.display, [/prescription construct/i, /metformin/i, /500/, /oral/i, /twice a day \(bd\)/i, /30/, /days/i]),
      ),
    ).toBeTruthy();
    // Diuretic — TWO drugs (HCTZ + FURP) are checked simultaneously in the
    // same repeat row (unlike every other row, which samples one), proving
    // the row's repeated obsgroups don't clobber each other — same
    // concurrency concern the ART pilot's own CPT/IPT precedent addressed
    // (mastercard-page.ts's Task 13 note 8). Both assertions below must
    // match DIFFERENT obs.
    expect(
      obs.some((o) =>
        hasAll(o.display, [
          /prescription construct/i,
          /hydrochlorothiazide/i,
          /25/,
          /oral/i,
          /once a day \(od\)/i,
          /30/,
          /days/i,
        ]),
      ),
    ).toBeTruthy();
    expect(
      obs.some((o) =>
        hasAll(o.display, [
          /prescription construct/i,
          /furosemide/i,
          /40/,
          /oral/i,
          /twice a day \(bd\)/i,
          /14/,
          /days/i,
        ]),
      ),
    ).toBeTruthy();
    expect(
      obs.some((o) => hasAll(o.display, [/prescription construct/i, /amlodipine/i, /5\.0/, /oral/i, /once a day \(od\)/i])),
    ).toBeTruthy();
    expect(
      obs.some((o) =>
        hasAll(o.display, [/prescription construct/i, /lisinopril/i, /10/, /oral/i, /once a day \(od\)/i]),
      ),
    ).toBeTruthy();
    expect(
      obs.some((o) =>
        hasAll(o.display, [/prescription construct/i, /propranolol/i, /40/, /oral/i, /twice a day \(bd\)/i]),
      ),
    ).toBeTruthy();
    expect(
      obs.some((o) => hasAll(o.display, [/prescription construct/i, /aspirin/i, /75/, /oral/i, /once a day \(od\)/i])),
    ).toBeTruthy();
    expect(
      obs.some((o) =>
        hasAll(o.display, [/prescription construct/i, /atorvastatin/i, /20/, /oral/i, /once a day \(od\)/i]),
      ),
    ).toBeTruthy();
    expect(
      obs.some((o) =>
        hasAll(o.display, [/prescription construct/i, /hydralazine/i, /25/, /oral/i, /three a day \(tds\)/i]),
      ),
    ).toBeTruthy();

    expect(
      obs.some((o) => new RegExp(`appointment date.*${appointmentDate}`, 'i').test(o.display)),
    ).toBeTruthy();
  });
});
