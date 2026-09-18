import { test, expect } from '../../core';

test('eligibleHivArtPatient fixture creates a patient that meets the ART mastercard gate', async ({
  eligibleHivArtPatient,
}) => {
  expect(eligibleHivArtPatient.uuid).toBeTruthy();
  expect(
    eligibleHivArtPatient.identifiers.some((i) => i.identifierType.uuid === '66784d84-977f-11e1-8993-905e29aff6c1'),
  ).toBeTruthy();
});
