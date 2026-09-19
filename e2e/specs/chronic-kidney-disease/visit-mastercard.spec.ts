import { test, expect } from '../../core';
import {
  MastercardFormPage,
  ChronicKidneyDiseaseMastercardGatePage,
  fillChronicKidneyDiseaseHeaderMinimum,
  fillChronicKidneyDiseaseVisitForm,
} from '../../pages';
import { CKD_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

// A visit mastercard is only meaningful once a header (CKD_INITIAL)
// encounter exists — same reasoning as every prior pilot's own
// visit-mastercard.spec.ts (see MastercardFormPage's ART verification note
// on this). This beforeEach creates that header first, on the same `page`
// the test itself receives, since reaching the visit form requires
// continuing on that same already-loaded page (`enterNewFlowsheet`), not a
// fresh `openCreateAtUrl` navigation. Uses `fillChronicKidneyDiseaseHeaderMinimum`
// (just "Agrees to FUP" + one diagnosis checkbox) rather than the full
// `fillChronicKidneyDiseaseHeaderForm`, since all this beforeEach needs is
// *a* saved header encounter to continue from, not any particular content
// on it. header-mastercard.spec.ts still uses the full fill since it
// asserts on that form's own field values.
test.describe('Chronic Kidney Disease visit mastercard', () => {
  test.beforeEach(async ({ page, eligibleChronicKidneyDiseasePatient }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);
    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      ChronicKidneyDiseaseMastercardGatePage.buildCreateUrl(eligibleChronicKidneyDiseasePatient.uuid, encounterDate),
    );
    await fillChronicKidneyDiseaseHeaderMinimum(headerForm);
    await headerForm.save();
    await headerForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as CKD_FOLLOWUP', async ({
    page,
    api,
    eligibleChronicKidneyDiseasePatient,
  }) => {
    // Continues on the same `page` the beforeEach already navigated and
    // saved a header encounter on — see this file's own top comment for why
    // `openCreateAtUrl` can't be called again here.
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('Chronic Kidney Disease Visit');

    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillChronicKidneyDiseaseVisitForm(visitForm, { appointmentDate });

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligibleChronicKidneyDiseasePatient.uuid}&encounterType=${CKD_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);

    const obs = results[0].obs as Array<{ display: string; comment?: string }>;

    // Every assertion below checks the ACTUAL rendered REST `display`
    // string, confirmed live by first saving this exact form and dumping
    // the real encounter's obs — never a presence-only check.
    expect(obs.some((o) => /height \(cm\).*165/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /weight \(kg\).*70/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /weight change.*lost 1kg since last visit/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /systolic blood pressure.*130/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /diastolic blood pressure.*85/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /glomerular filtration rate.*55/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /pulse.*78/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /creatinine.*1\.4/i.test(o.display))).toBeTruthy();

    expect(obs.some((o) => /urine protein.*trace/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /patient confused.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /patient has fatigue.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /patient has nausea.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /patient has anorexia.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /patient has pruritus.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /conjunctiva.*pink conjunctiva/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /patient has ascites.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /oedema.*trace/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /review of symptoms other.*mild pedal oedema noted/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /ckd stage.*ckd stage 3/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /nonsteroidal anti-inflammatory drug use.*yes/i.test(o.display))).toBeTruthy();
    // "Stopped" (avoiding the leading-space " Never"/" Stopped" quirk on the
    // 2nd/3rd options — see fillChronicKidneyDiseaseVisitForm's own
    // verification note 4) displays under a differently-worded concept name
    // than the XML's own "Tobacco use" label — confirmed live.
    expect(obs.some((o) => /smoking history.*in the past/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /history of alcohol use.*never/i.test(o.display))).toBeTruthy();

    // Medications — 5 independent "Prescription construct" obsgroups (4
    // repeated-drug classes + the non-coded "Other" row), confirmed live
    // with no cross-contamination between them (each has its own distinct
    // set of substrings). The construct's own component order is NOT
    // consistent across rows (confirmed live), so each is asserted via
    // multiple independent substring checks on the SAME obs rather than one
    // fixed-order regex.
    const hasAll = (display: string, patterns: RegExp[]) => patterns.every((p) => p.test(display));
    expect(
      obs.some((o) =>
        hasAll(o.display, [/prescription construct/i, /hydrochlorothiazide/i, /25\.0/i, /once a day \(od\)/i]),
      ),
    ).toBeTruthy();
    expect(
      obs.some((o) =>
        hasAll(o.display, [/prescription construct/i, /enalapril/i, /5\.0/i, /twice a day \(bd\)/i]),
      ),
    ).toBeTruthy();
    expect(
      obs.some((o) => hasAll(o.display, [/prescription construct/i, /atenolol/i, /50\.0/i, /once a day \(od\)/i])),
    ).toBeTruthy();
    expect(
      obs.some((o) => hasAll(o.display, [/prescription construct/i, /amlodipine/i, /10\.0/i, /once a day \(od\)/i])),
    ).toBeTruthy();
    expect(
      obs.some((o) =>
        hasAll(o.display, [/prescription construct/i, /other/i, /sodium bicarbonate/i, /500\.0/i, /three a day \(tds\)/i]),
      ),
    ).toBeTruthy();

    expect(obs.some((o) => /took medications today.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /diet recommendations.*low sodium/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => new RegExp(`appointment date.*${appointmentDate}`, 'i').test(o.display))).toBeTruthy();
  });
});
