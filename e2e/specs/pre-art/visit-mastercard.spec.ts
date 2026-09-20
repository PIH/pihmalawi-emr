import { test, expect } from '../../core';
import {
  MastercardFormPage,
  PreArtMastercardGatePage,
  fillPreArtHeaderMinimum,
  fillPreArtVisitForm,
} from '../../pages';
import { PRE_ART_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test.describe('Pre-ART visit mastercard', () => {
  test.beforeEach(async ({ page, eligiblePreArtPatient }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);
    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      PreArtMastercardGatePage.buildCreateUrl(eligiblePreArtPatient.uuid, encounterDate),
    );
    await fillPreArtHeaderMinimum(headerForm);
    await headerForm.save();
    await headerForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as PART_FOLLOWUP', async ({
    page,
    api,
    eligiblePreArtPatient,
  }) => {
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('Pre-ART Visit');

    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillPreArtVisitForm(visitForm, { appointmentDate });

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligiblePreArtPatient.uuid}&encounterType=${PRE_ART_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);

    const obs = results[0].obs as Array<{ display: string }>;

    expect(obs.some((o) => /height.*160/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /weight.*55/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /wasting.*no/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /tb status.*n/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /who stage.*who stage i adult/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /pregnan.*n/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /depo.*yes/i.test(o.display))).toBeTruthy();
  });
});
