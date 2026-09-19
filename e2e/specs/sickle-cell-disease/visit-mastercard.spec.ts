import { test, expect } from '../../core';
import {
  MastercardFormPage,
  SickleCellDiseaseMastercardGatePage,
  fillSickleCellDiseaseHeaderMinimum,
  fillSickleCellDiseaseVisitForm,
} from '../../pages';
import { SCD_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

// A visit mastercard is only meaningful once a header (SICKLE_CELL_DISEASE_INITIAL)
// encounter exists — same reasoning as every prior pilot's own
// visit-mastercard.spec.ts. This beforeEach creates that header first, on
// the same `page` the test itself receives, since reaching the visit form
// requires continuing on that same already-loaded page (`enterNewFlowsheet`),
// not a fresh `openCreateAtUrl` navigation. Uses `fillSickleCellDiseaseHeaderMinimum`
// (just Diagnosis Date, this form's ONLY required field) rather than the
// full `fillSickleCellDiseaseHeaderForm`, since all this beforeEach needs is
// *a* saved header encounter to continue from, not any particular content on
// it. header-mastercard.spec.ts still uses the full fill since it asserts on
// that form's own field values.
test.describe('Sickle Cell Disease visit mastercard', () => {
  test.beforeEach(async ({ page, eligibleSickleCellDiseasePatient }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);
    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      SickleCellDiseaseMastercardGatePage.buildCreateUrl(eligibleSickleCellDiseasePatient.uuid, encounterDate),
    );
    await fillSickleCellDiseaseHeaderMinimum(headerForm, encounterDate);
    await headerForm.save();
    await headerForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as SICKLE_CELL_DISEASE_FOLLOWUP', async ({
    page,
    api,
    eligibleSickleCellDiseasePatient,
  }) => {
    // Continues on the same `page` the beforeEach already navigated and
    // saved a header encounter on — see this file's own top comment for why
    // `openCreateAtUrl` can't be called again here.
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('Sickle Cell Disease Visit');

    const encounterDate = new Date().toISOString().slice(0, 10);
    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillSickleCellDiseaseVisitForm(visitForm, { encounterDate, appointmentDate });

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligibleSickleCellDiseasePatient.uuid}&encounterType=${SCD_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);

    const obs = results[0].obs as Array<{ display: string; comment?: string }>;

    // Every assertion below checks the ACTUAL rendered REST `display`
    // string, confirmed live by first saving this exact form and dumping
    // the real encounter's obs — never a presence-only check.
    const hasAll = (display: string, patterns: RegExp[]) => patterns.every((p) => p.test(display));

    expect(obs.some((o) => /height \(cm\).*120/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /weight \(kg\).*25/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /body mass index, measured.*17\.4/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /systolic blood pressure.*110/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /diastolic blood pressure.*70/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /pulse.*88/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /haemoglobin.*10/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /blood oxygen saturation.*97/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /temperature \(c\).*36\.8/i.test(o.display))).toBeTruthy();

    expect(obs.some((o) => /patient hospitalized since last visit.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /pain.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /currently.*taking antibiotics.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /medication side effects.*no/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /enlarged liver.*no/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /ascites.*no/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /lung exam findings.*no/i.test(o.display))).toBeTruthy();

    // Concept names actually saved for these rows now match their on-screen
    // labels' clinical intent.
    expect(obs.some((o) => /^jaundice.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /pink conjunctiva.*no/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /no presence of splenomegaly.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /are you in school.*yes/i.test(o.display))).toBeTruthy();
    // "Medication Rx" → real concept "Malaria" (thematically adjacent, not
    // counted as a mismatch).
    expect(obs.some((o) => /^malaria.*yes/i.test(o.display))).toBeTruthy();
    // "Fever" → real concept name is the TB red-flag-symptom construct.
    expect(
      obs.some((o) => /fevers, chills, night sweats, or productive cough.*no/i.test(o.display)),
    ).toBeTruthy();

    // 5 independent, single-drug "Prescription construct" obsgroups (not a
    // multi-drug repeat — all 5 filled, see verification note 0). Component
    // order is not consistent across rows (confirmed live), so each is
    // asserted via multiple independent substring checks on the SAME obs
    // rather than one fixed-order regex.
    expect(
      obs.some((o) =>
        hasAll(o.display, [/prescription construct/i, /sulfalene and pyramethamine/i, /500\.0/i, /once a day \(od\)/i]),
      ),
    ).toBeTruthy();
    expect(
      obs.some((o) => hasAll(o.display, [/prescription construct/i, /folic acid/i, /5\.0/i, /once a day \(od\)/i])),
    ).toBeTruthy();
    expect(
      obs.some((o) => hasAll(o.display, [/prescription construct/i, /hydroxyurea/i, /500\.0/i, /twice a day \(bd\)/i])),
    ).toBeTruthy();
    expect(
      obs.some((o) =>
        hasAll(o.display, [/prescription construct/i, /benzathine penicillin/i, /1\.2/i, /start immediately/i]),
      ),
    ).toBeTruthy();
    expect(
      obs.some((o) =>
        hasAll(o.display, [/prescription construct/i, /other/i, /ibuprofen/i, /200\.0/i, /three a day \(tds\)/i]),
      ),
    ).toBeTruthy();

    expect(obs.some((o) => new RegExp(`appointment date.*${appointmentDate}`, 'i').test(o.display))).toBeTruthy();
  });
});
