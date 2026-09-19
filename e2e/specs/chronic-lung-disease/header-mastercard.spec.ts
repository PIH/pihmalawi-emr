import { test, expect } from '../../core';
import {
  MastercardFormPage,
  ChronicLungDiseaseMastercardGatePage,
  fillChronicLungDiseaseHeaderForm,
} from '../../pages';
import { ASTHMA_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('Chronic Lung Disease header mastercard saves the entered data as an ASTHMA_INITIAL encounter', async ({
  page,
  api,
  eligibleChronicLungDiseasePatient,
}) => {
  const encounterDate = new Date().toISOString().slice(0, 10);

  // Chronic Lung Disease's create URL has its own headerForm and flowsheet
  // list (a different set than ART's/NCD Other's/Hypertension and
  // Diabetes's) — see chronic-lung-disease-mastercard-page.ts's
  // verification note 1 for how the real URL was confirmed live (dumping
  // the dashboard's "Create new Chronic Lung Disease eMastercard" link's
  // `onclick`, not guessed from the JSP tag). `openCreateAtUrl` reuses the
  // same "navigate + pick a default location" steps `openCreate` uses for
  // ART.
  const form = await MastercardFormPage.openCreateAtUrl(
    page,
    ChronicLungDiseaseMastercardGatePage.buildCreateUrl(eligibleChronicLungDiseasePatient.uuid, encounterDate),
  );

  // Fills every editable field on chronic-lung-disease-emastercard.xml —
  // shared with visit-mastercard.spec.ts so that spec doesn't need to
  // duplicate this field list to reach a saved header encounter (see
  // fillChronicLungDiseaseHeaderForm's own doc comment).
  await fillChronicLungDiseaseHeaderForm(form, encounterDate);

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${eligibleChronicLungDiseasePatient.uuid}&encounterType=${ASTHMA_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string }>;

  // Every assertion below checks the ACTUAL rendered REST `display` string,
  // confirmed live by first saving this exact form (via a standalone
  // Playwright verification script per
  // docs/e2e-adding-a-program-playbook.md's method) and dumping the real
  // encounter's obs — never a presence-only check. Several concepts' own
  // display names differ from either the XML's `labelText`/rendered label
  // or the prior pilots' own precedent (e.g. Patient Phone's own concept
  // name is "Telephone number", Guardian Phone's is "Next of kin
  // telephone", Guardian Name's is "Guardian; name and first names",
  // Guardian relation's is "Relationships of contact", the Diagnoses
  // obsgroup's is "Chronic Care Diagnosis Construct", Family History
  // (Asthma)'s is "Asthma family history", Family History (COPD)'s is
  // "COPD family history", Duration's is "Duration of symptom in months",
  // Age at onset's is "Age at cough onset", Chronic dry cough's is "Symptom
  // present", TB contact's and Occupational exposure's obsgroup is
  // "Exposure construct", Cooking's is "Location of cooking", Smoking's is
  // "Smoking history", the smoking date's is "Last time person used
  // tobacco", Occupation's is "Main activity") — confirmed live, not
  // assumed from the XML's `labelText` attributes.
  const onDate = (label: string) => new RegExp(`${label}.*${encounterDate}`, 'i');
  // For the Diagnoses/Exposure obsgroups, the concatenated child-obs order
  // (date first vs. name first) is NOT stable — same non-stable-ordering
  // behavior already confirmed for CPT/IPT (ART pilot), the diagnosis
  // obsgroups (NCD Other/Hypertension and Diabetes pilots) — so each
  // assertion checks the group's own display name, the specific answer's
  // name, and the date as three INDEPENDENT substring checks rather than
  // one ordered regex.
  const hasAll = (display: string, patterns: RegExp[]) => patterns.every((p) => p.test(display));
  const hasDate = new RegExp(encounterDate);

  expect(obs.some((o) => onDate('transfer in date').test(o.display))).toBeTruthy();
  // Patient Phone's underlying concept ("Telephone number") is Numeric, so
  // the leading zero in "0991112222" is dropped on save — confirmed live;
  // NOT the same behavior as Guardian Phone's Text-typed concept below.
  expect(obs.some((o) => /telephone number.*991112222/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /guardian.*name.*grace banda/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /next of kin telephone.*0993334444/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /relationships of contact.*mother/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /follow up agreement.*yes/i.test(o.display))).toBeTruthy();

  // Diagnoses (obsgroup: name + date).
  expect(
    obs.some((o) => hasAll(o.display, [/chronic care diagnosis construct/i, /asthma/i, hasDate])),
  ).toBeTruthy();
  expect(
    obs.some((o) =>
      hasAll(o.display, [/chronic care diagnosis construct/i, /chronic obstructive pulmonary disease/i, hasDate]),
    ),
  ).toBeTruthy();

  // Family History.
  expect(obs.some((o) => /asthma family history.*positive/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /copd family history.*negative/i.test(o.display))).toBeTruthy();

  // "PatientHistory &Exposures" row.
  expect(obs.some((o) => /hiv status.*reactive/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => onDate('hiv test date').test(o.display))).toBeTruthy();
  expect(obs.some((o) => onDate('date antiretrovirals started').test(o.display))).toBeTruthy();
  expect(obs.some((o) => /tb status.*smear positive/i.test(o.display))).toBeTruthy();
  expect(
    obs.some((o) => new RegExp(`year of tuberculosis diagnosis.*${encounterDate.slice(0, 4)}`, 'i').test(o.display)),
  ).toBeTruthy();

  // Chronic dry cough + Duration/Age at onset.
  expect(obs.some((o) => /symptom present.*dry cough/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /duration of symptom in months.*6/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /age at cough onset.*30/i.test(o.display))).toBeTruthy();

  // TB contact / Occupational exposure (both share the "Exposure construct"
  // obsgroup name, distinguished by answer + date).
  expect(
    obs.some((o) => hasAll(o.display, [/exposure construct/i, /contact with a tb\+ person/i, hasDate])),
  ).toBeTruthy();
  expect(
    obs.some((o) => hasAll(o.display, [/exposure construct/i, /occupational exposure/i, hasDate])),
  ).toBeTruthy();

  // Cooking / Smoking / Occupation. Indoor and Outdoor are independent
  // checkboxes (not a radio group) — both are filled and both save as
  // independent obs, confirmed live.
  expect(obs.some((o) => /location of cooking.*indoors/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /location of cooking.*outdoors/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /smoking history.*in the past/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => onDate('last time person used tobacco').test(o.display))).toBeTruthy();
  expect(obs.some((o) => /main activity.*employed/i.test(o.display))).toBeTruthy();

  // Second hand smoking exposure (also an "Exposure construct" obsgroup) —
  // confirmed live its answer displays as "Exposed to second hand smoke?"
  // (the same underlying concept the visit form's own "Passive smoking"
  // field uses), not "Second hand smoking" (the XML's own answerLabel).
  expect(
    obs.some((o) => hasAll(o.display, [/exposure construct/i, /exposed to second hand smoke/i, hasDate])),
  ).toBeTruthy();
});
