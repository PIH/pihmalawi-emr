import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// Exposed Child eMastercard — like Pre-ART, NOT gated on the separate retired
// "Early Infant Diagnosis Program"; it's an alternate initial state of the
// same active HIV Program (see constants.ts's EXPOSED_CHILD_ON_TREATMENT_STATE_UUID
// comment). Unlike Pre-ART, `EMastercardAccessTag.java` DOES have a
// flowsheetForms entry for EXPOSED_CHILD_INITIAL: ["exposed-child-visit",
// "eid-test-results"] — this pilot only exercises exposed-child-visit.xml,
// same "one main visit form" scope as every other pilot (eid-test-results.xml
// and dna-pcr-testing.xml are out of scope, matching e.g. TB's own
// tb-tests.xml/tb-post-lung-disease.xml exclusions).
//
// exposed-child-emastercard.xml has TWO near-identical field blocks with the
// same labels, wrapped in opposite `<ifMode mode="VIEW">` conditions (a
// read-only recap vs the real edit form) — confirmed only the edit block
// (`include="false"`) renders at create time, so plain label lookups resolve
// to exactly one element, same as any other pilot's form.
//
// KNOWN PRE-EXISTING BUG (not fixed, out of scope): the header form's
// "Current outcome" read-only display line hardcodes
// `fn.currentProgramWorkflowStatus('66870234-977f-11e1-8993-905e29aff6c1')`
// — that UUID is the RETIRED "Early Infant Diagnosis Program"'s own workflow,
// not the active HIV Program workflow this pilot's fixture patients actually
// enroll in. For any patient using the modern HIV-Program-based enrollment
// (which is how this dashboard mastercard is actually reached today), this
// line will always resolve to nothing. Same hardcoded-workflow-UUID bug
// family as MLW-1846/1857 — worth folding into that follow-up inventory
// rather than a new ticket. It's a read-only display only, doesn't block
// saving.
//
// Several sub-fields are skipped (documented inline in the fill function
// below) — free-text-with-labelText-attribute fields and multi-input
// obsgroups with no single clean label to anchor on, consistent with how
// prior pilots have scoped similar rows.
// ---------------------------------------------------------------------------

const EXPOSED_CHILD_HEADER_FORM = 'file:configuration/htmlforms/exposed-child-emastercard.xml';
const EXPOSED_CHILD_FLOWSHEETS = ['file:configuration/htmlforms/exposed-child-visit.xml'];

export class ExposedChildMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: EXPOSED_CHILD_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of EXPOSED_CHILD_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

export async function fillExposedChildHeaderForm(form: MastercardFormPage): Promise<void> {
  await form.fillField('guardianNameField', 'Grace Banda');
  await form.selectRadio('Agrees to FUP', 'Y');
  await form.fillField('Guardian Relation', 'Mother');
  await form.fillField('Guardian Phone', '991112222');
  // "NoART" chosen over the other answerLabels ("OnART"/"Died"/"Unk") since
  // it's the one option with no leading space in the XML's own
  // answerLabels="NoART, OnART, Died, Unk" attribute — sidesteps any risk of
  // an exact-match/whitespace mismatch.
  await form.selectRadio('Status', 'NoART');
  await form.fillField('Birth Wgt', '3.2');
  // Skipped, not chased further (out of scope): Mother's ART RegNo/Start
  // date (labelText attribute fields, no preceding <td> label to anchor on),
  // the "When starting NVP" and "NVP duration" obsgroups (multi-input, no
  // single clean label), and Child Age at enrolment (shares a rowspan <td>
  // label with the NVP row above it, plus inline "At Enrolment"/"weeks" text
  // around the input).
}

// Fills the minimum needed to save an EXPOSED_CHILD_INITIAL header
// encounter — used only by visit-mastercard.spec.ts's beforeEach.
export async function fillExposedChildHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.selectRadio('Agrees to FUP', 'Y');
}

export async function fillExposedChildVisitForm(
  form: MastercardFormPage,
  opts: { appointmentDate: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');
  await form.fillField('heightInput', '60');
  await form.fillField('weightInput', '5');
  await form.fillField('MUAC', '13');
  await form.selectRadio('Wasting/Malnutrition', 'No');
  await form.selectRadio('Breast feeding', 'Exc');
  await form.selectRadio('Mother Status', 'On ART');
  await form.selectRadio('Clinical Monitoring', 'NAD');
  await form.selectRadio('HIV infection', 'A');
  await form.fillField('CPT', '1');
  await form.fillField('appointmentDate', opts.appointmentDate);
}
