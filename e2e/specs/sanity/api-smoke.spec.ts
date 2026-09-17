import { test, expect } from '@playwright/test';
import { api as apiFixture } from '../../fixtures';
import { createPatient, getPatient, deletePatient, addPatientIdentifier, enrollInProgram, getProgramEnrollments, transitionToState } from '../../commands';
import { DUMMY_ID_IDENTIFIER_TYPE_UUID, NENO_DISTRICT_HOSPITAL_LOCATION_UUID, HIV_PROGRAM_UUID, ON_ARVS_STATE_UUID } from '../../core/constants';

const test2 = test.extend<{}, { api: Awaited<ReturnType<typeof apiFixture>> }>({
  api: [apiFixture, { scope: 'worker' }],
});

test2('createPatient, addPatientIdentifier, getPatient, and deletePatient round-trip', async ({ api }) => {
  const patient = await createPatient(api, { givenName: 'Test', familyName: 'Smoke' });
  expect(patient.uuid).toBeTruthy();

  await addPatientIdentifier(api, patient.uuid, {
    identifierTypeUuid: DUMMY_ID_IDENTIFIER_TYPE_UUID,
    identifier: `E2E-${Date.now()}`,
    locationUuid: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
    preferred: true,
  });

  const fetched = await getPatient(api, patient.uuid);
  expect(fetched.identifiers.length).toBeGreaterThan(0);
  expect(fetched.person.display).toContain('Test');

  await deletePatient(api, patient.uuid);
});

test2('enrollInProgram creates an enrollment with the initial state set', async ({ api }) => {
  const patient = await createPatient(api, { givenName: 'AutoEnroll', familyName: 'Test' });

  const enrollment = await enrollInProgram(api, {
    patientUuid: patient.uuid,
    programUuid: HIV_PROGRAM_UUID,
    locationUuid: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
    dateEnrolled: '2026-01-01',
    initialState: { stateUuid: ON_ARVS_STATE_UUID, startDate: '2026-01-01' },
  });

  expect(enrollment.program.uuid).toBe(HIV_PROGRAM_UUID);
  expect(enrollment.states.some((s) => s.state.uuid === ON_ARVS_STATE_UUID)).toBeTruthy();

  const fetched = await getProgramEnrollments(api, patient.uuid);
  expect(fetched.length).toBeGreaterThan(0);
});
