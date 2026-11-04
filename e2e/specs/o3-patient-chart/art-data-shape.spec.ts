import { type APIRequestContext, type Page } from '@playwright/test';
import { test, expect } from '../../core';
import {
  ART_FOLLOWUP_ENCOUNTER_TYPE_UUID,
  ART_INITIAL_ENCOUNTER_TYPE_UUID,
  NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
} from '../../core/constants';
import { MastercardFormPage, MastercardGatePage } from '../../pages/mastercard-page';

// O3 must save exactly what the HTML forms save: the same encounter type, form, provider and encounter role, and
// the same obs, groups included, for the same answers.

const CLINIC_VISIT_TYPE_UUID = 'f01c54cb-2225-471a-9cd5-d348552c337c';
const day = (offset: number) => new Date(Date.now() + offset * 24 * 3600 * 1000).toISOString().slice(0, 10);

type Shape = {
  encounterType: string;
  form: string;
  providers: Array<string>;
  obs: Array<string>;
};

async function shapes(api: APIRequestContext, patientUuid: string, encounterType: string): Promise<Array<Shape & { uuid: string }>> {
  const member = 'uuid,concept:(uuid),value';
  const res = await api.get(
    `encounter?patient=${patientUuid}&encounterType=${encounterType}&v=custom:(uuid,encounterType:(uuid),form:(uuid),` +
      `encounterProviders:(provider:(uuid),encounterRole:(uuid)),obs:(${member},groupMembers:(${member})))`,
  );
  expect(res.ok()).toBeTruthy();
  // dates compare by day; coded answers by uuid
  const value = (v) =>
    v && typeof v === 'object' ? v.uuid : typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) ? v.slice(0, 10) : v;
  const pair = (o) => `${o.concept.uuid.toLowerCase()}=${value(o.value)}`;
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

async function openHivCare(page: Page, patientUuid: string) {
  await page.goto(`spa/patient/${patientUuid}/chart/hivCare`);
  await expect(page.getByRole('heading', { name: 'HIV care' })).toBeVisible();
}

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

test.describe('ART encounters saved in O3 match the HTML forms', () => {
  test.beforeEach(async ({ page }) => {
    // The e2e session is created over REST without a location, which would make O3 stop at its location picker.
    const res = await page.request.post('ws/rest/v1/session', { data: { sessionLocation: NENO_DISTRICT_HOSPITAL_LOCATION_UUID } });
    expect(res.ok()).toBeTruthy();
  });

  test('an O3 ART visit matches an HTML-form ART visit with the same inputs', async ({ page, api, eligibleHivArtPatient }) => {
    const patientUuid = eligibleHivArtPatient.uuid;
    const next = day(60);

    // The card header and, yesterday, an ART visit, both through the HTML forms
    const form = await MastercardFormPage.openCreate(page, patientUuid, day(-1));
    await form.selectRadio('Agrees to FUP', 'Y');
    await form.save();
    await form.expectSaveSuccess();
    const enterLink = page.locator('a.form-action-link', { hasText: 'Enter New ART Visit' }).first();
    const formName = (await enterLink.getAttribute('onclick')).match(/enterVisit\('([^']+)'/)[1];
    await page.evaluate(([name, date]) => (window as any).flowsheet.enterVisit(name, date), [formName, day(-1)]);
    await page.locator('.submitButton').first().waitFor({ state: 'attached' });
    await form.selectDropdown('visitLocation', 'Neno District Hospital');
    await form.fillField('weightInput', '62');
    await form.fillField('pillCount', '4');
    await form.selectDropdown('artRegimenObs', '13A');
    await form.fillField('noTabletsGiven', '90');
    await form.checkCptIptGiven('ctx');
    await form.fillCptIptPills('ctx', '90');
    await form.fillField('appointmentDate', next);
    await form.save();
    await form.expectSaveSuccess();

    // Today, the same answers in O3
    const visit = await api.post('visit', {
      data: {
        patient: patientUuid,
        visitType: CLINIC_VISIT_TYPE_UUID,
        location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
        startDatetime: new Date(Date.now() - 60 * 1000).toISOString(),
      },
    });
    expect(visit.ok()).toBeTruthy();
    await openHivCare(page, patientUuid);
    await page.getByRole('button', { name: 'Record ART visit' }).click();
    await page.getByLabel('Weight').fill('62');
    await page.getByLabel('Pill count').fill('4');
    await page.getByLabel('ART regimen *').selectOption({ label: '13A' });
    await page.getByLabel('ARVs given (tablets) *').fill('90');
    await page.getByRole('group', { name: 'CPT/IPT given' }).getByText('CTX 960', { exact: true }).click();
    await page.getByLabel('CTX 960 pills').fill('90');
    await page.getByLabel('Next appointment *').fill(next);
    await page.getByRole('button', { name: 'Save and close' }).click();
    await expect(page.getByRole('table', { name: 'ART visits' }).getByRole('row')).toHaveCount(3);

    const [o3, legacy] = await shapes(api, patientUuid, ART_FOLLOWUP_ENCOUNTER_TYPE_UUID);
    expect(withoutUuid(o3)).toEqual(withoutUuid(legacy));
  });

  test('an O3 card header section matches the HTML form with the same inputs', async ({ page, api, eligibleHivArtPatient }) => {
    const patientUuid = eligibleHivArtPatient.uuid;

    const form = await MastercardFormPage.openCreate(page, patientUuid, day(0));
    await form.fillField('guardianNameField', 'Parity Guardian');
    await form.selectRadio('Agrees to FUP', 'Y');
    await form.save();
    await form.expectSaveSuccess();
    const [legacy] = await shapes(api, patientUuid, ART_INITIAL_ENCOUNTER_TYPE_UUID);
    await purge(api, legacy.uuid);

    await openHivCare(page, patientUuid);
    await page.getByRole('region', { name: 'Patient and guardian' }).getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Guardian name').fill('Parity Guardian');
    await page.getByRole('group', { name: /Agrees to follow-up/ }).getByText('Yes').click();
    await page.getByRole('button', { name: 'Save and close' }).click();
    await expect(page.getByRole('region', { name: 'Patient and guardian' }).getByText('Parity Guardian')).toBeVisible();

    const [o3] = await shapes(api, patientUuid, ART_INITIAL_ENCOUNTER_TYPE_UUID);
    expect(withoutUuid(o3)).toEqual(withoutUuid(legacy));
  });
});
