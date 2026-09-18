import { test, expect } from '../../core';
import { MastercardFormPage, NcdOtherMastercardGatePage, fillNcdOtherHeaderForm } from '../../pages';
import { NCD_OTHER_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('NCD Other header mastercard saves the entered data as an NCD_OTHER_INITIAL encounter', async ({
  page,
  api,
  eligibleNcdOtherPatient,
}) => {
  const encounterDate = new Date().toISOString().slice(0, 10);

  // NCD Other's create URL has a different headerForm and flowsheet list
  // than ART's — see ncd-other-mastercard-page.ts's verification note 1 for
  // how the real URL was confirmed live (dumping the dashboard's "Create
  // new NCD Other eMastercard" link's `onclick`, not guessed from the JSP
  // tag). `openCreateAtUrl` reuses the same "navigate + pick a default
  // location" steps `openCreate` uses for ART.
  const form = await MastercardFormPage.openCreateAtUrl(
    page,
    NcdOtherMastercardGatePage.buildCreateUrl(eligibleNcdOtherPatient.uuid, encounterDate),
  );

  // Fills every editable field on ncd-other-emastercard.xml — shared with
  // Task 4's visit-mastercard spec so that spec doesn't need to duplicate
  // this field list to reach a saved header encounter (see
  // fillNcdOtherHeaderForm's own doc comment).
  await fillNcdOtherHeaderForm(form, encounterDate);

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${eligibleNcdOtherPatient.uuid}&encounterType=${NCD_OTHER_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string }>;

  // Every assertion below checks the ACTUAL rendered REST `display` string,
  // confirmed live by first saving this exact form and dumping the real
  // encounter's obs (per docs/e2e-adding-a-program-playbook.md's method) —
  // never a presence-only check. Several concepts' own display names differ
  // from either the XML's `labelText`/rendered label or the brief's
  // placeholder guesses (e.g. Patient Phone's own concept name is
  // "Telephone number", Guardian Phone's is "Next of kin telephone",
  // Guardian Name's is "Guardian; name and first names", Guardian relation's
  // is "Relationships of contact", ART Start Date's is "Date antiretrovirals
  // started", HIV Test Date's is "HIV test date", TB Date's is "Tuberculosis
  // diagnosis date", Other comorbidity's is "Other diagnosis") — confirmed
  // live, not assumed from the XML's `labelText` attributes.
  const onDate = (label: string) => new RegExp(`${label}.*${encounterDate}`, 'i');
  // For the 5 diagnosis obsgroups, the concatenated child-obs order (date
  // first vs. name first) is NOT stable — same non-stable-ordering behavior
  // already confirmed for CPT/IPT in the ART pilot's visit-mastercard.spec —
  // so each assertion checks the group's own display name, the specific
  // answer's name, and the date as three INDEPENDENT substring checks
  // rather than one ordered regex.
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

  // Diagnoses (each: toggle checkbox + paired date).
  expect(
    obs.some((o) =>
      hasAll(o.display, [/chronic care diagnosis construct/i, /rheumatoid arthritis/i, hasDate]),
    ),
  ).toBeTruthy();
  expect(
    obs.some((o) => hasAll(o.display, [/chronic care diagnosis construct/i, /cirrhosis/i, hasDate])),
  ).toBeTruthy();
  expect(
    obs.some((o) =>
      hasAll(o.display, [/chronic care diagnosis construct/i, /deep vein thrombosis/i, hasDate]),
    ),
  ).toBeTruthy();
  expect(
    obs.some((o) =>
      hasAll(o.display, [/chronic care diagnosis construct/i, /sickle cell disease/i, hasDate]),
    ),
  ).toBeTruthy();
  expect(
    obs.some((o) =>
      hasAll(o.display, [
        /chronic care diagnosis construct/i,
        /other non-coded/i,
        /unspecified chronic condition/i,
        hasDate,
      ]),
    ),
  ).toBeTruthy();

  // Comorbidities checkboxes — each its own obs, all sharing the same
  // underlying concept's own display name ("Current opportunistic
  // infection or comorbidity, confirmed or presumed"), distinguished only
  // by their answer.
  expect(
    obs.some(
      (o) => /current opportunistic infection or comorbidity/i.test(o.display) && /hypertension/i.test(o.display),
    ),
  ).toBeTruthy();
  expect(
    obs.some(
      (o) => /current opportunistic infection or comorbidity/i.test(o.display) && /diabetes/i.test(o.display),
    ),
  ).toBeTruthy();
  expect(
    obs.some(
      (o) =>
        /current opportunistic infection or comorbidity/i.test(o.display) &&
        /chronic kidney disease/i.test(o.display),
    ),
  ).toBeTruthy();
  // `otherComorbidity` (this assertion) and `otherDxText` (the "other
  // non-coded" diagnosis assertion above) both resolve to the SAME concept
  // uuid (65780d0c-977f-11e1-8993-905e29aff6c1) in
  // ncd-other-emastercard.xml's own macros — pre-existing content, not a
  // bug. These are two distinct obs with distinct text ("Chronic liver
  // disease" vs. "Unspecified chronic condition"), so this assertion is NOT
  // redundant with the other one despite sharing a concept name.
  expect(obs.some((o) => /other diagnosis.*chronic liver disease/i.test(o.display))).toBeTruthy();

  // Patient History row.
  expect(obs.some((o) => /hiv status.*reactive/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => onDate('hiv test date').test(o.display))).toBeTruthy();
  expect(obs.some((o) => onDate('date antiretrovirals started').test(o.display))).toBeTruthy();
  expect(obs.some((o) => /tb status.*smear positive/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => onDate('tuberculosis diagnosis date').test(o.display))).toBeTruthy();

  // Imaging Results.
  expect(
    obs.some((o) =>
      hasAll(o.display, [/echocardiogram construct/i, /normal echo result/i, hasDate]),
    ),
  ).toBeTruthy();
  expect(
    obs.some((o) => hasAll(o.display, [/electrocardiogram construct/i, /normal/i, hasDate])),
  ).toBeTruthy();
});
