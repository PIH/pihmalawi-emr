import { test, expect } from '../../core';
import { MastercardFormPage, MentalHealthMastercardGatePage, fillMentalHealthHeaderForm } from '../../pages';
import { MENTAL_HEALTH_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('Mental Health header mastercard saves the entered data as a MENTAL_HEALTH_INITIAL encounter', async ({
  page,
  api,
  eligibleMentalHealthPatient,
}) => {
  const encounterDate = new Date().toISOString().slice(0, 10);

  const form = await MastercardFormPage.openCreateAtUrl(
    page,
    MentalHealthMastercardGatePage.buildCreateUrl(eligibleMentalHealthPatient.uuid, encounterDate),
  );

  await fillMentalHealthHeaderForm(form, encounterDate);

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${eligibleMentalHealthPatient.uuid}&encounterType=${MENTAL_HEALTH_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string }>;

  // Same shared Patient Phone/Guardian Name/Agrees to FUP concepts as every
  // prior pilot's own header form.
  expect(obs.some((o) => /telephone number.*991112222/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /guardian.*name.*grace banda/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /follow up agreement.*yes/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /schizophrenia/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /hallucination/i.test(o.display))).toBeTruthy();
});
