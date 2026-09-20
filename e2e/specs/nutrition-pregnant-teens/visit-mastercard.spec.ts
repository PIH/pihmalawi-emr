import { test, expect } from '../../core';
import {
  MastercardFormPage,
  NutritionPregnantTeensMastercardGatePage,
  fillNutritionPregnantTeensHeaderMinimum,
  fillNutritionPregnantTeensVisitForm,
} from '../../pages';
import { NUTRITION_PREGNANT_TEENS_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test.describe('Nutrition Pregnant Teens visit mastercard', () => {
  test.beforeEach(async ({ page, eligibleNutritionPatient }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);
    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      NutritionPregnantTeensMastercardGatePage.buildCreateUrl(eligibleNutritionPatient.uuid, encounterDate),
    );
    await fillNutritionPregnantTeensHeaderMinimum(headerForm);
    await headerForm.save();
    await headerForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as NUTRITION_PREGNANT_TEENS_FOLLOWUP', async ({
    page,
    api,
    eligibleNutritionPatient,
  }) => {
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('Nutrition Pregnant Teens Visit');

    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillNutritionPregnantTeensVisitForm(visitForm, { appointmentDate });

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligibleNutritionPatient.uuid}&encounterType=${NUTRITION_PREGNANT_TEENS_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);

    const obs = results[0].obs as Array<{ display: string }>;

    expect(obs.some((o) => /height.*155/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /weight.*48/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /circumference.*22/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /oil.*1/i.test(o.display))).toBeTruthy();
    // Maize/Beans are children of the same $typeOfFeedSet obsgroup — same
    // shared-concept display quirk as the generic Nutrition pilot.
    const feedSetObs = obs.filter((o) => /type of feed set/i.test(o.display));
    expect(feedSetObs.some((o) => /5\.0/.test(o.display))).toBeTruthy(); // Maize (Kgs)
    expect(feedSetObs.some((o) => /3\.0/.test(o.display))).toBeTruthy(); // Beans (Kgs)
    // "Ration (Warehouse signature)" persists under its underlying concept's
    // own name, "Given name" — a shared/reused concept, not a test bug.
    expect(obs.some((o) => /given name.*some ration signature/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /comment.*some comments/i.test(o.display))).toBeTruthy();
  });
});
