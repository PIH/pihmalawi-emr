import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// Chronic Care eMastercard (generic) — the base workflow of the same Chronic
// Care Program used by the 6 disease-specific pilots already covered (Asthma,
// Hypertension/Diabetes, CHF, CKD, NCD Other, Sickle Cell Disease). Header/
// flowsheet forms confirmed via `EMastercardAccessTag.java`'s own
// headerForms/flowsheetForms maps (ENCOUNTERTYPE_CHRONIC_CARE_INITIAL_NAME ->
// "chronic-care-emastercard" / ["chronic-care-visit"] only, no extra
// flowsheets, same shape as ART/NCD Other).
//
// Field selection below is a representative subset of chronic-care-emastercard.xml
// / chronic-care-visit.xml, not full field coverage: several fields on these
// forms have no `answerLabels` attribute at all (options rendered from each
// answer concept's own name, e.g. "Type of building where you sleep",
// "Fuel source?", "HIV status:", "Bicycle:") or share label text with another
// row on the same form (the "Age at diagnosis of: Diabetes/Hypertension/
// Epilepsy/Heart Failure/Asthma" table reuses the exact same label text as
// the Enrollment Diagnosis checkboxes) — both are skipped here rather than
// guessed at or risking an ambiguous-locator match. Every field actually used
// below has an explicit `answerLabel(s)` attribute in the XML, a stable `id`,
// or is a plain free-text/numeric obs with unique label text.
// ---------------------------------------------------------------------------

const CHRONIC_CARE_HEADER_FORM = 'file:configuration/htmlforms/chronic-care-emastercard.xml';
const CHRONIC_CARE_FLOWSHEETS = ['file:configuration/htmlforms/chronic-care-visit.xml'];

export class ChronicCareMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: CHRONIC_CARE_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of CHRONIC_CARE_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    // No leading slash — see playwright.config.ts's baseURL comment.
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

// Fills a representative subset of chronic-care-emastercard.xml's header
// form (see this file's top comment for why not every field is covered).
// Exported standalone (not a save) so visit-mastercard.spec.ts's beforeEach
// can reach a saved header encounter without duplicating this field list.
export async function fillChronicCareHeaderForm(
  form: MastercardFormPage,
  encounterDate: string,
): Promise<void> {
  await form.fillHeaderField('Transfer-In Date:', encounterDate);

  await form.selectDropdown('Referred From', 'OPD');

  // Enrollment Diagnosis checkboxes — "Cirrhosis"/"Chronic kidney disease"
  // chosen since neither collides with the "Age at diagnosis of:" table's
  // row labels (Diabetes/Hypertension/Epilepsy/Heart Failure/Asthma), unlike
  // every other diagnosis checkbox on this form.
  await form.checkByLabel('Cirrhosis');
  await form.checkByLabel('Chronic kidney disease');
  await form.checkByLabel('Other');
  await form.fillFieldAfterLabel('Other', 'Some other diagnosis');

  await form.selectDropdown('Type of roof:', 'Tin');
  await form.selectRadio('Electricity:', 'Yes');
  await form.selectRadio('Radio:', 'Yes');
  await form.selectRadio('On ART?', 'Yes');
  await form.selectDropdown('TB status:', 'Never had TB');
  await form.selectDropdown('Does patient smoke?', 'No');
  await form.selectDropdown('Does patient drink alcohol?', 'No');
  await form.fillField('Number of fruit and vegetable servings/day:', '3');
}

// Fills only the minimum needed to save a CHRONIC_CARE_INITIAL header
// encounter. Used ONLY by visit-mastercard.spec.ts's beforeEach, which needs
// a saved header encounter as a prerequisite, not its own content. The form's
// own JS requires at least one Enrollment Diagnosis checkbox ("Must enter at
// least one diagnosis!" if omitted — confirmed live) — "Cirrhosis" chosen
// since it doesn't collide with the "Age at diagnosis of:" row labels (see
// this file's top comment).
export async function fillChronicCareHeaderMinimum(form: MastercardFormPage): Promise<void> {
  await form.selectDropdown('Referred From', 'OPD');
  await form.checkByLabel('Cirrhosis');
}

// Fills a representative subset of chronic-care-visit.xml's data-entry
// (visit) form (see this file's top comment for why not every field is
// covered — e.g. Blood Pressure/Fingerstick/Peak Flow are compound
// multi-input cells with no distinguishing id or label, and "Number of
// seizures in the last month"'s own `<th>` label contains a `<br/>`, both
// skipped for the same ambiguous-locator reasons).
export async function fillChronicCareVisitForm(
  form: MastercardFormPage,
  opts: { appointmentDate: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');

  await form.fillField('heightInput', '160');
  await form.fillField('weightInput', '55');

  await form.selectRadio('CHF NYHA Classification', 'I');
  await form.selectDropdown('Asthma Classification', 'Mild persistent');
  // NOTE: Diagnosis is skipped, not chased further (out of scope for this
  // pilot's coverage) — its multi-answer checkboxes have no accessible name
  // reachable by checkByLabel or checkCellCheckbox (checkbox/label are inline
  // siblings in one shared <td>, not the label-cell/checkbox-cell pair either
  // expects).
  //
  // The next three rows' obs tags declare no answerConceptIds/answerLabels,
  // but they're NOT unusable — confirmed live (dumping each row's actual
  // rendered HTML) that with no configured answers, HTML Form Entry falls
  // back to OpenMRS's own global default Yes/No concept pair (distinct from
  // this project's own custom Yes/No concepts used elsewhere in this file),
  // rendered with plain "Yes"/"No" labels. "Hospitalized since last visit?"
  // renders as a <select> (not a radio group) despite style="yes_no".
  await form.selectDropdown('Hospitalized since last visit?', 'Yes');
  await form.selectRadio('For NCD?', 'Yes');
  await form.selectRadio('Preferred treatment out of stock?', 'No');

  await form.checkByLabel('Salbutamol inhaler');
  await form.checkByLabel('Captopril');
  await form.checkByLabel('Phenobarbital');
  await form.checkByLabel('Metformin');
  await form.checkByLabel('Furosemide');

  await form.selectRadio('Medications changed?', 'Yes');
  await form.fillField('appointmentDate', opts.appointmentDate);
  // No explicit answerLabels here either, but this row's own answerConceptIds
  // are the same Yes/No concepts "Medications changed?" above maps to
  // "No,Yes" — so the default rendered label is the full word, not 'Y'/'N'.
  await form.selectRadio('Visit fully completed?', 'Yes');
  await form.fillField('Comment (if not fully completed)', 'Some comments');
}
