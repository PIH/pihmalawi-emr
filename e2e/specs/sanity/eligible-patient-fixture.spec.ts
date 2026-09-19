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

test('eligibleChronicLungDiseasePatient fixture creates a patient that meets the Chronic Lung Disease mastercard gate', async ({
  eligibleChronicLungDiseasePatient,
}) => {
  expect(eligibleChronicLungDiseasePatient.uuid).toBeTruthy();
  expect(
    eligibleChronicLungDiseasePatient.identifiers.some(
      (i) => i.identifierType.uuid === CHRONIC_CARE_NUMBER_IDENTIFIER_TYPE_UUID,
    ),
  ).toBeTruthy();
});

test('eligibleHypertensionAndDiabetesPatient fixture creates a patient that meets the Hypertension and Diabetes mastercard gate', async ({
  eligibleHypertensionAndDiabetesPatient,
}) => {
  expect(eligibleHypertensionAndDiabetesPatient.uuid).toBeTruthy();
  expect(
    eligibleHypertensionAndDiabetesPatient.identifiers.some(
      (i) => i.identifierType.uuid === CHRONIC_CARE_NUMBER_IDENTIFIER_TYPE_UUID,
    ),
  ).toBeTruthy();
});

test('eligibleCardiacAndVascularDiseasePatient fixture creates a patient that meets the Cardiac and Vascular Disease mastercard gate', async ({
  eligibleCardiacAndVascularDiseasePatient,
}) => {
  expect(eligibleCardiacAndVascularDiseasePatient.uuid).toBeTruthy();
  expect(
    eligibleCardiacAndVascularDiseasePatient.identifiers.some(
      (i) => i.identifierType.uuid === CHRONIC_CARE_NUMBER_IDENTIFIER_TYPE_UUID,
    ),
  ).toBeTruthy();
});

test('eligibleChronicKidneyDiseasePatient fixture creates a patient that meets the Chronic Kidney Disease mastercard gate', async ({
  eligibleChronicKidneyDiseasePatient,
}) => {
  expect(eligibleChronicKidneyDiseasePatient.uuid).toBeTruthy();
  expect(
    eligibleChronicKidneyDiseasePatient.identifiers.some(
      (i) => i.identifierType.uuid === CHRONIC_CARE_NUMBER_IDENTIFIER_TYPE_UUID,
    ),
  ).toBeTruthy();
});
