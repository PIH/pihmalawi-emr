import { test, expect } from '../../core';
import { MastercardFormPage } from '../../pages';
import { ART_FOLLOWUP_ENCOUNTER_TYPE_UUID } from '../../core/constants';

// A visit mastercard is only meaningful once a header (ART_INITIAL)
// encounter exists — see MastercardFormPage's Task 10 verification notes.
// This beforeEach creates that header first, on the same `page` the test
// itself receives, since reaching the visit form requires continuing on
// that same already-loaded page (`enterNewFlowsheet`), not a fresh
// `openCreate` navigation.
test.describe('ART visit mastercard', () => {
  test.beforeEach(async ({ page, eligibleHivArtPatient }) => {
    const intakeDate = new Date().toISOString().slice(0, 10);
    const intakeForm = await MastercardFormPage.openCreate(page, eligibleHivArtPatient.uuid, intakeDate);
    await intakeForm.selectRadio('Agrees to FUP', 'Y');
    await intakeForm.save();
    await intakeForm.expectSaveSuccess();
  });

  test('a follow-up visit encounter can be entered and is saved as ART_FOLLOWUP', async ({
    page,
    api,
    eligibleHivArtPatient,
  }) => {
    // Continues on the same `page` the beforeEach already navigated and
    // saved a header encounter on — see MastercardFormPage's Task 10
    // verification note 1 for why `openCreate` can't be called again here.
    const visitForm = new MastercardFormPage(page);
    await visitForm.enterNewFlowsheet('ART Visit');

    // "Visit Location" is required (an `encounterLocation` tag, same as the
    // header's), and left blank by default — same as the header form.
    await visitForm.selectDropdown('visitLocation', 'Neno District Hospital');
    await visitForm.fillField('heightInput', '166');
    await visitForm.fillField('weightInput', '61');

    // --- Task 13 additions below — see MastercardFormPage's Task 13
    // verification notes for exactly how each of these was confirmed live.

    await visitForm.fillField('systolicBPInput', '118');
    await visitForm.fillField('diastolicBPInput', '76');

    // Renders as an ordinary single-select `<select>` despite the XML's
    // `style="checkbox"` (note 2) — only ever renders for female patients,
    // which `eligibleHivArtPatient` is by default (see header-mastercard's
    // same note on `createPatient`'s default `gender: 'F'`).
    await visitForm.selectDropdown('pregnantBf', 'Preg');

    // TB Status (Curr.)* — 4 independent checkboxes sharing one <td>, not a
    // mutually-exclusive radio group (note 3). Selecting "Yes" only.
    await visitForm.selectRadio('TB Status (Curr.)*', 'Yes');

    // Side Effects (Current) — 6 independent checkboxes sharing one <td>
    // (note 4); the row's own rendered label concatenates its `<th>`'s text
    // with its child `<span>`'s, with NO space between them.
    const sideEffectsRowLabel = 'Side Effects (Current)Specifiy Other In Notes';
    await visitForm.selectRadio(sideEffectsRowLabel, 'PN');
    await visitForm.selectRadio(sideEffectsRowLabel, 'SK');

    await visitForm.fillField('pillCount', '5');
    await visitForm.fillField('Doses Missed', '2');

    // ARVs given — "To:" radio (P/G) shares `noTabletsGiven`'s own single
    // <td> (note 7); reached by the row's own "ARVs given" label.
    await visitForm.selectRadio('ARVs given', 'G');

    // CPT/IPT Given — filling CTX 960 and RFP/INH (3HP) fully (toggle +
    // pills), which also exercises the `rfp/inh` slash-in-id case. All 5
    // groups' "No. of pills" inputs are required regardless of their own
    // toggle (note 8), so the other 3 (INH 300, RFP 150, Pyridoxine) get a
    // pills value of 0 with their toggle left unchecked — filling all 5
    // fully would be excessive repetition of the same obsgroup mechanism.
    await visitForm.checkCptIptGiven('ctx');
    await visitForm.fillCptIptPills('ctx', '30');
    await visitForm.checkCptIptGiven('rfp/inh');
    await visitForm.fillCptIptPills('rfp/inh', '12');
    await visitForm.fillCptIptPills('inh', '0');
    await visitForm.fillCptIptPills('rfp', '0');
    await visitForm.fillCptIptPills('pyridoxine', '0');

    // `artRegimenObs` and `noTabletsGiven` are both required by
    // art-visit.xml's own JS validation (not the `required` XML attribute)
    // — the submit button stays disabled until both are filled.
    await visitForm.selectDropdown('artRegimenObs', '1A');
    await visitForm.fillField('noTabletsGiven', '30');
    const appointmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await visitForm.fillField('appointmentDate', appointmentDate);

    await visitForm.save();
    await visitForm.expectSaveSuccess();

    const res = await api.get(
      `encounter?patient=${eligibleHivArtPatient.uuid}&encounterType=${ART_FOLLOWUP_ENCOUNTER_TYPE_UUID}&v=full`,
    );
    expect(res.ok()).toBeTruthy();
    const { results } = await res.json();
    expect(results.length).toBe(1);

    const obs = results[0].obs as Array<{ display: string }>;
    expect(obs.some((o) => /61/.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /166/.test(o.display))).toBeTruthy();

    // One assertion per Task 13 field, each checking the actual entered
    // VALUE against the real REST `display` string, confirmed live (see
    // MastercardFormPage's Task 13 verification notes for each).
    expect(obs.some((o) => /systolic blood pressure.*118/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /diastolic blood pressure.*76/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /pregnant\/lactating.*patient pregnant/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /tb status.*tb suspected/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /malawi art side effects.*peripheral neuropathy/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /malawi art side effects.*skin rash/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /amount of drug brought to clinic.*5/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /number of hiv drug doses missed.*2/i.test(o.display))).toBeTruthy();
    // "Responsible person present" is the underlying concept's real REST
    // display name for the "To: G" radio — NOT "ARVs given to" or similar.
    expect(obs.some((o) => /responsible person present.*true/i.test(o.display))).toBeTruthy();
    expect(obs.some((o) => /number of antiretrovirals given.*30/i.test(o.display))).toBeTruthy();
    // CPT/IPT: the display concatenates the pills value with the given
    // drug's own concept name — an untouched group would show just
    // "...: 0.0" with no drug name. Confirmed live the two halves' ORDER is
    // NOT stable across runs (observed both "30.0, Trimethoprim and
    // sulfamethoxazole" and "3HP (Rifapentine and Isoniazid), 12.0" — value
    // first for CTX, drug name first for RFP/INH, in the same run), so each
    // assertion checks both halves independently rather than one ordered
    // regex, while still proving the SPECIFIC group (not just any of the 5)
    // got the right value.
    expect(
      obs.some(
        (o) =>
          /hiv preventive therapy construct/i.test(o.display) &&
          /30\.0/.test(o.display) &&
          /trimethoprim and sulfamethoxazole/i.test(o.display),
      ),
    ).toBeTruthy();
    expect(
      obs.some(
        (o) =>
          /hiv preventive therapy construct/i.test(o.display) &&
          /12\.0/.test(o.display) &&
          /3hp \(rifapentine and isoniazid\)/i.test(o.display),
      ),
    ).toBeTruthy();
  });
});
