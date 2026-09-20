import { test, expect } from '../../core';
import { MastercardFormPage, PreArtMastercardGatePage, fillPreArtHeaderForm } from '../../pages';
import { PRE_ART_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('Pre-ART header mastercard saves the entered data as a PART_INITIAL encounter', async ({
  page,
  api,
  eligiblePreArtPatient,
}) => {
  const encounterDate = new Date().toISOString().slice(0, 10);

  const form = await MastercardFormPage.openCreateAtUrl(
    page,
    PreArtMastercardGatePage.buildCreateUrl(eligiblePreArtPatient.uuid, encounterDate),
  );

  await fillPreArtHeaderForm(form);

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${eligiblePreArtPatient.uuid}&encounterType=${PRE_ART_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string }>;

  expect(obs.some((o) => /guardian.*name.*grace banda/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /accompagnateur.*991112222/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /follow up agreement.*yes/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /relationship.*mother/i.test(o.display))).toBeTruthy();
});
