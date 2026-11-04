import { type APIRequestContext, type Page } from '@playwright/test';
import { test, expect } from '../../core';
import {
  MENTAL_HEALTH_FOLLOWUP_ENCOUNTER_TYPE_UUID,
  MENTAL_HEALTH_INITIAL_ENCOUNTER_TYPE_UUID,
  MENTAL_HEALTH_SCREENING_ENCOUNTER_TYPE_UUID,
  NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
} from '../../core/constants';
import { MastercardFormPage, MentalHealthMastercardGatePage, fillMentalHealthHeaderMinimum } from '../../pages';

// O3 must save exactly what the mental health HTML forms save: the same encounter type, form, provider and
// encounter role, and the same obs, groups included, for the same answers.

const CLINIC_VISIT_TYPE_UUID = 'f01c54cb-2225-471a-9cd5-d348552c337c';
const CPZ_UUID = '654b00aa-977f-11e1-8993-905e29aff6c1';
const day = (offset: number) => new Date(Date.now() + offset * 24 * 3600 * 1000).toISOString().slice(0, 10);

type Shape = { encounterType: string; form: string; providers: Array<string>; obs: Array<string> };

async function shapes(api: APIRequestContext, patientUuid: string, encounterType: string): Promise<Array<Shape & { uuid: string }>> {
  const member = 'uuid,concept:(uuid),value,comment';
  const res = await api.get(
    `encounter?patient=${patientUuid}&encounterType=${encounterType}&v=custom:(uuid,encounterType:(uuid),form:(uuid),` +
      `encounterProviders:(provider:(uuid),encounterRole:(uuid)),obs:(${member},groupMembers:(${member})))`,
  );
  expect(res.ok()).toBeTruthy();
  // dates compare by day; coded answers by uuid
  const value = (v) => (v && typeof v === 'object' ? v.uuid : typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) ? v.slice(0, 10) : v);
  const pair = (o) => `${o.concept.uuid.toLowerCase()}=${value(o.value)}${o.comment ? `#${o.comment}` : ''}`;
  return (await res.json()).results.map((e) => ({
    uuid: e.uuid,
    encounterType: e.encounterType.uuid.toLowerCase(),
    form: e.form?.uuid?.toLowerCase() ?? null,
    providers: e.encounterProviders.map((p) => `${p.provider.uuid}/${p.encounterRole.uuid}`).sort(),
    obs: e.obs
      .map((o) => (o.groupMembers?.length ? `${o.concept.uuid.toLowerCase()}{${o.groupMembers.map(pair).sort().join(',')}}` : pair(o)))
      .sort(),
  }));
}

const withoutUuid = ({ uuid, ...shape }: Shape & { uuid: string }) => shape;

async function purge(api: APIRequestContext, encounterUuid: string) {
  const obs = await api.get(`obs?encounter=${encounterUuid}&includeAll=true&v=custom:(uuid)&limit=100`);
  let remaining = (await obs.json()).results;
  for (let pass = 0; remaining.length && pass < 5; pass++) {
    const failed = [];
    for (const o of remaining) {
      if (!(await api.delete(`obs/${o.uuid}?purge=true`)).ok()) {
        failed.push(o);
      }
    }
    remaining = failed;
  }
  expect((await api.delete(`encounter/${encounterUuid}?purge=true`)).ok()).toBeTruthy();
}

/** The card header through the HTML form, dated yesterday, with the flowsheet left open */
async function legacyHeader(page: Page, patientUuid: string) {
  const form = await MastercardFormPage.openCreateAtUrl(page, MentalHealthMastercardGatePage.buildCreateUrl(patientUuid, day(-1)));
  await fillMentalHealthHeaderMinimum(form, day(-1));
  await form.save();
  await form.expectSaveSuccess();
  return form;
}

/** Opens a flowsheet form of the legacy card for a new entry on a date, as its Enter New link does */
async function enterLegacy(page: Page, label: string, date: string) {
  const link = page.locator('a.form-action-link', { hasText: `Enter New ${label}` }).first();
  const formName = (await link.getAttribute('onclick')).match(/enterVisit\('([^']+)'/)[1];
  await page.evaluate(([name, d]) => (window as any).flowsheet.enterVisit(name, d), [formName, date]);
  await page.locator('.submitButton').first().waitFor({ state: 'attached' });
}

const panel = (page: Page) => page.locator('#omrs-workspaces-container');

async function startVisitAndOpen(page: Page, api: APIRequestContext, patientUuid: string) {
  const visit = await api.post('visit', {
    data: {
      patient: patientUuid,
      visitType: CLINIC_VISIT_TYPE_UUID,
      location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
      startDatetime: new Date(Date.now() - 60 * 1000).toISOString(),
    },
  });
  expect(visit.ok()).toBeTruthy();
  await page.goto(`spa/patient/${patientUuid}/chart/mentalHealth`);
  await expect(page.getByRole('heading', { name: 'Mental health', exact: true })).toBeVisible();
}

test.describe('Mental health encounters saved in O3 match the HTML forms', () => {
  test.beforeEach(async ({ page }) => {
    // The e2e session is created over REST without a location, which would make O3 stop at its location picker.
    const res = await page.request.post('ws/rest/v1/session', { data: { sessionLocation: NENO_DISTRICT_HOSPITAL_LOCATION_UUID } });
    expect(res.ok()).toBeTruthy();
  });

  test('an O3 mental health visit matches an HTML-form visit with the same inputs', async ({ page, api, eligibleMentalHealthPatient }) => {
    const patientUuid = eligibleMentalHealthPatient.uuid;
    const next = day(30);

    const form = await legacyHeader(page, patientUuid);
    await enterLegacy(page, 'Mental Health Visit', day(-1));
    await form.selectDropdown('visitLocation', 'Neno District Hospital');
    await form.fillField('weightInput', '55');
    await form.selectRadio('Patient stable?', 'Yes');
    await form.checkByLabel('Chloropromazine (CPZ)');
    await form.fillField(`dose_${CPZ_UUID}`, '100');
    await form.selectDropdown(`doseUnit_${CPZ_UUID}`, 'mg');
    await form.selectDropdown(`frequencyCoded_${CPZ_UUID}`, 'OD');
    await form.fillField('appointmentDate', next);
    await form.save();
    await form.expectSaveSuccess();

    await startVisitAndOpen(page, api, patientUuid);
    await page.getByRole('button', { name: 'Record mental health visit' }).click();
    await page.getByLabel('Weight').fill('55');
    await page.getByRole('group', { name: 'Patient stable?' }).getByText('Yes').click();
    await page.getByText('Chloropromazine (CPZ)', { exact: true }).click();
    await page.getByLabel('Chloropromazine (CPZ) dose').fill('100');
    await page.getByLabel('Chloropromazine (CPZ) unit').selectOption({ label: 'mg' });
    await page.getByLabel('Chloropromazine (CPZ) frequency').selectOption({ label: 'OD' });
    await page.getByLabel('Next appointment *').fill(next);
    await page.getByRole('button', { name: 'Save and close' }).click();
    await expect(page.getByRole('table', { name: 'Mental health visits' }).getByRole('row')).toHaveCount(3);

    const [o3, legacy] = await shapes(api, patientUuid, MENTAL_HEALTH_FOLLOWUP_ENCOUNTER_TYPE_UUID);
    expect(withoutUuid(o3)).toEqual(withoutUuid(legacy));
  });

  test('an O3 screening matches an HTML-form screening with the same inputs', async ({ page, api, eligibleMentalHealthPatient }) => {
    const patientUuid = eligibleMentalHealthPatient.uuid;
    const next = day(30);

    const form = await legacyHeader(page, patientUuid);
    await enterLegacy(page, 'Mental Health Screening', day(-1));
    await form.selectDropdown('visitLocation', 'Neno District Hospital');
    await form.checkByLabel('Depression');
    await form.checkByLabel('PM +');
    await form.selectRadio('Sessions', 'Session 1');
    await form.fillField('appointmentDate', next);
    await form.save();
    await form.expectSaveSuccess();

    await startVisitAndOpen(page, api, patientUuid);
    await page.getByRole('button', { name: 'Record screening' }).click();
    await panel(page).getByText('Depression', { exact: true }).click();
    await panel(page).getByText('PM +', { exact: true }).click();
    await panel(page).getByText('Session 1', { exact: true }).click();
    await page.getByLabel('Next appointment *').fill(next);
    await page.getByRole('button', { name: 'Save and close' }).click();
    await expect(page.getByRole('table', { name: 'Screenings' }).getByRole('row')).toHaveCount(3);

    const [o3, legacy] = await shapes(api, patientUuid, MENTAL_HEALTH_SCREENING_ENCOUNTER_TYPE_UUID);
    expect(withoutUuid(o3)).toEqual(withoutUuid(legacy));
  });

  test("an O3-started card header matches the HTML form's with the same inputs", async ({ page, api, eligibleMentalHealthPatient }) => {
    const patientUuid = eligibleMentalHealthPatient.uuid;

    await legacyHeader(page, patientUuid);
    const [legacy] = await shapes(api, patientUuid, MENTAL_HEALTH_INITIAL_ENCOUNTER_TYPE_UUID);
    await purge(api, legacy.uuid);

    await page.goto(`spa/patient/${patientUuid}/chart/mentalHealth`);
    await page.getByRole('region', { name: 'Diagnoses' }).getByRole('button', { name: 'Start the card' }).click();
    await page.getByText('Schizophrenia', { exact: true }).click();
    await page.getByLabel('Schizophrenia date').fill(day(-1));
    await page.getByRole('group', { name: /Agrees to follow-up/ }).getByText('Yes').click();
    await page.getByRole('button', { name: 'Save and close' }).click();
    await expect(page.getByRole('region', { name: 'Diagnoses' }).getByText(/Schizophrenia ·/)).toBeVisible();

    const [o3] = await shapes(api, patientUuid, MENTAL_HEALTH_INITIAL_ENCOUNTER_TYPE_UUID);
    expect(withoutUuid(o3)).toEqual(withoutUuid(legacy));
  });
});
