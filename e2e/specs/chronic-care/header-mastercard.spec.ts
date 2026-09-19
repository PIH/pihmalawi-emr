import { test, expect } from '../../core';
import { MastercardFormPage, ChronicCareMastercardGatePage, fillChronicCareHeaderForm } from '../../pages';
import { CHRONIC_CARE_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('Chronic Care header mastercard saves the entered data as a CHRONIC_CARE_INITIAL encounter', async ({
  page,
  api,
  eligibleChronicCarePatient,
}) => {
  const encounterDate = new Date().toISOString().slice(0, 10);

  const form = await MastercardFormPage.openCreateAtUrl(
    page,
    ChronicCareMastercardGatePage.buildCreateUrl(eligibleChronicCarePatient.uuid, encounterDate),
  );

  await fillChronicCareHeaderForm(form, encounterDate);

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${eligibleChronicCarePatient.uuid}&encounterType=${CHRONIC_CARE_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string }>;

  expect(obs.some((o) => /chronic care diagnosis.*cirrhosis/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /chronic care diagnosis.*chronic kidney disease/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /other diagnosis.*some other diagnosis/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /roof material.*sheet metal/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /on art.*true/i.test(o.display))).toBeTruthy();
});
