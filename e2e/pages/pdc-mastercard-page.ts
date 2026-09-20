import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// PDC eMastercard (generic) — the header form shared as a PREREQUISITE by all
// 4 condition-specific PDC variants (Developmental Delay, Trisomy, Cleft
// Lip/Palate, Other Diagnosis), not just its own pilot. Confirmed against
// EMastercardAccessTag.java: those 4 variants' dashboard links only render
// once `Helper.hasCondition` finds an existing obs of the "Diagnosis" concept
// (656292d8-977f-11e1-8993-905e29aff6c1) with a matching answer — and this
// generic eMastercard's own "Diagnosis" checkbox group is where that obs гets
// recorded. So `fillGenericPdcHeaderWithDiagnosis` below is imported and used
// by every other PDC variant's own spec files, not just this one's.
//
// Also confirmed against EMastercardAccessTag.java's `flowsheetForms` map:
// generic PDC has NO entry there at all (every other condition/variant does)
// — `pdc-visit.xml` is unreachable via the live "Enter New Flowsheet" flow,
// so this pilot is HEADER-ONLY, no visit-mastercard spec.
//
// IMPORTANT label collision: this form has TWO different checkbox groups
// with IDENTICAL answer labels ("Trisomy 21", "Cleft Lip", "Developmental
// Delay", "Low Birth Weight", "Hydrocephalus", "CNS infection.", "Cleft
// Palate", "Severe Malnutrition", "Other.", "Premature Birth", "HIE") — a
// "Reason for Referral" group (conceptId=$reasonForReferral, document order
// FIRST) and the actual "Diagnosis" group (conceptId=$diagnosis, document
// order SECOND) that the program-access gate checks. Confirmed live via DOM
// dump (not guessed) that all 11 labels duplicate 1:1 in this exact order,
// so `MastercardFormPage.checkLastByLabel` (targets the LAST match) reliably
// reaches the real $diagnosis checkbox every time.
// ---------------------------------------------------------------------------

const PDC_HEADER_FORM = 'file:configuration/htmlforms/pdc-emastercard.xml';

export class PdcMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: PDC_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    // No leading slash — see playwright.config.ts's baseURL comment.
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

export type PdcDiagnosisLabel =
  | 'Developmental Delay'
  | 'Trisomy 21'
  | 'Cleft Lip'
  | 'Cleft Palate'
  | 'Low Birth Weight'
  | 'Hydrocephalus'
  | 'CNS infection.'
  | 'Severe Malnutrition'
  | 'Premature Birth'
  | 'HIE'
  | 'Other.';

// Fills the generic PDC eMastercard header with the minimum needed to save a
// PDC_INITIAL encounter AND record the given Diagnosis — the prerequisite
// every condition-specific PDC variant's own mastercard link gates on.
export async function fillGenericPdcHeaderWithDiagnosis(
  form: MastercardFormPage,
  diagnosis: PdcDiagnosisLabel,
): Promise<void> {
  await form.checkLastByLabel(diagnosis);
}

export async function fillPdcHeaderForm(form: MastercardFormPage, encounterDate: string): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);
  await form.fillField('Patient Phone', '0991112222');
  await form.selectRadio('Agrees to FUP', 'Y');
  await form.checkLastByLabel('Developmental Delay');
}
