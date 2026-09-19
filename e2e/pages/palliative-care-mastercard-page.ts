import { MastercardFormPage } from './mastercard-page';

// Palliative Care's create URL/flowsheet list, per EMastercardAccessTag's
// headerForms/flowsheetForms maps for PALLIATIVE_INITIAL.
const PALLIATIVE_CARE_HEADER_FORM = 'file:configuration/htmlforms/palliative-care-mastercard.xml';
const PALLIATIVE_CARE_FLOWSHEETS = ['file:configuration/htmlforms/palliative-care-visit.xml'];

export class PalliativeCareMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: PALLIATIVE_CARE_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of PALLIATIVE_CARE_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

// Fills a representative set of palliative-care-mastercard.xml's fields.
// Values are asserted against in palliative-care/header-mastercard.spec.ts.
export async function fillPalliativeCareHeaderForm(form: MastercardFormPage, encounterDate: string): Promise<void> {
  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('guardianNameField', 'Grace Banda');
  await form.fillField('Guardian Phone', '0993334444');
  await form.fillField('Guardian relation to patient', 'Mother');
  await form.selectRadio('Agrees to FUP', 'Y');

  // Cancer diagnosis (obsgroup: checkbox + paired date, both real ids).
  await form.checkById('cancer-dx');
  await form.fillField('cancer-dx-date', encounterDate);
}

// Minimum fields needed to save a PALLIATIVE_INITIAL header encounter — used
// only by visit-mastercard.spec.ts's beforeEach.
export async function fillPalliativeCareHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.selectRadio('Agrees to FUP', 'Y');
}

// Fills a representative set of palliative-care-visit.xml's data-entry
// fields. Values are asserted against in palliative-care/visit-mastercard.spec.ts.
export async function fillPalliativeCareVisitForm(
  form: MastercardFormPage,
  opts: { appointmentDate: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');
  await form.fillField('heightInput', '160');
  await form.fillField('weightInput', '55');
  await form.fillField('painScore', '2');
  await form.selectRadio('Counseling?', 'Yes');
  await form.fillField('Management plan/comments', 'Some comments');
  await form.fillField('appointmentDate', opts.appointmentDate);
}
