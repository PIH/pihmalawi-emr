import { type APIRequestContext, request } from '@playwright/test';
import { test, expect } from '../../core';
import { NENO_DISTRICT_HOSPITAL_LOCATION_UUID } from '../../core/constants';

const HTN_DM_ON_TREATMENT = 'd5d2d3bf-9cca-4a1f-9c69-f7713ed8fff4';
const ASTHMA_ON_TREATMENT = '7f2fc125-f9bc-4195-b879-3060a386468a';
const PRE_ART_CONTINUE = '6687f284-977f-11e1-8993-905e29aff6c1';
const MENTAL_HEALTH_ON_TREATMENT = '2F76D426-56A9-4651-B253-A2299B442C09';
const EPILEPSY_ON_TREATMENT = 'CB86C6FE-4263-4A4C-AF54-49D5308459D4';
const PATIENT_DIED_CONCEPT_NAME = /patient died/i;

type State = { uuid: string; name: string };
type QuickProgram = {
  key: string;
  label: string;
  available: boolean;
  canEdit: boolean;
  enrolment: { uuid: string } | null;
  workflows: Array<{ uuid: string; name: string; open: boolean; currentState: State | null; enrolStates: State[]; changeStates: State[] }>;
  exitStates: Array<State & { kind: string }>;
};

async function quickPrograms(api: APIRequestContext, patientUuid: string): Promise<QuickProgram[]> {
  const res = await api.get(`pihmalawi/quickprograms?patient=${patientUuid}`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()).results;
}

async function program(api: APIRequestContext, patientUuid: string, key: string): Promise<QuickProgram> {
  const found = (await quickPrograms(api, patientUuid)).find((p) => p.key === key);
  expect(found, key).toBeDefined();
  return found!;
}

function enrol(api: APIRequestContext, patientUuid: string, key: string, states: string[]) {
  return api.post('pihmalawi/quickprograms/enrol', {
    data: {
      patient: patientUuid,
      program: key,
      states,
      date: new Date().toISOString().slice(0, 10),
      location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
    },
  });
}

test.describe('Quick Programs REST endpoints', () => {
  test('offers every Chronic Care condition to a patient not enrolled', async ({ api, unenrolledChronicCarePatient }) => {
    const chronicCare = await program(api, unenrolledChronicCarePatient.uuid, 'chronic-care');
    expect(chronicCare.enrolment).toBeNull();
    expect(chronicCare.workflows).toHaveLength(6);
    for (const workflow of chronicCare.workflows) {
      expect(workflow.open).toBe(false);
      expect(workflow.enrolStates.length).toBeGreaterThan(0);
    }
  });

  test('enrols in two Chronic Care conditions at once, which makes both eMastercards available', async ({
    api,
    unenrolledChronicCarePatient,
  }) => {
    const res = await enrol(api, unenrolledChronicCarePatient.uuid, 'chronic-care', [HTN_DM_ON_TREATMENT, ASTHMA_ON_TREATMENT]);
    expect(res.ok()).toBeTruthy();

    const cards = (await (await api.get(`pihmalawi/emastercards?patient=${unenrolledChronicCarePatient.uuid}`)).json())
      .results as Array<{ key: string; state: string }>;
    expect(cards.find((c) => c.key === 'htn-dm')?.state).toBe('CREATE');
    expect(cards.find((c) => c.key === 'asthma')?.state).toBe('CREATE');
  });

  test('rejects a state Quick Programs does not offer', async ({ api, unenrolledChronicCarePatient }) => {
    const res = await enrol(api, unenrolledChronicCarePatient.uuid, 'hiv', [PRE_ART_CONTINUE]);
    expect(res.status()).toBe(400);
    expect((await res.json()).error.message).toMatch(/can't be chosen/);
  });

  test('exiting Mental Health with Patient died ends both its workflows', async ({ api, unenrolledChronicCarePatient }) => {
    const enrolled = await enrol(api, unenrolledChronicCarePatient.uuid, 'mental-health', [
      MENTAL_HEALTH_ON_TREATMENT,
      EPILEPSY_ON_TREATMENT,
    ]);
    expect(enrolled.ok()).toBeTruthy();
    const mentalHealth = await program(api, unenrolledChronicCarePatient.uuid, 'mental-health');
    const died = mentalHealth.exitStates.find((s) => PATIENT_DIED_CONCEPT_NAME.test(s.name));
    expect(died?.kind).toBe('DIED');

    const res = await api.post('pihmalawi/quickprograms/exit', {
      data: { patientProgram: mentalHealth.enrolment!.uuid, state: died!.uuid, date: new Date().toISOString().slice(0, 10) },
    });
    expect(res.ok()).toBeTruthy();

    const enrolment = await (
      await api.get(`programenrollment/${mentalHealth.enrolment!.uuid}?v=custom:(dateCompleted,states:(voided,state:(concept:(display))))`)
    ).json();
    expect(enrolment.dateCompleted).not.toBeNull();
    const diedStates = enrolment.states.filter(
      (s: { voided: boolean; state: { concept: { display: string } } }) =>
        !s.voided && PATIENT_DIED_CONCEPT_NAME.test(s.state.concept.display),
    );
    expect(diedStates).toHaveLength(2);
  });

  test('answers 400 with a message for a change dated before the current state started', async ({
    api,
    unenrolledChronicCarePatient,
  }) => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const enrolled = await api.post('pihmalawi/quickprograms/enrol', {
      data: {
        patient: unenrolledChronicCarePatient.uuid,
        program: 'chronic-care',
        states: [HTN_DM_ON_TREATMENT],
        date: yesterday,
        location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
      },
    });
    expect(enrolled.ok()).toBeTruthy();
    const chronicCare = await program(api, unenrolledChronicCarePatient.uuid, 'chronic-care');
    const htnDm = chronicCare.workflows.find((w) => w.currentState)!;
    const first = await api.post('pihmalawi/quickprograms/change', {
      data: { patientProgram: chronicCare.enrolment!.uuid, states: [htnDm.changeStates[0].uuid], date: today },
    });
    expect(first.ok()).toBeTruthy();

    const res = await api.post('pihmalawi/quickprograms/change', {
      data: { patientProgram: chronicCare.enrolment!.uuid, states: [HTN_DM_ON_TREATMENT], date: yesterday },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error.message).toMatch(/can't be before/);
  });

  test('answers 403 to a user without Edit Patients', async ({ api, unenrolledChronicCarePatient }) => {
    const suffix = Date.now();
    const role = await (
      await api.post('role', {
        data: {
          name: `e2e quick programs ${suffix}`,
          description: 'e2e',
          privileges: ['Get Patients', 'Get People', 'Get Programs', 'Get Patient Programs', 'Get Locations', 'View clinical data'],
        },
      })
    ).json();
    const user = await (
      await api.post('user', {
        data: {
          username: `e2equick${suffix}`,
          password: 'Test1234',
          person: { names: [{ givenName: 'AutoQuick', familyName: 'User' }], gender: 'F', birthdate: '1990-01-01' },
          roles: [role.uuid],
        },
      })
    ).json();
    const asUser = await request.newContext({
      baseURL: `${process.env.E2E_BASE_URL}/ws/rest/v1/`,
      storageState: { cookies: [], origins: [] },
      // OpenMRS redirects to its login page rather than challenging, so send the credentials up front.
      extraHTTPHeaders: { Authorization: `Basic ${Buffer.from(`e2equick${suffix}:Test1234`).toString('base64')}` },
    });
    try {
      const chronicCare = (await (await asUser.get(`pihmalawi/quickprograms?patient=${unenrolledChronicCarePatient.uuid}`)).json())
        .results.find((p: QuickProgram) => p.key === 'chronic-care');
      expect(chronicCare.canEdit).toBe(false);
      const res = await enrol(asUser, unenrolledChronicCarePatient.uuid, 'chronic-care', [HTN_DM_ON_TREATMENT]);
      expect(res.status()).toBe(403);
    } finally {
      await asUser.dispose();
      await api.delete(`user/${user.uuid}?purge=true`);
      await api.delete(`person/${user.person.uuid}?purge=true`);
      await api.delete(`role/${role.uuid}?purge=true`);
    }
  });
});
