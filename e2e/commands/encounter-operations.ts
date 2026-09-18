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
    const obsRes = await api.get(`obs?encounter=${encounter.uuid}&limit=100`);
    expect(obsRes.ok()).toBeTruthy();
    const { results: obs } = await obsRes.json();
    for (const o of obs) {
      const delObsRes = await api.delete(`obs/${o.uuid}?purge=true`);
      expect(delObsRes.ok()).toBeTruthy();
    }

    const delEncRes = await api.delete(`encounter/${encounter.uuid}?purge=true`);
    expect(delEncRes.ok()).toBeTruthy();
  }
};
