import { test, expect } from '../../core';
import {
  MastercardFormPage,
  CardiacAndVascularDiseaseMastercardGatePage,
  fillCardiacAndVascularDiseaseHeaderMinimum,
  fillCardiacAndVascularDiseaseVisitForm,
} from '../../pages';
import { CHF_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

// A visit mastercard is only meaningful once a header (CHF_INITIAL)
// encounter exists — same reasoning as every prior pilot's own
// visit-mastercard.spec.ts (see MastercardFormPage's ART verification
// note on this). This beforeEach creates that header first, on the same
// `page` the test itself receives, since reaching the visit form requires
// continuing on that same already-loaded page (`enterNewFlowsheet`), not a
// fresh `openCreateAtUrl` navigation. Uses
// `fillCardiacAndVascularDiseaseHeaderMinimum` (just "Agrees to FUP" + one
// diagnosis checkbox) rather than the full
// `fillCardiacAndVascularDiseaseHeaderForm`, since all this beforeEach needs
// is *a* saved header encounter to continue from, not any particular
// content on it. header-mastercard.spec.ts still uses the full fill since
// it asserts on that form's own field values.
test.describe('Cardiac and Vascular Disease visit mastercard', () => {
  test.beforeEach(async ({ page, eligibleCardiacAndVascularDiseasePatient }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);
    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      CardiacAndVascularDiseaseMastercardGatePage.buildCreateUrl(
        eligibleCardiacAndVascularDiseasePatient.uuid,
        encounterDate,
      ),
    );
    await fillCardiacAndVascularDiseaseHeaderMinimum(headerForm);
    await headerForm.save();
    await headerForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as CHF_FOLLOWUP', async ({
    page,
    api,
    eligibleCardiacAndVascularDiseasePatient,
  }) => {
    // Continues on the same `page` the beforeEach already navigated and
    // saved a header encounter on — see this file's own top comment for why
    // `openCreateAtUrl` can't be called again here.
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('Cardiac and Vascular Disease Visit');

    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillCardiacAndVascularDiseaseVisitForm(visitForm, { appointmentDate });

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligibleCardiacAndVascularDiseasePatient.uuid}&encounterType=${CHF_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);

    // Visit Location is the encounter's own `location` attribute, not an
    // obs — same as every prior pilot's visit forms.
    expect(results[0].location?.display).toMatch(/neno district hospital/i);

    const obs = results[0].obs as Array<{ display: string }>;
    const hasAll = (display: string, patterns: RegExp[]) => patterns.every((p) => p.test(display));

    // Every assertion below checks the ACTUAL rendered REST `display`
    // string, confirmed live by first saving this exact form and dumping
    // the real encounter's obs (per docs/e2e-adding-a-program-playbook.md's
    // method) — never a presence-only check.
    expect(obs.some((o) => /height \(cm\).*165/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /weight \(kg\).*70/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /weight change.*lost 2kg since last visit/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /systolic blood pressure.*130/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /diastolic blood pressure.*85/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /pulse.*78/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /oxygen saturation.*97/i.test(o.display))).toBeTruthy();

    // Several of these concepts' own REST display names differ substantially
    // from the XML's row label/answerLabel, confirmed live: Orthopnea's own
    // answer displays as "Raised" (not "Increase"), Dry cough's "Same" as
    // "About the same", Oedema's "LE" as "Lower extremities", JVP Elevated's
    // concept name is "Jugular venous pressure elevated", Volume status's
    // concept name is "Patients fluid management" and "Euvol" displays as
    // "Euvolemic", NYHA stage's "II" displays as "Nyha class 2" (Arabic
    // numeral, not roman), Alcohol's "Stopped" displays as "In the past",
    // Tobacco's own concept name is "Smoking history".
    expect(obs.some((o) => /level of orthopnea.*raised/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /dyspnea on exertion.*lower/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /level of dry cough.*about the same/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /level of fatigue.*none/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /hospitalized.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /oedema.*lower extremities/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /bibasilar crackles.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /jugular venous pressure elevated.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /patients fluid management.*euvolemic/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /nyha class 2/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /history of alcohol use.*in the past/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /smoking history.*never/i.test(o.display))).toBeTruthy();
    // Two DIFFERENT obs both toggle Yes here (this pilot's own "Salt or
    // Fluid restricted" row on the visit-edit-table AND "Diet - Salt or
    // Fluid" further down) — each asserted against its own, distinct
    // concept display name so this doesn't silently pass against the wrong
    // field.
    expect(obs.some((o) => /salt or fluid restricted.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /low salt diet recommended.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /depression.*anxiety.*yes/i.test(o.display))).toBeTruthy();

    // Medications — each an independent "Prescription construct" obsgroup.
    // The concatenated child-obs order is NOT stable (same non-stable
    // ordering already confirmed for CPT/IPT (ART pilot), the diagnosis
    // obsgroups, and Hypertension and Diabetes's/Chronic Lung Disease's own
    // medication rows), so each assertion checks the drug name, dose,
    // route, frequency, and duration as INDEPENDENT substring checks rather
    // than one ordered regex.
    expect(
      obs.some((o) =>
        hasAll(o.display, [/prescription construct/i, /aspirin/i, /1/, /tablet/i, /oral/i, /once a day/i, /30/, /days/i]),
      ),
    ).toBeTruthy();
    expect(
      obs.some((o) =>
        hasAll(o.display, [
          /prescription construct/i,
          /hydrochlorothiazide/i,
          /25/,
          /milligram/i,
          /oral/i,
          /once a day/i,
          /30/,
          /days/i,
        ]),
      ),
    ).toBeTruthy();
    expect(
      obs.some((o) =>
        hasAll(o.display, [
          /prescription construct/i,
          /enalapril/i,
          /5/,
          /milligram/i,
          /oral/i,
          /twice a day/i,
          /30/,
          /days/i,
        ]),
      ),
    ).toBeTruthy();
    expect(
      obs.some((o) =>
        hasAll(o.display, [
          /prescription construct/i,
          /atenolol/i,
          /50/,
          /milligram/i,
          /oral/i,
          /once a day/i,
          /30/,
          /days/i,
        ]),
      ),
    ).toBeTruthy();
    expect(
      obs.some((o) =>
        hasAll(o.display, [
          /prescription construct/i,
          /amlodipine/i,
          /10/,
          /milligram/i,
          /oral/i,
          /once a day/i,
          /30/,
          /days/i,
        ]),
      ),
    ).toBeTruthy();
    expect(
      obs.some((o) =>
        hasAll(o.display, [
          /prescription construct/i,
          /atorvastatin/i,
          /20/,
          /milligram/i,
          /oral/i,
          /once a day/i,
          /30/,
          /days/i,
        ]),
      ),
    ).toBeTruthy();
    // Benzathine PCN — checkbox only (dosing sub-fields skipped, see
    // cardiac-and-vascular-disease-mastercard-page.ts's own verification
    // note 6 for the duplicate-id reason), so only the drug name half of
    // the obsgroup is asserted.
    expect(obs.some((o) => /prescription construct/i.test(o.display) && /benzathine/i.test(o.display))).toBeTruthy();
    // Other medications (non-coded) — confirmed live this obsgroup's own
    // "drug name" half displays as plain "Other" (not "Other non-coded",
    // unlike the header form's own non-coded diagnosis answer).
    expect(
      obs.some((o) =>
        hasAll(o.display, [
          /prescription construct/i,
          /other/i,
          /digoxin/i,
          /3/,
          /milliliter/i,
          /intravenous/i,
          /on an as needed basis/i,
          /5/,
          /days/i,
        ]),
      ),
    ).toBeTruthy();

    expect(obs.some((o) => /took medication.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /mental health referral.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /palliative.*referral.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /follow up agreement.*yes/i.test(o.display))).toBeTruthy();
    expect(
      obs.some((o) => new RegExp(`appointment date.*${appointmentDate}`, 'i').test(o.display)),
    ).toBeTruthy();
  });
});
