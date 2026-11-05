import { type Page } from '@playwright/test';
import { test, expect } from '../../core';
import {
  ART_FOLLOWUP_ENCOUNTER_TYPE_UUID,
  ART_INITIAL_ENCOUNTER_TYPE_UUID,
  ART_VISIT_FORM_UUID,
  EPILEPSY_FOLLOWUP_ENCOUNTER_TYPE_UUID,
  EPILEPSY_INITIAL_ENCOUNTER_TYPE_UUID,
  MENTAL_HEALTH_FOLLOWUP_ENCOUNTER_TYPE_UUID,
  MENTAL_HEALTH_INITIAL_ENCOUNTER_TYPE_UUID,
  NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
} from '../../core/constants';

const WEIGHT_CONCEPT_UUID = '6569c44a-977f-11e1-8993-905e29aff6c1';
// "Epilepsy Visit", one of the Epilepsy eMastercard's flowsheet forms, which stays a legacy flowsheet.
const EPILEPSY_VISIT_FORM_UUID = '11FF7E89-BCB4-4947-BDF0-5ABA4A963E85';
// "Mental Health Visit", one of the Mental Health eMastercard's flowsheet forms.
const MENTAL_HEALTH_VISIT_FORM_UUID = 'F374493E-8038-4F81-AE3D-79D2D0EC4D1C';

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

  test("opens the encounter's eMastercard to enter data in", async ({ page, api, eligibleEpilepsyPatient }) => {
    for (const data of [
      { encounterType: EPILEPSY_INITIAL_ENCOUNTER_TYPE_UUID, encounterDatetime: '2026-01-05' },
      {
        encounterType: EPILEPSY_FOLLOWUP_ENCOUNTER_TYPE_UUID,
        form: EPILEPSY_VISIT_FORM_UUID,
        encounterDatetime: '2026-02-05',
        obs: [{ concept: WEIGHT_CONCEPT_UUID, value: 61 }],
      },
    ]) {
      const res = await api.post('encounter', {
        data: { patient: eligibleEpilepsyPatient.uuid, location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID, ...data },
      });
      expect(res.ok()).toBeTruthy();
    }

    await editEncounterFromAllEncounters(page, eligibleEpilepsyPatient.uuid, /EPILEPSY_FOLLOWUP/);

    const frame = page.locator('iframe[title="Epilepsy eMastercard"]');
    await expect(frame).toHaveAttribute('src', /headerForm=file:configuration\/htmlforms\/epilepsy-emastercard\.xml/);
    await expect(page.frameLocator('iframe[title="Epilepsy eMastercard"]').locator('.visit-table-row')).not.toHaveCount(0);
    await expect(page.getByText('There was an error with this form')).toHaveCount(0);
  });

  test('"Edit this encounter" on a mental health visit opens the native panel', async ({ page, api, eligibleMentalHealthPatient }) => {
    for (const data of [
      { encounterType: MENTAL_HEALTH_INITIAL_ENCOUNTER_TYPE_UUID, encounterDatetime: '2026-01-05' },
      {
        encounterType: MENTAL_HEALTH_FOLLOWUP_ENCOUNTER_TYPE_UUID,
        form: MENTAL_HEALTH_VISIT_FORM_UUID,
        encounterDatetime: '2026-02-05',
        obs: [{ concept: WEIGHT_CONCEPT_UUID, value: 61 }],
      },
    ]) {
      const res = await api.post('encounter', {
        data: { patient: eligibleMentalHealthPatient.uuid, location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID, ...data },
      });
      expect(res.ok()).toBeTruthy();
    }

    await editEncounterFromAllEncounters(page, eligibleMentalHealthPatient.uuid, /MENTAL_HEALTH_FOLLOWUP/);

    await expect(page.getByText('Edit mental health visit')).toBeVisible();
    await expect(page.locator('iframe[title="Mental Health eMastercard"]')).toHaveCount(0);
  });

  test('"Edit this encounter" on an ART visit opens the native panel', async ({ page, api, eligibleHivArtPatient }) => {
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

    await expect(page.getByText('Edit ART visit')).toBeVisible();
    await expect(page.getByLabel('Weight')).toHaveValue('61');
    await expect(page.locator('iframe[title="ART eMastercard"]')).toHaveCount(0);
  });

  test("says when an encounter isn't on any of the patient's eMastercards", async ({
    page,
    api,
    eligibleMentalHealthPatient,
  }) => {
    const res = await api.post('encounter', {
      data: {
        patient: eligibleMentalHealthPatient.uuid,
        // the patient has no epilepsy card; O3 offers "Edit this encounter" only for encounters with a form
        encounterType: EPILEPSY_FOLLOWUP_ENCOUNTER_TYPE_UUID,
        form: EPILEPSY_VISIT_FORM_UUID,
        location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
        encounterDatetime: '2026-02-05',
      },
    });
    expect(res.ok()).toBeTruthy();

    await editEncounterFromAllEncounters(page, eligibleMentalHealthPatient.uuid, /EPILEPSY_FOLLOWUP/);

    await expect(page.getByText(/This encounter can't be edited here/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open the patient dashboard' })).toBeVisible();
  });
});
