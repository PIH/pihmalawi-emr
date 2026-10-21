import { test, expect } from '../../core';
import {
  MastercardFormPage,
  MentalHealthMastercardGatePage,
  fillMentalHealthHeaderMinimum,
  fillMentalHealthScreeningForm,
} from '../../pages';
import { MENTAL_HEALTH_SCREENING_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test.describe('Mental Health screening mastercard', () => {
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

  test('offers the combined Stress and anxiety box and no longer offers Stress, Anxiety or Anger', async ({ page }) => {
    const screeningForm = new MastercardFormPage(page);
    await screeningForm.enterNewFlowsheet('Mental Health Screening');

    const editTable = page.locator('table.visit-edit-table');
    await expect(editTable.getByLabel('Stress and anxiety', { exact: true })).toHaveCount(1);
    for (const removed of ['Stress', 'Anxiety', 'Anger']) {
      await expect(editTable.getByLabel(removed, { exact: true })).toHaveCount(0);
    }
  });

  test('a screening encounter can be entered and is saved as MENTAL_HEALTH_SCREENING', async ({
    page,
    api,
    eligibleMentalHealthPatient,
  }) => {
    const screeningForm = new MastercardFormPage(page);
    await screeningForm.enterNewFlowsheet('Mental Health Screening');

    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillMentalHealthScreeningForm(screeningForm, { appointmentDate });

    await screeningForm.save();
    await screeningForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligibleMentalHealthPatient.uuid}&encounterType=${MENTAL_HEALTH_SCREENING_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);
    expect(results[0].location?.display).toMatch(/neno district hospital/i);

    const obs = results[0].obs as Array<{ display: string }>;
    const hasObs = (pattern: RegExp) => obs.some((o) => pattern.test(o.display));

    // Diagnoses — the new answers display by their concepts' fully specified
    // names, not the form's own short labels.
    expect(hasObs(/^diagnosis: depression$/i)).toBeTruthy();
    expect(hasObs(/^diagnosis: stress and anxiety$/i)).toBeTruthy();
    expect(hasObs(/^diagnosis: suicide risk$/i)).toBeTruthy();
    expect(hasObs(/^diagnosis: trauma or post-traumatic stress disorder$/i)).toBeTruthy();
    expect(hasObs(/^diagnosis: gender-based violence$/i)).toBeTruthy();
    expect(hasObs(/^diagnosis: high viral load$/i)).toBeTruthy();

    // Interventions are saved against the "Clinical progress" question.
    expect(hasObs(/^clinical progress: couple or family counselling$/i)).toBeTruthy();

    expect(hasObs(/first session notes/i)).toBeTruthy();
    expect(hasObs(new RegExp(appointmentDate))).toBeTruthy();
  });
});
