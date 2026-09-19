import { test, expect } from '../../core';
import { MastercardFormPage, TbMastercardGatePage, fillTbHeaderMinimum, fillTbVisitForm } from '../../pages';
import { TB_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test.describe('TB visit mastercard', () => {
  test.beforeEach(async ({ page, eligibleTbPatient }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);
    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      TbMastercardGatePage.buildCreateUrl(eligibleTbPatient.uuid, encounterDate),
    );
    await fillTbHeaderMinimum(headerForm);
    await headerForm.save();
    await headerForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as TB_FOLLOWUP', async ({
    page,
    api,
    eligibleTbPatient,
  }) => {
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('TB Visit');

    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillTbVisitForm(visitForm, { appointmentDate });

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligibleTbPatient.uuid}&encounterType=${TB_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);
    expect(results[0].location?.display).toMatch(/neno district hospital/i);

    const obs = results[0].obs as Array<{ display: string }>;
    expect(obs.some((o) => /4/.test(o.display))).toBeTruthy();
    expect(obs.some((o) => new RegExp(appointmentDate).test(o.display))).toBeTruthy();
  });
});
