import { test, expect } from '../../core';
import {
  MastercardFormPage,
  SickleCellDiseaseMastercardGatePage,
  fillSickleCellDiseaseHeaderForm,
} from '../../pages';
import { SCD_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('Sickle Cell Disease header mastercard saves the entered data as a SICKLE_CELL_DISEASE_INITIAL encounter', async ({
  page,
  api,
  eligibleSickleCellDiseasePatient,
}) => {
  const encounterDate = new Date().toISOString().slice(0, 10);

  const form = await MastercardFormPage.openCreateAtUrl(
    page,
    SickleCellDiseaseMastercardGatePage.buildCreateUrl(eligibleSickleCellDiseasePatient.uuid, encounterDate),
  );

  // Fills every editable field on sickle-cell-disease-emastercard.xml —
  // shared with visit-mastercard.spec.ts's beforeEach so that spec doesn't
  // need to duplicate this field list to reach a saved header encounter
  // (see fillSickleCellDiseaseHeaderForm's own doc comment).
  await fillSickleCellDiseaseHeaderForm(form, encounterDate);

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${eligibleSickleCellDiseasePatient.uuid}&encounterType=${SCD_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string; comment?: string }>;

  // Every assertion below checks the ACTUAL rendered REST `display` string,
  // confirmed live by first saving this exact form and dumping the real
  // encounter's obs (per docs/e2e-adding-a-program-playbook.md's method) —
  // never a presence-only check.
  const hasAll = (display: string, patterns: RegExp[]) => patterns.every((p) => p.test(display));
  const hasDate = new RegExp(encounterDate);

  expect(obs.some((o) => /follow up agreement.*yes/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => hasAll(o.display, [/transfer in date/i, hasDate]))).toBeTruthy();
  // Patient Phone's underlying concept ("Telephone number") is Numeric, so
  // the leading zero in "0991112222" is dropped on save — confirmed live;
  // NOT the same behavior as Guardian Phone's Text-typed concept below
  // (same quirk every prior Chronic Care pilot's own header-mastercard.spec.ts
  // already documented).
  expect(obs.some((o) => /telephone number.*991112222/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /guardian.*name.*grace banda/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /next of kin telephone.*0993334444/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /relationships of contact.*mother/i.test(o.display))).toBeTruthy();

  // Diagnosis Date + the hidden, always-checked Sickle cell disease
  // diagnosis obs — one obsgroup, component order not fixed (see
  // fillSickleCellDiseaseHeaderForm's own verification note 2).
  expect(
    obs.some((o) => hasAll(o.display, [/chronic care diagnosis construct/i, /sickle cell disease/i, hasDate])),
  ).toBeTruthy();

  // Diagnostic Tool rows.
  expect(obs.some((o) => /^microscopy:\s*yes/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => hasAll(o.display, [/^microscopy date/i, hasDate]))).toBeTruthy();
  expect(obs.some((o) => /rapid testing:\s*yes/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => hasAll(o.display, [/rapid testing date/i, hasDate]))).toBeTruthy();
  expect(obs.some((o) => /hb electrophoresis:\s*no/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => hasAll(o.display, [/hb electrophoresis date/i, hasDate]))).toBeTruthy();

  // HIV History.
  expect(obs.some((o) => /hiv status.*reactive/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => hasAll(o.display, [/date antiretrovirals started/i, hasDate]))).toBeTruthy();
  expect(obs.some((o) => hasAll(o.display, [/hiv test date/i, hasDate]))).toBeTruthy();

  // Family History.
  expect(obs.some((o) => /parent relationship.*yes/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /sibling relationship.*unknown/i.test(o.display))).toBeTruthy();

  // Referral History — 3 independent checkbox obs plus 1 obsgroup ("Other" +
  // its "Specify:" free text). NOTE: the "In-Patient" checkbox's underlying
  // concept genuinely displays as "Patient transfer in" (a real content
  // mismatch — see fillSickleCellDiseaseHeaderForm's own verification note 6
  // "CONTENT BUG CANDIDATE" — asserted here as its ACTUAL value, not the
  // on-screen "In-Patient" label, per this pilot's own rule of asserting the
  // real REST display string).
  expect(obs.some((o) => /pdc reasons for referral.*patient transfer in/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /pdc reasons for referral.*ic3/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /pdc reasons for referral.*opd clinic/i.test(o.display))).toBeTruthy();
  expect(
    obs.some((o) =>
      hasAll(o.display, [/reasons for referral set/i, /referred out/i, /chronic pain crisis referral/i]),
    ),
  ).toBeTruthy();
});
