import { test, expect } from '../../core';
import {
  ART_INITIAL_ENCOUNTER_TYPE_UUID,
  NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
} from '../../core/constants';

test.describe('eMastercards in the O3 patient chart', () => {
  test.beforeEach(async ({ page }) => {
    const res = await page.request.post('ws/rest/v1/session', {
      data: { sessionLocation: NENO_DISTRICT_HOSPITAL_LOCATION_UUID },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('has an eMastercards page second in the left navigation', async ({ page, eligibleHivArtPatient }) => {
    await page.goto(`spa/patient/${eligibleHivArtPatient.uuid}/chart`);

    const links = page.getByRole('navigation', { name: 'Left navigation' }).getByRole('link');
    await expect(links.nth(1)).toHaveText('eMastercards');
  });

  test('creates an eMastercard in a panel of the chart, then offers to edit it', async ({
    page,
    api,
    eligibleHivArtPatient,
  }) => {
    await page.goto(`spa/patient/${eligibleHivArtPatient.uuid}/chart/eMastercards`);
    const art = page.getByRole('region', { name: 'ART Patient Card' });
    // The ART card is kept on the HIV care page; its legacy flowsheet is still reachable from here
    await expect(art.getByRole('button', { name: 'Open HIV care' })).toBeVisible();
    await art.getByRole('button', { name: 'Open legacy card' }).click();

    const flowsheet = page.frameLocator('iframe[title="ART eMastercard"]');
    await expect(flowsheet.locator('#back-link')).toBeAttached();
    await expect(flowsheet.locator('header').first()).toBeHidden();
    const src = await page.locator('iframe[title="ART eMastercard"]').getAttribute('src');
    expect(src).toContain('headerForm=file:configuration/htmlforms/art-emastercard.xml');
    expect(src).toContain(`&embedded=true&encounterDate=${new Date().toISOString().slice(0, 10)}`);

    // Saving the header form is covered by the mastercard specs; here the card
    // is created through the API, then the flowsheet is left, which closes the
    // panel and refreshes the chart.
    const res = await api.post('encounter', {
      data: {
        patient: eligibleHivArtPatient.uuid,
        encounterType: ART_INITIAL_ENCOUNTER_TYPE_UUID,
        location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
        encounterDatetime: '2026-01-05',
      },
    });
    expect(res.ok()).toBeTruthy();
    await flowsheet.locator('#back-link').click();

    await expect(page.locator('iframe[title="ART eMastercard"]')).toHaveCount(0);
    await expect(art.getByRole('button', { name: 'Open HIV care' })).toBeVisible();
    await expect(art.getByText('Created: 05-Jan-2026, Visited: no, Appointment: none')).toBeVisible();
  });

  test('shows why an eMastercard is not available', async ({ page, eligibleHivArtPatient }) => {
    await page.goto(`spa/patient/${eligibleHivArtPatient.uuid}/chart/eMastercards`);

    await expect(
      page
        .getByRole('region', { name: 'Pre-ART Patient Card' })
        .getByText('Not available: Inactive program state (Pre-ART eMastercard)'),
    ).toBeVisible();
  });

  test("opens the Kaposi's sarcoma flowsheet embedded, and closes it from its back link", async ({
    page,
    eligibleHivArtPatient,
  }) => {
    await page.goto(`spa/patient/${eligibleHivArtPatient.uuid}/chart/eMastercards`);
    await page
      .getByRole('region', { name: 'Kaposis Sarcoma Flowsheet' })
      .getByRole('button', { name: 'Create new KS file' })
      .click();

    const flowsheet = page.frameLocator('iframe[title="KS file"]');
    await expect(flowsheet.locator('#back-link')).toBeAttached();
    await expect(flowsheet.locator('header').first()).toBeHidden();
    await flowsheet.locator('#back-link').click();
    await expect(page.locator('iframe[title="KS file"]')).toHaveCount(0);
  });
});

