import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// PDC Cleft Lip / Palate eMastercard — one of 4 condition-specific PDC
// variants. Gated on a "Diagnosis" obs matching Cleft Lip or Cleft Palate
// recorded on the GENERIC PDC eMastercard first — see pdc-mastercard-page.ts's
// top comment.
//
// Header form's "Facial Abnormalities" row (Small Jaw/Other) has no
// accessible label of its own (bare `<b>` text, not a real `<label>`,
// sharing one `<th>`) — skipped, same reasoning as Developmental Delay's
// Genetic Syndrome row.
// ---------------------------------------------------------------------------

const PDC_CLEFT_LIP_PALATE_HEADER_FORM = 'file:configuration/htmlforms/pdc-cleft-lip-palate-emastercard.xml';
const PDC_CLEFT_LIP_PALATE_FLOWSHEETS = ['file:configuration/htmlforms/cleft-lip-palate-visit.xml'];

export class PdcCleftLipPalateMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: PDC_CLEFT_LIP_PALATE_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of PDC_CLEFT_LIP_PALATE_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

export async function fillPdcCleftLipPalateHeaderForm(
  form: MastercardFormPage,
  encounterDate: string,
): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);
  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('Guardian Name', 'Grace Banda');
  await form.selectRadio('Agrees to FUP', 'Y');
}

// Fills only the minimum needed to save a PDC_CLEFT_CLIP_PALLET_INITIAL
// header encounter. Used ONLY by visit-mastercard.spec.ts's beforeEach.
export async function fillPdcCleftLipPalateHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.selectRadio('Agrees to FUP', 'Y');
}

export async function fillPdcCleftLipPalateVisitForm(
  form: MastercardFormPage,
  opts: { appointmentDate: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');
  await form.fillField('heightInput', '80');
  await form.fillField('weightInput', '10');
  await form.fillField('MUAC', '13');

  await form.selectRadio('Difficult Breathing', 'No');
  await form.selectRadio('Heart Murmur', 'No');
  await form.selectRadio('Ear Pain', 'No');
  await form.selectRadio('Ear Discharge', 'No');
  await form.selectRadio('Continue Follow Up', 'Yes');
  await form.fillField('appointmentDate', opts.appointmentDate);
}
