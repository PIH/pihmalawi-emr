import { type APIRequestContext, expect } from '@playwright/test';
import { addPatientIdentifier, createPatient, getPatient, type TestPatient } from './patient-operations';
import {
  CHRONIC_CARE_NUMBER_IDENTIFIER_TYPE_UUID,
  CHRONIC_CARE_PROGRAM_UUID,
  NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
} from '../core/constants';

export interface ProgramEnrollment {
  uuid: string;
  program: { uuid: string };
  dateEnrolled: string;
  location: { uuid: string };
  states: Array<{ uuid: string; state: { uuid: string }; startDate: string; endDate: string | null }>;
}

export interface EnrollmentOptions {
  patientUuid: string;
  programUuid: string;
  locationUuid: string;
  dateEnrolled: string;
  initialState?: { stateUuid: string; startDate: string };
}

export const enrollInProgram = async (
  api: APIRequestContext,
  opts: EnrollmentOptions,
): Promise<ProgramEnrollment> => {
  const res = await api.post('programenrollment', {
    data: {
      patient: opts.patientUuid,
      program: opts.programUuid,
      location: opts.locationUuid,
      dateEnrolled: opts.dateEnrolled,
      states: opts.initialState
        ? [{ state: opts.initialState.stateUuid, startDate: opts.initialState.startDate }]
        : [],
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
};

export const transitionToState = async (
  api: APIRequestContext,
  enrollmentUuid: string,
  opts: { stateUuid: string; startDate: string },
): Promise<ProgramEnrollment> => {
  const res = await api.post(`programenrollment/${enrollmentUuid}`, {
    data: {
      states: [{ state: opts.stateUuid, startDate: opts.startDate }],
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
};

export const getProgramEnrollments = async (
  api: APIRequestContext,
  patientUuid: string,
): Promise<ProgramEnrollment[]> => {
  const res = await api.get(`programenrollment?patient=${patientUuid}&v=full&limit=100`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.results;
};

export const purgeProgramEnrollments = async (
  api: APIRequestContext,
  patientUuid: string,
): Promise<void> => {
  const enrollments = await getProgramEnrollments(api, patientUuid);
  for (const enrollment of enrollments) {
    const res = await api.delete(`programenrollment/${enrollment.uuid}?purge=true`);
    expect(res.ok()).toBeTruthy();
  }
};

export interface ChronicCareEligibilityOptions {
  workflowStateUuid: string;
  identifierPrefix: string;
}

// Generalized across all Chronic Care Program conditions (diabetes/hypertension,
// asthma, CHF, CKD, NCD Other, ...) — parameterized by the condition's initial
// workflow state and identifier prefix so each condition's fixture is a small
// call to this function, not a copy of its body. See docs/program-eligibility-rules.md
// for the per-condition workflow/state uuids.
export const createEligibleChronicCarePatient = async (
  api: APIRequestContext,
  opts: ChronicCareEligibilityOptions,
): Promise<TestPatient> => {
  const patient = await createPatient(api, { givenName: 'AutoChronic', familyName: 'Pilot' });

  await addPatientIdentifier(api, patient.uuid, {
    identifierTypeUuid: CHRONIC_CARE_NUMBER_IDENTIFIER_TYPE_UUID,
    identifier: `${opts.identifierPrefix}-E2E-${Date.now()}`,
    locationUuid: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
    preferred: false,
  });

  await enrollInProgram(api, {
    patientUuid: patient.uuid,
    programUuid: CHRONIC_CARE_PROGRAM_UUID,
    locationUuid: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
    dateEnrolled: new Date().toISOString().slice(0, 10),
    initialState: { stateUuid: opts.workflowStateUuid, startDate: new Date().toISOString().slice(0, 10) },
  });

  // Refresh patient data to include the added identifier
  return getPatient(api, patient.uuid);
};
