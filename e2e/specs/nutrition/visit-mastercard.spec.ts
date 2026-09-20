import { test, expect } from '../../core';
import {
  MastercardFormPage,
  NutritionMastercardGatePage,
  fillNutritionHeaderMinimum,
  fillNutritionVisitForm,
} from '../../pages';
import { NUTRITION_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test.describe('Nutrition visit mastercard', () => {
  test.beforeEach(async ({ page, eligibleNutritionPatient }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);
    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      NutritionMastercardGatePage.buildCreateUrl(eligibleNutritionPatient.uuid, encounterDate),
    );
    await fillNutritionHeaderMinimum(headerForm);
    await headerForm.save();
    await headerForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as NUTRITION_FOLLOWUP', async ({
    page,
    api,
    eligibleNutritionPatient,
  }) => {
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('Nutrition Visit');

    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillNutritionVisitForm(visitForm, { appointmentDate });

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligibleNutritionPatient.uuid}&encounterType=${NUTRITION_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);

    const obs = results[0].obs as Array<{ display: string }>;

    expect(obs.some((o) => /height.*160/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /weight.*55/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /circumference.*25/i.test(o.display))).toBeTruthy();

    // Lactogen/Oil/Maize/Beans/Likuni Phala are all children of the same
    // $typeOfFeedSet obsgroup — confirmed live they all persist/display under
    // the generic "Type of Feed Set" question text rather than their own
    // distinct names (likely a shared-concept content quirk, not a test
    // bug), so distinguish them by value instead of by name.
    const feedSetObs = obs.filter((o) => /type of feed set/i.test(o.display));
    expect(feedSetObs.some((o) => /:\s*2$/.test(o.display))).toBeTruthy(); // Lactogen (Tins)
    expect(feedSetObs.some((o) => /5\.0/.test(o.display))).toBeTruthy(); // Maize (Kgs)
    expect(feedSetObs.some((o) => /3\.0/.test(o.display))).toBeTruthy(); // Beans (Kgs)
    expect(feedSetObs.filter((o) => /yes/i.test(o.display)).length).toBe(2); // Oil + Likuni Phala
  });
});
