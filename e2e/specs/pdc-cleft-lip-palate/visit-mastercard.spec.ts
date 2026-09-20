import { test, expect } from '../../core';
import {
  MastercardFormPage,
  PdcMastercardGatePage,
  fillGenericPdcHeaderWithDiagnosis,
  PdcCleftLipPalateMastercardGatePage,
  fillPdcCleftLipPalateHeaderMinimum,
  fillPdcCleftLipPalateVisitForm,
} from '../../pages';
import { PDC_CLEFT_CLIP_PALLET_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test.describe('PDC Cleft Lip/Palate visit mastercard', () => {
  test.beforeEach(async ({ page, eligiblePdcPatient }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);

    const genericForm = await MastercardFormPage.openCreateAtUrl(
      page,
      PdcMastercardGatePage.buildCreateUrl(eligiblePdcPatient.uuid, encounterDate),
    );
    await fillGenericPdcHeaderWithDiagnosis(genericForm, 'Cleft Lip');
    await genericForm.save();
    await genericForm.expectSaveSuccess();

    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      PdcCleftLipPalateMastercardGatePage.buildCreateUrl(eligiblePdcPatient.uuid, encounterDate),
    );
    await fillPdcCleftLipPalateHeaderMinimum(headerForm);
    await headerForm.save();
    await headerForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as PDC_CLEFT_CLIP_PALLET_FOLLOWUP', async ({
    page,
    api,
    eligiblePdcPatient,
  }) => {
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('Cleft Lip / Palate Visit');

    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillPdcCleftLipPalateVisitForm(visitForm, { appointmentDate });

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligiblePdcPatient.uuid}&encounterType=${PDC_CLEFT_CLIP_PALLET_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);

    const obs = results[0].obs as Array<{ display: string }>;
    expect(obs.some((o) => /height.*80/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /weight.*10/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /appointment date/i.test(o.display))).toBeTruthy();
  });
});
