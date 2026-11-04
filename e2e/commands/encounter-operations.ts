import { type APIRequestContext, expect } from '@playwright/test';

// Purges every encounter recorded against a patient, and every obs on each
// of those encounters first.
//
// Why obs must go first: verified live against the REST API — DELETE
// .../encounter/{uuid}?purge=true 500s with a MySQL FK violation
// (`obs`, CONSTRAINT `encounter_observations` FOREIGN KEY (encounter_id)
// REFERENCES `encounter`) when the encounter still has obs attached. The
// REST encounter purge does not cascade-delete obs itself. Deleting each
// obs first (DELETE .../obs/{uuid}?purge=true), then the encounter, then
// works cleanly (204 on both). Needed because MastercardFormPage.save()
// (Task 9) creates a real ART_INITIAL encounter for the shared
// `eligibleHivArtPatient` fixture, and without this the fixture's teardown
// deletePatient() call 500s with the same FK violation, this time on
// `encounter`, CONSTRAINT `encounter_patient` FOREIGN KEY (patient_id)
// REFERENCES `patient`.
export const purgeEncountersForPatient = async (api: APIRequestContext, patientUuid: string): Promise<void> => {
  const encountersRes = await api.get(`encounter?patient=${patientUuid}&limit=100`);
  expect(encountersRes.ok()).toBeTruthy();
  const { results: encounters } = await encountersRes.json();

  for (const encounter of encounters) {
    // Voided obs count too (editing an encounter voids the obs it replaces), and an obs can't be purged while a
    // group member or newer version still points at it, so purge in passes until none are left.
    const obsRes = await api.get(`obs?encounter=${encounter.uuid}&includeAll=true&v=custom:(uuid)&limit=100`);
    expect(obsRes.ok()).toBeTruthy();
    let remaining: Array<{ uuid: string }> = (await obsRes.json()).results;
    for (let pass = 0; remaining.length && pass < 5; pass++) {
      const failed = [];
      for (const o of remaining) {
        if (!(await api.delete(`obs/${o.uuid}?purge=true`)).ok()) {
          failed.push(o);
        }
      }
      remaining = failed;
    }
    expect(remaining).toEqual([]);

    const delEncRes = await api.delete(`encounter/${encounter.uuid}?purge=true`);
    expect(delEncRes.ok()).toBeTruthy();
  }
};
