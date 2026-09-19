import { test, expect } from '../../core';
import { CHRONIC_CARE_NUMBER_IDENTIFIER_TYPE_UUID } from '../../core/constants';

test('eligibleHivArtPatient fixture creates a patient that meets the ART mastercard gate', async ({
  eligibleHivArtPatient,
}) => {
  expect(eligibleHivArtPatient.uuid).toBeTruthy();
  expect(
    eligibleHivArtPatient.identifiers.some((i) => i.identifierType.uuid === '66784d84-977f-11e1-8993-905e29aff6c1'),
  ).toBeTruthy();
});

test('eligibleNcdOtherPatient fixture creates a patient that meets the NCD Other mastercard gate', async ({
  eligibleNcdOtherPatient,
}) => {
  expect(eligibleNcdOtherPatient.uuid).toBeTruthy();
  expect(
    eligibleNcdOtherPatient.identifiers.some(
      (i) => i.identifierType.uuid === CHRONIC_CARE_NUMBER_IDENTIFIER_TYPE_UUID,
    ),
  ).toBeTruthy();
});

test('eligibleSickleCellDiseasePatient fixture creates a patient enrolled in the Chronic Care Program with a Chronic Care Number', async ({
  eligibleSickleCellDiseasePatient,
}) => {
  expect(eligibleSickleCellDiseasePatient.uuid).toBeTruthy();
  expect(
    eligibleSickleCellDiseasePatient.identifiers.some(
      (i) => i.identifierType.uuid === CHRONIC_CARE_NUMBER_IDENTIFIER_TYPE_UUID,
    ),
  ).toBeTruthy();
});
