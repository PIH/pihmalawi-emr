import { Page } from '@playwright/test';
import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// Kaposi's Sarcoma — NOT gated by eMastercardAccess/eTraceAccess at all. It's
// a plain hardcoded link in malawiPatientDashboard.jsp behind
// <openmrs:hasPrivilege privilege="Edit Patients"> only — no program
// enrollment, no workflow state, no patient identifier type required. Any
// plain patient qualifies (confirmed live, see kaposisSarcomaPatient fixture
// in core/test.ts).
//
// kaposis-sarcoma-emastercard.xml (the "header") has ZERO <obs> fields and no
// <submit/> at all — pure read-only display (patient name/gender/DOB). The
// real clinical work happens in two independent flowsheet forms:
//   - ks-evaluation-form.xml (PATIENT EVALUATION encounters)
//   - ks-chemotherapy-form.xml (CHEMOTHERAPY encounters)
//
// The create URL includes requireEncounter=false — confirmed live (via a
// throwaway scratch spec, deleted before this commit) that this is what
// makes BOTH "Enter New KS Evaluation Form" / "Enter New KS Chemotherapy
// Form" links immediately clickable with no header encounter needed first,
// unlike every other pilot in this initiative (which all require saving a
// header before a flowsheet's "Enter New ..." link appears). There is also
// no #mastercardLocation element on this page (the header has nothing to
// select a location for) — so this page object does NOT use
// MastercardFormPage.openCreateAtUrl (which unconditionally selects
// #mastercardLocation and would hang here); openCreateGate below navigates
// directly instead.
// ---------------------------------------------------------------------------

const KS_HEADER_FORM = 'file:configuration/htmlforms/kaposis-sarcoma-emastercard.xml';
const KS_FLOWSHEETS = [
  'file:configuration/htmlforms/ks-evaluation-form.xml',
  'file:configuration/htmlforms/ks-chemotherapy-form.xml',
];

export class KaposisSarcomaMastercardGatePage {
  static buildCreateUrl(patientUuid: string): string {
    const params = new URLSearchParams({
      headerForm: KS_HEADER_FORM,
      dashboardUrl: 'legacyui',
      patientId: patientUuid,
      requireEncounter: 'false',
    });
    for (const flowsheet of KS_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }

  static async open(page: Page, patientUuid: string): Promise<MastercardFormPage> {
    await page.goto(KaposisSarcomaMastercardGatePage.buildCreateUrl(patientUuid));
    await page.waitForLoadState('networkidle');
    return new MastercardFormPage(page);
  }
}

// Fills a representative subset of ks-evaluation-form.xml — Weight/Height
// (plain numeric), Diagnosis (a "Clinical" checkbox, one of 3 answers on the
// same $diagnosisMethod concept, chosen since it has a real answerLabel
// distinct from the other two), and Pain scale. Several rows are skipped
// (out of scope, same reasoning as prior pilots): the Laboratory/Clinical
// Examination sections are Velocity <repeat> templates with no answerLabels
// of their own, and several `style="yes_no"` rows (e.g. "Patient on ARVs")
// were not chased given this form already has a solid representative subset
// without them (yes_no fields have needed live-DOM verification elsewhere in
// this initiative, e.g. the Chronic Care pilot, and weren't worth it here).
export async function fillKsEvaluationForm(form: MastercardFormPage): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');
  await form.fillField('Weight', '65');
  await form.fillField('Height', '170');
  await form.checkByLabel('Clinical');
  await form.fillField('Pain (0-10)', '4');
}

// Fills a representative subset of ks-chemotherapy-form.xml — every field on
// this form is a plain numeric/date obs with no radio/checkbox ambiguity at
// all (confirmed by reading the full XML), so this is closer to full
// coverage than most pilots' "representative subset".
export async function fillKsChemotherapyForm(
  form: MastercardFormPage,
  opts: { nextAppointmentDate: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');
  await form.fillField('Cycle number', '2');
  await form.fillField('Height', '170');
  await form.fillField('Weight', '65');
  await form.fillField('Vincristine Sulphate dose', '1.5');
  await form.fillField('Bleomycin dose', '10');
  await form.fillField('Paclitaxel (taxol) dose', '90');
  await form.fillField('Next appointment', opts.nextAppointmentDate);
}
