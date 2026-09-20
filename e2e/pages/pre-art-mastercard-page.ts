import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// Pre-ART eMastercard — NOT gated on the separate retired "PRE-ART PROGRAM"
// (see constants.ts's PRE_ART_ON_TREATMENT_STATE_UUID comment); it's an
// alternate initial state of the same active HIV Program used by the
// hiv-art pilot, with its own "HCC Number" identifier type.
//
// Unlike every other pilot's mastercard, `EMastercardAccessTag.java` has NO
// headerForms/flowsheetForms map entry for PART_INITIAL at all — meaning the
// live dashboard's own "Create new" link falls back to the OLD
// htmlformentry.form popup, not flowsheet.page. Confirmed live that the
// standard flowsheet.page URL (headerForm=pre-art-emastercard.xml,
// flowsheets=pre-art-visit.xml) still works fine when navigated to directly
// — flowsheet.page itself doesn't require a Java-side map entry, that map is
// only used to build the dashboard's own link. Built the same way as every
// other pilot's page object.
//
// Both forms are fully labeled (no ambiguous fields): pre-art-emastercard.xml
// uses plain <td>label</td><td><obs .../></td> pairs (cellAt-compatible,
// same as any <th> row), pre-art-visit.xml uses standard <th>/<td> rows.
// ---------------------------------------------------------------------------

const PRE_ART_HEADER_FORM = 'file:configuration/htmlforms/pre-art-emastercard.xml';
const PRE_ART_FLOWSHEETS = ['file:configuration/htmlforms/pre-art-visit.xml'];

export class PreArtMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: PRE_ART_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of PRE_ART_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

export async function fillPreArtHeaderForm(form: MastercardFormPage): Promise<void> {
  await form.fillField('guardianNameField', 'Grace Banda');
  await form.fillField('Guardian Phone', '991112222');
  await form.selectRadio('Agrees to FUP', 'Y');
  await form.fillField('Guardian relation to patient', 'Mother');
  await form.selectRadio('Ever taken any ARVs', 'N');
  await form.selectRadio('Ever taken TB treatm.', 'N');
  await form.selectRadio('Ever taken IPT', 'N');
  await form.selectRadio('WHO Stage', '1');
}

// Fills the minimum needed to save a PART_INITIAL header encounter — used
// only by visit-mastercard.spec.ts's beforeEach, which needs a saved header
// as a prerequisite, not its own content.
export async function fillPreArtHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.selectRadio('Agrees to FUP', 'Y');
}

export async function fillPreArtVisitForm(
  form: MastercardFormPage,
  opts: { appointmentDate: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');
  await form.fillField('Height', '160');
  await form.fillField('Weight', '55');
  await form.selectRadio('Wasting/malnutrition', 'No');
  await form.selectRadio('TB Status', 'N');
  await form.selectRadio('WHO Stage', '1');
  await form.selectRadio('Pregnant?', 'N');
  await form.checkCellCheckbox('Depo-Provera Given');
  await form.fillField('appointmentDate', opts.appointmentDate);
}
