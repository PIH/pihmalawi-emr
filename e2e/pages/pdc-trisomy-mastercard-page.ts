import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// PDC Trisomy eMastercard — one of 4 condition-specific PDC variants. Gated
// on a "Diagnosis" obs matching Trisomy 21 recorded on the GENERIC PDC
// eMastercard first — see pdc-mastercard-page.ts's top comment.
// ---------------------------------------------------------------------------

const PDC_TRISOMY_HEADER_FORM = 'file:configuration/htmlforms/pdc-trisomy-emastercard.xml';
const PDC_TRISOMY_FLOWSHEETS = ['file:configuration/htmlforms/pdc-trisomy-21-visit.xml'];

export class PdcTrisomyMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: PDC_TRISOMY_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of PDC_TRISOMY_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

export async function fillPdcTrisomyHeaderForm(form: MastercardFormPage, encounterDate: string): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);
  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('Guardian Name', 'Grace Banda');
  await form.selectRadio('Agrees to FUP', 'Y');
  await form.selectRadio('Meconium Delayed', 'Yes');
}

// Fills only the minimum needed to save a PDC_TRISOMY21_INITIAL header
// encounter. Used ONLY by visit-mastercard.spec.ts's beforeEach.
export async function fillPdcTrisomyHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.selectRadio('Agrees to FUP', 'Y');
}

export async function fillPdcTrisomyVisitForm(
  form: MastercardFormPage,
  opts: { appointmentDate: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');
  await form.fillField('heightInput', '85');
  await form.fillField('weightInput', '11');
  await form.fillField('MUAC', '13');

  await form.selectRadio('Passage Normal', 'Yes');
  await form.selectRadio('Diarrhea Persistent', 'No');
  await form.selectRadio('Antcolvusants', 'No');
  await form.selectRadio('Individual Counseling', 'Yes');
  await form.selectRadio('Continue Follow Up', 'Yes');
  await form.selectRadio('Physiotherapy', 'Yes');
  await form.fillField('appointmentDate', opts.appointmentDate);
}
