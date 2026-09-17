import { type APIRequestContext, test as base } from '@playwright/test';
import { api } from '../fixtures';
import {
  createPatient,
  deletePatient,
  addPatientIdentifier,
  enrollInProgram,
  purgeProgramEnrollments,
  type TestPatient,
} from '../commands';
import {
  HIV_PROGRAM_UUID,
  ON_ARVS_STATE_UUID,
  ARV_NUMBER_IDENTIFIER_TYPE_UUID,
  NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
} from './constants';

export interface CustomTestFixtures {
  eligibleHivArtPatient: TestPatient;
}

export interface CustomWorkerFixtures {
  api: APIRequestContext;
}

export const test = base.extend<CustomTestFixtures, CustomWorkerFixtures>({
  api: [api, { scope: 'worker' }],

  eligibleHivArtPatient: [
    async ({ api }, use) => {
      // No digits in the name — see the note on createPatient's default givenName in Task 4.
      const patient = await createPatient(api, { givenName: 'AutoArt', familyName: 'Pilot' });

      await addPatientIdentifier(api, patient.uuid, {
        identifierTypeUuid: ARV_NUMBER_IDENTIFIER_TYPE_UUID,
        identifier: `ARV-E2E-${Date.now()}`,
        locationUuid: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
        preferred: false,
      });

      await enrollInProgram(api, {
        patientUuid: patient.uuid,
        programUuid: HIV_PROGRAM_UUID,
        locationUuid: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
        dateEnrolled: new Date().toISOString().slice(0, 10),
        initialState: { stateUuid: ON_ARVS_STATE_UUID, startDate: new Date().toISOString().slice(0, 10) },
      });

      await use(patient);

      // Purging the patient directly would 500 (patient_program FK) — the
      // enrollment must be purged first. See Task 5's purgeProgramEnrollments.
      await purgeProgramEnrollments(api, patient.uuid);
      await deletePatient(api, patient.uuid);
    },
    { scope: 'test' },
  ],
});

export { expect } from '@playwright/test';
