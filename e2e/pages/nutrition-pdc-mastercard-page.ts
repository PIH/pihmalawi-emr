import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// Nutrition PDC eMastercard — one of 5 Nutrition mastercard variants, all
// sharing the same Nutrition program/workflow/state (see
// NUTRITION_PROGRAM_UUID in core/constants.ts). See nutrition-mastercard-page.ts
// for the field-coverage note (no ambiguous-locator fields on this form
// family — full coverage, not a representative subset).
// ---------------------------------------------------------------------------

const NUTRITION_PDC_HEADER_FORM = 'file:configuration/htmlforms/nutrition-pdc-emastercard.xml';
const NUTRITION_PDC_FLOWSHEETS = ['file:configuration/htmlforms/nutrition-pdc-visit.xml'];

export class NutritionPdcMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: NUTRITION_PDC_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of NUTRITION_PDC_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

export async function fillNutritionPdcHeaderForm(form: MastercardFormPage, encounterDate: string): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);

  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('Guardian Name', 'Grace Banda');
  await form.fillField('Guardian relation to patient', 'Mother');
  await form.selectRadio('Agrees to FUP', 'Y');

  // Enrollment Reasons — Maternal Death/Malnutrition/Needs Social Support
  // (POSER)/Other:Specify, all unique labels.
  await form.checkByLabel('Malnutrition');
}

export async function fillNutritionPdcHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.checkByLabel('Malnutrition');
}

export async function fillNutritionPdcVisitForm(
  form: MastercardFormPage,
  opts: { appointmentDate: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');

  await form.fillField('heightInput', '90');
  await form.fillField('weightInput', '14');
  await form.fillField('MUAC', '15');
  await form.fillField('Lactogen (Tins)', '2');
  await form.fillField('appointmentDate', opts.appointmentDate);
  await form.fillField('Ration (Warehouse signature)', 'Some ration signature');
  await form.fillField('Comments', 'Some comments');
}
