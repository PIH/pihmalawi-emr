import { test, expect } from '../../core';
import { MastercardFormPage, TraceMastercardGatePage } from '../../pages';
import { TRACE_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

// trace-mastercard.xml has no <obs> fields at all (see trace-mastercard-page.ts's
// top comment) — nothing to fill, just open and save.
test('Trace header mastercard saves as a TRACE_INITIAL encounter', async ({ page, api, tracePatient }) => {
  const encounterDate = new Date().toISOString().slice(0, 10);

  const form = await MastercardFormPage.openCreateAtUrl(
    page,
    TraceMastercardGatePage.buildCreateUrl(tracePatient.uuid, encounterDate),
  );

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${tracePatient.uuid}&encounterType=${TRACE_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);
});
