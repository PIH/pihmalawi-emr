import { type APIRequestContext } from '@playwright/test';
import { test, expect } from '../../core';
import { runMigrationSqlFile, runSql } from '../../commands';
import {
  NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
  NUTRITION_ADULTS_FOLLOWUP_ENCOUNTER_TYPE_UUID,
  NUTRITION_ADULTS_VISIT_FORM_UUID,
  NUTRITION_EMASTERCARD_FORM_UUID,
  NUTRITION_INFANT_FOLLOWUP_ENCOUNTER_TYPE_UUID,
  NUTRITION_INFANT_VISIT_FORM_UUID,
  NUTRITION_INITIAL_ENCOUNTER_TYPE_UUID,
  NUTRITION_PDC_FOLLOWUP_ENCOUNTER_TYPE_UUID,
  NUTRITION_PDC_VISIT_FORM_UUID,
  NUTRITION_PREGNANT_TEENS_FOLLOWUP_ENCOUNTER_TYPE_UUID,
  NUTRITION_PREGNANT_TEENS_VISIT_FORM_UUID,
} from '../../core/constants';

// MLW-1859 moved the Nutrition visit forms' "Ration (Warehouse signature)" field and the Nutrition
// eMastercard's "Needs Social Support (POSER)" checkbox onto new concepts, and
// migrateNutritionConcepts.sql (liquibase changeset 20261019-migrate-nutrition-concepts) moves the
// identifiable obs recorded before that onto the new concepts too. Same approach as
// sickle-cell-disease/concept-migration.spec.ts: seed "legacy" encounters over REST, re-run the
// migration SQL, and check each obs by uuid.
//
// Requires E2E_DOCKER_INSTANCE (and docker access to its openmrs-db container) -- see
// commands/db-operations.ts.

const MIGRATION_SQL_FILE = 'migrateNutritionConcepts.sql';
const MIGRATION_CHANGESET_ID = '20261019-migrate-nutrition-concepts';

// Ration (Warehouse signature): old concept -> new concept (both Text)
const GIVEN_NAME = '6570f9ea-977f-11e1-8993-905e29aff6c1';
const NAME_OF_DATA_COLLECTOR = '655ff60e-977f-11e1-8993-905e29aff6c1';

// eMastercard "Reason enrolled in food program" answers. Before MLW-1859 both the POSER and the
// Malnutrition checkboxes saved ENROLLED_IN_PDC; Malnutrition still does.
const REASON_ENROLLED_IN_FOOD_PROGRAM = '6567efa8-977f-11e1-8993-905e29aff6c1';
const ENROLLED_IN_PDC = '92148ae3-642c-47f5-ae7c-2c4efa9796e8';
const POSER_SUPPORT = '5b49fbf4-2645-4ab2-974e-4e6c961162b1';

const VISIT_FORMS = [
  { name: 'Adults', formUuid: NUTRITION_ADULTS_VISIT_FORM_UUID, encounterTypeUuid: NUTRITION_ADULTS_FOLLOWUP_ENCOUNTER_TYPE_UUID },
  { name: 'Infant', formUuid: NUTRITION_INFANT_VISIT_FORM_UUID, encounterTypeUuid: NUTRITION_INFANT_FOLLOWUP_ENCOUNTER_TYPE_UUID },
  { name: 'PDC', formUuid: NUTRITION_PDC_VISIT_FORM_UUID, encounterTypeUuid: NUTRITION_PDC_FOLLOWUP_ENCOUNTER_TYPE_UUID },
  {
    name: 'Pregnant Teens',
    formUuid: NUTRITION_PREGNANT_TEENS_VISIT_FORM_UUID,
    encounterTypeUuid: NUTRITION_PREGNANT_TEENS_FOLLOWUP_ENCOUNTER_TYPE_UUID,
  },
];

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

const getObsConcept = async (api: APIRequestContext, obsUuid: string): Promise<string> => {
  const res = await api.get(`obs/${obsUuid}?v=custom:(uuid,concept:(uuid))`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()).concept.uuid.toLowerCase();
};

const getObsValueText = async (api: APIRequestContext, obsUuid: string): Promise<string> => {
  const res = await api.get(`obs/${obsUuid}?v=custom:(uuid,value)`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()).value;
};

const getCodedValues = async (api: APIRequestContext, obs: SeededObs[]): Promise<string[]> => {
  const values: string[] = [];
  for (const o of obs) {
    const res = await api.get(`obs/${o.uuid}?v=custom:(uuid,value)`);
    expect(res.ok()).toBeTruthy();
    values.push((await res.json()).value.uuid.toLowerCase());
  }
  return values.sort();
};

test.describe('Nutrition concept migration (MLW-1859)', () => {
  test('the liquibase changeset was executed by the deployed instance, not skipped', () => {
    // onFail="CONTINUE" means an unmet precondition leaves no row at all, and a failed changeset
    // aborts startup, so a row with EXECTYPE EXECUTED is what a successful run looks like.
    const execType = runSql(
      `select exectype from liquibasechangelog where id = '${MIGRATION_CHANGESET_ID}';`,
    ).trim();
    expect(execType).toBe('EXECUTED');
  });

  test('moves legacy Ration obs on every Nutrition visit form onto the new concept, keeping the text', async ({
    api,
    eligibleNutritionPatient,
  }) => {
    const seeded: Array<{ name: string; obsUuid: string; text: string }> = [];
    for (const { name, formUuid, encounterTypeUuid } of VISIT_FORMS) {
      const text = `Ration signature ${name}`;
      const [obs] = await createLegacyEncounter(api, {
        patientUuid: eligibleNutritionPatient.uuid,
        encounterTypeUuid,
        formUuid,
        obs: [{ concept: GIVEN_NAME, value: text }],
      });
      seeded.push({ name, obsUuid: obs.uuid, text });
    }

    runMigrationSqlFile(MIGRATION_SQL_FILE);

    for (const { name, obsUuid, text } of seeded) {
      expect(await getObsConcept(api, obsUuid), `${name} visit`).toBe(NAME_OF_DATA_COLLECTOR);
      expect(await getObsValueText(api, obsUuid), `${name} visit`).toBe(text);
    }
  });

  test('turns one of a POSER + Malnutrition pair into POSER, and leaves a single tick as Malnutrition', async ({
    api,
    eligibleNutritionPatient,
  }) => {
    const reasonObs = (value: string) => ({ concept: REASON_ENROLLED_IN_FOOD_PROGRAM, value });

    // Both boxes ticked: two identical "Enrolled in PDC" obs on one encounter.
    const bothTicked = await createLegacyEncounter(api, {
      patientUuid: eligibleNutritionPatient.uuid,
      encounterTypeUuid: NUTRITION_INITIAL_ENCOUNTER_TYPE_UUID,
      formUuid: NUTRITION_EMASTERCARD_FORM_UUID,
      obs: [reasonObs(ENROLLED_IN_PDC), reasonObs(ENROLLED_IN_PDC)],
    });
    // One box ticked: could have been either, so it must stay as it is (Malnutrition).
    const oneTicked = await createLegacyEncounter(api, {
      patientUuid: eligibleNutritionPatient.uuid,
      encounterTypeUuid: NUTRITION_INITIAL_ENCOUNTER_TYPE_UUID,
      formUuid: NUTRITION_EMASTERCARD_FORM_UUID,
      obs: [reasonObs(ENROLLED_IN_PDC)],
    });

    runMigrationSqlFile(MIGRATION_SQL_FILE);

    expect(await getCodedValues(api, bothTicked)).toEqual([ENROLLED_IN_PDC, POSER_SUPPORT].sort());
    expect(await getCodedValues(api, oneTicked)).toEqual([ENROLLED_IN_PDC]);

    // A second run must not turn the remaining Malnutrition obs into POSER as well.
    runMigrationSqlFile(MIGRATION_SQL_FILE);
    expect(await getCodedValues(api, bothTicked)).toEqual([ENROLLED_IN_PDC, POSER_SUPPORT].sort());
  });

  test('leaves the old concepts alone outside the Nutrition forms that used them', async ({
    api,
    eligibleNutritionPatient,
  }) => {
    const patientUuid = eligibleNutritionPatient.uuid;

    // Same encounter types as the Nutrition forms, but no form, so only the form scoping keeps
    // these untouched.
    const [unscopedRation] = await createLegacyEncounter(api, {
      patientUuid,
      encounterTypeUuid: NUTRITION_ADULTS_FOLLOWUP_ENCOUNTER_TYPE_UUID,
      obs: [{ concept: GIVEN_NAME, value: 'Not a nutrition form' }],
    });
    const unscopedPair = await createLegacyEncounter(api, {
      patientUuid,
      encounterTypeUuid: NUTRITION_INITIAL_ENCOUNTER_TYPE_UUID,
      obs: [
        { concept: REASON_ENROLLED_IN_FOOD_PROGRAM, value: ENROLLED_IN_PDC },
        { concept: REASON_ENROLLED_IN_FOOD_PROGRAM, value: ENROLLED_IN_PDC },
      ],
    });

    runMigrationSqlFile(MIGRATION_SQL_FILE);

    expect(await getObsConcept(api, unscopedRation.uuid)).toBe(GIVEN_NAME);
    expect(await getCodedValues(api, unscopedPair)).toEqual([ENROLLED_IN_PDC, ENROLLED_IN_PDC]);
  });
});
