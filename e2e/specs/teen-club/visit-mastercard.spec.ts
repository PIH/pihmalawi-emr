import { test, expect } from '../../core';
import {
  MastercardFormPage,
  TeenClubMastercardGatePage,
  fillTeenClubHeaderMinimum,
  fillTeenClubVisitForm,
} from '../../pages';
import { TEEN_CLUB_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test.describe('Teen Club visit mastercard', () => {
  test.beforeEach(async ({ page, eligibleTeenClubPatient }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);
    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      TeenClubMastercardGatePage.buildCreateUrl(eligibleTeenClubPatient.uuid, encounterDate),
    );
    await fillTeenClubHeaderMinimum(headerForm);
    await headerForm.save();
    await headerForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as TEEN_CLUB_FOLLOWUP', async ({
    page,
    api,
    eligibleTeenClubPatient,
  }) => {
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('Teen Club Visit');

    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillTeenClubVisitForm(visitForm, { appointmentDate });

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligibleTeenClubPatient.uuid}&encounterType=${TEEN_CLUB_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);
    expect(results[0].location?.display).toMatch(/neno district hospital/i);

    const obs = results[0].obs as Array<{ display: string }>;
    expect(obs.some((o) => /160/.test(o.display))).toBeTruthy();
    expect(obs.some((o) => new RegExp(appointmentDate).test(o.display))).toBeTruthy();
  });
});
