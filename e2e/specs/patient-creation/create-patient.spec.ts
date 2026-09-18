import { test, expect } from '../../core';
import { CreatePatientWizardPage } from '../../pages';

test('create a new patient through the full wizard, including an identifier and deceased status', async ({ page }) => {
  const wizard = await CreatePatientWizardPage.openShortForm(page);
  await wizard.fillShortForm({ givenName: 'AutoWizard', familyName: 'Patient', gender: 'F', birthdate: '1985-06-15' });
  const next = await wizard.clickCreatePerson();

  const fullForm = 'chooseNewPatient' in next ? await next.chooseNewPatient() : next;
  await fullForm.addIdentifier({ identifierTypeName: 'Dummy ID', identifier: `E2E-${Date.now()}` });
  await fullForm.setDeceased(true, '2026-01-01');
  await fullForm.save();
  await fullForm.expectSaveSuccess();
});
