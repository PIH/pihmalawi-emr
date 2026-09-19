import { test, expect } from '../../core';
import { MastercardFormPage, PalliativeCareMastercardGatePage, fillPalliativeCareHeaderForm } from '../../pages';
import { PALLIATIVE_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('Palliative Care header mastercard saves the entered data as a PALLIATIVE_INITIAL encounter', async ({
  page,
  api,
  eligiblePalliativeCarePatient,
}) => {
  const encounterDate = new Date().toISOString().slice(0, 10);

  const form = await MastercardFormPage.openCreateAtUrl(
    page,
    PalliativeCareMastercardGatePage.buildCreateUrl(eligiblePalliativeCarePatient.uuid, encounterDate),
  );

  await fillPalliativeCareHeaderForm(form, encounterDate);

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${eligiblePalliativeCarePatient.uuid}&encounterType=${PALLIATIVE_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string }>;

  expect(obs.some((o) => /telephone number.*991112222/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /guardian.*name.*grace banda/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /follow up agreement.*yes/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /cancer/i.test(o.display))).toBeTruthy();
});
