import { test, expect } from '../../core';
import {
  MastercardFormPage,
  PalliativeCareMastercardGatePage,
  fillPalliativeCareHeaderMinimum,
  fillPalliativeCareVisitForm,
} from '../../pages';
import { PALLIATIVE_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test.describe('Palliative Care visit mastercard', () => {
  test.beforeEach(async ({ page, eligiblePalliativeCarePatient }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);
    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      PalliativeCareMastercardGatePage.buildCreateUrl(eligiblePalliativeCarePatient.uuid, encounterDate),
    );
    await fillPalliativeCareHeaderMinimum(headerForm);
    await headerForm.save();
    await headerForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as PALLIATIVE_FOLLOWUP', async ({
    page,
    api,
    eligiblePalliativeCarePatient,
  }) => {
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('Palliative Care Visit');

    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillPalliativeCareVisitForm(visitForm, { appointmentDate });

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligiblePalliativeCarePatient.uuid}&encounterType=${PALLIATIVE_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);
    expect(results[0].location?.display).toMatch(/neno district hospital/i);

    const obs = results[0].obs as Array<{ display: string }>;
    expect(obs.some((o) => /160/.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /some comments/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => new RegExp(appointmentDate).test(o.display))).toBeTruthy();
  });
});
