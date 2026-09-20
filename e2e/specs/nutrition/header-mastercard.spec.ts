import { test, expect } from '../../core';
import { MastercardFormPage, NutritionMastercardGatePage, fillNutritionHeaderForm } from '../../pages';
import { NUTRITION_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('Nutrition header mastercard saves the entered data as a NUTRITION_INITIAL encounter', async ({
  page,
  api,
  eligibleNutritionPatient,
}) => {
  const encounterDate = new Date().toISOString().slice(0, 10);

  const form = await MastercardFormPage.openCreateAtUrl(
    page,
    NutritionMastercardGatePage.buildCreateUrl(eligibleNutritionPatient.uuid, encounterDate),
  );

  await fillNutritionHeaderForm(form, encounterDate);

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${eligibleNutritionPatient.uuid}&encounterType=${NUTRITION_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string }>;

  expect(obs.some((o) => /telephone number.*991112222/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /relation.*mother/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /follow up agreement.*yes/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /ncd/i.test(o.display))).toBeTruthy();
  // The "Malnutrition" checkbox on this form is mapped to the SAME answer
  // concept ($enrolledInPdc) as "Needs Social Support (POSER)" — confirmed
  // live it persists/displays as "Enrolled in PDC", not anything
  // malnutrition-related. Likely a copy-paste content bug in
  // nutrition-emastercard.xml (worth a follow-up ticket), asserting the
  // actual real behavior here, not the UI label.
  expect(obs.some((o) => /reason enrolled in food program.*enrolled in pdc/i.test(o.display))).toBeTruthy();
});
