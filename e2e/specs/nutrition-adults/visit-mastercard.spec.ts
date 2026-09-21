import { test, expect } from '../../core';
import {
  MastercardFormPage,
  NutritionAdultsMastercardGatePage,
  fillNutritionAdultsHeaderMinimum,
  fillNutritionAdultsVisitForm,
} from '../../pages';
import { NUTRITION_ADULTS_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test.describe('Nutrition Adults visit mastercard', () => {
  test.beforeEach(async ({ page, eligibleNutritionPatient }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);
    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      NutritionAdultsMastercardGatePage.buildCreateUrl(eligibleNutritionPatient.uuid, encounterDate),
    );
    await fillNutritionAdultsHeaderMinimum(headerForm);
    await headerForm.save();
    await headerForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as NUTRITION_ADULTS_FOLLOWUP', async ({
    page,
    api,
    eligibleNutritionPatient,
  }) => {
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('Nutrition Adult Visit');

    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillNutritionAdultsVisitForm(visitForm, { appointmentDate });

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligibleNutritionPatient.uuid}&encounterType=${NUTRITION_ADULTS_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);

    const obs = results[0].obs as Array<{ display: string }>;

    expect(obs.some((o) => /height.*160/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /weight.*55/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /body mass index.*22/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /likuni.*2/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /name of data collector.*some ration signature/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /comment.*some comments/i.test(o.display))).toBeTruthy();
  });
});
