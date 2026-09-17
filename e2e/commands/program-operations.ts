import { type APIRequestContext, expect } from '@playwright/test';

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
  const res = await api.get(`programenrollment?patient=${patientUuid}&v=full`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.results;
};
