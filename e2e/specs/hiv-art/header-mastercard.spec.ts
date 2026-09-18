import { test, expect } from '../../core';
import { MastercardFormPage } from '../../pages';
import { ART_INITIAL_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test('ART header mastercard saves the entered data as an ART_INITIAL encounter', async ({
  page,
  api,
  eligibleHivArtPatient,
}) => {
  const encounterDate = new Date().toISOString().slice(0, 10);
  const form = await MastercardFormPage.openCreate(page, eligibleHivArtPatient.uuid, encounterDate);

  // Labels below are the ACTUAL rendered text in art-emastercard.xml's
  // header form, confirmed live against a running instance — not the
  // brief's placeholder guesses. The design doc's "Patient agrees to
  // follow-up" concept renders as "Agrees to FUP", and WHO Stage's options
  // render as bare "1"/"2"/"3"/"4", not "Stage 1" etc.
  await form.selectRadio('Agrees to FUP', 'Y');
  await form.selectRadio('WHO Stage', '1');
  await form.fillField('Height', '165');
  await form.fillField('Weight', '60');

  // --- Task 11 additions below — see MastercardFormPage's Task 11
  // verification notes for exactly how each of these was confirmed live.

  // Transfer-In Date / Child HCC no. — inline in the page header, outside
  // `table.data-entry-table` entirely (note 2).
  await form.fillHeaderField('Transfer-In Date:', encounterDate);
  await form.fillHeaderField('Child HCC no:', 'HCC-E2E-1234');

  // Patient / Guardian Details — plain labeled inputs.
  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('Guardian Phone', '0993334444');
  await form.fillField('Guardian relation to patient', 'Mother');

  // Status at ART Initiation.
  await form.fillField('HIV-related diseases', 'Chronic diarrhea');
  await form.selectRadio('Urine LAM/Crag Result', 'Negative');
  // "Pres" is a checkbox sharing WHO Stage's own <td> (note 4) —
  // `selectRadio` generalizes to it fine (`.check()` works on checkboxes).
  await form.selectRadio('WHO Stage', 'Pres');
  // `style="no_yes"` (KS) renders as an ordinary N/Y radio pair (note 5).
  await form.selectRadio('KS', 'Y');
  await form.selectRadio('TB Status at Init.', 'Last');
  // Only renders for female patients (`eligibleHivArtPatient`'s default —
  // see `createPatient`'s default `gender: 'F'`).
  await form.selectRadio('Preg/Breastf', 'Preg');

  // CD4 — two obs sharing one "CD4" row, left-cell/right-cell (note 6).
  await form.fillField('CD4Count', '350');
  await form.fillField('CD4Pct', '18');
  await form.fillField('CD4 Date', encounterDate);

  await form.selectRadio('Ever taken ARVs', 'N');
  await form.fillField('Age at Init. (yrs)', '34');

  // Last ARVs (drug, date) — two bare inputs sharing one <td> (note 7).
  await form.fillField('LastArvsDrug', 'AZT/3TC/NVP');
  await form.fillField('LastArvsDate', encounterDate);

  // Confirmatory HIV Test before ART Start.
  await form.fillField('Facility', 'Neno District Hospital');
  await form.fillField('Link ID / HTC Serial No.', 'HTC-E2E-5678');
  await form.fillField('Test Date', encounterDate);
  // Confirmatory test type radio shares "Test Date"'s row, in the next
  // (unlabeled) <td> over — positional but anchored to a real label (note 8).
  await form.selectRadio('Test Date', 'Rapid', 2);
  await form.selectRadio('ART educat. done', 'Y');
  // ART education date shares that same row, next <td> over — same shape.
  await form.fillField('ART educat. done', encounterDate, 2);

  // TB Treatm. & ART Regimen at Initiation.
  await form.fillField('TB treatm.', '12345');
  await form.fillField('TB treatm.', encounterDate, 2);
  await form.selectDropdown('ART Regimens', '1A');
  await form.fillField('ART Regimens', encounterDate, 2);
  // ART Regimen rows 2/3 have a genuinely empty <td></td> label (no text to
  // anchor a lookup to at all) — skipped; see Task 11 verification note 9.

  await form.save();
  await form.expectSaveSuccess();

  const res = await api.get(
    `encounter?patient=${eligibleHivArtPatient.uuid}&encounterType=${ART_INITIAL_ENCOUNTER_TYPE_UUID}&v=full`,
  );
  expect(res.ok()).toBeTruthy();
  const { results } = await res.json();
  expect(results.length).toBe(1);

  const obs = results[0].obs as Array<{ display: string }>;
  expect(obs.some((o) => /165/.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /60/.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /follow up agreement.*yes/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /who stage/i.test(o.display))).toBeTruthy();

  // One assertion per Task 11 field/section, each on a distinctive value.
  // Regexes below use the ACTUAL rendered `obs[].display` strings, confirmed
  // live (e.g. selecting "Last" for TB Status displays as "Treatment
  // complete" — the answer concept's own name, not the rendered radio
  // label; "Ever taken ARVs" displays as "Ever received ART?").
  //
  // Every date-field assertion below checks the field's own `display`
  // AGAINST `encounterDate`, not just that some obs with that label exists
  // — these all go through `fillInputOrDatePicker`'s readonly-datepicker
  // branch (the newest, least-previously-exercised code path in this
  // file), so a bug that silently wrote the wrong date needs to be
  // catchable here.
  const onDate = (label: string) => new RegExp(`${label}.*${encounterDate}`, 'i');
  expect(obs.some((o) => onDate('transfer in date').test(o.display))).toBeTruthy();
  expect(obs.some((o) => /HCC-E2E-1234/.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /0991112222/.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /0993334444/.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /Mother/.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /Chronic diarrhea/.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /urine.*lam.*negative/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /presumed severe/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /worsening.*arv/i.test(o.display) && /true/i.test(o.display))).toBeTruthy();
  expect(
    obs.some((o) => /tuberculosis treatment status/i.test(o.display) && /treatment complete/i.test(o.display)),
  ).toBeTruthy();
  // "Preg" specifically (not "No"/"Bf") — the display text is the answer
  // concept's own name, "Patient pregnant", confirmed live.
  expect(obs.some((o) => /pregnant\/lactating.*patient pregnant/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /cd4 count.*350/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /cd4%.*18/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => onDate('date of cd4 count').test(o.display))).toBeTruthy();
  expect(obs.some((o) => /ever received art.*no/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /^age:? ?34/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /AZT\/3TC\/NVP/.test(o.display))).toBeTruthy();
  expect(obs.some((o) => onDate('date art last taken').test(o.display))).toBeTruthy();
  expect(obs.some((o) => /confirmatory hiv test location.*neno district hospital/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /HTC-E2E-5678/.test(o.display))).toBeTruthy();
  expect(obs.some((o) => onDate('date of hiv diagnosis').test(o.display))).toBeTruthy();
  expect(obs.some((o) => /rapid/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => /education.*done.*yes/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => onDate('art education date').test(o.display))).toBeTruthy();
  expect(obs.some((o) => /tb registration number.*12345/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => onDate('tuberculosis drug treatment start date').test(o.display))).toBeTruthy();
  // Anchored to the concept's own name plus a trailing colon so a
  // multi-char regimen label containing "1A" as a substring (e.g. "11A",
  // "11PA") can't false-match — confirmed live display is exactly
  // "...drugs change 1: 1A: d4T / 3TC / NVP (previous 1L)".
  expect(obs.some((o) => /antiretroviral drugs change 1:\s*1a:/i.test(o.display))).toBeTruthy();
  expect(obs.some((o) => onDate('start date 1st line arv').test(o.display))).toBeTruthy();
});
