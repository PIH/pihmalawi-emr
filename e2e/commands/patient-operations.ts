import { type APIRequestContext, expect } from '@playwright/test';
import { DUMMY_ID_IDENTIFIER_TYPE_UUID, NENO_DISTRICT_HOSPITAL_LOCATION_UUID } from '../core/constants';

export interface TestPatient {
  uuid: string;
  identifiers: Array<{
    uuid: string;
    identifier: string;
    identifierType: { uuid: string };
    location: { uuid: string };
    preferred: boolean;
  }>;
  person: { uuid: string; display: string; gender: string; birthdate: string; dead: boolean };
}

export interface CreatePatientOptions {
  givenName?: string;
  familyName?: string;
  gender?: 'M' | 'F';
  birthdate?: string;
  dead?: boolean;
}

function randomIdentifier(): string {
  return `E2E-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export const createPatient = async (
  api: APIRequestContext,
  opts: CreatePatientOptions = {},
): Promise<TestPatient> => {
  const givenName = opts.givenName ?? `TestPatient`;
  const familyName = opts.familyName ?? 'Test';
  const gender = opts.gender ?? 'F';
  const birthdate = opts.birthdate ?? '1990-01-01';

  const res = await api.post('patient', {
    data: {
      identifiers: [
        {
          identifier: randomIdentifier(),
          identifierType: DUMMY_ID_IDENTIFIER_TYPE_UUID,
          location: NENO_DISTRICT_HOSPITAL_LOCATION_UUID,
          preferred: true,
        },
      ],
      person: {
        gender,
        birthdate,
        birthdateEstimated: false,
        dead: opts.dead ?? false,
        names: [{ givenName, familyName }],
        addresses: [],
        attributes: [],
      },
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
};

export const addPatientIdentifier = async (
  api: APIRequestContext,
  patientUuid: string,
  opts: { identifierTypeUuid: string; identifier: string; locationUuid: string; preferred?: boolean },
): Promise<void> => {
  const res = await api.post(`patient/${patientUuid}/identifier`, {
    data: {
      identifier: opts.identifier,
      identifierType: opts.identifierTypeUuid,
      location: opts.locationUuid,
      preferred: opts.preferred ?? false,
    },
  });
  expect(res.ok()).toBeTruthy();
};

export const getPatient = async (api: APIRequestContext, uuid: string): Promise<TestPatient> => {
  const res = await api.get(`patient/${uuid}?v=full`);
  expect(res.ok()).toBeTruthy();
  return res.json();
};

export const deletePatient = async (api: APIRequestContext, uuid: string): Promise<void> => {
  const res = await api.delete(`patient/${uuid}?purge=true`);
  expect(res.ok()).toBeTruthy();
};
