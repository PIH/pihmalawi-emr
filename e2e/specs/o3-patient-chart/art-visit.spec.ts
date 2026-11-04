import { type APIRequestContext, type Page } from '@playwright/test';
import { test, expect } from '../../core';
import {
  ART_FOLLOWUP_ENCOUNTER_TYPE_UUID,
  ART_INITIAL_ENCOUNTER_TYPE_UUID,
  NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
} from '../../core/constants';
import { MastercardFormPage, MastercardGatePage } from '../../pages/mastercard-page';

// The ART card's forms, as art-emastercard.xml and art-visit.xml save them.
const ART_EMASTERCARD_FORM_UUID = 'a3cbdf5f-8c15-41b4-b97d-903ba3bd0532';
const ART_VISIT_FORM_UUID = '64db7fd5-c28d-4b85-87c4-d01e92ae004a';
const AGREES_TO_FOLLOW_UP_CONCEPT_UUID = '655fc526-977f-11e1-8993-905e29aff6c1';
const YES_CONCEPT_UUID = '65576354-977f-11e1-8993-905e29aff6c1';
const ART_REGIMEN_CONCEPT_UUID = '657ac57e-977f-11e1-8993-905e29aff6c1';
const REGIMEN_13A_UUID = '53009e3a-dc3f-11e8-9f8b-f2801f1b9fd1';
const PILL_COUNT_CONCEPT_UUID = '655fb892-977f-11e1-8993-905e29aff6c1';
const CLINIC_VISIT_TYPE_UUID = 'f01c54cb-2225-471a-9cd5-d348552c337c';

const today = () => new Date().toISOString().slice(0, 10);
const inThreeMonths = () => new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);

/** The card header, saved as art-emastercard.xml saves it, so ART visits can be recorded */
async function saveCardHeader(api: APIRequestContext, patientUuid: string) {
  const res = await api.post('encounter', {
    data: {
      patient: patientUuid,
      encounterType: ART_INITIAL_ENCOUNTER_TYPE_UUID,
      form: ART_EMASTERCARD_FORM_UUID,
      location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
      encounterDatetime: '2026-01-05',
      obs: [{ concept: AGREES_TO_FOLLOW_UP_CONCEPT_UUID, value: YES_CONCEPT_UUID }],
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

async function artVisits(api: APIRequestContext, patientUuid: string) {
  const res = await api.get(
    `encounter?patient=${patientUuid}&encounterType=${ART_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=custom:(uuid,form:(uuid),obs:(concept:(uuid),value))`,
  );
  expect(res.ok()).toBeTruthy();
  return (await res.json()).results;
}

async function openHivCare(page: Page, patientUuid: string) {
  await page.goto(`spa/patient/${patientUuid}/chart/hivCare`);
  await expect(page.getByRole('heading', { name: 'HIV care' })).toBeVisible();
}

const visitsTable = (page: Page) => page.getByRole('table', { name: 'ART visits' });

/** Records an ART visit on the HIV care page, in today's visit */
async function recordArtVisitInO3(page: Page, patientUuid: string) {
  await openHivCare(page, patientUuid);
  await page.getByRole('button', { name: 'Record ART visit' }).click();
  await page.getByLabel('ART regimen *').selectOption({ label: '13A' });
  await page.getByLabel('ARVs given (tablets) *').fill('90');
  await page.getByLabel('Pill count').fill('4');
  await page.getByLabel('Next appointment *').fill(inThreeMonths());
  await page.getByRole('button', { name: 'Save and close' }).click();
  await expect(visitsTable(page).getByRole('cell', { name: '13A', exact: true })).toBeVisible();
}

async function openLegacyCard(page: Page, patientUuid: string) {
  await page.goto(MastercardGatePage.buildCreateUrl(patientUuid, today()));
  await page.waitForLoadState('networkidle');
}

const legacyVisitRow = (page: Page) => page.locator('#flowsheet-section-ART_Visit .visit-table-row, .visit-table-row').filter({ hasText: '13A' }).first();

test.describe('ART visit recorded in O3', () => {
  test.beforeEach(async ({ page, api, eligibleHivArtPatient }) => {
    // The e2e session is created over REST without a location, which would make O3 stop at its location picker.
    const res = await page.request.post('ws/rest/v1/session', {
      data: { sessionLocation: NENO_DISTRICT_HOSPITAL_LOCATION_UUID },
    });
    expect(res.ok()).toBeTruthy();
    await saveCardHeader(api, eligibleHivArtPatient.uuid);
    await startVisit(api, eligibleHivArtPatient.uuid);
  });

  test('records an ART visit in O3 and the legacy ART card shows it', async ({ page, api, eligibleHivArtPatient }) => {
    await recordArtVisitInO3(page, eligibleHivArtPatient.uuid);

    const [visit] = await artVisits(api, eligibleHivArtPatient.uuid);
    expect(visit.form.uuid).toBe(ART_VISIT_FORM_UUID);
    expect(visit.obs).toContainEqual(
      expect.objectContaining({
        concept: expect.objectContaining({ uuid: ART_REGIMEN_CONCEPT_UUID }),
        value: expect.objectContaining({ uuid: REGIMEN_13A_UUID }),
      }),
    );

    await openLegacyCard(page, eligibleHivArtPatient.uuid);
    const row = legacyVisitRow(page);
    await expect(row).toBeVisible();
    await expect(row).toContainText('90');
  });

  test('edits that visit in the legacy form and O3 shows the change', async ({ page, eligibleHivArtPatient }) => {
    await recordArtVisitInO3(page, eligibleHivArtPatient.uuid);

    await openLegacyCard(page, eligibleHivArtPatient.uuid);
    await legacyVisitRow(page).locator('a').first().click();
    const form = new MastercardFormPage(page);
    await page.locator('#pillCount input').first().waitFor();
    await page.locator('#pillCount input').first().fill('7');
    await form.save();
    await form.expectSaveSuccess();

    await openHivCare(page, eligibleHivArtPatient.uuid);
    const row = visitsTable(page).getByRole('row').filter({ hasText: '13A' });
    await expect(row.getByRole('cell').nth(8)).toHaveText('7');
  });

  test('edits it in O3 and the legacy row updates', async ({ page, api, eligibleHivArtPatient }) => {
    await recordArtVisitInO3(page, eligibleHivArtPatient.uuid);

    await visitsTable(page).getByRole('row').filter({ hasText: '13A' }).getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByLabel('Pill count')).toHaveValue('4');
    await page.getByLabel('ARVs given (tablets) *').fill('60');
    await page.getByRole('button', { name: 'Save and close' }).click();
    await expect(visitsTable(page).getByRole('cell', { name: '60 (P)' }).or(visitsTable(page).getByRole('cell', { name: '60', exact: true }))).toBeVisible();

    const [visit] = await artVisits(api, eligibleHivArtPatient.uuid);
    expect(visit.obs.filter((o: { concept: { uuid: string } }) => o.concept.uuid === PILL_COUNT_CONCEPT_UUID)).toHaveLength(1);

    await openLegacyCard(page, eligibleHivArtPatient.uuid);
    await expect(legacyVisitRow(page)).toContainText('60');
  });
});
