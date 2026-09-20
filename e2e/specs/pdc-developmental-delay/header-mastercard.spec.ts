import { test, expect } from '../../core';
import {
  MastercardFormPage,
  PdcMastercardGatePage,
  fillGenericPdcHeaderWithDiagnosis,
  PdcDevelopmentalDelayMastercardGatePage,
  fillPdcDevelopmentalDelayHeaderForm,
} from '../../pages';
import { PDC_DEVELOPMENTAL_DELAY_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('PDC Developmental Delay header mastercard saves the entered data as a PDC_DEVELOPMENTAL_DELAY_INITIAL encounter', async ({
  page,
  api,
  eligiblePdcPatient,
}) => {
  const encounterDate = new Date().toISOString().slice(0, 10);

  // Prerequisite: the generic PDC eMastercard must record a "Diagnosis" obs
  // matching Developmental Delay before this variant's own link is gated
  // open — see pdc-mastercard-page.ts's top comment.
  const genericForm = await MastercardFormPage.openCreateAtUrl(
    page,
    PdcMastercardGatePage.buildCreateUrl(eligiblePdcPatient.uuid, encounterDate),
  );
  await fillGenericPdcHeaderWithDiagnosis(genericForm, 'Developmental Delay');
  await genericForm.save();
  await genericForm.expectSaveSuccess();

  const form = await MastercardFormPage.openCreateAtUrl(
    page,
    PdcDevelopmentalDelayMastercardGatePage.buildCreateUrl(eligiblePdcPatient.uuid, encounterDate),
  );
  await fillPdcDevelopmentalDelayHeaderForm(form, encounterDate);

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${eligiblePdcPatient.uuid}&encounterType=${PDC_DEVELOPMENTAL_DELAY_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string }>;
  expect(obs.some((o) => /telephone number.*991112222/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /guardian.*name.*grace banda/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /follow up agreement.*yes/i.test(o.display))).toBeTruthy();
});
