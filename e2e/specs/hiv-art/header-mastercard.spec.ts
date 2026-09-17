import { test, expect } from '../../core';
import { MastercardFormPage } from '../../pages';
import { ART_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('ART header mastercard saves the entered data as an ART_INITIAL encounter', async ({
  page,
  api,
  eligibleHivArtPatient,
}) => {
  const encounterDate = new Date().toISOString().slice(0, 10);
  const form = await MastercardFormPage.openCreate(page, eligibleHivArtPatient.uuid, encounterDate);

  // Labels below are the ACTUAL rendered text in art-emastercard.xml's
  // header form, confirmed live against a running instance — not the
  // brief's placeholder guesses. The design doc's "Patient agrees to
  // follow-up" concept renders as "Agrees to FUP", and WHO Stage's options
  // render as bare "1"/"2"/"3"/"4", not "Stage 1" etc.
  await form.selectRadio('Agrees to FUP', 'Y');
  await form.selectRadio('WHO Stage', '1');
  await form.fillField('Height', '165');
  await form.fillField('Weight', '60');
  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${eligibleHivArtPatient.uuid}&encounterType=${ART_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string }>;
  expect(obs.some((o) => /165/.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /60/.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /follow up agreement.*yes/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /who stage/i.test(o.display))).toBeTruthy();
});
