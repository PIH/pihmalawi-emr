import { MastercardFormPage } from './mastercard-page';

// ---------------------------------------------------------------------------
// Trace Mastercard — gated by a DIFFERENT tag (pihmalawi:eTraceAccess, not
// eMastercardAccess). Confirmed against ETraceAccessTag.java: no program
// enrollment or identifier type required at all, any plain patient qualifies
// (see TRACE_INITIAL_ENCOUNTER_TYPE_UUID's comment in constants.ts). Its own
// getNewMasterCardConfiguration DOES map TRACE_INITIAL -> ["trace-attempt"],
// unlike EMastercardAccessTag's map (which has no PART_INITIAL entry, per
// pre-art-mastercard-page.ts's own note) — flowsheet.page works either way.
//
// trace-mastercard.xml (the header form) has ZERO <obs> fields — it's a
// pure read-only patient-info display (name, sex/DOB, address, CHW name)
// plus a submit button, so there's nothing to fill before saving.
//
// trace-attempt.xml (the visit form) is fully labeled with standard <th>/<td>
// rows, but several obs `display` values from the REST API use the
// underlying concept's own fully-specified name rather than the htmlform's
// <th> text or answerLabel override (confirmed against concepts.csv, not
// guessed):
//   - "Health complaints" -> concept "Current complaints or symptoms"
//   - "Social complaints" -> concept "Other socio-economic complaint non-coded"
//   - "Patient behavior" -> concept "In general, would you say that your
//     health is:", whose "Bad" answerLabel maps to a concept actually named
//     "Poor" (not "Bad") — "Good" and "Fair" answerLabels DO match their
//     concepts' own names, so "Good" is used here to avoid that mismatch.
// ---------------------------------------------------------------------------

const TRACE_HEADER_FORM = 'file:configuration/htmlforms/trace-mastercard.xml';
const TRACE_FLOWSHEETS = ['file:configuration/htmlforms/trace-attempt.xml'];

export class TraceMastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: TRACE_HEADER_FORM,
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    for (const flowsheet of TRACE_FLOWSHEETS) {
      params.append('flowsheets', flowsheet);
    }
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }
}

export async function fillTraceVisitForm(
  form: MastercardFormPage,
  opts: { missingAppDate: string; nextTrackingAttempt: string },
): Promise<void> {
  await form.selectDropdown('visitLocation', 'Neno District Hospital');
  await form.fillField('Attempt #', '2');
  await form.fillField('Tracker', 'Grace Banda');
  await form.fillField('Missing Appointment Date', opts.missingAppDate);
  await form.selectRadio('Patient found', 'Yes');
  await form.fillField('Reason for missing appointment', 'Transport difficulties');
  await form.fillField('Health complaints', 'None reported');
  await form.fillField('Social complaints', 'None reported');
  await form.selectRadio('Agreed to return to clinic', 'Yes');
  await form.fillField('Date given', opts.missingAppDate);
  await form.selectRadio('Patient behavior', 'Good');
  await form.fillField('Remarks', 'Some remarks');
  await form.fillField('Next tracking attempt', opts.nextTrackingAttempt);
}
