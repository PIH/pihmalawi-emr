import { test, expect } from '../../core';
import {
  MastercardFormPage,
  HypertensionAndDiabetesMastercardGatePage,
  fillHypertensionAndDiabetesHeaderForm,
} from '../../pages';
import { DIABETES_HYPERTENSION_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('Hypertension and Diabetes header mastercard saves the entered data as a DIABETES HYPERTENSION INITIAL VISIT encounter', async ({
  page,
  api,
  eligibleHypertensionAndDiabetesPatient,
}) => {
  const encounterDate = new Date().toISOString().slice(0, 10);

  // Hypertension and Diabetes' create URL has its own headerForm and
  // flowsheet list (a different set than either ART's or NCD Other's) — see
  // hypertension-and-diabetes-mastercard-page.ts's verification note 1 for
  // how the real URL was confirmed live (dumping the dashboard's "Create new
  // Hypertension and Diabetes eMastercard" link's `onclick`, not guessed from
  // the JSP tag). `openCreateAtUrl` reuses the same "navigate + pick a
  // default location" steps `openCreate` uses for ART.
  const form = await MastercardFormPage.openCreateAtUrl(
    page,
    HypertensionAndDiabetesMastercardGatePage.buildCreateUrl(eligibleHypertensionAndDiabetesPatient.uuid, encounterDate),
  );

  // Fills every editable field on hypertension-and-diabetes-emastercard.xml
  // — shared with the visit-mastercard spec so that spec doesn't need to
  // duplicate this field list to reach a saved header encounter (see
  // fillHypertensionAndDiabetesHeaderForm's own doc comment).
  await fillHypertensionAndDiabetesHeaderForm(form, encounterDate);

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${eligibleHypertensionAndDiabetesPatient.uuid}&encounterType=${DIABETES_HYPERTENSION_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string }>;

  // Every assertion below checks the ACTUAL rendered REST `display` string,
  // confirmed live by first saving this exact form (via a standalone
  // Playwright verification script per docs/e2e-adding-a-program-playbook.md's
  // method) and dumping the real encounter's obs — never a presence-only
  // check. Several concepts' own display names differ from either the XML's
  // `labelText`/rendered label or the ART/NCD Other pilots' own precedent
  // (e.g. Patient Phone's own concept name is "Telephone number", Guardian
  // Phone's is "Next of kin telephone", Guardian Name's is "Guardian; name
  // and first names", Guardian relation's is "Relationships of contact",
  // ART Start Date's is "Date antiretrovirals started", TB Year's is "Year of
  // Tuberculosis diagnosis", the Diagnoses obsgroup's is "Chronic Care
  // Diagnosis Construct", the Complications obsgroup's is "Patient history
  // and complications construct", Family History (Diabetes)'s is "Family
  // History of Diabetes Mellitus", Family History (Hypertension)'s is
  // "Family history of hypertension") — confirmed live, not assumed from the
  // XML's `labelText` attributes.
  const onDate = (label: string) => new RegExp(`${label}.*${encounterDate}`, 'i');
  // For the diagnosis/complications obsgroups, the concatenated child-obs
  // order (date first vs. name first) is NOT stable — same non-stable
  // ordering already confirmed for CPT/IPT (ART pilot) and the 5 diagnosis
  // obsgroups (NCD Other pilot) — so each assertion checks the group's own
  // display name, the specific answer's name, and the date as three
  // INDEPENDENT substring checks rather than one ordered regex.
  const hasAll = (display: string, patterns: RegExp[]) => patterns.every((p) => p.test(display));
  const hasDate = new RegExp(encounterDate);

  expect(obs.some((o) => /follow up agreement.*yes/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => onDate('transfer in date').test(o.display))).toBeTruthy();
  // Patient Phone's underlying concept ("Telephone number") is Numeric, so
  // the leading zero in "0991112222" is dropped on save — confirmed live;
  // NOT the same behavior as Guardian Phone's Text-typed concept below.
  expect(obs.some((o) => /telephone number.*991112222/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /guardian.*name.*grace banda/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /next of kin telephone.*0993334444/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /relationships of contact.*mother/i.test(o.display))).toBeTruthy();

  // Diagnoses — only Type 1 DM is filled (Type 2 DM is intentionally
  // skipped: mastercard.js's setupHtnDmValidation disables the sibling
  // diabetes-type checkbox the moment one is checked — see
  // hypertension-and-diabetes-mastercard-page.ts's own comment).
  expect(
    obs.some((o) => hasAll(o.display, [/chronic care diagnosis construct/i, /type 1 diabetes/i, hasDate])),
  ).toBeTruthy();
  expect(
    obs.some((o) => hasAll(o.display, [/chronic care diagnosis construct/i, /hypertension/i, hasDate])),
  ).toBeTruthy();

  // Family History.
  expect(obs.some((o) => /family history of diabetes mellitus.*yes/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /family history of hypertension.*no/i.test(o.display))).toBeTruthy();

  // Patient History & Complications row.
  expect(obs.some((o) => /hiv status.*reactive/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => onDate('hiv test date').test(o.display))).toBeTruthy();
  expect(obs.some((o) => onDate('date antiretrovirals started').test(o.display))).toBeTruthy();
  expect(obs.some((o) => /tb status.*smear positive/i.test(o.display))).toBeTruthy();
  expect(
    obs.some((o) => new RegExp(`year of tuberculosis diagnosis.*${encounterDate.slice(0, 4)}`, 'i').test(o.display)),
  ).toBeTruthy();

  // Complications (7 obsgroups sharing the "Patient history and
  // complications construct" concept name, distinguished by answer + date).
  expect(
    obs.some((o) =>
      hasAll(o.display, [/patient history and complications construct/i, /stroke and transient ischemic attack/i, hasDate]),
    ),
  ).toBeTruthy();
  expect(
    obs.some((o) =>
      hasAll(o.display, [/patient history and complications construct/i, /cardiovascular disease/i, hasDate]),
    ),
  ).toBeTruthy();
  expect(
    obs.some((o) =>
      hasAll(o.display, [/patient history and complications construct/i, /peripheral vascular disease/i, hasDate]),
    ),
  ).toBeTruthy();
  expect(
    obs.some((o) => hasAll(o.display, [/patient history and complications construct/i, /retinopathy/i, hasDate])),
  ).toBeTruthy();
  expect(
    obs.some((o) => hasAll(o.display, [/patient history and complications construct/i, /neuropathy/i, hasDate])),
  ).toBeTruthy();
  expect(
    obs.some((o) => hasAll(o.display, [/patient history and complications construct/i, /renal disease/i, hasDate])),
  ).toBeTruthy();
  expect(
    obs.some((o) =>
      hasAll(o.display, [/patient history and complications construct/i, /sexual disorder/i, hasDate]),
    ),
  ).toBeTruthy();
});
