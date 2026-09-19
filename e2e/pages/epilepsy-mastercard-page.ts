import { MastercardFormPage } from './mastercard-page';

// Epilepsy's create URL/flowsheet list, per EMastercardAccessTag's
// headerForms/flowsheetForms maps for EPILEPSY_INITIAL.
const EPILEPSY_HEADER_FORM = 'file:configuration/htmlforms/epilepsy-emastercard.xml';
const EPILEPSY_FLOWSHEETS = ['file:configuration/htmlforms/epilepsy-visit.xml'];

export class EpilepsyMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: EPILEPSY_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of EPILEPSY_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

// Fills a representative set of epilepsy-emastercard.xml's fields. The
// diagnosis obsgroup is hidden with a fixed defaultValue (not a user-facing
// checkbox like Mental Health's own diagnosis gate), so no "at least one
// diagnosis checked" minimum applies here — "Agrees to FUP" alone saves.
export async function fillEpilepsyHeaderForm(form: MastercardFormPage, encounterDate: string): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);

  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('guardianNameField', 'Grace Banda');
  await form.fillField('Guardian Phone', '0993334444');
  await form.fillField('Guardian relation to patient', 'Mother');
  await form.selectRadio('Agrees to FUP', 'Y');
}

export async function fillEpilepsyHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.selectRadio('Agrees to FUP', 'Y');
}

// Carbamazepine's concept uuid (epilepsy-visit.xml's own $cbz macro), used to
// build its dose_/doseUnit_/route_/frequencyCoded_/duration_/durationUnit_
// field ids — same repeated-medication-row shape as the Mental Health pilot.
const CBZ_UUID = '654b0726-977f-11e1-8993-905e29aff6c1';

// Fills a representative set of epilepsy-visit.xml's data-entry fields.
export async function fillEpilepsyVisitForm(form: MastercardFormPage, opts: { appointmentDate: string }): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');
  await form.fillField('heightInput', '160');
  await form.fillField('weightInput', '55');

  await form.selectRadio('Seizures since last visit', 'Yes');
  await form.selectRadio('Any triggers', 'Yes');
  await form.selectRadio('Hospitalized since last visit', 'Yes');
  await form.checkCellCheckbox('Pregnant');
  await form.selectRadio('On family planning', 'Yes');

  await form.checkByLabel('Carbamazepine (CBZ)');
  await form.fillField(`dose_${CBZ_UUID}`, '5');
  await form.selectDropdown(`doseUnit_${CBZ_UUID}`, 'mg');
  await form.selectDropdown(`route_${CBZ_UUID}`, 'Oral');
  await form.selectDropdown(`frequencyCoded_${CBZ_UUID}`, 'OD');
  await form.fillField(`duration_${CBZ_UUID}`, '30');
  await form.selectDropdown(`durationUnit_${CBZ_UUID}`, 'Days');

  await form.fillField('appointmentDate', opts.appointmentDate);
}
