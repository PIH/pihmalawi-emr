import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// PDC Developmental Delay eMastercard — one of 4 condition-specific PDC
// variants. Its dashboard "Create new" link is gated on the patient already
// having a "Diagnosis" obs matching Developmental Delay or HIE (see
// pdc-mastercard-page.ts's top comment) — every spec here must first call
// `fillGenericPdcHeaderWithDiagnosis` against the GENERIC PDC eMastercard
// before this variant's own header becomes reachable.
//
// Header form's "Genetic Syndrome" row (Suspected/Confirmed) has no
// accessible label of its own (bare `<span>` text, not a real `<label>`,
// sharing a rowspan `<th>` between both rows) — skipped, not chased further.
// ---------------------------------------------------------------------------

const PDC_DEVELOPMENTAL_DELAY_HEADER_FORM =
  'file:configuration/htmlforms/pdc-developmental-delay-emastercard.xml';
const PDC_DEVELOPMENTAL_DELAY_FLOWSHEETS = ['file:configuration/htmlforms/developmental-delay-visit.xml'];

export class PdcDevelopmentalDelayMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: PDC_DEVELOPMENTAL_DELAY_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of PDC_DEVELOPMENTAL_DELAY_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

export async function fillPdcDevelopmentalDelayHeaderForm(
  form: MastercardFormPage,
  encounterDate: string,
): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);
  await form.fillField('Patient Phone', '0991112222');
  await form.fillField('Guardian Name', 'Grace Banda');
  await form.selectRadio('Agrees to FUP', 'Y');
}

// Fills only the minimum needed to save a PDC_DEVELOPMENTAL_DELAY_INITIAL
// header encounter. Used ONLY by visit-mastercard.spec.ts's beforeEach.
export async function fillPdcDevelopmentalDelayHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.selectRadio('Agrees to FUP', 'Y');
}

export async function fillPdcDevelopmentalDelayVisitForm(
  form: MastercardFormPage,
  opts: { appointmentDate: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');
  await form.fillField('heightInput', '90');
  await form.fillField('weightInput', '13');
  await form.fillField('MUAC', '14');

  await form.selectRadio('Anti Convulsants', 'Yes');
  await form.selectRadio('Continue Follow Up', 'Yes');
  await form.selectRadio('Physiotherapy', 'Yes');
  await form.selectRadio('Individual Counselling', 'Yes');
  await form.fillField('appointmentDate', opts.appointmentDate);
}
