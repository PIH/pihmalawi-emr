import { test } from '../../core';
import { MastercardFormPage, HivPatientSummaryPage } from '../../pages';

// Seeds a real ART_INITIAL header encounter and an ART_FOLLOWUP visit
// encounter (the visit is where `artRegimenObs` lives — see
// MastercardFormPage's Task 10 verification notes) via the same
// already-loaded `page`, matching visit-mastercard.spec.ts's pattern, then
// checks the HIV Patient Summary reflects both the weight and regimen
// entered on the visit. See hiv-patient-summary-page.ts's verification
// notes for how the entry point and rendered structure were confirmed live.
test('HIV Patient Summary reflects data entered on the ART mastercard', async ({ page, eligibleHivArtPatient }) => {
  const encounterDate = new Date().toISOString().slice(0, 10);
  const headerForm = await MastercardFormPage.openCreate(page, eligibleHivArtPatient.uuid, encounterDate);
  await headerForm.selectRadio('Agrees to FUP', 'Y');
  await headerForm.save();
  await headerForm.expectSaveSuccess();

  await headerForm.enterNewFlowsheet('ART Visit');
  await headerForm.selectDropdown('visitLocation', 'Neno District Hospital');
  await headerForm.fillField('heightInput', '166');
  await headerForm.fillField('weightInput', '62');
  // `artRegimenObs` and `noTabletsGiven` are both required by art-visit.xml's
  // own JS validation for the submit button to enable — see MastercardFormPage's
  // Task 10 verification notes.
  await headerForm.selectDropdown('artRegimenObs', '1A');
  await headerForm.fillField('noTabletsGiven', '30');
  const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await headerForm.fillField('appointmentDate', appointmentDate);
  await headerForm.save();
  await headerForm.expectSaveSuccess();

  const summary = await HivPatientSummaryPage.openForPatient(page, eligibleHivArtPatient.uuid);
  await summary.expectWeightDisplayed('62');
  await summary.expectRegimenDisplayed('1A');
});
