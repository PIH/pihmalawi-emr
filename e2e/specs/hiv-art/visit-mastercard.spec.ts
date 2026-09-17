import { test, expect } from '../../core';
import { MastercardFormPage } from '../../pages';
import { ART_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

// A visit mastercard is only meaningful once a header (ART_INITIAL)
// encounter exists — see MastercardFormPage's Task 10 verification notes.
// This beforeEach creates that header first, on the same `page` the test
// itself receives, since reaching the visit form requires continuing on
// that same already-loaded page (`enterNewFlowsheet`), not a fresh
// `openCreate` navigation.
test.describe('ART visit mastercard', () => {
  test.beforeEach(async ({ page, eligibleHivArtPatient }) => {
    const intakeDate = new Date().toISOString().slice(0, 10);
    const intakeForm = await MastercardFormPage.openCreate(page, eligibleHivArtPatient.uuid, intakeDate);
    await intakeForm.selectRadio('Agrees to FUP', 'Y');
    await intakeForm.save();
    await intakeForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as ART_FOLLOWUP', async ({
    page,
    api,
    eligibleHivArtPatient,
  }) => {
    // Continues on the same `page` the beforeEach already navigated and
    // saved a header encounter on — see MastercardFormPage's Task 10
    // verification note 1 for why `openCreate` can't be called again here.
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('ART Visit');

    // "Visit Location" is required (an `encounterLocation` tag, same as the
    // header's), and left blank by default — same as the header form.
    await visitForm.selectDropdown('visitLocation', 'Neno District Hospital');
    await visitForm.fillField('heightInput', '166');
    await visitForm.fillField('weightInput', '61');
    // `artRegimenObs` and `noTabletsGiven` are both required by
    // art-visit.xml's own JS validation (not the `required` XML attribute)
    // — the submit button stays disabled until both are filled.
    await visitForm.selectDropdown('artRegimenObs', '1A');
    await visitForm.fillField('noTabletsGiven', '30');
    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await visitForm.fillField('appointmentDate', appointmentDate);

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligibleHivArtPatient.uuid}&encounterType=${ART_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);

    const obs = results[0].obs as Array<{ display: string }>;
    expect(obs.some((o) => /61/.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /166/.test(o.display))).toBeTruthy();
  });
});
