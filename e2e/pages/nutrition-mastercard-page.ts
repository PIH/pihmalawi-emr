import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// Nutrition eMastercard (generic) — one of 5 Nutrition mastercard variants,
// all sharing the same Nutrition program/workflow/state (see
// NUTRITION_PROGRAM_UUID in core/constants.ts), differing only in encounter
// types and header/visit forms. Unlike the Chronic Care Program pilots, every
// field on both this header and visit form has an explicit `answerLabels`/
// `answerLabel` attribute or is a plain free-text/numeric obs with a unique
// label — no ambiguous-locator fields were found (confirmed by reading the
// full htmlform XML, not by guessing), so this pilot has full field coverage
// rather than a representative subset.
// ---------------------------------------------------------------------------

const NUTRITION_HEADER_FORM = 'file:configuration/htmlforms/nutrition-emastercard.xml';
const NUTRITION_FLOWSHEETS = ['file:configuration/htmlforms/nutrition-visit.xml'];

export class NutritionMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: NUTRITION_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of NUTRITION_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    // No leading slash — see playwright.config.ts's baseURL comment.
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

export async function fillNutritionHeaderForm(form: MastercardFormPage, encounterDate: string): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);

  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('Guardian relation to patient', 'Mother');
  await form.selectRadio('Agrees to FUP', 'Y');

  // Program Enrollment (method) — TB/NCD/HIV/PDC, all unique labels.
  await form.checkByLabel('NCD');
  // Enrollment Reasons — Maternal Death/Severe Maternal Illness/Multiple
  // births/Twins/Needs Social Support (POSER)/Malnutrition/Other Specify,
  // all unique labels, no collision with the Program Enrollment table above.
  await form.checkByLabel('Malnutrition');
}

// Fills only the minimum needed to save a NUTRITION_INITIAL header encounter.
// Used ONLY by visit-mastercard.spec.ts's beforeEach.
export async function fillNutritionHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.checkByLabel('NCD');
}

export async function fillNutritionVisitForm(
  form: MastercardFormPage,
  opts: { appointmentDate: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');

  await form.fillField('heightInput', '160');
  await form.fillField('weightInput', '55');
  await form.fillField('MUAC', '25');
  await form.fillField('appointmentDate', opts.appointmentDate);

  await form.fillField('Lactogen (Tins)', '2');
  await form.selectRadio('Oil (litres)', 'Yes');
  await form.fillField('Maize (Kgs)', '5');
  await form.fillField('Beans (Kgs)', '3');
  await form.selectRadio('Likuni Phala (Kgs)', 'Yes');
  await form.fillField('Comments', 'Some comments');
}
