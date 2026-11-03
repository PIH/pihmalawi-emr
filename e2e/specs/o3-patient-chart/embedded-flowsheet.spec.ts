import { type APIRequestContext, type Page } from '@playwright/test';
import { test, expect } from '../../core';
import {
  MENTAL_HEALTH_INITIAL_ENCOUNTER_TYPE_UUID,
  NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
} from '../../core/constants';

// The Mental Health eMastercard's flowsheet, for a patient who already has one.
async function mentalHealthFlowsheetPath(api: APIRequestContext, patientUuid: string): Promise<string> {
  const res = await api.post('encounter', {
    data: {
      patient: patientUuid,
      encounterType: MENTAL_HEALTH_INITIAL_ENCOUNTER_TYPE_UUID,
      location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
      encounterDatetime: '2026-01-05',
    },
  });
  expect(res.ok()).toBeTruthy();
  const cards = (await (await api.get(`pihmalawi/emastercards?patient=${patientUuid}`)).json()).results;
  return cards.find((c: { key: string }) => c.key === 'mental-health').flowsheetPath;
}

// Records the messages the page posts to its parent. Here the page is the top
// window, so its parent is itself.
async function recordMessages(page: Page) {
  await page.evaluate(() => {
    (window as any).__messages = [];
    window.addEventListener('message', (e) => (window as any).__messages.push(e.data));
  });
}

test.describe('eMastercard flowsheet embedded in the O3 chart', () => {
  test('hides the legacy header and closes instead of going back to the dashboard', async ({
    page,
    api,
    eligibleMentalHealthPatient,
  }) => {
    const path = await mentalHealthFlowsheetPath(api, eligibleMentalHealthPatient.uuid);
    await page.goto(`${path}&embedded=true`);
    await expect(page.locator('#back-link')).toBeVisible();

    await expect(page.locator('header').first()).toBeHidden();
    await expect(page.locator('#breadcrumbs')).toBeHidden();

    await recordMessages(page);
    const url = page.url();
    await page.locator('#back-link').click();

    await expect.poll(() => page.evaluate(() => (window as any).__messages)).toEqual([
      { type: 'pihmalawi:emastercard:close' },
    ]);
    expect(page.url()).toBe(url);
  });

  test('keeps the legacy header and back link when not embedded', async ({ page, api, eligibleMentalHealthPatient }) => {
    const path = await mentalHealthFlowsheetPath(api, eligibleMentalHealthPatient.uuid);
    await page.goto(path);

    await expect(page.locator('header').first()).toBeVisible();
    await page.locator('#back-link').click();
    await expect(page).toHaveURL(/patientDashboard\.form/);
  });

  test('tells the chart about unsaved changes, and asks before leaving them', async ({
    page,
    api,
    eligibleMentalHealthPatient,
  }) => {
    const path = await mentalHealthFlowsheetPath(api, eligibleMentalHealthPatient.uuid);
    await page.goto(`${path}&embedded=true`);
    await expect(page.locator('#back-link')).toBeVisible();
    // Loading the flowsheet clears its unsaved-changes flag, so let it finish first.
    await page.waitForLoadState('networkidle');
    await recordMessages(page);

    await page.evaluate(() => (window as any).flowsheet.setDirty());
    await expect.poll(() => page.evaluate(() => (window as any).__messages)).toEqual([
      { type: 'pihmalawi:emastercard:dirty', dirty: true },
    ]);

    page.once('dialog', (dialog) => dialog.dismiss());
    await page.locator('#back-link').click();
    await page.waitForTimeout(500);
    const closes = () =>
      page.evaluate(() => (window as any).__messages.filter((m: { type: string }) => m.type === 'pihmalawi:emastercard:close').length);
    expect(await closes()).toBe(0);

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('#back-link').click();
    await expect
      .poll(() => page.evaluate(() => (window as any).__messages.at(-1)))
      .toEqual({ type: 'pihmalawi:emastercard:close' });
  });
});

