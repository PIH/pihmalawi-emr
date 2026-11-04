import { type APIRequestContext, type Page } from '@playwright/test';
import { test, expect } from '../../core';
import { ART_INITIAL_ENCOUNTER_TYPE_UUID, NENO_DISTRICT_HOSPITAL_LOCATION_UUID } from '../../core/constants';
import { MastercardGatePage } from '../../pages/mastercard-page';

// The ART card header's form and concepts, as art-emastercard.xml saves them.
const ART_EMASTERCARD_FORM_UUID = 'a3cbdf5f-8c15-41b4-b97d-903ba3bd0532';
const AGREES_TO_FOLLOW_UP_CONCEPT_UUID = '655fc526-977f-11e1-8993-905e29aff6c1';
const YES_CONCEPT_UUID = '65576354-977f-11e1-8993-905e29aff6c1';
const LINK_ID_CONCEPT_UUID = 'b9e98a62-8437-4807-9df8-37f0046fd0e8';
const WHO_STAGE_CONCEPT_UUID = '65778170-977f-11e1-8993-905e29aff6c1';
const WHO_STAGE_2_UUID = '65749afa-977f-11e1-8993-905e29aff6c1';
const GUARDIAN_NAME_CONCEPT_UUID = '655bbc74-977f-11e1-8993-905e29aff6c1';

const today = () => new Date().toISOString().slice(0, 10);

async function cardHeaders(api: APIRequestContext, patientUuid: string) {
  const res = await api.get(
    `encounter?patient=${patientUuid}&encounterType=${ART_INITIAL_ENCOUNTER_TYPE_UUID}&v=custom:(uuid,form:(uuid),obs:(concept:(uuid),value))`,
  );
  expect(res.ok()).toBeTruthy();
  return (await res.json()).results;
}

const valueOf = (encounter, concept: string) => {
  const obs = encounter.obs.find((o) => o.concept.uuid.toLowerCase() === concept);
  return obs?.value?.uuid ?? obs?.value;
};

async function openHivCare(page: Page, patientUuid: string) {
  await page.goto(`spa/patient/${patientUuid}/chart/hivCare`);
  await expect(page.getByRole('heading', { name: 'HIV care' })).toBeVisible();
}

async function openLegacyCard(page: Page, patientUuid: string) {
  await page.goto(MastercardGatePage.buildCreateUrl(patientUuid, today()));
  await page.waitForLoadState('networkidle');
}

test.describe('ART card header edited in O3', () => {
  test.beforeEach(async ({ page }) => {
    // The e2e session is created over REST without a location, which would make O3 stop at its location picker.
    const res = await page.request.post('ws/rest/v1/session', {
      data: { sessionLocation: NENO_DISTRICT_HOSPITAL_LOCATION_UUID },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('creates the ART card header in O3 and the legacy header shows it', async ({ page, api, eligibleHivArtPatient }) => {
    await openHivCare(page, eligibleHivArtPatient.uuid);
    await expect(page.getByRole('button', { name: 'Record ART visit' })).toBeDisabled();

    await page.getByRole('region', { name: 'Patient and guardian' }).getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Guardian name').fill('E2E Guardian');
    await page.getByRole('group', { name: /Agrees to follow-up/ }).getByText('Yes').click();
    await page.getByRole('button', { name: 'Save and close' }).click();

    await expect(page.getByRole('region', { name: 'Patient and guardian' }).getByText('E2E Guardian')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Record ART visit' })).toBeEnabled();

    const [header] = await cardHeaders(api, eligibleHivArtPatient.uuid);
    expect(header.form.uuid).toBe(ART_EMASTERCARD_FORM_UUID);
    expect(valueOf(header, AGREES_TO_FOLLOW_UP_CONCEPT_UUID)).toBe(YES_CONCEPT_UUID);

    await openLegacyCard(page, eligibleHivArtPatient.uuid);
    await expect(page.getByText('E2E Guardian')).toBeVisible();
  });

  test('edits status at initiation in O3 and the legacy header shows the change without losing confirmatory test values', async ({
    page,
    api,
    eligibleHivArtPatient,
  }) => {
    const res = await api.post('encounter', {
      data: {
        patient: eligibleHivArtPatient.uuid,
        encounterType: ART_INITIAL_ENCOUNTER_TYPE_UUID,
        form: ART_EMASTERCARD_FORM_UUID,
        location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
        encounterDatetime: '2026-01-05',
        obs: [
          { concept: AGREES_TO_FOLLOW_UP_CONCEPT_UUID, value: YES_CONCEPT_UUID },
          { concept: LINK_ID_CONCEPT_UUID, value: 'HTC-E2E-1' },
          { concept: GUARDIAN_NAME_CONCEPT_UUID, value: 'Kept Guardian' },
        ],
      },
    });
    expect(res.ok()).toBeTruthy();

    await openHivCare(page, eligibleHivArtPatient.uuid);
    await page.getByRole('region', { name: 'Status at ART initiation' }).getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('group', { name: 'WHO stage' }).getByText('Stage 2').click();
    await page.getByRole('button', { name: 'Save and close' }).click();
    await expect(page.getByRole('region', { name: 'Status at ART initiation' }).getByText('Stage 2')).toBeVisible();

    const headers = await cardHeaders(api, eligibleHivArtPatient.uuid);
    expect(headers).toHaveLength(1);
    expect(valueOf(headers[0], WHO_STAGE_CONCEPT_UUID)).toBe(WHO_STAGE_2_UUID);
    expect(valueOf(headers[0], LINK_ID_CONCEPT_UUID)).toBe('HTC-E2E-1');

    await openLegacyCard(page, eligibleHivArtPatient.uuid);
    await expect(page.getByText('HTC-E2E-1')).toBeVisible();
    await expect(page.getByText('Kept Guardian')).toBeVisible();
  });
});
