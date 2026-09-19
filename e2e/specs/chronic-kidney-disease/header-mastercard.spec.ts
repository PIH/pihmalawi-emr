import { test, expect } from '../../core';
import {
  MastercardFormPage,
  ChronicKidneyDiseaseMastercardGatePage,
  fillChronicKidneyDiseaseHeaderForm,
} from '../../pages';
import { CKD_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('Chronic Kidney Disease header mastercard saves the entered data as a CKD_INITIAL encounter', async ({
  page,
  api,
  eligibleChronicKidneyDiseasePatient,
}) => {
  const encounterDate = new Date().toISOString().slice(0, 10);

  const form = await MastercardFormPage.openCreateAtUrl(
    page,
    ChronicKidneyDiseaseMastercardGatePage.buildCreateUrl(eligibleChronicKidneyDiseasePatient.uuid, encounterDate),
  );

  // Fills every editable field on chronic-kidney-disease-emastercard.xml —
  // shared with visit-mastercard.spec.ts's beforeEach so that spec doesn't
  // need to duplicate this field list to reach a saved header encounter
  // (see fillChronicKidneyDiseaseHeaderForm's own doc comment).
  await fillChronicKidneyDiseaseHeaderForm(form, encounterDate);

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${eligibleChronicKidneyDiseasePatient.uuid}&encounterType=${CKD_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
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
  // (same quirk already documented in prior Chronic Care pilots' own
  // header-mastercard.spec.ts files).
  expect(obs.some((o) => /telephone number.*991112222/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /guardian.*name.*grace banda/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /next of kin telephone.*0993334444/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /relationships of contact.*mother/i.test(o.display))).toBeTruthy();

  // Presumed etiology — 6 independent checkboxes, each its own obs under the
  // same "Presumed chronic kidney disease etiology" concept. Confirmed live
  // REST answer names diverge substantially from the XML's own
  // `answerLabel`s: "HIV" -> "Human immunodeficiency virus", "Nephrotic" ->
  // "Nephropathy", "Others" -> "Other", "Unknown" -> "Unknown cause".
  const etiologyAnswers = ['Hypertension', 'Diabetes', 'Human immunodeficiency virus', 'Nephropathy', 'Other', 'Unknown cause'];
  for (const answer of etiologyAnswers) {
    expect(
      obs.some((o) => hasAll(o.display, [/presumed chronic kidney disease etiology/i, new RegExp(`: ${answer}$`, 'i')])),
    ).toBeTruthy();
  }
  // The 2 free-text etiology fields — confirmed live each uses its own
  // underlying concept's real (lowercase, in one case) display name, not
  // the XML's "Drugs (specify)"/"Others (specify)" labels.
  expect(obs.some((o) => /drugs.*ibuprofen \(nsaid\)/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /other diagnosis.*unspecified nephrotoxic exposure/i.test(o.display))).toBeTruthy();
  // The shared "Date" field for the whole Presumed etiology cell — confirmed
  // live its own concept displays as "Diagnosis date", the SAME concept
  // name used by each of the 4 diagnosis obsgroups' own date component
  // below (a shared concept, not a bug — distinguished only by which
  // encounter/obsgroup it belongs to).
  expect(obs.some((o) => hasAll(o.display, [/^diagnosis date/i, hasDate]))).toBeTruthy();

  // CHF/Hypertension/Diabetes/Other diagnoses (4 obsgroups). Confirmed live
  // each renders as ONE "Chronic Care Diagnosis Construct: ..." obs
  // combining the diagnosis name and its date — but the two components'
  // ORDER within that string is not consistent across the 4 obsgroups
  // (some render date-then-name, others name-then-date), so each is
  // asserted via `hasAll` (both substrings present, any order) rather than
  // a single fixed-order regex.
  expect(
    obs.some((o) => hasAll(o.display, [/chronic care diagnosis construct/i, /heart failure/i, hasDate])),
  ).toBeTruthy();
  expect(
    obs.some((o) => hasAll(o.display, [/chronic care diagnosis construct/i, /hypertension/i, hasDate])),
  ).toBeTruthy();
  expect(
    obs.some((o) => hasAll(o.display, [/chronic care diagnosis construct/i, /diabetes/i, hasDate])),
  ).toBeTruthy();
  expect(
    obs.some((o) => hasAll(o.display, [/chronic care diagnosis construct/i, /other non-coded/i, hasDate])),
  ).toBeTruthy();

  // PatientHistory row.
  expect(obs.some((o) => /hiv status.*reactive/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => hasAll(o.display, [/hiv test date/i, hasDate]))).toBeTruthy();
  expect(obs.some((o) => hasAll(o.display, [/date antiretrovirals started/i, hasDate]))).toBeTruthy();
  expect(obs.some((o) => /history of dialysis.*none reported/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => hasAll(o.display, [/date of dialysis/i, hasDate]))).toBeTruthy();
  expect(obs.some((o) => /tb status.*smear positive/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => hasAll(o.display, [/tuberculosis diagnosis date/i, hasDate]))).toBeTruthy();
});
