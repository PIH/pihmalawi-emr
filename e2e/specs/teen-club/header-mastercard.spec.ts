import { test, expect } from '../../core';
import { MastercardFormPage, TeenClubMastercardGatePage, fillTeenClubHeaderForm } from '../../pages';
import { TEEN_CLUB_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('Teen Club header mastercard saves the entered data as a TEEN_CLUB_INITIAL encounter', async ({
  page,
  api,
  eligibleTeenClubPatient,
}) => {
  const encounterDate = new Date().toISOString().slice(0, 10);

  const form = await MastercardFormPage.openCreateAtUrl(
    page,
    TeenClubMastercardGatePage.buildCreateUrl(eligibleTeenClubPatient.uuid, encounterDate),
  );

  await fillTeenClubHeaderForm(form, encounterDate);

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${eligibleTeenClubPatient.uuid}&encounterType=${TEEN_CLUB_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string }>;
  expect(obs.some((o) => /telephone number.*991112222/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /follow up agreement.*yes/i.test(o.display))).toBeTruthy();
});
