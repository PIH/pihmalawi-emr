import { test, expect } from '../../core';
import { KaposisSarcomaMastercardGatePage, fillKsChemotherapyForm } from '../../pages';
import { KS_CHEMOTHERAPY_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('KS Chemotherapy Form saves as a CHEMOTHERAPY encounter', async ({ page, api, kaposisSarcomaPatient }) => {
  const form = await KaposisSarcomaMastercardGatePage.open(page, kaposisSarcomaPatient.uuid);

  await form.enterNewFlowsheet('KS Chemotherapy Form');

  const nextAppointmentDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await fillKsChemotherapyForm(form, { nextAppointmentDate });

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${kaposisSarcomaPatient.uuid}&encounterType=${KS_CHEMOTHERAPY_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string }>;

  expect(obs.some((o) => /cycle number.*2/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /height.*170/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /weight.*65/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /vincristine.*1\.5/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /bleomycin.*10/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /paclitaxel.*90/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /appointment/i.test(o.display))).toBeTruthy();
});
