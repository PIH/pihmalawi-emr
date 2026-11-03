import { type Page } from '@playwright/test';
import { test, expect } from '../../core';
import {
  MENTAL_HEALTH_INITIAL_ENCOUNTER_TYPE_UUID,
  NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
} from '../../core/constants';

// The legacy dashboard's eMastercard section, row by row, as text plus the
// links in it. The section is now drawn from a shared eMastercard registry
// (also used by the O3 chart), so these snapshots, recorded before that
// change, pin it to what it showed before.
async function legacyEMastercardRows(page: Page, patientUuid: string): Promise<string> {
  await page.goto(`patientDashboard.form?patientId=${patientUuid}`);
  const rows = await page
    .locator('[id="pihmalawi.malawiPatientDashboard"] table')
    .first()
    .locator(':scope > tbody > tr, :scope > tr')
    .evaluateAll((trs) =>
      trs.map((tr) => {
        const text = (tr.textContent ?? '').replace(/\s+/g, ' ').trim();
        const links = Array.from(tr.querySelectorAll('a')).map(
          (a) => (a.getAttribute('href') ?? '') + ' ' + (a.getAttribute('onclick') ?? ''),
        );
        return [text, ...links].join(' | ');
      }),
    );
  // Patient ids and the date pickers' random ids differ on every run.
  return rows
    .filter((row) => row.length > 0)
    .map((row) =>
      row
        .replace(/patientId=\d+/g, 'patientId=<id>')
        .replace(/date-[0-9a-f-]{36}/g, 'date-<uuid>')
        .replace(/\d{2}\/\d{2}\/\d{4}/g, '<date>'),
    )
    .join('\n');
}

test.describe('Legacy dashboard eMastercard section', () => {
  test('ART patient', async ({ page, eligibleHivArtPatient }) => {
    expect(await legacyEMastercardRows(page, eligibleHivArtPatient.uuid)).toMatchSnapshot('art.txt');
  });

  test('Teen Club patient', async ({ page, eligibleTeenClubPatient }) => {
    expect(await legacyEMastercardRows(page, eligibleTeenClubPatient.uuid)).toMatchSnapshot('teen-club.txt');
  });

  test('Hypertension and Diabetes patient', async ({ page, eligibleHypertensionAndDiabetesPatient }) => {
    expect(await legacyEMastercardRows(page, eligibleHypertensionAndDiabetesPatient.uuid)).toMatchSnapshot('htn-dm.txt');
  });

  test('PDC patient', async ({ page, eligiblePdcPatient }) => {
    expect(await legacyEMastercardRows(page, eligiblePdcPatient.uuid)).toMatchSnapshot('pdc.txt');
  });

  test('Nutrition patient', async ({ page, eligibleNutritionPatient }) => {
    expect(await legacyEMastercardRows(page, eligibleNutritionPatient.uuid)).toMatchSnapshot('nutrition.txt');
  });

  test('Mental Health patient with an existing eMastercard', async ({ page, api, eligibleMentalHealthPatient }) => {
    const res = await api.post('encounter', {
      data: {
        patient: eligibleMentalHealthPatient.uuid,
        encounterType: MENTAL_HEALTH_INITIAL_ENCOUNTER_TYPE_UUID,
        location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
        encounterDatetime: '2026-01-05',
      },
    });
    expect(res.ok()).toBeTruthy();
    expect(await legacyEMastercardRows(page, eligibleMentalHealthPatient.uuid)).toMatchSnapshot('mental-health-edit.txt');
  });
});
