import { test, expect } from '../../core';
import { MastercardFormPage, TraceMastercardGatePage, fillTraceVisitForm } from '../../pages';
import { TRACE_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

test.describe('Trace visit mastercard', () => {
  test.beforeEach(async ({ page, tracePatient }) => {
    const encounterDate = new Date().toISOString().slice(0, 10);
    const headerForm = await MastercardFormPage.openCreateAtUrl(
      page,
      TraceMastercardGatePage.buildCreateUrl(tracePatient.uuid, encounterDate),
    );
    // trace-mastercard.xml has no fields to fill (see trace-mastercard-page.ts).
    await headerForm.save();
    await headerForm.expectSaveSuccess();
  });

  test('a trace attempt encounter can be entered and is saved as TRACE_FOLLOWUP', async ({
    page,
    api,
    tracePatient,
  }) => {
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('Trace Attempt');

    const missingAppDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const nextTrackingAttempt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await fillTraceVisitForm(visitForm, { missingAppDate, nextTrackingAttempt });

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${tracePatient.uuid}&encounterType=${TRACE_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);

    const obs = results[0].obs as Array<{ display: string }>;

    expect(obs.some((o) => /attempts made to contact.*2/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /tracker.*grace banda/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /missing appointment date/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /trace patient found.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /reason for missing appointment.*transport/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /current complaints or symptoms.*none reported/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /other socio-economic complaint.*none reported/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /agreed to return to clinic.*yes/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /date given/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /would you say that your health is.*good/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /trace remarks.*some remarks/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /next tracking attempt/i.test(o.display))).toBeTruthy();
  });
});
