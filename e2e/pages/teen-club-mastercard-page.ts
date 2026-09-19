import { MastercardFormPage } from './mastercard-page';

// Teen Club's create URL/flowsheet list, per EMastercardAccessTag's
// headerForms/flowsheetForms maps for TEEN_CLUB_INITIAL — the intake survey
// form is out of scope for this pilot (only teen-club-visit.xml is covered),
// but is still included in the URL since that's what the real dashboard link
// renders.
const TEEN_CLUB_HEADER_FORM = 'file:configuration/htmlforms/teen-club-emastercard.xml';
const TEEN_CLUB_FLOWSHEETS = [
  'file:configuration/htmlforms/teen-club-intake-survey.xml',
  'file:configuration/htmlforms/teen-club-visit.xml',
];

export class TeenClubMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: TEEN_CLUB_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of TEEN_CLUB_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

// Fills a representative set of teen-club-emastercard.xml's fields. Values
// are asserted against in teen-club/header-mastercard.spec.ts.
export async function fillTeenClubHeaderForm(form: MastercardFormPage, encounterDate: string): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);

  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('Guardian relation to patient', 'Mother');
  await form.selectRadio('Agrees to FUP', 'Y');
}

export async function fillTeenClubHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.selectRadio('Agrees to FUP', 'Y');
}

// Fills a representative set of teen-club-visit.xml's data-entry fields.
export async function fillTeenClubVisitForm(form: MastercardFormPage, opts: { appointmentDate: string }): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');
  await form.fillField('heightInput', '160');
  await form.fillField('weightInput', '55');

  await form.selectRadio('TB Status (Curr.)', 'Yes');
  await form.selectRadio('Sputum Collected', 'Yes');
  await form.selectRadio('Is nutrition screening outcome for MUAC normal? ', 'Yes');
  await form.selectRadio('Nutrition referred?', 'Y');
  await form.selectRadio('Mental Health Screened', 'Y');

  await form.fillField('appointmentDate', opts.appointmentDate);
}
