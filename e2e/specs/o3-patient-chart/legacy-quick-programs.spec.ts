import { type Page } from '@playwright/test';
import { test, expect } from '../../core';
import { createPatient, deletePatient } from '../../commands';

// The legacy dashboard's Quick Programs section, row by row. The section is
// now drawn from a shared Quick Programs registry (also used by the O3
// Enrolments tab), so these snapshots, recorded before that change, pin it to
// what it showed and posted before.
async function legacyQuickProgramRows(page: Page, patientUuid: string): Promise<string> {
  await page.goto(`patientDashboard.form?patientId=${patientUuid}`);
  const rows = await page
    .locator('[id="pihmalawi.quickPrograms"] table')
    .first()
    .locator(':scope > tbody > tr, :scope > tr')
    .evaluateAll((trs) =>
      trs.map((tr) => {
        const text = (tr.textContent ?? '').replace(/\s+/g, ' ').trim();
        const controls = Array.from(tr.querySelectorAll('form, input, select > option:first-child')).map((el) =>
          ['action', 'name', 'type', 'value', 'onclick']
            .map((a) => el.getAttribute(a))
            .filter(Boolean)
            .join(' '),
        );
        return [text, ...controls].join(' | ');
      }),
    );
  // Database ids, the CSRF token, today's date and the location list differ between runs and sites.
  return rows
    .filter((row) => row.length > 0)
    .map((row) =>
      row
        .replace(/OWASP-CSRFTOKEN hidden \S+/g, 'OWASP-CSRFTOKEN hidden <token>')
        .replace(/\d{2}\/\d{2}\/\d{4}/g, '<date>')
        .replace(/\b\d+\b/g, '<n>')
        .replace(/Choose a location\.\.\..*?(\||$)/g, 'Choose a location... <locations> $1'),
    )
    .join('\n');
}

test.describe('Legacy dashboard Quick Programs section', () => {
  test('patient in no program', async ({ page, api }) => {
    const patient = await createPatient(api, { givenName: 'AutoQuick', familyName: 'Pilot' });
    try {
      expect(await legacyQuickProgramRows(page, patient.uuid)).toMatchSnapshot('not-enrolled.txt');
    } finally {
      await deletePatient(api, patient.uuid);
    }
  });

  test('ART patient', async ({ page, eligibleHivArtPatient }) => {
    expect(await legacyQuickProgramRows(page, eligibleHivArtPatient.uuid)).toMatchSnapshot('art.txt');
  });

  test('Chronic Care (Hypertension and Diabetes) patient', async ({ page, eligibleHypertensionAndDiabetesPatient }) => {
    expect(await legacyQuickProgramRows(page, eligibleHypertensionAndDiabetesPatient.uuid)).toMatchSnapshot('htn-dm.txt');
  });

  test('Mental Health patient', async ({ page, eligibleMentalHealthPatient }) => {
    expect(await legacyQuickProgramRows(page, eligibleMentalHealthPatient.uuid)).toMatchSnapshot('mental-health.txt');
  });

  test('PDC patient', async ({ page, eligiblePdcPatient }) => {
    expect(await legacyQuickProgramRows(page, eligiblePdcPatient.uuid)).toMatchSnapshot('pdc.txt');
  });

  test('Teen Club patient', async ({ page, eligibleTeenClubPatient }) => {
    expect(await legacyQuickProgramRows(page, eligibleTeenClubPatient.uuid)).toMatchSnapshot('teen-club.txt');
  });
});
