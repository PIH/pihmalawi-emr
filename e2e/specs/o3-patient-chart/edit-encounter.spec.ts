import { type Page } from '@playwright/test';
import { test, expect } from '../../core';
import {
  ART_FOLLOWUP_ENCOUNTER_TYPE_UUID,
  ART_INITIAL_ENCOUNTER_TYPE_UUID,
  ART_VISIT_FORM_UUID,
  MENTAL_HEALTH_SCREENING_ENCOUNTER_TYPE_UUID,
  NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
} from '../../core/constants';

const WEIGHT_CONCEPT_UUID = '6569c44a-977f-11e1-8993-905e29aff6c1';
const MENTAL_HEALTH_SCREENING_FORM_UUID = '8bb404f3-f224-40dd-b0c4-76e1b8a119e4';

async function editEncounterFromAllEncounters(page: Page, patientUuid: string, encounterTypeName: RegExp) {
  await page.goto(`spa/patient/${patientUuid}/chart/Visits`);
  await page.getByRole('tab', { name: 'All encounters' }).click();
  const row = page.getByRole('row', { name: encounterTypeName });
  await row.getByRole('button', { name: 'Expand current row' }).click();
  await page.getByRole('button', { name: 'Edit this encounter' }).click();
}

test.describe('Edit this encounter, in the O3 patient chart', () => {
  test.beforeEach(async ({ page }) => {
    const res = await page.request.post('ws/rest/v1/session', {
      data: { sessionLocation: NENO_DISTRICT_HOSPITAL_LOCATION_UUID },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("opens the encounter's eMastercard to enter data in", async ({ page, api, eligibleHivArtPatient }) => {
    for (const data of [
      { encounterType: ART_INITIAL_ENCOUNTER_TYPE_UUID, encounterDatetime: '2026-01-05' },
      {
        encounterType: ART_FOLLOWUP_ENCOUNTER_TYPE_UUID,
        form: ART_VISIT_FORM_UUID,
        encounterDatetime: '2026-02-05',
        obs: [{ concept: WEIGHT_CONCEPT_UUID, value: 61 }],
      },
    ]) {
      const res = await api.post('encounter', {
        data: { patient: eligibleHivArtPatient.uuid, location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID, ...data },
      });
      expect(res.ok()).toBeTruthy();
    }

    await editEncounterFromAllEncounters(page, eligibleHivArtPatient.uuid, /ART_FOLLOWUP/);

    const frame = page.locator('iframe[title="ART eMastercard"]');
    await expect(frame).toHaveAttribute('src', /headerForm=file:configuration\/htmlforms\/art-emastercard\.xml/);
    await expect(page.frameLocator('iframe[title="ART eMastercard"]').locator('.visit-table-row')).not.toHaveCount(0);
    await expect(page.getByText('There was an error with this form')).toHaveCount(0);
  });

  test("says when an encounter isn't on any of the patient's eMastercards", async ({
    page,
    api,
    eligibleMentalHealthPatient,
  }) => {
    const res = await api.post('encounter', {
      data: {
        patient: eligibleMentalHealthPatient.uuid,
        encounterType: MENTAL_HEALTH_SCREENING_ENCOUNTER_TYPE_UUID,
        form: MENTAL_HEALTH_SCREENING_FORM_UUID,
        location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
        encounterDatetime: '2026-02-05',
      },
    });
    expect(res.ok()).toBeTruthy();

    await editEncounterFromAllEncounters(page, eligibleMentalHealthPatient.uuid, /MENTAL_HEALTH_SCREENING/);

    await expect(page.getByText(/This encounter can't be edited here/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open the patient dashboard' })).toBeVisible();
  });
});
