import { type APIRequestContext, test as base } from '@playwright/test';
import { api } from '../fixtures';
import {
  createPatient,
  deletePatient,
  getPatient,
  addPatientIdentifier,
  enrollInProgram,
  createEligibleChronicCarePatient,
  createEligibleProgramPatient,
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
  CHF_ON_TREATMENT_STATE_UUID,
  CKD_ON_TREATMENT_STATE_UUID,
  SCD_ON_TREATMENT_STATE_UUID,
  TB_PROGRAM_UUID,
  TB_ON_TREATMENT_STATE_UUID,
  TB_PROGRAM_IDENTIFIER_TYPE_UUID,
  MENTAL_HEALTH_PROGRAM_UUID,
  MENTAL_HEALTH_ON_TREATMENT_STATE_UUID,
  CHRONIC_CARE_NUMBER_IDENTIFIER_TYPE_UUID,
  PALLIATIVE_CARE_PROGRAM_UUID,
  PALLIATIVE_CARE_ON_TREATMENT_STATE_UUID,
  PALLIATIVE_CARE_NUMBER_IDENTIFIER_TYPE_UUID,
  MENTAL_HEALTH_PROGRAM_UUID as EPILEPSY_MENTAL_HEALTH_PROGRAM_UUID,
  EPILEPSY_ON_TREATMENT_STATE_UUID,
  TEEN_CLUB_PROGRAM_UUID,
  TEEN_CLUB_FIRST_TIME_INITIATION_STATE_UUID,
  CHRONIC_CARE_ON_TREATMENT_STATE_UUID,
  NUTRITION_PROGRAM_UUID,
  NUTRITION_ON_TREATMENT_STATE_UUID,
  NUTRITION_PROGRAM_NUMBER_IDENTIFIER_TYPE_UUID,
  PDC_PROGRAM_UUID,
  PDC_ON_TREATMENT_STATE_UUID,
  PDC_IDENTIFIER_TYPE_UUID,
} from './constants';

export interface CustomTestFixtures {
  eligibleHivArtPatient: TestPatient;
  eligibleNcdOtherPatient: TestPatient;
  eligibleChronicLungDiseasePatient: TestPatient;
  eligibleHypertensionAndDiabetesPatient: TestPatient;
  eligibleCardiacAndVascularDiseasePatient: TestPatient;
  eligibleChronicKidneyDiseasePatient: TestPatient;
  eligibleSickleCellDiseasePatient: TestPatient;
  eligibleTbPatient: TestPatient;
  eligibleMentalHealthPatient: TestPatient;
  eligiblePalliativeCarePatient: TestPatient;
  eligibleEpilepsyPatient: TestPatient;
  eligibleTeenClubPatient: TestPatient;
  eligibleChronicCarePatient: TestPatient;
  eligibleNutritionPatient: TestPatient;
  eligiblePdcPatient: TestPatient;
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

  eligibleCardiacAndVascularDiseasePatient: [
    async ({ api }, use) => {
      const patient = await createEligibleChronicCarePatient(api, {
        workflowStateUuid: CHF_ON_TREATMENT_STATE_UUID,
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

  eligibleChronicKidneyDiseasePatient: [
    async ({ api }, use) => {
      const patient = await createEligibleChronicCarePatient(api, {
        workflowStateUuid: CKD_ON_TREATMENT_STATE_UUID,
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

  eligibleSickleCellDiseasePatient: [
    async ({ api }, use) => {
      const patient = await createEligibleChronicCarePatient(api, {
        workflowStateUuid: SCD_ON_TREATMENT_STATE_UUID,
        identifierPrefix: 'SCD',
      });

      await use(patient);

      // Same FK order as eligibleHivArtPatient's teardown — see the comment there.
      await purgeEncountersForPatient(api, patient.uuid);
      await purgeProgramEnrollments(api, patient.uuid);
      await deletePatient(api, patient.uuid);
    },
    { scope: 'test' },
  ],

  eligibleTbPatient: [
    async ({ api }, use) => {
      const patient = await createEligibleProgramPatient(api, {
        programUuid: TB_PROGRAM_UUID,
        workflowStateUuid: TB_ON_TREATMENT_STATE_UUID,
        identifierTypeUuid: TB_PROGRAM_IDENTIFIER_TYPE_UUID,
        identifierPrefix: 'TB',
      });

      await use(patient);

      await purgeEncountersForPatient(api, patient.uuid);
      await purgeProgramEnrollments(api, patient.uuid);
      await deletePatient(api, patient.uuid);
    },
    { scope: 'test' },
  ],

  eligibleMentalHealthPatient: [
    async ({ api }, use) => {
      const patient = await createEligibleProgramPatient(api, {
        programUuid: MENTAL_HEALTH_PROGRAM_UUID,
        workflowStateUuid: MENTAL_HEALTH_ON_TREATMENT_STATE_UUID,
        identifierTypeUuid: CHRONIC_CARE_NUMBER_IDENTIFIER_TYPE_UUID,
        identifierPrefix: 'CCN',
      });

      await use(patient);

      await purgeEncountersForPatient(api, patient.uuid);
      await purgeProgramEnrollments(api, patient.uuid);
      await deletePatient(api, patient.uuid);
    },
    { scope: 'test' },
  ],

  eligiblePalliativeCarePatient: [
    async ({ api }, use) => {
      const patient = await createEligibleProgramPatient(api, {
        programUuid: PALLIATIVE_CARE_PROGRAM_UUID,
        workflowStateUuid: PALLIATIVE_CARE_ON_TREATMENT_STATE_UUID,
        identifierTypeUuid: PALLIATIVE_CARE_NUMBER_IDENTIFIER_TYPE_UUID,
        identifierPrefix: 'PC',
      });

      await use(patient);

      await purgeEncountersForPatient(api, patient.uuid);
      await purgeProgramEnrollments(api, patient.uuid);
      await deletePatient(api, patient.uuid);
    },
    { scope: 'test' },
  ],

  eligibleEpilepsyPatient: [
    async ({ api }, use) => {
      const patient = await createEligibleProgramPatient(api, {
        programUuid: EPILEPSY_MENTAL_HEALTH_PROGRAM_UUID,
        workflowStateUuid: EPILEPSY_ON_TREATMENT_STATE_UUID,
        identifierTypeUuid: CHRONIC_CARE_NUMBER_IDENTIFIER_TYPE_UUID,
        identifierPrefix: 'EPI',
      });

      await use(patient);

      await purgeEncountersForPatient(api, patient.uuid);
      await purgeProgramEnrollments(api, patient.uuid);
      await deletePatient(api, patient.uuid);
    },
    { scope: 'test' },
  ],

  eligibleTeenClubPatient: [
    async ({ api }, use) => {
      const patient = await createEligibleProgramPatient(api, {
        programUuid: TEEN_CLUB_PROGRAM_UUID,
        workflowStateUuid: TEEN_CLUB_FIRST_TIME_INITIATION_STATE_UUID,
        identifierTypeUuid: ARV_NUMBER_IDENTIFIER_TYPE_UUID,
        identifierPrefix: 'ARV',
      });

      await use(patient);

      await purgeEncountersForPatient(api, patient.uuid);
      await purgeProgramEnrollments(api, patient.uuid);
      await deletePatient(api, patient.uuid);
    },
    { scope: 'test' },
  ],

  eligibleChronicCarePatient: [
    async ({ api }, use) => {
      const patient = await createEligibleChronicCarePatient(api, {
        workflowStateUuid: CHRONIC_CARE_ON_TREATMENT_STATE_UUID,
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

  // Shared across all 5 Nutrition mastercard variants (generic, Adults,
  // Infant, PDC, Pregnant Teens) — they all gate on the same program/
  // workflow/state, only the encounter types/forms differ per variant.
  eligibleNutritionPatient: [
    async ({ api }, use) => {
      const patient = await createEligibleProgramPatient(api, {
        programUuid: NUTRITION_PROGRAM_UUID,
        workflowStateUuid: NUTRITION_ON_TREATMENT_STATE_UUID,
        identifierTypeUuid: NUTRITION_PROGRAM_NUMBER_IDENTIFIER_TYPE_UUID,
        identifierPrefix: 'NUT',
      });

      await use(patient);

      await purgeEncountersForPatient(api, patient.uuid);
      await purgeProgramEnrollments(api, patient.uuid);
      await deletePatient(api, patient.uuid);
    },
    { scope: 'test' },
  ],

  // Shared across all 5 PDC mastercard variants (generic, Developmental
  // Delay, Trisomy, Cleft Lip/Palate, Other Diagnosis) — all gate on the
  // same program/workflow/state. The 4 condition-specific variants ALSO
  // require a "Diagnosis" obs set via the generic PDC eMastercard header
  // first — see pdc-mastercard-page.ts's `fillGenericPdcHeaderWithDiagnosis`,
  // done per-spec (not in this fixture) since which diagnosis to set differs
  // per variant under test.
  eligiblePdcPatient: [
    async ({ api }, use) => {
      const patient = await createEligibleProgramPatient(api, {
        programUuid: PDC_PROGRAM_UUID,
        workflowStateUuid: PDC_ON_TREATMENT_STATE_UUID,
        identifierTypeUuid: PDC_IDENTIFIER_TYPE_UUID,
        identifierPrefix: 'PDC',
      });

      await use(patient);

      await purgeEncountersForPatient(api, patient.uuid);
      await purgeProgramEnrollments(api, patient.uuid);
      await deletePatient(api, patient.uuid);
    },
    { scope: 'test' },
  ],
});

export { expect } from '@playwright/test';
