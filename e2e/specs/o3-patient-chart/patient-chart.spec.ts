import { test, expect } from '../../core';
import {
  MastercardFormPage,
  HypertensionAndDiabetesMastercardGatePage,
  fillHypertensionAndDiabetesHeaderMinimum,
  fillHypertensionAndDiabetesVisitForm,
} from '../../pages';
import {
  ART_FOLLOWUP_ENCOUNTER_TYPE_UUID,
  ART_VISIT_FORM_UUID,
  MENTAL_HEALTH_SCREENING_ENCOUNTER_TYPE_UUID,
  NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
} from '../../core/constants';

// "Session notes", saved by mental-health-screening.xml.
const SESSION_NOTES_CONCEPT_UUID = '49317520-079f-4ccc-a5e3-e0018aa644c7';

// The vitals concepts the mastercards save to, configured for the O3 vitals app in base-config.json.
const SYSTOLIC_BLOOD_PRESSURE_CONCEPT_UUID = '6569bffe-977f-11e1-8993-905e29aff6c1';
const DIASTOLIC_BLOOD_PRESSURE_CONCEPT_UUID = '6569c116-977f-11e1-8993-905e29aff6c1';
const WEIGHT_CONCEPT_UUID = '6569c44a-977f-11e1-8993-905e29aff6c1';
const HEIGHT_CONCEPT_UUID = '6569c562-977f-11e1-8993-905e29aff6c1';

// The legacy dashboard header's viral load and CD4 concepts (concept.viralLoad, dashboard.header.showConcept)
const VIRAL_LOAD_CONCEPT_UUID = '654a7694-977f-11e1-8993-905e29aff6c1';
const CD4_COUNT_CONCEPT_UUID = '656c327a-977f-11e1-8993-905e29aff6c1';

// Phase 0 of moving the patient dashboard to O3: the O3 patient chart runs
// alongside the legacy dashboard, reached from its "O3 - Patient Chart" link,
// with only the dashboards Malawi uses (see base-config.json).
test.describe('O3 patient chart pilot', () => {
  test.beforeEach(async ({ page }) => {
    // Users reach the chart after the legacy login page, which sets a session
    // location. The e2e session is created over REST without one, which would
    // make O3 stop at its location picker, so set it the same way here.
    const res = await page.request.post('ws/rest/v1/session', {
      data: { sessionLocation: NENO_DISTRICT_HOSPITAL_LOCATION_UUID },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('the legacy dashboard links to the O3 patient chart for the same patient', async ({
    page,
    eligibleMentalHealthPatient,
  }) => {
    await page.goto(`patientDashboard.form?patientId=${eligibleMentalHealthPatient.uuid}`);
    await page.getByRole('link', { name: 'O3 - Patient Chart' }).click();

    await expect(page).toHaveURL(new RegExp(`/spa/patient/${eligibleMentalHealthPatient.uuid}/chart`));
    await expect(page.getByText(eligibleMentalHealthPatient.person.display, { exact: false }).first()).toBeVisible();
  });

  test('loads without unresolved backend module dependencies', async ({ page, eligibleHivArtPatient }) => {
    await page.goto(`spa/patient/${eligibleHivArtPatient.uuid}/chart`);
    await expect(page.getByRole('link', { name: 'Programs', exact: true })).toBeVisible();
    // The toast is raised once the apps' backend dependencies have been checked.
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Some modules have unresolved backend dependencies')).toHaveCount(0);
  });

  test('has no order basket, visit note or clinical forms in the right-hand toolbar', async ({
    page,
    eligibleHivArtPatient,
  }) => {
    await page.goto(`spa/patient/${eligibleHivArtPatient.uuid}/chart`);
    await expect(page.getByRole('link', { name: 'Programs', exact: true })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /order basket|visit note|clinical forms/i })).toHaveCount(0);
  });

  test('shows only the pilot dashboards in the left navigation', async ({ page, eligibleMentalHealthPatient }) => {
    await page.goto(`spa/patient/${eligibleMentalHealthPatient.uuid}/chart`);

    const nav = page.locator('nav');
    for (const shown of ['Patient summary', 'Vitals & Biometrics', 'Visits', 'Programs']) {
      await expect(nav.getByRole('link', { name: shown, exact: true })).toBeVisible();
    }
    for (const hidden of [
      'Medications',
      'Orders',
      'Results',
      'Immunizations',
      'Allergies',
      'Conditions',
      'Attachments',
      'Appointments',
    ]) {
      await expect(nav.getByRole('link', { name: hidden, exact: true })).toHaveCount(0);
    }
  });

  test('lists encounters recorded outside a visit under All encounters', async ({
    page,
    api,
    eligibleMentalHealthPatient,
  }) => {
    // Mastercard encounters are saved without a visit, so they don't appear
    // under Visits, only under All encounters.
    const res = await api.post('encounter', {
      data: {
        patient: eligibleMentalHealthPatient.uuid,
        encounterType: MENTAL_HEALTH_SCREENING_ENCOUNTER_TYPE_UUID,
        location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
        encounterDatetime: new Date().toISOString().slice(0, 10),
        obs: [{ concept: SESSION_NOTES_CONCEPT_UUID, value: 'O3 pilot session notes' }],
      },
    });
    expect(res.ok()).toBeTruthy();

    await page.goto(`spa/patient/${eligibleMentalHealthPatient.uuid}/chart/Visits`);
    await page.getByRole('tab', { name: 'All encounters' }).click();

    const row = page.getByRole('row', { name: /MENTAL_HEALTH_SCREENING/ });
    await expect(row).toHaveCount(1);
    await row.getByRole('button', { name: 'Expand current row' }).click();
    await expect(page.getByText('O3 pilot session notes')).toBeVisible();
  });

  test('shows the vitals recorded on a mastercard visit', async ({ page, api, eligibleHivArtPatient }) => {
    const res = await api.post('encounter', {
      data: {
        patient: eligibleHivArtPatient.uuid,
        encounterType: ART_FOLLOWUP_ENCOUNTER_TYPE_UUID,
        form: ART_VISIT_FORM_UUID,
        location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
        encounterDatetime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        obs: [
          { concept: SYSTOLIC_BLOOD_PRESSURE_CONCEPT_UUID, value: 120 },
          { concept: DIASTOLIC_BLOOD_PRESSURE_CONCEPT_UUID, value: 80 },
          { concept: WEIGHT_CONCEPT_UUID, value: 61 },
          { concept: HEIGHT_CONCEPT_UUID, value: 170 },
        ],
      },
    });
    expect(res.ok()).toBeTruthy();

    await page.goto(`spa/patient/${eligibleHivArtPatient.uuid}/chart/Vitals & Biometrics`);

    const vitals = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: /BP/ }) });
    await expect(vitals.getByRole('cell', { name: '120 / 80' })).toBeVisible();
    const biometrics = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: /Weight/ }) });
    await expect(biometrics.getByRole('cell', { name: '61', exact: true })).toBeVisible();
    await expect(biometrics.getByRole('cell', { name: '170', exact: true })).toBeVisible();
    await expect(biometrics.getByRole('cell', { name: '21.1', exact: true })).toBeVisible();
  });

  test('records vitals in a new visit', async ({ page, eligibleHivArtPatient }) => {
    await page.goto(`spa/patient/${eligibleHivArtPatient.uuid}/chart/Vitals & Biometrics`);
    await page.getByRole('button', { name: /record vitals/i }).first().click();
    await page.getByRole('button', { name: 'Start new visit' }).click();

    await expect(page.getByText('Part of the form did not load')).toHaveCount(0);
    // The visit type comes from emrapi's configured default visit type, and its
    // picker shows only until that has loaded. A click before then fails
    // validation silently, so wait for it.
    await expect(page.getByRole('combobox', { name: 'Select a location' })).toHaveValue('Neno District Hospital');
    await expect(page.getByText('Visit Type', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Start visit' }).click();
    await expect(page.getByText('Active Visit', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /record vitals/i }).first().click();
    await page.getByRole('spinbutton', { name: /temperature/i }).fill('36.8');
    await page.getByRole('spinbutton', { name: /systolic/i }).fill('118');
    await page.getByRole('spinbutton', { name: /diastolic/i }).fill('76');
    await page.getByRole('spinbutton', { name: /weight/i }).fill('62');
    await page.getByRole('button', { name: /save and close/i }).click();

    const vitals = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: /BP/ }) });
    await expect(vitals.getByRole('cell', { name: '118 / 76' })).toBeVisible();
    await expect(vitals.getByRole('cell', { name: '36.8', exact: true })).toBeVisible();
  });

  test('shows the program status and offers the workflow states, including outcomes, when editing', async ({
    page,
    eligibleHivArtPatient,
  }) => {
    await page.goto(`spa/patient/${eligibleHivArtPatient.uuid}/chart/Programs`);

    const enrollment = page.getByRole('row', { name: /HIV PROGRAM/ });
    await expect(enrollment.getByRole('cell', { name: 'On antiretrovirals' })).toBeVisible();
    // The edit form crashes if it opens before the page has loaded the list of
    // programs (an upstream bug, reported with the other upstream changes).
    await page.waitForLoadState('networkidle');

    await enrollment.getByRole('button').last().click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();

    const status = page.getByLabel('Program status');
    for (const state of ['On antiretrovirals', 'Patient died', 'Patient transferred out', 'Treatment stopped']) {
      await expect(status.getByRole('option', { name: state, exact: true })).toHaveCount(1);
    }
  });

  test('shows the programs, not a second copy of the vitals, on the patient summary', async ({
    page,
    eligibleHivArtPatient,
  }) => {
    await page.goto(`spa/patient/${eligibleHivArtPatient.uuid}/chart/Patient Summary`);

    await expect(page.getByRole('row', { name: /HIV PROGRAM/ })).toBeVisible();
    // The latest values stay in the chart's vitals header; the Vitals and
    // Biometrics tables are only on their own dashboard.
    await expect(page.getByText('Vitals and biometrics', { exact: true })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Vitals', exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Biometrics', exact: true })).toHaveCount(0);
  });

  test('shows the BP entered on a mastercard visit as the patient BP', async ({
    page,
    eligibleHypertensionAndDiabetesPatient,
  }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);
    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      HypertensionAndDiabetesMastercardGatePage.buildCreateUrl(eligibleHypertensionAndDiabetesPatient.uuid, encounterDate),
    );
    await fillHypertensionAndDiabetesHeaderMinimum(headerForm, encounterDate);
    await headerForm.save();
    await headerForm.expectSaveSuccess();

    // Enters 130 / 85 in the visit's Blood pressure field.
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('Hypertension and Diabetes Visit');
    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillHypertensionAndDiabetesVisitForm(visitForm, { appointmentDate });
    await visitForm.save();
    await visitForm.expectSaveSuccess();

    await page.goto(`spa/patient/${eligibleHypertensionAndDiabetesPatient.uuid}/chart/Vitals & Biometrics`);

    const vitals = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: /BP/ }) });
    await expect(vitals.getByRole('cell', { name: '130 / 85' })).toBeVisible();
  });

  test('shows the vitals and biometrics header on the summary and vitals pages only', async ({
    page,
    eligibleHivArtPatient,
  }) => {
    for (const shown of ['patient-summary', 'vitals-and-biometrics', 'visits']) {
      await page.goto(`spa/patient/${eligibleHivArtPatient.uuid}/chart/${shown}`);
      await expect(page.getByText('Vitals and biometrics', { exact: true }), shown).toBeVisible();
    }
    for (const hidden of ['programs', 'enrolments', 'eMastercards']) {
      await page.goto(`spa/patient/${eligibleHivArtPatient.uuid}/chart/${hidden}`);
      await expect(page.getByRole('link', { name: 'Programs', exact: true })).toBeVisible();
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Vitals and biometrics', { exact: true }), hidden).toHaveCount(0);
    }
  });

  test('shows each vital from the latest time it was recorded, so BP matches the vitals table', async ({
    page,
    api,
    eligibleHivArtPatient,
  }) => {
    for (const data of [
      {
        encounterDatetime: '2026-09-01',
        obs: [
          { concept: SYSTOLIC_BLOOD_PRESSURE_CONCEPT_UUID, value: 140 },
          { concept: DIASTOLIC_BLOOD_PRESSURE_CONCEPT_UUID, value: 90 },
          { concept: WEIGHT_CONCEPT_UUID, value: 60 },
        ],
      },
      { encounterDatetime: '2026-10-01', obs: [{ concept: WEIGHT_CONCEPT_UUID, value: 62 }] },
    ]) {
      const res = await api.post('encounter', {
        data: {
          patient: eligibleHivArtPatient.uuid,
          encounterType: ART_FOLLOWUP_ENCOUNTER_TYPE_UUID,
          form: ART_VISIT_FORM_UUID,
          location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
          ...data,
        },
      });
      expect(res.ok()).toBeTruthy();
    }

    await page.goto(`spa/patient/${eligibleHivArtPatient.uuid}/chart/vitals-and-biometrics`);

    await expect(page.getByText('140 / 90 mmHg')).toBeVisible();
    await expect(page.getByText('62 kg')).toBeVisible();
    const vitals = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: /BP/ }) });
    await expect(vitals.getByRole('cell', { name: '140 / 90' })).toBeVisible();
  });

  test('shows the latest viral load and CD4 count under the vitals for a patient in the HIV program', async ({
    page,
    api,
    eligibleHivArtPatient,
  }) => {
    const res = await api.post('encounter', {
      data: {
        patient: eligibleHivArtPatient.uuid,
        encounterType: ART_FOLLOWUP_ENCOUNTER_TYPE_UUID,
        location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
        encounterDatetime: '2026-06-01',
        obs: [
          { concept: VIRAL_LOAD_CONCEPT_UUID, value: 1500 },
          { concept: CD4_COUNT_CONCEPT_UUID, value: 350 },
        ],
      },
    });
    expect(res.ok()).toBeTruthy();

    await page.goto(`spa/patient/${eligibleHivArtPatient.uuid}/chart/patient-summary`);

    await expect(page.getByText('HIV', { exact: true })).toBeVisible();
    await expect(page.getByText(/^1500/)).toBeVisible();
    await expect(page.getByText(/^350/)).toBeVisible();
  });

  test("doesn't show the HIV line for a patient not in the HIV program", async ({ page, eligibleMentalHealthPatient }) => {
    await page.goto(`spa/patient/${eligibleMentalHealthPatient.uuid}/chart/patient-summary`);
    await expect(page.getByText('Vitals and biometrics', { exact: true })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Viral load', { exact: true })).toHaveCount(0);
  });
});

