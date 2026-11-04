import { type APIRequestContext, type Page } from '@playwright/test';
import { test, expect } from '../../core';
import { ART_INITIAL_ENCOUNTER_TYPE_UUID, NENO_DISTRICT_HOSPITAL_LOCATION_UUID } from '../../core/constants';
import { MastercardGatePage } from '../../pages/mastercard-page';

// The forms and concepts the viral load and follow-up testing panels save, as their HTML forms do.
const ART_EMASTERCARD_FORM_UUID = 'a3cbdf5f-8c15-41b4-b97d-903ba3bd0532';
const VIRAL_LOAD_ENCOUNTER_TYPE_UUID = '9959a261-2122-4ae1-a89d-1ca444b712ea';
const VIRAL_LOAD_FORM_UUID = 'badbb502-9718-11e7-8999-ad34fd5ac8df';
const FOLLOW_UP_TESTING_ENCOUNTER_TYPE_UUID = '4104867f-8f40-4273-bc42-a67958e599eb';
const FOLLOW_UP_TESTING_FORM_UUID = '1caa998f-2f21-4568-b319-0618f6733284';
const AGREES_TO_FOLLOW_UP_CONCEPT_UUID = '655fc526-977f-11e1-8993-905e29aff6c1';
const YES_CONCEPT_UUID = '65576354-977f-11e1-8993-905e29aff6c1';
const CLINIC_VISIT_TYPE_UUID = 'f01c54cb-2225-471a-9cd5-d348552c337c';

const today = () => new Date().toISOString().slice(0, 10);

async function encounters(api: APIRequestContext, patientUuid: string, encounterType: string) {
  const res = await api.get(`encounter?patient=${patientUuid}&encounterType=${encounterType}&v=custom:(uuid,form:(uuid))`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()).results;
}

async function openHivCare(page: Page, patientUuid: string) {
  await page.goto(`spa/patient/${patientUuid}/chart/hivCare`);
  await expect(page.getByRole('heading', { name: 'HIV care' })).toBeVisible();
}

test.describe('ART tests recorded in O3', () => {
  test.beforeEach(async ({ page, api, eligibleHivArtPatient }) => {
    // The e2e session is created over REST without a location, which would make O3 stop at its location picker.
    const session = await page.request.post('ws/rest/v1/session', {
      data: { sessionLocation: NENO_DISTRICT_HOSPITAL_LOCATION_UUID },
    });
    expect(session.ok()).toBeTruthy();
    const header = await api.post('encounter', {
      data: {
        patient: eligibleHivArtPatient.uuid,
        encounterType: ART_INITIAL_ENCOUNTER_TYPE_UUID,
        form: ART_EMASTERCARD_FORM_UUID,
        location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
        encounterDatetime: '2026-01-05',
        obs: [{ concept: AGREES_TO_FOLLOW_UP_CONCEPT_UUID, value: YES_CONCEPT_UUID }],
      },
    });
    expect(header.ok()).toBeTruthy();
    const visit = await api.post('visit', {
      data: {
        patient: eligibleHivArtPatient.uuid,
        visitType: CLINIC_VISIT_TYPE_UUID,
        location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
        startDatetime: new Date(Date.now() - 60 * 1000).toISOString(),
      },
    });
    expect(visit.ok()).toBeTruthy();
  });

  test('records a viral load in O3; the legacy viral load section and the HIV care headline show it', async ({
    page,
    api,
    eligibleHivArtPatient,
  }) => {
    await openHivCare(page, eligibleHivArtPatient.uuid);
    await page.getByRole('button', { name: 'Record viral load' }).click();
    await page.getByText('Routine', { exact: true }).click();
    await page.getByText('Bled', { exact: true }).click();
    await page.getByLabel('Sample ID').fill('S-E2E-1');
    await page.getByLabel('Viral load', { exact: true }).fill('1234');
    await page.getByRole('button', { name: 'Save and close' }).click();

    await expect(page.getByRole('region', { name: 'HIV at a glance' }).getByText('1234')).toBeVisible();
    const [saved] = await encounters(api, eligibleHivArtPatient.uuid, VIRAL_LOAD_ENCOUNTER_TYPE_UUID);
    expect(saved.form.uuid).toBe(VIRAL_LOAD_FORM_UUID);

    await page.goto(MastercardGatePage.buildCreateUrl(eligibleHivArtPatient.uuid, today()));
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.visit-table-row').filter({ hasText: 'S-E2E-1' })).toContainText('1234');
  });

  test('records follow-up tests in O3; the legacy card shows them', async ({ page, api, eligibleHivArtPatient }) => {
    await openHivCare(page, eligibleHivArtPatient.uuid);
    await page.getByRole('button', { name: 'Record follow-up tests' }).click();
    await page.getByLabel('CD4 count').fill('543');
    await page.getByLabel('PHQ-9 score').fill('3');
    await page.getByRole('button', { name: 'Save and close' }).click();

    await expect(page.getByRole('region', { name: 'HIV at a glance' }).getByText('543')).toBeVisible();
    const [saved] = await encounters(api, eligibleHivArtPatient.uuid, FOLLOW_UP_TESTING_ENCOUNTER_TYPE_UUID);
    expect(saved.form.uuid).toBe(FOLLOW_UP_TESTING_FORM_UUID);

    await page.goto(MastercardGatePage.buildCreateUrl(eligibleHivArtPatient.uuid, today()));
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.visit-table-row').filter({ hasText: '543' })).toBeVisible();
  });
});
