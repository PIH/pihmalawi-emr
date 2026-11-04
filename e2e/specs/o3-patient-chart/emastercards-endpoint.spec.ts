import { type APIRequestContext, type Page, request } from '@playwright/test';
import { test, expect } from '../../core';
import {
  MENTAL_HEALTH_INITIAL_ENCOUNTER_TYPE_UUID,
  NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
} from '../../core/constants';

// "ART Visit", one of the ART eMastercard's flowsheet forms.
const ART_VISIT_FORM_UUID = '64db7fd5-c28d-4b85-87c4-d01e92ae004a';

type Card = {
  key: string;
  group: string;
  label: string;
  state: 'CREATE' | 'EDIT' | 'VIEW' | 'UNAVAILABLE';
  message: string | null;
  formUuids: string[];
  encounterTypeUuids: string[];
};

async function cards(api: APIRequestContext, patientUuid: string): Promise<Card[]> {
  const res = await api.get(`pihmalawi/emastercards?patient=${patientUuid}`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()).results;
}

async function legacyRows(page: Page, patientUuid: string): Promise<string[]> {
  await page.goto(`patientDashboard.form?patientId=${patientUuid}`);
  return page
    .locator('[id="pihmalawi.malawiPatientDashboard"] table')
    .first()
    .locator(':scope > tbody > tr, :scope > tr')
    .evaluateAll((trs) => trs.map((tr) => (tr.textContent ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean));
}

// What the legacy dashboard shows for a card in each state.
function legacyText(card: Card): string {
  switch (card.state) {
    case 'CREATE':
      return `Create new ${card.label}`;
    case 'EDIT':
      return `Edit ${card.label}`;
    case 'VIEW':
      return `View ${card.label}`;
    default:
      return card.message ?? '';
  }
}

async function expectSameAsLegacy(page: Page, api: APIRequestContext, patientUuid: string) {
  const fromApi = await cards(api, patientUuid);
  const rows = await legacyRows(page, patientUuid);
  let row = 0;
  for (const card of fromApi) {
    while (row < rows.length && !rows[row].includes(legacyText(card))) {
      row++;
    }
    expect(row, `${card.key}: "${legacyText(card)}" not found in order`).toBeLessThan(rows.length);
    row++;
  }
}

test.describe('eMastercards REST endpoint', () => {
  test('lists the ART eMastercard as one to create, with its forms', async ({ api, eligibleHivArtPatient }) => {
    const art = (await cards(api, eligibleHivArtPatient.uuid)).find((c) => c.key === 'art');
    expect(art).toMatchObject({ group: 'ART Patient Card', label: 'ART eMastercard', state: 'CREATE' });
    expect(art!.formUuids).toContain(ART_VISIT_FORM_UUID);
  });

  test('answers 404 for an unknown patient', async ({ api }) => {
    const res = await api.get('pihmalawi/emastercards?patient=00000000-0000-0000-0000-000000000000');
    expect(res.status()).toBe(404);
  });

  test('answers 404 for a voided patient', async ({ api, eligibleHivArtPatient }) => {
    const voided = await api.delete(`patient/${eligibleHivArtPatient.uuid}?reason=e2e`);
    expect(voided.ok()).toBeTruthy();

    const res = await api.get(`pihmalawi/emastercards?patient=${eligibleHivArtPatient.uuid}`);
    expect(res.status()).toBe(404);
    expect((await res.json()).error.message).toBe('Patient not found');
  });

  test('answers 401 when not logged in', async ({ eligibleHivArtPatient }) => {
    // Without the suite's saved login.
    const anonymous = await request.newContext({
      baseURL: `${process.env.E2E_BASE_URL}/`,
      storageState: { cookies: [], origins: [] },
    });
    // Like the core REST endpoints, the 401 also points the browser at the login page; don't follow it.
    const res = await anonymous.get(`ws/rest/v1/pihmalawi/emastercards?patient=${eligibleHivArtPatient.uuid}`, {
      maxRedirects: 0,
    });
    expect(res.status()).toBe(401);
    await anonymous.dispose();
  });

  test('matches the legacy dashboard for an ART patient', async ({ page, api, eligibleHivArtPatient }) => {
    await expectSameAsLegacy(page, api, eligibleHivArtPatient.uuid);
  });

  test('matches the legacy dashboard for a Teen Club patient', async ({ page, api, eligibleTeenClubPatient }) => {
    await expectSameAsLegacy(page, api, eligibleTeenClubPatient.uuid);
  });

  test('matches the legacy dashboard for a PDC patient', async ({ page, api, eligiblePdcPatient }) => {
    await expectSameAsLegacy(page, api, eligiblePdcPatient.uuid);
  });

  test('matches the legacy dashboard for a patient with an existing eMastercard', async ({
    page,
    api,
    eligibleMentalHealthPatient,
  }) => {
    const res = await api.post('encounter', {
      data: {
        patient: eligibleMentalHealthPatient.uuid,
        encounterType: MENTAL_HEALTH_INITIAL_ENCOUNTER_TYPE_UUID,
        location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
        encounterDatetime: '2026-01-05',
      },
    });
    expect(res.ok()).toBeTruthy();

    const mentalHealth = (await cards(api, eligibleMentalHealthPatient.uuid)).find((c) => c.key === 'mental-health');
    expect(mentalHealth?.state).toBe('EDIT');
    await expectSameAsLegacy(page, api, eligibleMentalHealthPatient.uuid);
  });
  test('returns the system locations tag', async ({ api, eligibleHivArtPatient }) => {
    const setting = await api.get('systemsetting?q=pihmalawi.systemLocationsTag&v=custom:(value)');
    expect(setting.ok()).toBeTruthy();
    const expected = (await setting.json()).results[0]?.value ?? null;

    const res = await api.get(`pihmalawi/emastercards?patient=${eligibleHivArtPatient.uuid}`);
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).systemLocationsTag).toBe(expected);
  });
});
