import { MastercardFormPage } from './mastercard-page';

// Mental Health's create URL/flowsheet list, per EMastercardAccessTag's
// headerForms/flowsheetForms maps for MENTAL_HEALTH_INITIAL —
// mental-health-screening.xml is out of scope for this pilot (only
// mental-health-visit.xml is covered), but is still included in the URL since
// that's what the real dashboard link renders.
const MENTAL_HEALTH_HEADER_FORM = 'file:configuration/htmlforms/mental-health-emastercard.xml';
const MENTAL_HEALTH_FLOWSHEETS = [
  'file:configuration/htmlforms/mental-health-screening.xml',
  'file:configuration/htmlforms/mental-health-visit.xml',
];

export class MentalHealthMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: MENTAL_HEALTH_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of MENTAL_HEALTH_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

// Fills a representative set of mental-health-emastercard.xml's fields.
// Values are asserted against in mental-health/header-mastercard.spec.ts.
export async function fillMentalHealthHeaderForm(form: MastercardFormPage, encounterDate: string): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);

  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('guardianNameField', 'Grace Banda');
  await form.fillField('Guardian Phone', '0993334444');
  await form.fillField('Guardian relation to patient', 'Mother');
  await form.selectRadio('Agrees to FUP', 'Y');

  // Schizophrenia diagnosis (obsgroup: checkbox + paired date span).
  await form.checkByLabel('Schizophrenia');
  await form.fillField('schizo-date', encounterDate);

  // Hallucinations (a separate "chief complaint" obsgroup: checkbox + paired
  // date span).
  await form.checkByLabel('Hallucinations');
  await form.fillField('hallu-date', encounterDate);
}

// Minimum fields needed to save a MENTAL_HEALTH_INITIAL header encounter —
// used only by visit-mastercard.spec.ts's beforeEach. Diagnoses carry class
// "dx-checkbox-item" (same gate as the Hypertension and Diabetes/Chronic Lung
// Disease pilots' own forms — mastercard.js requires at least one checked),
// confirmed live: "Agrees to FUP" alone left the submit button disabled.
export async function fillMentalHealthHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.selectRadio('Agrees to FUP', 'Y');
  await form.checkByLabel('Schizophrenia');
}

// The one repeated medication row filled below (Chloropromazine/CPZ) —
// concept uuid sourced from mental-health-visit.xml's own macro, used to
// build its dose_/doseUnit_/route_/frequencyCoded_/duration_/durationUnit_
// field ids.
const CPZ_UUID = '654b00aa-977f-11e1-8993-905e29aff6c1';

// Fills a representative set of mental-health-visit.xml's data-entry fields.
// Values are asserted against in mental-health/visit-mastercard.spec.ts.
export async function fillMentalHealthVisitForm(
  form: MastercardFormPage,
  opts: { appointmentDate: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');
  await form.fillField('heightInput', '160');
  await form.fillField('weightInput', '55');
  await form.fillField('phq9ScoreInput', '5');

  await form.selectRadio('Patient stable?', 'Yes');
  await form.selectRadio('Able to do activities of daily living', 'Yes');
  await form.checkCellCheckbox('Pregnant?');
  await form.selectRadio('On family planning?', 'Yes');
  await form.selectRadio('Suicide risk?', 'Yes');
  await form.selectRadio('Hospitalised since last visit due to this condition?', 'Yes');
  await form.selectRadio('Counselling Provided?', 'Yes');

  await form.checkByLabel('Chloropromazine (CPZ)');
  await form.fillField(`dose_${CPZ_UUID}`, '5');
  await form.selectDropdown(`doseUnit_${CPZ_UUID}`, 'mg');
  await form.selectDropdown(`route_${CPZ_UUID}`, 'Oral');
  await form.selectDropdown(`frequencyCoded_${CPZ_UUID}`, 'OD');
  await form.fillField(`duration_${CPZ_UUID}`, '30');
  await form.selectDropdown(`durationUnit_${CPZ_UUID}`, 'Days');

  await form.fillField('Comments', 'Some comments');
  await form.fillField('appointmentDate', opts.appointmentDate);
}
