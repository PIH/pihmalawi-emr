import { test, expect } from '../../core';
import {
  MastercardFormPage,
  ChronicLungDiseaseMastercardGatePage,
  fillChronicLungDiseaseHeaderMinimum,
  fillChronicLungDiseaseVisitForm,
} from '../../pages';
import { ASTHMA_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

// A visit mastercard is only meaningful once a header (ASTHMA_INITIAL)
// encounter exists — same reasoning as the ART/NCD Other/Hypertension and
// Diabetes pilots' own visit-mastercard.spec.ts files (see
// MastercardFormPage's ART verification note on this). This beforeEach
// creates that header first, on the same `page` the test itself receives,
// since reaching the visit form requires continuing on that same
// already-loaded page (`enterNewFlowsheet`), not a fresh `openCreateAtUrl`
// navigation. Uses `fillChronicLungDiseaseHeaderMinimum` (just "Agrees to
// FUP" + one diagnosis checkbox) rather than the full
// `fillChronicLungDiseaseHeaderForm`, since all this beforeEach needs is *a*
// saved header encounter to continue from, not any particular content on
// it. header-mastercard.spec.ts still uses the full fill since it asserts
// on that form's own field values.
test.describe('Chronic Lung Disease visit mastercard', () => {
  test.beforeEach(async ({ page, eligibleChronicLungDiseasePatient }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);
    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      ChronicLungDiseaseMastercardGatePage.buildCreateUrl(eligibleChronicLungDiseasePatient.uuid, encounterDate),
    );
    await fillChronicLungDiseaseHeaderMinimum(headerForm);
    await headerForm.save();
    await headerForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as ASTHMA_FOLLOWUP', async ({
    page,
    api,
    eligibleChronicLungDiseasePatient,
  }) => {
    // Continues on the same `page` the beforeEach already navigated and
    // saved a header encounter on — see this file's own top comment for why
    // `openCreateAtUrl` can't be called again here.
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('Chronic Lung Disease Visit');

    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillChronicLungDiseaseVisitForm(visitForm, { appointmentDate });

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligibleChronicLungDiseasePatient.uuid}&encounterType=${ASTHMA_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);

    // Visit Location is the encounter's own `location` attribute, not an
    // obs — same as every prior pilot's visit forms.
    expect(results[0].location?.display).toMatch(/neno district hospital/i);

    // Every assertion below checks the ACTUAL rendered REST `display`
    // string, confirmed live by first saving this exact form (via a
    // standalone Playwright verification script per
    // docs/e2e-adding-a-program-playbook.md's method) and dumping the real
    // encounter's obs — never a presence-only check. Several concepts' own
    // display names differ from the XML's row label (e.g. "Planned Visit?"
    // saves as a raw boolean "Scheduled visit: true" rather than "Yes",
    // Day/Night symptoms' concepts are "Daytime symptom frequency"/
    // "Nighttime symptom frequency", the 4 Beta-agonist fields are "Inhaler
    // use per day/week/month" and "Number of times inhaler is used in a
    // year", Steroid inhaler daily?'s concept is "Daily inhaled steroid
    // use", Smoking's is "Number of cigarettes smoked per day", Passive
    // smoking's is "Exposed to second hand smoke?", Indoor cooking's is
    // "Location of cooking" (and "Yes" selects Indoor, displaying as
    // "Indoors"), Exacerbation today?'s is "Asthma exacerbation today",
    // Asthma severity's is "Asthma classification", COPD's is "Chronic care
    // diagnosis", Other dx's is "Other diagnosis", Comments' is "Clinical
    // impression comments", every medication row shares the single concept
    // name "Prescription construct") — confirmed live, not assumed.
    const obs = results[0].obs as Array<{ display: string }>;
    const hasAll = (display: string, patterns: RegExp[]) => patterns.every((p) => p.test(display));

    expect(obs.some((o) => /scheduled visit.*true/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /height \(cm\).*160/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /weight \(kg\).*55/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /daytime symptom frequency.*2/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /nighttime symptom frequency.*1/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /inhaler use per day.*1/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /inhaler use per week.*2/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /inhaler use per month.*3/i.test(o.display))).toBeTruthy();
    expect(
      obs.some((o) => /number of times inhaler is used in a year.*4/i.test(o.display)),
    ).toBeTruthy();
    expect(obs.some((o) => /daily inhaled steroid use.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /number of cigarettes smoked per day.*0/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /exposed to second hand smoke\?.*no/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /location of cooking.*indoors/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /asthma exacerbation today.*no/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /asthma classification.*mild persistent/i.test(o.display))).toBeTruthy();
    expect(
      obs.some((o) => /chronic care diagnosis.*chronic obstructive pulmonary disease/i.test(o.display)),
    ).toBeTruthy();
    expect(obs.some((o) => /other diagnosis.*bronchiectasis/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /clinical impression comments.*some comments/i.test(o.display))).toBeTruthy();
    expect(
      obs.some((o) => new RegExp(`appointment date.*${appointmentDate}`, 'i').test(o.display)),
    ).toBeTruthy();

    // Medications — each an independent "Prescription construct" obsgroup.
    // The concatenated child-obs order is NOT stable (same non-stable
    // ordering already confirmed for CPT/IPT (ART pilot), the diagnosis
    // obsgroups, and Hypertension and Diabetes's own medication rows), so
    // each assertion checks the drug name, dose, route, frequency, and
    // duration as INDEPENDENT substring checks rather than one ordered
    // regex. All 4 rows (3 single-drug repeats + the "Other" non-coded row)
    // are asserted, confirming no cross-contamination between them.
    expect(
      obs.some((o) =>
        hasAll(o.display, [
          /prescription construct/i,
          /beta-agonists \(inhaled\)/i,
          /2/,
          /puff/i,
          /oral/i,
          /twice a day \(bd\)/i,
          /30/,
          /days/i,
        ]),
      ),
    ).toBeTruthy();
    expect(
      obs.some((o) =>
        hasAll(o.display, [
          /prescription construct/i,
          /inhaled steroid/i,
          /1/,
          /puff/i,
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
          /oral steroid/i,
          /5/,
          /milligram/i,
          /oral/i,
          /once a day \(od\)/i,
          /7/,
          /days/i,
        ]),
      ),
    ).toBeTruthy();
    expect(
      obs.some((o) =>
        hasAll(o.display, [
          /prescription construct/i,
          /nebulized saline/i,
          /3/,
          /milliliter/i,
          /intravenous/i,
          /on an as needed basis/i,
          /5/,
          /days/i,
        ]),
      ),
    ).toBeTruthy();
  });
});
