import { test, expect } from '../../core';
import {
  MastercardFormPage,
  CardiacAndVascularDiseaseMastercardGatePage,
  fillCardiacAndVascularDiseaseHeaderForm,
} from '../../pages';
import { CHF_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('Cardiac and Vascular Disease header mastercard saves the entered data as a CHF_INITIAL encounter', async ({
  page,
  api,
  eligibleCardiacAndVascularDiseasePatient,
}) => {
  const encounterDate = new Date().toISOString().slice(0, 10);

  const form = await MastercardFormPage.openCreateAtUrl(
    page,
    CardiacAndVascularDiseaseMastercardGatePage.buildCreateUrl(
      eligibleCardiacAndVascularDiseasePatient.uuid,
      encounterDate,
    ),
  );

  // Fills every editable field on cardiac-and-vascular-disease-emastercard.xml
  // — shared with visit-mastercard.spec.ts's beforeEach so that spec doesn't
  // need to duplicate this field list to reach a saved header encounter
  // (see fillCardiacAndVascularDiseaseHeaderForm's own doc comment).
  await fillCardiacAndVascularDiseaseHeaderForm(form, encounterDate);

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${eligibleCardiacAndVascularDiseasePatient.uuid}&encounterType=${CHF_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string; comment?: string }>;

  // Every assertion below checks the ACTUAL rendered REST `display` string,
  // confirmed live by first saving this exact form and dumping the real
  // encounter's obs (per docs/e2e-adding-a-program-playbook.md's method) —
  // never a presence-only check. Patient Phone's underlying concept
  // ("Telephone number") is Numeric, so the leading zero in "0991112222" is
  // dropped on save — confirmed live; NOT the same behavior as Guardian
  // Phone's Text-typed concept below (same quirk already documented in the
  // NCD Other pilot's own header-mastercard.spec.ts).
  const onDate = (label: string) => new RegExp(`${label}.*${encounterDate}`, 'i');
  const hasAll = (display: string, patterns: RegExp[]) => patterns.every((p) => p.test(display));
  const hasDate = new RegExp(encounterDate);

  expect(obs.some((o) => /follow up agreement.*yes/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => onDate('transfer in date').test(o.display))).toBeTruthy();
  expect(obs.some((o) => /telephone number.*991112222/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /guardian.*name.*grace banda/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /next of kin telephone.*0993334444/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /relationships of contact.*mother/i.test(o.display))).toBeTruthy();

  // Diagnoses (17 obsgroups: 16 straightforward + the "Other" non-coded one).
  // The strings below are the concept's own REST `display` name, confirmed
  // live — several differ substantially from the XML's own `answerLabel`
  // abbreviation (e.g. "CAD" displays as "Coronary artery disease", "Afib"
  // as "Irregular rhythm", "PE" as "Pulmonary embolism", "DVT" as "Deep vein
  // thrombosis", and "Ischemic heart disease" as "Ischaemic heart disease"
  // — British spelling on the concept itself, not a typo here).
  const diagnosisAnswers = [
    'Cardiomyopathy',
    'Dilated cardiomyopathy',
    'Coronary artery disease',
    'Irregular rhythm',
    'Restrictive cardiomyopathy',
    'Pulmonary embolism',
    'Rheumatic heart disease',
    'Stroke',
    'Deep vein thrombosis',
    'Valvular heart disease',
    'Right ventricular failure',
    'Congenital heart disease',
    'Hypertensive heart disease',
    'Unknown',
    'Pericardial disease',
    'Ischaemic heart disease',
  ];
  for (const answer of diagnosisAnswers) {
    expect(
      obs.some((o) => hasAll(o.display, [/chronic care diagnosis construct/i, new RegExp(answer, 'i'), hasDate])),
    ).toBeTruthy();
  }
  expect(
    obs.some((o) =>
      hasAll(o.display, [
        /chronic care diagnosis construct/i,
        /other non-coded/i,
        /unspecified cardiac condition/i,
        hasDate,
      ]),
    ),
  ).toBeTruthy();

  // Comorbidities.
  expect(
    obs.some(
      (o) => /current opportunistic infection or comorbidity/i.test(o.display) && /chronic kidney disease/i.test(o.display),
    ),
  ).toBeTruthy();
  expect(
    obs.some(
      (o) => /current opportunistic infection or comorbidity/i.test(o.display) && /diabetes/i.test(o.display),
    ),
  ).toBeTruthy();
  expect(
    obs.some(
      (o) => /current opportunistic infection or comorbidity/i.test(o.display) && /hypertension/i.test(o.display),
    ),
  ).toBeTruthy();
  expect(obs.some((o) => /other diagnosis.*chronic liver disease/i.test(o.display))).toBeTruthy();

  // Family planning — confirmed live the concept's own display is "Method
  // of family planning: <answer>" (reversed word order from, and a
  // different answer name than, the XML's own `answerLabel`s — e.g. "OC
  // (pills)" displays as "Oral contraception", "Depo (injection)" as
  // "Depo-provera", "Other" as "Other non-coded").
  expect(obs.some((o) => /method of family planning.*oral contraception/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /method of family planning.*depo-provera/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /method of family planning.*none/i.test(o.display))).toBeTruthy();
  // The "Other" checkbox's own `showCommentField`/`commentFieldLabel`
  // free-text value is stored as the obs's own `comment` property, NOT as
  // part of `display` or `value` (confirmed live: this obs's `display` is
  // just "Method of family planning: Other non-coded", with no trace of the
  // typed "Condoms" text at all) — so the specify text itself must be
  // asserted via `comment`, not `display`.
  const otherFamilyPlanningObs = obs.find(
    (o) => /method of family planning.*other non-coded/i.test(o.display),
  );
  expect(otherFamilyPlanningObs).toBeTruthy();
  expect(otherFamilyPlanningObs?.comment).toMatch(/condoms/i);

  // Patient History row.
  expect(obs.some((o) => /hiv status.*reactive/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => onDate('hiv test date').test(o.display))).toBeTruthy();
  expect(obs.some((o) => onDate('date antiretrovirals started').test(o.display))).toBeTruthy();
  expect(obs.some((o) => /tb status.*smear positive/i.test(o.display))).toBeTruthy();
  expect(
    obs.some((o) => new RegExp(`year of tuberculosis diagnosis.*${encounterDate.slice(0, 4)}`, 'i').test(o.display)),
  ).toBeTruthy();

  // Imaging Results.
  expect(obs.some((o) => hasAll(o.display, [/echocardiogram construct/i, /normal echo result/i, hasDate]))).toBeTruthy();
  expect(obs.some((o) => hasAll(o.display, [/electrocardiogram construct/i, /normal/i, hasDate]))).toBeTruthy();
});
