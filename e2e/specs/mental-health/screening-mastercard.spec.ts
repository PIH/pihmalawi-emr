import { readFileSync } from 'fs';
import { resolve } from 'path';
import { test, expect } from '../../core';
import {
  MastercardFormPage,
  MentalHealthMastercardGatePage,
  fillMentalHealthHeaderMinimum,
  fillMentalHealthScreeningForm,
  MENTAL_HEALTH_SCREENING_OTHER_DIAGNOSIS,
  MENTAL_HEALTH_SCREENING_OTHER_INTERVENTION,
} from '../../pages';
import { MENTAL_HEALTH_SCREENING_ENCOUNTER_TYPE_UUID } from '../../core/constants';

const SCREENING_FORM_XML = resolve(
  __dirname,
  '../../../content/configuration/backend_configuration/htmlforms/mental-health-screening.xml',
);

// Concepts mental-health-screening.xml saves to, as REST returns them on v=full obs.
const DIAGNOSIS_CONCEPT_UUID = '656292d8-977f-11e1-8993-905e29aff6c1';
const MENTAL_HEALTH_INTERVENTION_CONCEPT_UUID = '05d28bcb-ac69-4688-bb9e-480b8ca4f3bd';
const OTHER_CODED_CONCEPT_UUID = '8797110a-d38e-427f-a08f-260300c8c896';
const OTHER_NON_CODED_TEXT_CONCEPT_UUID = 'd57e3a20-5802-11e6-8b77-86f30ca893d3';
const OTHER_MENTAL_HEALTH_DIAGNOSIS_CONSTRUCT_UUID = 'd8467734-8ef7-4cb3-ab3f-e24ca9665472';
const OTHER_MENTAL_HEALTH_INTERVENTION_CONSTRUCT_UUID = '8fe2cbb9-78b8-47a6-956a-bbbc5751749f';
const OUTCOME_DATE_CONCEPT_UUID = '3597ed63-5627-4522-8cff-2d5d2393bada';

type RestObs = {
  display: string;
  concept: { uuid: string };
  value: unknown;
  groupMembers: RestObs[] | null;
};

test.describe('Mental Health screening mastercard', () => {
  // htmlformentry substitutes macros by plain text replacement in no fixed
  // order, so a macro whose name starts with another macro's name (e.g.
  // `$otherDiagnosisSet` vs `$other`) can be corrupted into an unknown
  // concept and break the form with a BadFormDesignException. Whether it
  // happens depends on that order, so it's checked statically here.
  test('has no macro whose name is a prefix of another macro name', () => {
    const xml = readFileSync(SCREENING_FORM_XML, 'utf8');
    const macros = xml.slice(xml.indexOf('<macros>'), xml.indexOf('</macros>'));
    const keys = [
      ...[...macros.matchAll(/key="(\w+)"/g)].map((m) => m[1]),
      ...[...macros.matchAll(/^\s*(\w+)=/gm)].map((m) => m[1]),
    ];
    expect(keys.length).toBeGreaterThan(0);

    const clashes = keys.flatMap((a) => keys.filter((b) => a !== b && b.startsWith(a)).map((b) => `${a} -> ${b}`));
    expect(clashes).toEqual([]);
  });

  test.describe('in the browser', () => {
    test.beforeEach(async ({ page, eligibleMentalHealthPatient }) => {
      const encounterDate = new Date().toISOString().slice(0, 10);
      const headerForm = await MastercardFormPage.openCreateAtUrl(
        page,
        MentalHealthMastercardGatePage.buildCreateUrl(eligibleMentalHealthPatient.uuid, encounterDate),
      );
      await fillMentalHealthHeaderMinimum(headerForm, encounterDate);
      await headerForm.save();
      await headerForm.expectSaveSuccess();
    });

    test('offers the combined Stress and anxiety box and no longer offers Stress, Anxiety or Anger', async ({
      page,
    }) => {
      const screeningForm = new MastercardFormPage(page);
      await screeningForm.enterNewFlowsheet('Mental Health Screening');

      const editTable = page.locator('table.visit-edit-table');
      await expect(editTable.getByLabel('Stress and anxiety', { exact: true })).toHaveCount(1);
      for (const removed of ['Stress', 'Anxiety', 'Anger']) {
        await expect(editTable.getByLabel(removed, { exact: true })).toHaveCount(0);
      }
    });

    test('a screening encounter is saved as MENTAL_HEALTH_SCREENING with every field on its own concept', async ({
      page,
      api,
      eligibleMentalHealthPatient,
    }) => {
      const screeningForm = new MastercardFormPage(page);
      await screeningForm.enterNewFlowsheet('Mental Health Screening');

      const outcomeDate = new Date().toISOString().slice(0, 10);
      const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await fillMentalHealthScreeningForm(screeningForm, { appointmentDate, outcomeDate });

      await screeningForm.save();
      await screeningForm.expectSaveSuccess();

      const res = await api.get(
        `encounter?patient=${eligibleMentalHealthPatient.uuid}&encounterType=${MENTAL_HEALTH_SCREENING_ENCOUNTER_TYPE_UUID}&v=full`,
      );
      expect(res.ok()).toBeTruthy();
      const { results } = await res.json();
      expect(results.length).toBe(1);
      expect(results[0].location?.display).toMatch(/neno district hospital/i);

      const obs = results[0].obs as RestObs[];
      const hasObs = (pattern: RegExp) => obs.some((o) => pattern.test(o.display));

      // Diagnoses — the new answers display by their concepts' fully specified
      // names, not the form's own short labels.
      for (const diagnosis of [
        'depression',
        'stress and anxiety',
        'grief and loss',
        'substance abuse',
        'suicide risk',
        'trauma or post-traumatic stress disorder',
        'gender-based violence',
        'high viral load',
      ]) {
        expect(hasObs(new RegExp(`^diagnosis: ${diagnosis}$`, 'i')), diagnosis).toBeTruthy();
      }

      // Interventions are saved against the "Mental health intervention" question.
      for (const intervention of [
        'problem management plus',
        'psychological first aid',
        'psychoeducation',
        'supportive counselling',
        'cognitive behavioural therapy',
        'interpersonal therapy',
        'case management',
        'couple or family counselling',
      ]) {
        expect(hasObs(new RegExp(`^mental health intervention: ${intervention}$`, 'i')), intervention).toBeTruthy();
      }

      // Each "Other" box and its Specify text are saved together in their row's own obs group.
      for (const { constructUuid, questionUuid, text } of [
        {
          constructUuid: OTHER_MENTAL_HEALTH_DIAGNOSIS_CONSTRUCT_UUID,
          questionUuid: DIAGNOSIS_CONCEPT_UUID,
          text: MENTAL_HEALTH_SCREENING_OTHER_DIAGNOSIS,
        },
        {
          constructUuid: OTHER_MENTAL_HEALTH_INTERVENTION_CONSTRUCT_UUID,
          questionUuid: MENTAL_HEALTH_INTERVENTION_CONCEPT_UUID,
          text: MENTAL_HEALTH_SCREENING_OTHER_INTERVENTION,
        },
      ]) {
        const groups = obs.filter((o) => o.concept.uuid === constructUuid);
        expect(groups.length).toBe(1);
        const members = groups[0].groupMembers ?? [];
        expect(
          members.some(
            (m) =>
              m.concept.uuid === questionUuid && (m.value as { uuid?: string })?.uuid === OTHER_CODED_CONCEPT_UUID,
          ),
        ).toBeTruthy();
        expect(members.some((m) => m.concept.uuid === OTHER_NON_CODED_TEXT_CONCEPT_UUID && m.value === text)).toBeTruthy();
      }

      expect(hasObs(/^session number: first$/i)).toBeTruthy();
      expect(hasObs(/^session notes: first session notes$/i)).toBeTruthy();
      expect(hasObs(/^outcome: relocated$/i)).toBeTruthy();
      expect(
        obs.some((o) => o.concept.uuid === OUTCOME_DATE_CONCEPT_UUID && String(o.value).startsWith(outcomeDate)),
      ).toBeTruthy();
      expect(hasObs(new RegExp(appointmentDate))).toBeTruthy();
    });

    test('a saved screening encounter is shown in the flowsheet table', async ({ page }) => {
      const screeningForm = new MastercardFormPage(page);
      await screeningForm.enterNewFlowsheet('Mental Health Screening');

      const outcomeDate = new Date().toISOString().slice(0, 10);
      const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await fillMentalHealthScreeningForm(screeningForm, { appointmentDate, outcomeDate });
      await screeningForm.save();
      await screeningForm.expectSaveSuccess();

      const row = page.locator('table.visit-table tr.visit-table-row', { hasText: 'First session notes' });
      await expect(row).toHaveCount(1);
      await expect(row).toContainText(MENTAL_HEALTH_SCREENING_OTHER_DIAGNOSIS);
      await expect(row).toContainText(MENTAL_HEALTH_SCREENING_OTHER_INTERVENTION);
      await expect(page.getByText(/BadFormDesignException/)).toHaveCount(0);
    });
  });
});
