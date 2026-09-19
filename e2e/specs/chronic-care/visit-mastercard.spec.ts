import { test, expect } from '../../core';
import {
  MastercardFormPage,
  ChronicCareMastercardGatePage,
  fillChronicCareHeaderMinimum,
  fillChronicCareVisitForm,
} from '../../pages';
import { CHRONIC_CARE_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test.describe('Chronic Care visit mastercard', () => {
  test.beforeEach(async ({ page, eligibleChronicCarePatient }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);
    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      ChronicCareMastercardGatePage.buildCreateUrl(eligibleChronicCarePatient.uuid, encounterDate),
    );
    await fillChronicCareHeaderMinimum(headerForm);
    await headerForm.save();
    await headerForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as CHRONIC_CARE_FOLLOWUP', async ({
    page,
    api,
    eligibleChronicCarePatient,
  }) => {
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('Chronic Care Visit');

    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillChronicCareVisitForm(visitForm, { appointmentDate });

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligibleChronicCarePatient.uuid}&encounterType=${CHRONIC_CARE_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);

    const obs = results[0].obs as Array<{ display: string }>;

    expect(obs.some((o) => /nyha class.*1/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /asthma classification.*mild persistent/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /patient hospitalized since last visit.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /hospitalized for non-communicable disease since last visit.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /preferred treatment out of stock.*no/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /change in treatment.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /patient visit completed with all services delivered.*yes/i.test(o.display))).toBeTruthy();
  });
});
