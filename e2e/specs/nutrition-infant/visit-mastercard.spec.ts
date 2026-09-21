import { test, expect } from '../../core';
import {
  MastercardFormPage,
  NutritionInfantMastercardGatePage,
  fillNutritionInfantHeaderMinimum,
  fillNutritionInfantVisitForm,
} from '../../pages';
import { NUTRITION_INFANT_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test.describe('Nutrition Infant visit mastercard', () => {
  test.beforeEach(async ({ page, eligibleNutritionPatient }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);
    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      NutritionInfantMastercardGatePage.buildCreateUrl(eligibleNutritionPatient.uuid, encounterDate),
    );
    await fillNutritionInfantHeaderMinimum(headerForm);
    await headerForm.save();
    await headerForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as NUTRITION_INFANT_FOLLOWUP', async ({
    page,
    api,
    eligibleNutritionPatient,
  }) => {
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('Nutrition Infant Visit');

    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillNutritionInfantVisitForm(visitForm, { appointmentDate });

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligibleNutritionPatient.uuid}&encounterType=${NUTRITION_INFANT_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);

    const obs = results[0].obs as Array<{ display: string }>;

    expect(obs.some((o) => /height.*60/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /weight.*7/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /circumference.*13/i.test(o.display))).toBeTruthy();
    // Lactogen (Tins) persists under its underlying concept's own name,
    // "Type of Feed Set" — same shared-concept quirk as the generic
    // Nutrition pilot, not a test bug.
    expect(obs.some((o) => /type of feed set.*2/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /name of data collector.*some ration signature/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /comment.*some comments/i.test(o.display))).toBeTruthy();
  });
});
