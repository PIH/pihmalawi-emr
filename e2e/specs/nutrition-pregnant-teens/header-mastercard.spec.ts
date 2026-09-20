import { test, expect } from '../../core';
import {
  MastercardFormPage,
  NutritionPregnantTeensMastercardGatePage,
  fillNutritionPregnantTeensHeaderForm,
} from '../../pages';
import { NUTRITION_PREGNANT_TEENS_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('Nutrition Pregnant Teens header mastercard saves the entered data as a NUTRITION_PREGNANT_TEENS_INITIAL encounter', async ({
  page,
  api,
  eligibleNutritionPatient,
}) => {
  const encounterDate = new Date().toISOString().slice(0, 10);

  const form = await MastercardFormPage.openCreateAtUrl(
    page,
    NutritionPregnantTeensMastercardGatePage.buildCreateUrl(eligibleNutritionPatient.uuid, encounterDate),
  );

  await fillNutritionPregnantTeensHeaderForm(form, encounterDate);

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${eligibleNutritionPatient.uuid}&encounterType=${NUTRITION_PREGNANT_TEENS_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string }>;

  expect(obs.some((o) => /telephone number.*991112222/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /guardian.*grace banda/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /relation.*mother/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /follow up agreement.*yes/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /ncd/i.test(o.display))).toBeTruthy();
});
