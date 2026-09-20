import { test, expect } from '../../core';
import { MastercardFormPage, ExposedChildMastercardGatePage, fillExposedChildHeaderForm } from '../../pages';
import { EXPOSED_CHILD_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('Exposed Child header mastercard saves the entered data as an EXPOSED_CHILD_INITIAL encounter', async ({
  page,
  api,
  eligibleExposedChildPatient,
}) => {
  const encounterDate = new Date().toISOString().slice(0, 10);

  const form = await MastercardFormPage.openCreateAtUrl(
    page,
    ExposedChildMastercardGatePage.buildCreateUrl(eligibleExposedChildPatient.uuid, encounterDate),
  );

  await fillExposedChildHeaderForm(form);

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${eligibleExposedChildPatient.uuid}&encounterType=${EXPOSED_CHILD_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string }>;

  expect(obs.some((o) => /guardian.*name.*grace banda/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /follow up agreement.*yes/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /relationship.*mother/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /accompagnateur.*991112222/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /birth.*weight.*3\.2/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /mother hiv status.*alive not on art/i.test(o.display))).toBeTruthy();
});
