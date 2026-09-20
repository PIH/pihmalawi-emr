import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// Nutrition Pregnant Teens eMastercard — one of 5 Nutrition mastercard
// variants, all sharing the same Nutrition program/workflow/state (see
// NUTRITION_PROGRAM_UUID in core/constants.ts). See nutrition-mastercard-page.ts
// for the field-coverage note (no ambiguous-locator fields on this form
// family — full coverage, not a representative subset).
// ---------------------------------------------------------------------------

const NUTRITION_PREGNANT_TEENS_HEADER_FORM = 'file:configuration/htmlforms/nutrition-pregnant-teens-emastercard.xml';
const NUTRITION_PREGNANT_TEENS_FLOWSHEETS = ['file:configuration/htmlforms/nutrition-pregnant-teens-visit.xml'];

export class NutritionPregnantTeensMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: NUTRITION_PREGNANT_TEENS_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of NUTRITION_PREGNANT_TEENS_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

export async function fillNutritionPregnantTeensHeaderForm(
  form: MastercardFormPage,
  encounterDate: string,
): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);

  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('Guardian Name', 'Grace Banda');
  await form.fillField('Guardian relation to patient', 'Mother');
  await form.selectRadio('Agrees to FUP', 'Y');

  // Enrollment Program / Reasons — TB/NCD/HIV/Name of Enrolling
  // Nurse/Clinician, all unique labels.
  await form.checkByLabel('NCD');
}

export async function fillNutritionPregnantTeensHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.checkByLabel('NCD');
}

export async function fillNutritionPregnantTeensVisitForm(
  form: MastercardFormPage,
  opts: { appointmentDate: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');

  await form.fillField('heightInput', '155');
  await form.fillField('weightInput', '48');
  await form.fillField('MUAC', '22');
  await form.fillField('Oil (litres)', '1');
  await form.fillField('Maize (Kgs)', '5');
  await form.fillField('Beans (Kgs)', '3');
  await form.fillField('appointmentDate', opts.appointmentDate);
  await form.fillField('Ration (Warehouse signature)', 'Some ration signature');
  await form.fillField('Comments', 'Some comments');
}
