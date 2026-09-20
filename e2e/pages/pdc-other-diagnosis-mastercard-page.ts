import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// PDC Other Diagnosis eMastercard — one of 4 condition-specific PDC
// variants. Gated on a "Diagnosis" obs matching any of Low Birth Weight,
// Hydrocephalus, CNS infection, Severe Malnutrition, Premature Birth, HIE,
// Epilepsy, or non-coded "Other" recorded on the GENERIC PDC eMastercard
// first — see pdc-mastercard-page.ts's top comment.
// ---------------------------------------------------------------------------

const PDC_OTHER_DIAGNOSIS_HEADER_FORM = 'file:configuration/htmlforms/pdc-other-diagnosis-emastercard.xml';
const PDC_OTHER_DIAGNOSIS_FLOWSHEETS = ['file:configuration/htmlforms/other-diagnosis-visit.xml'];

export class PdcOtherDiagnosisMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: PDC_OTHER_DIAGNOSIS_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of PDC_OTHER_DIAGNOSIS_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

export async function fillPdcOtherDiagnosisHeaderForm(
  form: MastercardFormPage,
  encounterDate: string,
): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);
  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('Guardian Name', 'Grace Banda');
  await form.selectRadio('Agrees to FUP', 'Y');
}

// Fills only the minimum needed to save a PDC_OTHER_DIAGNOSIS_INITIAL header
// encounter. Used ONLY by visit-mastercard.spec.ts's beforeEach.
export async function fillPdcOtherDiagnosisHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.selectRadio('Agrees to FUP', 'Y');
}

export async function fillPdcOtherDiagnosisVisitForm(
  form: MastercardFormPage,
  opts: { appointmentDate: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');
  await form.fillField('heightInput', '75');
  await form.fillField('weightInput', '9');
  await form.fillField('MUAC', '12');

  await form.selectRadio('Antcolvusants', 'No');
  await form.selectRadio('Continue Follow UP', 'Yes');
  await form.selectRadio('Physiotherapy', 'Yes');
  await form.fillField('appointmentDate', opts.appointmentDate);
}
