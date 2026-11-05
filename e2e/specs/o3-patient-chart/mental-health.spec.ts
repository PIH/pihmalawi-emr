import { type APIRequestContext, type Page } from '@playwright/test';
import { test, expect } from '../../core';
import {
  MENTAL_HEALTH_FOLLOWUP_ENCOUNTER_TYPE_UUID,
  MENTAL_HEALTH_INITIAL_ENCOUNTER_TYPE_UUID,
  NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
} from '../../core/constants';

// The Mental Health eMastercard header, as mental-health-emastercard.xml saves it
const MH_EMASTERCARD_FORM_UUID = '38A60208-3227-4CE7-AB2A-5802F8866BD4';
const AGREES_TO_FOLLOW_UP_CONCEPT_UUID = '655fc526-977f-11e1-8993-905e29aff6c1';
const YES_CONCEPT_UUID = '65576354-977f-11e1-8993-905e29aff6c1';
const DIAGNOSIS_GROUP_CONCEPT_UUID = '6db168f1-0f38-42d9-9f0e-90946a3d8e72';
const DIAGNOSIS_CONCEPT_UUID = '65671c9a-977f-11e1-8993-905e29aff6c1';
const DIAGNOSIS_DATE_CONCEPT_UUID = '65732bf2-977f-11e1-8993-905e29aff6c1';
const SCHIZOPHRENIA_UUID = '654860c0-977f-11e1-8993-905e29aff6c1';
const CLINIC_VISIT_TYPE_UUID = 'f01c54cb-2225-471a-9cd5-d348552c337c';
const SCREENING_ENCOUNTER_TYPE_UUID = '1ec34eeb-0776-4f58-871e-fe0026fda111';

const inAMonth = () => new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

async function saveCardHeader(api: APIRequestContext, patientUuid: string) {
  const res = await api.post('encounter', {
    data: {
      patient: patientUuid,
      encounterType: MENTAL_HEALTH_INITIAL_ENCOUNTER_TYPE_UUID,
      form: MH_EMASTERCARD_FORM_UUID,
      location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
      encounterDatetime: '2026-01-05',
      obs: [
        { concept: AGREES_TO_FOLLOW_UP_CONCEPT_UUID, value: YES_CONCEPT_UUID },
        {
          concept: DIAGNOSIS_GROUP_CONCEPT_UUID,
          groupMembers: [
            { concept: DIAGNOSIS_CONCEPT_UUID, value: SCHIZOPHRENIA_UUID },
            { concept: DIAGNOSIS_DATE_CONCEPT_UUID, value: '2026-01-05' },
          ],
        },
      ],
    },
  });
  expect(res.ok()).toBeTruthy();
}

async function startVisit(api: APIRequestContext, patientUuid: string) {
  const res = await api.post('visit', {
    data: {
      patient: patientUuid,
      visitType: CLINIC_VISIT_TYPE_UUID,
      location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
      startDatetime: new Date(Date.now() - 60 * 1000).toISOString(),
    },
  });
  expect(res.ok()).toBeTruthy();
}

async function openMentalHealth(page: Page, patientUuid: string) {
  await page.goto(`spa/patient/${patientUuid}/chart/mentalHealth`);
  await expect(page.getByRole('heading', { name: 'Mental health', exact: true })).toBeVisible();
}

async function encounters(api: APIRequestContext, patientUuid: string, encounterType: string) {
  const res = await api.get(`encounter?patient=${patientUuid}&encounterType=${encounterType}&v=custom:(uuid,obs:(display))`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()).results as Array<{ uuid: string; obs: Array<{ display: string }> }>;
}

async function recordVisit(page: Page, weight: string) {
  await page.getByRole('button', { name: 'Record mental health visit' }).click();
  await page.getByLabel('Weight').fill(weight);
  await page.getByRole('group', { name: 'Hallucinations' }).getByText('Yes').click();
  await page.getByRole('group', { name: 'Patient stable?' }).getByText('Yes').click();
  await page.getByText('Chloropromazine (CPZ)', { exact: true }).click();
  await page.getByLabel('Chloropromazine (CPZ) dose').fill('100');
  await page.getByLabel('Chloropromazine (CPZ) unit').selectOption({ label: 'mg' });
  await page.getByLabel('Chloropromazine (CPZ) frequency').selectOption({ label: 'OD' });
  await page.getByLabel('Next appointment *').fill(inAMonth());
  await page.getByRole('button', { name: 'Save and close' }).click();
}

test.describe('Mental health card in O3', () => {
  test.beforeEach(async ({ page }) => {
    // The e2e session is created over REST without a location, which would make O3 stop at its location picker.
    const session = await page.request.post('ws/rest/v1/session', { data: { sessionLocation: NENO_DISTRICT_HOSPITAL_LOCATION_UUID } });
    expect(session.ok()).toBeTruthy();
  });

  test('starts the card in O3', async ({ page, api, eligibleMentalHealthPatient }) => {
    await openMentalHealth(page, eligibleMentalHealthPatient.uuid);
    await expect(page.getByRole('button', { name: 'Record mental health visit' })).toBeDisabled();
    await page.getByRole('region', { name: 'Diagnoses' }).getByRole('button', { name: 'Start the card' }).click();
    await page.getByText('Schizophrenia', { exact: true }).click();
    await page.getByLabel('Schizophrenia date').fill('2026-01-05');
    await page.getByRole('group', { name: /Agrees to follow-up/ }).getByText('Yes').click();
    await page.getByRole('button', { name: 'Save and close' }).click();

    await expect(page.getByRole('region', { name: 'Diagnoses' }).getByText('Schizophrenia · 05-Jan-2026')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Record mental health visit' })).toBeEnabled();
    expect(await encounters(api, eligibleMentalHealthPatient.uuid, MENTAL_HEALTH_INITIAL_ENCOUNTER_TYPE_UUID)).toHaveLength(1);
  });

  test('edits History and exposures and the legacy card shows it', async ({ page, eligibleMentalHealthPatient, api }) => {
    await saveCardHeader(api, eligibleMentalHealthPatient.uuid);
    await openMentalHealth(page, eligibleMentalHealthPatient.uuid);
    await page.getByRole('region', { name: 'History and exposures' }).getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('TB year').fill('2019');
    await page.getByRole('button', { name: 'Save and close' }).click();
    await expect(page.getByRole('region', { name: 'History and exposures' }).getByText('2019')).toBeVisible();

    const [header] = await encounters(api, eligibleMentalHealthPatient.uuid, MENTAL_HEALTH_INITIAL_ENCOUNTER_TYPE_UUID);
    expect(header.obs.map((o) => o.display).join(' ')).toMatch(/2019/);
    // the diagnosis the header already had is still there
    expect(header.obs.map((o) => o.display).join(' ')).toMatch(/Schizophrenia/i);
  });

  test('records a visit; the page and the legacy card show it', async ({ page, api, eligibleMentalHealthPatient }) => {
    await saveCardHeader(api, eligibleMentalHealthPatient.uuid);
    await startVisit(api, eligibleMentalHealthPatient.uuid);
    await openMentalHealth(page, eligibleMentalHealthPatient.uuid);
    await recordVisit(page, '55');

    const visits = page.getByRole('table', { name: 'Mental health visits' });
    await expect(visits.getByText('CPZ 100 mg OD')).toBeVisible();
    await expect(page.getByRole('table', { name: 'Mental status examination' }).getByText('Present')).toBeVisible();
    const [saved] = await encounters(api, eligibleMentalHealthPatient.uuid, MENTAL_HEALTH_FOLLOWUP_ENCOUNTER_TYPE_UUID);
    expect(saved.obs.map((o) => o.display).join(' ')).toMatch(/Chlorpromazine/i);

    const cards = await (await api.get(`pihmalawi/emastercards?patient=${eligibleMentalHealthPatient.uuid}`)).json();
    const card = cards.results.find((c: { key: string }) => c.key === 'mental-health');
    await page.goto(card.flowsheetPath);
    await expect(page.locator('.visit-table-row').filter({ hasText: '55' })).not.toHaveCount(0);
  });

  test('edits it in O3', async ({ page, api, eligibleMentalHealthPatient }) => {
    await saveCardHeader(api, eligibleMentalHealthPatient.uuid);
    await startVisit(api, eligibleMentalHealthPatient.uuid);
    await openMentalHealth(page, eligibleMentalHealthPatient.uuid);
    await recordVisit(page, '55');
    const row = page.getByRole('table', { name: 'Mental health visits' }).getByRole('row').nth(1);
    await row.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('group', { name: 'Hallucinations' }).getByText('No').click();
    await page.getByRole('button', { name: 'Save and close' }).click();
    await expect(page.getByRole('table', { name: 'Mental status examination' }).getByText('Absent')).toBeVisible();
    const [saved] = await encounters(api, eligibleMentalHealthPatient.uuid, MENTAL_HEALTH_FOLLOWUP_ENCOUNTER_TYPE_UUID);
    expect(saved.obs.filter((o) => /Hallucinations/i.test(o.display))).toHaveLength(1);
  });

  test('Record mental health visit opens a blank visit, even while an earlier one is open for editing', async ({
    page,
    api,
    eligibleMentalHealthPatient,
  }) => {
    await saveCardHeader(api, eligibleMentalHealthPatient.uuid);
    await startVisit(api, eligibleMentalHealthPatient.uuid);
    await openMentalHealth(page, eligibleMentalHealthPatient.uuid);
    await recordVisit(page, '55');
    await page.getByRole('table', { name: 'Mental health visits' }).getByRole('row').nth(1).getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByLabel('Chloropromazine (CPZ) dose')).toHaveValue('100');
    await page.getByRole('button', { name: 'Record mental health visit' }).click();
    await expect(page.getByText('Record mental health visit', { exact: true }).last()).toBeVisible();
    await expect(page.getByLabel('Chloropromazine (CPZ)')).not.toBeChecked();
    // the next appointment is prefilled from the one recorded today, as the form's script does
  });

  test('records a screening and lists it', async ({ page, api, eligibleMentalHealthPatient }) => {
    await saveCardHeader(api, eligibleMentalHealthPatient.uuid);
    await startVisit(api, eligibleMentalHealthPatient.uuid);
    await openMentalHealth(page, eligibleMentalHealthPatient.uuid);
    await page.getByRole('button', { name: 'Record screening' }).click();
    await page.getByText('Depression', { exact: true }).click();
    await page.getByText('PM +', { exact: true }).click();
    await page.getByText('Session 1', { exact: true }).click();
    await page.getByLabel('Next appointment *').fill(inAMonth());
    await page.getByRole('button', { name: 'Save and close' }).click();
    await expect(page.getByRole('table', { name: 'Screenings' }).getByText('Depression')).toBeVisible();
    expect(await encounters(api, eligibleMentalHealthPatient.uuid, SCREENING_ENCOUNTER_TYPE_UUID)).toHaveLength(1);
  });

  test('Record screening opens a blank form while one is open for editing', async ({ page, api, eligibleMentalHealthPatient }) => {
    await saveCardHeader(api, eligibleMentalHealthPatient.uuid);
    await startVisit(api, eligibleMentalHealthPatient.uuid);
    await openMentalHealth(page, eligibleMentalHealthPatient.uuid);
    await page.getByRole('button', { name: 'Record screening' }).click();
    await page.getByText('Depression', { exact: true }).click();
    await page.getByLabel('Session notes').fill('first');
    await page.getByLabel('Next appointment *').fill(inAMonth());
    await page.getByRole('button', { name: 'Save and close' }).click();
    await page.getByRole('table', { name: 'Screenings' }).getByRole('row').nth(1).getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByLabel('Session notes')).toHaveValue('first');
    await page.getByRole('button', { name: 'Record screening' }).click();
    await expect(page.getByLabel('Session notes')).toHaveValue('');
  });
});
