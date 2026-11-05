import { type APIRequestContext, type Page } from '@playwright/test';
import { test, expect } from '../../core';
import { NENO_DISTRICT_HOSPITAL_LOCATION_UUID } from '../../core/constants';

const HTN_DM_WORKFLOW = '9b571347-8dc3-40fe-9994-e82071fa8290';
const ASTHMA_WORKFLOW = '319838b7-23cb-4e04-9b36-ad1e83cbeaaf';
const EPILEPSY_WORKFLOW = '26FD314D-138F-4A5C-8890-E01791C06336';
const MENTAL_HEALTH_WORKFLOW = 'DA69BBCB-01FE-4C59-9D46-8A2659ABBD73';

type Program = {
  key: string;
  workflows: Array<{ uuid: string; name: string; enrolStates: Array<{ name: string }>; changeStates: Array<{ name: string }> }>;
  exitStates: Array<{ name: string; kind: string }>;
};

async function program(api: APIRequestContext, patientUuid: string, key: string): Promise<Program> {
  const results = (await (await api.get(`pihmalawi/quickprograms?patient=${patientUuid}`)).json()).results as Program[];
  return results.find((p) => p.key === key)!;
}

// Enrols, from the Enrolments tab, in the given conditions, each in its first offered state.
async function enrolInConditions(page: Page, api: APIRequestContext, patientUuid: string, key: string, label: string, workflowUuids: string[]) {
  const workflows = (await program(api, patientUuid, key)).workflows.filter((w) => workflowUuids.includes(w.uuid));
  await page.goto(`spa/patient/${patientUuid}/chart/enrolments`);
  await page.getByRole('region', { name: label }).getByRole('button', { name: 'Enrol' }).click();
  for (const workflow of workflows) {
    await page.getByRole('checkbox', { name: workflow.name, exact: true }).check({ force: true });
    await page.getByLabel(`${workflow.name} state`, { exact: true }).selectOption({ label: workflow.enrolStates[0].name });
  }
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
}

test.describe('Enrolments tab in the O3 patient chart', () => {
  test.beforeEach(async ({ page }) => {
    const res = await page.request.post('ws/rest/v1/session', {
      data: { sessionLocation: NENO_DISTRICT_HOSPITAL_LOCATION_UUID },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('sits between Visits and Programs in the left navigation', async ({ page, eligibleHivArtPatient }) => {
    await page.goto(`spa/patient/${eligibleHivArtPatient.uuid}/chart`);
    const links = page.getByRole('navigation', { name: 'Left navigation' }).getByRole('link');
    // HIV care shows for patients with an ART patient card, which this one has
    await expect(links).toHaveText(['Patient summary', 'eMastercards', 'Vitals & Biometrics', 'Visits', 'Enrolments', 'HIV care', 'Programs']);
  });

  test('enrolling in two Chronic Care conditions makes both their eMastercards available', async ({
    page,
    api,
    unenrolledChronicCarePatient,
  }) => {
    await enrolInConditions(page, api, unenrolledChronicCarePatient.uuid, 'chronic-care', 'Chronic Care Program', [
      HTN_DM_WORKFLOW,
      ASTHMA_WORKFLOW,
    ]);

    await page.goto(`spa/patient/${unenrolledChronicCarePatient.uuid}/chart/eMastercards`);
    await expect(page.getByRole('button', { name: 'Create new Hypertension and Diabetes eMastercard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create new Chronic Lung Disease eMastercard' })).toBeVisible();
  });

  test('enrolling in Mental health and Epilepsy makes both their eMastercards available', async ({
    page,
    api,
    unenrolledChronicCarePatient,
  }) => {
    await enrolInConditions(page, api, unenrolledChronicCarePatient.uuid, 'mental-health', 'Mental Health Program', [
      MENTAL_HEALTH_WORKFLOW,
      EPILEPSY_WORKFLOW,
    ]);

    await page.goto(`spa/patient/${unenrolledChronicCarePatient.uuid}/chart/eMastercards`);
    // the mental health card is kept natively in O3, on its own page
    await expect(page.getByRole('button', { name: 'Open mental health' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create new Epilepsy eMastercard' })).toBeVisible();
  });

  test("changes a condition's state", async ({ page, api, eligibleHypertensionAndDiabetesPatient }) => {
    const htnDm = (await program(api, eligibleHypertensionAndDiabetesPatient.uuid, 'chronic-care')).workflows.find(
      (w) => w.uuid === HTN_DM_WORKFLOW,
    )!;
    const newState = htnDm.changeStates[0].name;

    await page.goto(`spa/patient/${eligibleHypertensionAndDiabetesPatient.uuid}/chart/enrolments`);
    const card = page.getByRole('region', { name: 'Chronic Care Program' });
    await card.getByRole('button', { name: 'Change state' }).click();
    await page.getByLabel(`${htnDm.name} state`, { exact: true }).selectOption({ label: newState });
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(card.getByText(new RegExp(`^${htnDm.name}: ${newState} since`))).toBeVisible();
  });

  // HIV's exits don't include Patient died; ending other workflows on a death
  // is covered by quickprograms-endpoint.spec.ts.
  test('exiting ends the enrolment', async ({ page, api, eligibleHivArtPatient }) => {
    const exitState = (await program(api, eligibleHivArtPatient.uuid, 'hiv')).exitStates.find((s) => s.kind === 'COMPLETE')!;

    await page.goto(`spa/patient/${eligibleHivArtPatient.uuid}/chart/enrolments`);
    const card = page.getByRole('region', { name: 'HIV Program' });
    await card.getByRole('button', { name: 'Exit' }).click();
    await page.getByLabel('Exit with').selectOption({ label: exitState.name });
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(card.getByText('Not enrolled')).toBeVisible();
    await expect(card.getByText(new RegExp(`^Last enrolled .* \\(${exitState.name}\\)$`))).toBeVisible();
  });
});
