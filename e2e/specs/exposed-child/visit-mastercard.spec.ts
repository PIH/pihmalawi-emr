import { test, expect } from '../../core';
import {
  MastercardFormPage,
  ExposedChildMastercardGatePage,
  fillExposedChildHeaderMinimum,
  fillExposedChildVisitForm,
} from '../../pages';
import { EXPOSED_CHILD_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test.describe('Exposed Child visit mastercard', () => {
  test.beforeEach(async ({ page, eligibleExposedChildPatient }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);
    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      ExposedChildMastercardGatePage.buildCreateUrl(eligibleExposedChildPatient.uuid, encounterDate),
    );
    await fillExposedChildHeaderMinimum(headerForm);
    await headerForm.save();
    await headerForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as EXPOSED_CHILD_FOLLOWUP', async ({
    page,
    api,
    eligibleExposedChildPatient,
  }) => {
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('Exposed Child Visit');

    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillExposedChildVisitForm(visitForm, { appointmentDate });

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligibleExposedChildPatient.uuid}&encounterType=${EXPOSED_CHILD_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);

    const obs = results[0].obs as Array<{ display: string }>;

    expect(obs.some((o) => /height.*60/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /weight.*5/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /middle upper arm circumference.*13/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /wasting.*no/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /breast.*exc/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /mother hiv status.*alive on art/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /clinical monitoring.*nothing abnormal detected/i.test(o.display))).toBeTruthy();
  });
});
