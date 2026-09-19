import { type APIRequestContext, test as base } from '@playwright/test';
import { api } from '../fixtures';
import {
  createPatient,
  deletePatient,
  getPatient,
  addPatientIdentifier,
  enrollInProgram,
  createEligibleChronicCarePatient,
  purgeProgramEnrollments,
  purgeEncountersForPatient,
  type TestPatient,
} from '../commands';
import {
  HIV_PROGRAM_UUID,
  ON_ARVS_STATE_UUID,
  ARV_NUMBER_IDENTIFIER_TYPE_UUID,
  NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
  NCD_OTHER_ON_TREATMENT_STATE_UUID,
  ASTHMA_ON_TREATMENT_STATE_UUID,
  DIABETES_HYPERTENSION_ON_TREATMENT_STATE_UUID,
} from './constants';

export interface CustomTestFixtures {
  eligibleHivArtPatient: TestPatient;
  eligibleNcdOtherPatient: TestPatient;
  eligibleChronicLungDiseasePatient: TestPatient;
  eligibleHypertensionAndDiabetesPatient: TestPatient;
}

export interface CustomWorkerFixtures {
  api: APIRequestContext;
}

export const test = base.extend<CustomTestFixtures, CustomWorkerFixtures>({
  api: [api, { scope: 'worker' }],

  eligibleHivArtPatient: [
    async ({ api }, use) => {
      // No digits in the name — see the note on createPatient's default givenName in Task 4.
      let patient = await createPatient(api, { givenName: 'AutoArt', familyName: 'Pilot' });

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

      // Refresh patient data to include the added identifier
      patient = await getPatient(api, patient.uuid);

      await use(patient);

      // Purging the patient directly would 500 (FK constraints) — any
      // encounters (e.g. the ART_INITIAL mastercard header form saved by
      // Task 9's MastercardFormPage) and program enrollments must be purged
      // first. See Task 5's purgeProgramEnrollments and Task 9's
      // purgeEncountersForPatient for the verified FK chain.
      await purgeEncountersForPatient(api, patient.uuid);
      await purgeProgramEnrollments(api, patient.uuid);
      await deletePatient(api, patient.uuid);
    },
    { scope: 'test' },
  ],

  eligibleNcdOtherPatient: [
    async ({ api }, use) => {
      const patient = await createEligibleChronicCarePatient(api, {
        workflowStateUuid: NCD_OTHER_ON_TREATMENT_STATE_UUID,
        identifierPrefix: 'CCN',
      });

      await use(patient);

      // Same FK order as eligibleHivArtPatient's teardown — see the comment there.
      await purgeEncountersForPatient(api, patient.uuid);
      await purgeProgramEnrollments(api, patient.uuid);
      await deletePatient(api, patient.uuid);
    },
    { scope: 'test' },
  ],

  eligibleChronicLungDiseasePatient: [
    async ({ api }, use) => {
      const patient = await createEligibleChronicCarePatient(api, {
        workflowStateUuid: ASTHMA_ON_TREATMENT_STATE_UUID,
        identifierPrefix: 'ASTHMA',
      });

      await use(patient);

      // Same FK order as eligibleHivArtPatient's teardown — see the comment there.
      await purgeEncountersForPatient(api, patient.uuid);
      await purgeProgramEnrollments(api, patient.uuid);
      await deletePatient(api, patient.uuid);
    },
    { scope: 'test' },
  ],

  eligibleHypertensionAndDiabetesPatient: [
    async ({ api }, use) => {
      const patient = await createEligibleChronicCarePatient(api, {
        workflowStateUuid: DIABETES_HYPERTENSION_ON_TREATMENT_STATE_UUID,
        identifierPrefix: 'HTNDM',
      });

      await use(patient);

      // Same FK order as eligibleHivArtPatient's teardown — see the comment there.
      await purgeEncountersForPatient(api, patient.uuid);
      await purgeProgramEnrollments(api, patient.uuid);
      await deletePatient(api, patient.uuid);
    },
    { scope: 'test' },
  ],
});

export { expect } from '@playwright/test';
