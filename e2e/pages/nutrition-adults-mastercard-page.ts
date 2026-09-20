import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// Nutrition Adults eMastercard — one of 5 Nutrition mastercard variants, all
// sharing the same Nutrition program/workflow/state (see
// NUTRITION_PROGRAM_UUID in core/constants.ts). See nutrition-mastercard-page.ts
// for the field-coverage note (no ambiguous-locator fields on this form
// family — full coverage, not a representative subset).
// ---------------------------------------------------------------------------

const NUTRITION_ADULTS_HEADER_FORM = 'file:configuration/htmlforms/nutrition-adults-emastercard.xml';
const NUTRITION_ADULTS_FLOWSHEETS = ['file:configuration/htmlforms/nutrition-adult-visit.xml'];

export class NutritionAdultsMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: NUTRITION_ADULTS_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of NUTRITION_ADULTS_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

export async function fillNutritionAdultsHeaderForm(form: MastercardFormPage, encounterDate: string): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);

  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('Guardian Name', 'Grace Banda');
  await form.fillField('Guardian relation to patient', 'Mother');
  await form.selectRadio('Agrees to FUP', 'Y');

  // Program Enrollment — TB/NCD/HIV, all unique labels.
  await form.checkByLabel('NCD');
}

export async function fillNutritionAdultsHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.checkByLabel('NCD');
}

export async function fillNutritionAdultsVisitForm(
  form: MastercardFormPage,
  opts: { appointmentDate: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');

  await form.fillField('heightInput', '160');
  await form.fillField('weightInput', '55');
  await form.fillField('BMI', '22');
  await form.fillField('Food Likuni', '2');
  await form.fillField('appointmentDate', opts.appointmentDate);
  await form.fillField('Ration (Warehouse signature)', 'Some ration signature');
  await form.fillField('Comments', 'Some comments');
}
