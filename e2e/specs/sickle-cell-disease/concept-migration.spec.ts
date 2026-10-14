import { type APIRequestContext } from '@playwright/test';
import { test, expect } from '../../core';
import { runMigrationSqlFile, runSql } from '../../commands';
import {
  NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
  SCD_EMASTERCARD_FORM_UUID,
  SCD_FOLLOWUP_ENCOUNTER_TYPE_UUID,
  SCD_INITIAL_ENCOUNTER_TYPE_UUID,
  SCD_VISIT_FORM_UUID,
} from '../../core/constants';

// MLW-1858 moved several Sickle Cell Disease Visit/eMastercard fields onto new concepts, and
// migrateSickleCellDiseaseConcepts.sql (liquibase changeset
// 20261013-migrate-sickle-cell-disease-concepts) moves the obs recorded before that onto the new
// concepts too. The forms can no longer produce obs on the old concepts, so these tests seed
// "legacy" encounters directly over REST, re-run the migration SQL, and check each obs by uuid.
//
// Requires E2E_DOCKER_INSTANCE (and docker access to its openmrs-db container) -- see
// commands/db-operations.ts.

const MIGRATION_SQL_FILE = 'migrateSickleCellDiseaseConcepts.sql';
const MIGRATION_CHANGESET_ID = '20261013-migrate-sickle-cell-disease-concepts';

const YES = '65576354-977f-11e1-8993-905e29aff6c1';
const NO = '6557646c-977f-11e1-8993-905e29aff6c1';

// Visit form questions: old concept -> new concept
const ATTENDED_SCHOOL_EVER = '656cb22c-977f-11e1-8993-905e29aff6c1';
const ABSENCE_FROM_SCHOOL = '839054d3-4faf-4e66-88e0-cfbafaf48131';
const COMPLICATIONS_SINCE_LAST_VISIT = 'e384a58c-4a73-11ec-81d3-0242ac130003';
const NO_PRESENCE_OF_SPLENOMEGALY = '65639a20-977f-11e1-8993-905e29aff6c1';
const ENLARGED_SPLEEN = '96c94222-94fa-4514-b952-adf429643c2e';
const EXTREMITY_EXAM_FINDINGS = '6557aea4-977f-11e1-8993-905e29aff6c1';
const JAUNDICE = '6546d462-977f-11e1-8993-905e29aff6c1';
const DIAGNOSIS_RESOLVED = '6570e5b8-977f-11e1-8993-905e29aff6c1';
const IRREGULAR_CONJUNCTIVA = '1ecf325d-a9ce-4a68-9f00-393ba47fa2e9';

// eMastercard "Reason for referral" answer: old answer -> new answer
const REASON_FOR_REFERRAL = '98b17e13-659f-41e7-8459-b370fdbffe0f';
const PATIENT_TRANSFER_IN = '7602d441-4a44-41a9-aa49-a59853aedc65';
const INPATIENT_AT_TIME_OF_VISIT = '656fc048-977f-11e1-8993-905e29aff6c1';
const OPD = '6578c9f4-977f-11e1-8993-905e29aff6c1';

interface SeededObs {
  uuid: string;
  concept: { uuid: string };
}

const createLegacyEncounter = async (
  api: APIRequestContext,
  opts: {
    patientUuid: string;
    encounterTypeUuid: string;
    formUuid?: string;
    obs: Array<{ concept: string; value: string }>;
  },
): Promise<SeededObs[]> => {
  const res = await api.post('encounter', {
    data: {
      patient: opts.patientUuid,
      encounterType: opts.encounterTypeUuid,
      encounterDatetime: new Date().toISOString().slice(0, 10),
      location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
      ...(opts.formUuid ? { form: opts.formUuid } : {}),
      obs: opts.obs,
    },
  });
  expect(res.ok()).toBeTruthy();
  const encounter = await res.json();
  const obsRes = await api.get(`obs?encounter=${encounter.uuid}&v=custom:(uuid,concept:(uuid))`);
  expect(obsRes.ok()).toBeTruthy();
  const { results } = await obsRes.json();
  expect(results.length).toBe(opts.obs.length);
  return results;
};

const seededObsFor = (obs: SeededObs[], conceptUuid: string): string => {
  const match = obs.find((o) => o.concept.uuid.toLowerCase() === conceptUuid);
  expect(match, `seeded obs for concept ${conceptUuid}`).toBeTruthy();
  return match!.uuid;
};

const getObsConceptAndValue = async (
  api: APIRequestContext,
  obsUuid: string,
): Promise<{ concept: string; value: string }> => {
  const res = await api.get(`obs/${obsUuid}?v=custom:(uuid,concept:(uuid),value)`);
  expect(res.ok()).toBeTruthy();
  const obs = await res.json();
  return { concept: obs.concept.uuid.toLowerCase(), value: obs.value.uuid.toLowerCase() };
};

test.describe('Sickle Cell Disease concept migration (MLW-1858)', () => {
  test('the liquibase changeset was executed by the deployed instance, not skipped', () => {
    // onFail="CONTINUE" means an unmet precondition leaves no row at all, and a failed changeset
    // aborts startup, so a row with EXECTYPE EXECUTED is what a successful run looks like.
    const execType = runSql(
      `select exectype from liquibasechangelog where id = '${MIGRATION_CHANGESET_ID}';`,
    ).trim();
    expect(execType).toBe('EXECUTED');
  });

  test('moves legacy Visit and eMastercard obs onto the new concepts, keeping their values', async ({
    api,
    eligibleSickleCellDiseasePatient,
  }) => {
    const patientUuid = eligibleSickleCellDiseasePatient.uuid;

    const visitObs = await createLegacyEncounter(api, {
      patientUuid,
      encounterTypeUuid: SCD_FOLLOWUP_ENCOUNTER_TYPE_UUID,
      formUuid: SCD_VISIT_FORM_UUID,
      obs: [
        { concept: ATTENDED_SCHOOL_EVER, value: YES },
        { concept: COMPLICATIONS_SINCE_LAST_VISIT, value: NO },
        { concept: EXTREMITY_EXAM_FINDINGS, value: YES },
        { concept: DIAGNOSIS_RESOLVED, value: NO },
      ],
    });
    // "No presence of splenomegaly" was the spleen field's concept only between #311 and #312, so
    // it gets its own encounter (one form submission never has both spleen concepts).
    const interimSpleenObs = await createLegacyEncounter(api, {
      patientUuid,
      encounterTypeUuid: SCD_FOLLOWUP_ENCOUNTER_TYPE_UUID,
      formUuid: SCD_VISIT_FORM_UUID,
      obs: [{ concept: NO_PRESENCE_OF_SPLENOMEGALY, value: YES }],
    });
    const headerObs = await createLegacyEncounter(api, {
      patientUuid,
      encounterTypeUuid: SCD_INITIAL_ENCOUNTER_TYPE_UUID,
      formUuid: SCD_EMASTERCARD_FORM_UUID,
      obs: [{ concept: REASON_FOR_REFERRAL, value: PATIENT_TRANSFER_IN }],
    });

    runMigrationSqlFile(MIGRATION_SQL_FILE);

    const expectations: Array<{ obsUuid: string; concept: string; value: string }> = [
      { obsUuid: seededObsFor(visitObs, ATTENDED_SCHOOL_EVER), concept: ABSENCE_FROM_SCHOOL, value: YES },
      { obsUuid: seededObsFor(visitObs, COMPLICATIONS_SINCE_LAST_VISIT), concept: ENLARGED_SPLEEN, value: NO },
      { obsUuid: seededObsFor(visitObs, EXTREMITY_EXAM_FINDINGS), concept: JAUNDICE, value: YES },
      { obsUuid: seededObsFor(visitObs, DIAGNOSIS_RESOLVED), concept: IRREGULAR_CONJUNCTIVA, value: NO },
      { obsUuid: seededObsFor(interimSpleenObs, NO_PRESENCE_OF_SPLENOMEGALY), concept: ENLARGED_SPLEEN, value: YES },
      {
        obsUuid: seededObsFor(headerObs, REASON_FOR_REFERRAL),
        concept: REASON_FOR_REFERRAL,
        value: INPATIENT_AT_TIME_OF_VISIT,
      },
    ];
    for (const { obsUuid, concept, value } of expectations) {
      expect(await getObsConceptAndValue(api, obsUuid), `obs ${obsUuid}`).toEqual({ concept, value });
    }
  });

  test('leaves the old concepts alone outside the Sickle Cell Disease forms', async ({
    api,
    eligibleSickleCellDiseasePatient,
  }) => {
    const patientUuid = eligibleSickleCellDiseasePatient.uuid;

    // The old concepts are shared with other forms (e.g. PDC's "Complications since last visit"),
    // so the migration is scoped by form, not by encounter type or concept. Same encounter types
    // as the SCD forms, but no form, so only the form scoping keeps these untouched.
    const unscopedVisitObs = await createLegacyEncounter(api, {
      patientUuid,
      encounterTypeUuid: SCD_FOLLOWUP_ENCOUNTER_TYPE_UUID,
      obs: [
        { concept: ATTENDED_SCHOOL_EVER, value: YES },
        { concept: COMPLICATIONS_SINCE_LAST_VISIT, value: NO },
        { concept: NO_PRESENCE_OF_SPLENOMEGALY, value: YES },
        { concept: EXTREMITY_EXAM_FINDINGS, value: YES },
        { concept: DIAGNOSIS_RESOLVED, value: NO },
      ],
    });
    const unscopedHeaderObs = await createLegacyEncounter(api, {
      patientUuid,
      encounterTypeUuid: SCD_INITIAL_ENCOUNTER_TYPE_UUID,
      obs: [{ concept: REASON_FOR_REFERRAL, value: PATIENT_TRANSFER_IN }],
    });
    // On the eMastercard itself, only the "Patient transfer in" answer moves -- other referral
    // reasons must keep their answer.
    const otherReferralObs = await createLegacyEncounter(api, {
      patientUuid,
      encounterTypeUuid: SCD_INITIAL_ENCOUNTER_TYPE_UUID,
      formUuid: SCD_EMASTERCARD_FORM_UUID,
      obs: [{ concept: REASON_FOR_REFERRAL, value: OPD }],
    });

    runMigrationSqlFile(MIGRATION_SQL_FILE);

    const untouched: Array<{ obsUuid: string; concept: string; value: string }> = [
      { obsUuid: seededObsFor(unscopedVisitObs, ATTENDED_SCHOOL_EVER), concept: ATTENDED_SCHOOL_EVER, value: YES },
      {
        obsUuid: seededObsFor(unscopedVisitObs, COMPLICATIONS_SINCE_LAST_VISIT),
        concept: COMPLICATIONS_SINCE_LAST_VISIT,
        value: NO,
      },
      {
        obsUuid: seededObsFor(unscopedVisitObs, NO_PRESENCE_OF_SPLENOMEGALY),
        concept: NO_PRESENCE_OF_SPLENOMEGALY,
        value: YES,
      },
      {
        obsUuid: seededObsFor(unscopedVisitObs, EXTREMITY_EXAM_FINDINGS),
        concept: EXTREMITY_EXAM_FINDINGS,
        value: YES,
      },
      { obsUuid: seededObsFor(unscopedVisitObs, DIAGNOSIS_RESOLVED), concept: DIAGNOSIS_RESOLVED, value: NO },
      {
        obsUuid: seededObsFor(unscopedHeaderObs, REASON_FOR_REFERRAL),
        concept: REASON_FOR_REFERRAL,
        value: PATIENT_TRANSFER_IN,
      },
      { obsUuid: seededObsFor(otherReferralObs, REASON_FOR_REFERRAL), concept: REASON_FOR_REFERRAL, value: OPD },
    ];
    for (const { obsUuid, concept, value } of untouched) {
      expect(await getObsConceptAndValue(api, obsUuid), `obs ${obsUuid}`).toEqual({ concept, value });
    }
  });

  test('is safe to run again over already-migrated data', async ({ api, eligibleSickleCellDiseasePatient }) => {
    const visitObs = await createLegacyEncounter(api, {
      patientUuid: eligibleSickleCellDiseasePatient.uuid,
      encounterTypeUuid: SCD_FOLLOWUP_ENCOUNTER_TYPE_UUID,
      formUuid: SCD_VISIT_FORM_UUID,
      obs: [{ concept: EXTREMITY_EXAM_FINDINGS, value: YES }],
    });

    runMigrationSqlFile(MIGRATION_SQL_FILE);
    runMigrationSqlFile(MIGRATION_SQL_FILE);

    expect(await getObsConceptAndValue(api, seededObsFor(visitObs, EXTREMITY_EXAM_FINDINGS))).toEqual({
      concept: JAUNDICE,
      value: YES,
    });
  });
});
