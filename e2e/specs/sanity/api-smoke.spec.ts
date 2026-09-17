import { test, expect } from '@playwright/test';
import { api as apiFixture } from '../../fixtures';
import { createPatient, getPatient, deletePatient, addPatientIdentifier } from '../../commands';
import { DUMMY_ID_IDENTIFIER_TYPE_UUID, NENO_DISTRICT_HOSPITAL_LOCATION_UUID } from '../../core/constants';

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
