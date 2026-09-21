import { test, expect } from '../../core';
import {
  MastercardFormPage,
  NutritionPdcMastercardGatePage,
  fillNutritionPdcHeaderMinimum,
  fillNutritionPdcVisitForm,
} from '../../pages';
import { NUTRITION_PDC_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test.describe('Nutrition PDC visit mastercard', () => {
  test.beforeEach(async ({ page, eligibleNutritionPatient }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);
    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      NutritionPdcMastercardGatePage.buildCreateUrl(eligibleNutritionPatient.uuid, encounterDate),
    );
    await fillNutritionPdcHeaderMinimum(headerForm);
    await headerForm.save();
    await headerForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as NUTRITION_PDC_FOLLOWUP', async ({
    page,
    api,
    eligibleNutritionPatient,
  }) => {
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('Nutrition PDC Visit');

    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillNutritionPdcVisitForm(visitForm, { appointmentDate });

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligibleNutritionPatient.uuid}&encounterType=${NUTRITION_PDC_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);

    const obs = results[0].obs as Array<{ display: string }>;

    expect(obs.some((o) => /height.*90/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /weight.*14/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /circumference.*15/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /lactogen tins.*2/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /name of data collector.*some ration signature/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /comment.*some comments/i.test(o.display))).toBeTruthy();
  });
});
