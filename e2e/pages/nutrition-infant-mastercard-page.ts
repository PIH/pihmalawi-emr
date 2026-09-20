import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// Nutrition Infant eMastercard — one of 5 Nutrition mastercard variants, all
// sharing the same Nutrition program/workflow/state (see
// NUTRITION_PROGRAM_UUID in core/constants.ts). See nutrition-mastercard-page.ts
// for the field-coverage note (no ambiguous-locator fields on this form
// family — full coverage, not a representative subset).
// ---------------------------------------------------------------------------

const NUTRITION_INFANT_HEADER_FORM = 'file:configuration/htmlforms/nutrition-infant-emastercard.xml';
const NUTRITION_INFANT_FLOWSHEETS = ['file:configuration/htmlforms/nutrition-infant-visit.xml'];

export class NutritionInfantMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: NUTRITION_INFANT_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of NUTRITION_INFANT_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

export async function fillNutritionInfantHeaderForm(form: MastercardFormPage, encounterDate: string): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);

  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('Guardian Name', 'Grace Banda');
  await form.fillField('Guardian relation to patient', 'Mother');
  await form.selectRadio('Agrees to FUP', 'Y');

  // Enrollment Reasons — Maternal Death/Severe Maternal Illness/Multiple
  // births/Twins/Other, all unique labels.
  await form.checkByLabel('Multiple births/Twins');
}

export async function fillNutritionInfantHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.checkByLabel('Multiple births/Twins');
}

export async function fillNutritionInfantVisitForm(
  form: MastercardFormPage,
  opts: { appointmentDate: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');

  await form.fillField('heightInput', '60');
  await form.fillField('weightInput', '7');
  await form.fillField('MUAC', '13');
  await form.fillField('Lactogen (Tins)', '2');
  await form.fillField('appointmentDate', opts.appointmentDate);
  await form.fillField('Ration (Warehouse signature)', 'Some ration signature');
  await form.fillField('Comments', 'Some comments');
}
