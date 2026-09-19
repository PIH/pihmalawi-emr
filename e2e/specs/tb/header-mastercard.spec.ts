import { test, expect } from '../../core';
import { MastercardFormPage, TbMastercardGatePage, fillTbHeaderForm } from '../../pages';
import { TB_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('TB header mastercard saves the entered data as a TB_INITIAL encounter', async ({
  page,
  api,
  eligibleTbPatient,
}) => {
  const encounterDate = new Date().toISOString().slice(0, 10);

  const form = await MastercardFormPage.openCreateAtUrl(
    page,
    TbMastercardGatePage.buildCreateUrl(eligibleTbPatient.uuid, encounterDate),
  );

  await fillTbHeaderForm(form, encounterDate);

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${eligibleTbPatient.uuid}&encounterType=${TB_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string }>;

  // Patient Phone/Guardian Name/Agrees to FUP share the exact same concepts
  // as chronic-lung-disease-emastercard.xml's own fields (same macro uuids)
  // — reusing that pilot's own confirmed display names.
  expect(obs.some((o) => /telephone number.*991112222/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /guardian.*name.*grace banda/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /follow up agreement.*yes/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /art number.*12345/i.test(o.display))).toBeTruthy();
});
