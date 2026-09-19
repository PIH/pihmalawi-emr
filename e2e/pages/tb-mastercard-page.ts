import { MastercardFormPage } from './mastercard-page';

// TB's create URL/flowsheet list, per EMastercardAccessTag's headerForms/
// flowsheetForms maps for TB_INITIAL — tb-tests.xml is commented out there
// (matches the app's own real "Create new" link), and tb-post-lung-disease.xml
// is out of scope for this pilot (only tb-visit.xml is covered), but both are
// still included in the URL since that's what the real dashboard link renders.
const TB_HEADER_FORM = 'file:configuration/htmlforms/tb-emastercard.xml';
const TB_FLOWSHEETS = [
  'file:configuration/htmlforms/tb-visit.xml',
  'file:configuration/htmlforms/tb-post-lung-disease.xml',
];

export class TbMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: TB_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of TB_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

// Fills a representative set of tb-emastercard.xml's fields. Values are
// asserted against in tb/header-mastercard.spec.ts.
export async function fillTbHeaderForm(form: MastercardFormPage, encounterDate: string): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);

  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('guardianNameField', 'Grace Banda');
  await form.fillField('Guardian Phone', '0993334444');
  await form.fillField('Guardian relation to patient', 'Mother');
  await form.selectRadio('Agrees to FUP', 'Y');

  await form.selectRadio('Disease Classification', 'P');
  await form.selectRadio('Patient Category', 'New');
  await form.selectRadio('Diagnosis', 'Clinically diagnosed');

  await form.fillField('ARV Number', '12345');
  await form.selectRadio('ARV Status', 'A');

  await form.fillField('Regimen (RHZE)', '4');
  await form.selectRadio('DOT Option', 'HCW');
  await form.selectRadio('Source of referral', 'OPD');
}

// Minimum fields needed to save a TB_INITIAL header encounter — used only by
// visit-mastercard.spec.ts's beforeEach, which just needs a saved header to
// continue from.
export async function fillTbHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.selectRadio('Agrees to FUP', 'Y');
}

// Fills a representative set of tb-visit.xml's data-entry fields. Values are
// asserted against in tb/visit-mastercard.spec.ts.
export async function fillTbVisitForm(form: MastercardFormPage, opts: { appointmentDate: string }): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');
  await form.fillField('Regimen (RHZE) Number of tablets', '4');
  await form.fillField('appointmentDate', opts.appointmentDate);
}
