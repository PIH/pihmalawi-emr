import { test, expect } from '../../core';
import { createPatient, addPatientIdentifier, purgeProgramEnrollments, deletePatient } from '../../commands';
import { QuickProgramsPage, MastercardGatePage } from '../../pages';
import { ARV_NUMBER_IDENTIFIER_TYPE_UUID, NENO_DISTRICT_HOSPITAL_LOCATION_UUID } from '../../core/constants';

test('ART mastercard is only offered once program, state, and identifier criteria are all met', async ({
  page,
  api,
}) => {
  const patient = await createPatient(api, { givenName: 'AutoGate', familyName: 'Test' });

  // 1. Before any enrollment: gate closed ("Not available: Inactive program state (ART eMastercard)")
  expect(await MastercardGatePage.isCreateLinkVisibleOnDashboard(page, patient.uuid)).toBe(false);

  // 2. Enroll in HIV program via the quick-programs widget. The widget's real
  // display text is "HIV Program" / "On antiretrovirals" (not "HIV PROGRAM" /
  // "On ARVs" as originally assumed) — see quick-programs-page.ts header notes.
  const quickPrograms = await QuickProgramsPage.openForPatient(page, patient.uuid);
  await quickPrograms.enroll({
    programName: 'HIV Program',
    initialStateName: 'On antiretrovirals',
    locationName: 'Neno District Hospital',
    dateEnrolled: new Date().toISOString().slice(0, 10),
  });

  // Still closed: no ARV Number identifier yet ("Not available: No identifier (ART eMastercard)")
  expect(await MastercardGatePage.isCreateLinkVisibleOnDashboard(page, patient.uuid)).toBe(false);

  // 3. Assign the ARV Number identifier at the same location
  await addPatientIdentifier(api, patient.uuid, {
    identifierTypeUuid: ARV_NUMBER_IDENTIFIER_TYPE_UUID,
    identifier: `ARV-E2E-${Date.now()}`,
    locationUuid: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
  });

  // 4. Now the gate should be open ("Create new ART eMastercard" link visible)
  expect(await MastercardGatePage.isCreateLinkVisibleOnDashboard(page, patient.uuid)).toBe(true);

  await purgeProgramEnrollments(api, patient.uuid);
  await deletePatient(api, patient.uuid);
});
