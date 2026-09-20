import { test, expect } from '../../core';
import { KaposisSarcomaMastercardGatePage, fillKsEvaluationForm } from '../../pages';
import { KS_EVALUATION_ENCOUNTER_TYPE_UUID } from '../../core/constants';

// kaposis-sarcoma-emastercard.xml (the header) has no <obs> fields and no
// <submit/> at all — there's nothing to fill/save on it independently, so
// there's no separate "header spec" for Kaposi's Sarcoma. requireEncounter=
// false on the create URL makes both flowsheet forms immediately reachable
// with no header encounter needed first (confirmed live).
test('KS Evaluation Form saves as a PATIENT EVALUATION encounter', async ({
  page,
  api,
  kaposisSarcomaPatient,
}) => {
  const form = await KaposisSarcomaMastercardGatePage.open(page, kaposisSarcomaPatient.uuid);

  await form.enterNewFlowsheet('KS Evaluation Form');
  await fillKsEvaluationForm(form);

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${kaposisSarcomaPatient.uuid}&encounterType=${KS_EVALUATION_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string }>;

  expect(obs.some((o) => /weight.*65/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /height.*170/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /diagnosis.*clinical/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /pain.*4/i.test(o.display))).toBeTruthy();
});
