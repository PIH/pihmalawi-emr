import { test, expect } from '../../core';
import { MastercardFormPage, NutritionPdcMastercardGatePage, fillNutritionPdcHeaderForm } from '../../pages';
import { NUTRITION_PDC_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('Nutrition PDC header mastercard saves the entered data as a NUTRITION_PDC_INITIAL encounter', async ({
  page,
  api,
  eligibleNutritionPatient,
}) => {
  const encounterDate = new Date().toISOString().slice(0, 10);

  const form = await MastercardFormPage.openCreateAtUrl(
    page,
    NutritionPdcMastercardGatePage.buildCreateUrl(eligibleNutritionPatient.uuid, encounterDate),
  );

  await fillNutritionPdcHeaderForm(form, encounterDate);

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${eligibleNutritionPatient.uuid}&encounterType=${NUTRITION_PDC_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string }>;

  expect(obs.some((o) => /telephone number.*991112222/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /guardian.*grace banda/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /relation.*mother/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /follow up agreement.*yes/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /malnutrition/i.test(o.display))).toBeTruthy();
});
