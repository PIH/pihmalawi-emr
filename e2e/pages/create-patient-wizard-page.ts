import { type Page, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Verification notes (Task 7) — everything below was confirmed against a live
// instance (http://localhost:8080/openmrs, OpenMRS legacyui 2.8.7) by curling
// raw HTML and driving a headless Playwright script, NOT guessed from the
// task brief's placeholder code. Several things differ from the brief's
// assumptions; they're called out explicitly.
//
// 1. Entry point. There is no separate "Register a patient" link — the short
//    create-person form is embedded directly in the "Find/Create Patient"
//    page (`findPatient.htm`), in a portlet OpenMRS core ships as
//    `view/portlets/addPersonForm.jsp` (not present in this repo). Fields,
//    read from the rendered page source:
//      - `#personName` — a SINGLE free-text "Given [Middle] Family" field
//        (name="addName"), not separate given/family inputs. The server
//        splits it. Client-side JS restricts it to `^[a-zA-Z \-]+$` — NO
//        DIGITS allowed (matches the existing "no digits in test names" note
//        in e2e/core/test.ts).
//      - `#birthdate` (name="addBirthdate") — format is MM/DD/YYYY, not ISO.
//      - `#age` (name="addAge").
//      - `#gender-M` / `#gender-F` radios (name="addGender", value M/F).
//      - Submit: `<input type=submit value="Create Person">`. Hidden fields
//        personType=patient / viewType=shortEdit route the GET to
//        admin/person/addPerson.htm, which redirects to
//        admin/patients/shortPatientForm.form.
//    Focusing `#birthdate` (and later `#deathDate`) pops open a jQuery-UI
//    datepicker overlay that intercepts clicks on whatever's below it;
//    pressing Escape did not reliably close it in headless mode, so we force
//    -hide `#ui-datepicker-div` via `page.evaluate` after filling a date.
//
// 2. Similar-patients interstitial: NOT REPRODUCIBLE. Per the brief, this was
//    expected to appear when duplicate names exist. To test this, two
//    patients named "Zdupcheck Sameperson" (same gender/birthdate) were
//    created via the REST API, then the short form was submitted a third
//    time with identical name/birthdate/gender. All three attempts landed
//    directly on `admin/patients/shortPatientForm.form` ("Create a New
//    Patient" heading) — no interstitial, no "similar patients" text
//    anywhere in the response, in this legacyui version/config. `chooseNewPatient()`
//    below is therefore UNVERIFIED — kept only so the code compiles against
//    the brief's declared `SimilarPatientsPage | FullPatientFormPage` return
//    type, in case some other data/config state does trigger it.
//
// 3. Full patient form (admin/patients/shortPatientForm.form, rendered by
//    omod/src/main/webapp/shortPatientForm.jsp in this repo — though the
//    live-rendered markup has extra JS beyond that checked-in source,
//    presumably from another bundled enhancement):
//      - Identifier row 0: type `<select id="identifiers0.identifierType"
//        name="identifiers[0].identifierType">` (note: the id has NO array
//        brackets, only the name does). The identifier value input has
//        neither an id nor a label — only `name="identifiers[0].identifier"`.
//        "Dummy ID" is a valid option (used by the spec).
//      - Address (district/traditional authority/village) is ALWAYS
//        required to save — NOT mentioned in the brief at all. A client-side
//        `alert()` (from this distro's pihmalawi module) blocks submission
//        with "pihmalawi.address.district/traditionalAuthority/village is a
//        required field" if left blank. The traditional-authority and
//        village `<select>`s start with only a blank option and are
//        populated by AJAX once their parent is chosen, so selecting one
//        requires waiting for `options.length > 1` first. Verified working
//        values: District "Neno" -> Traditional Authority "Chekucheku" ->
//        Village "Chapingasa". Since the brief's interface has no address
//        step, `save()` fills this default itself when the district is still
//        blank.
//      - Deceased: checkbox `#personDead`, death date `#deathDate` (format
//        MM/DD/YYYY, same datepicker-overlay caveat as above). NOT mentioned
//        in the brief: cause of death is SERVER-SIDE required whenever
//        dead=true (a `Person.dead.causeOfDeathNull` validation error is
//        returned otherwise), via a concept-answers autocomplete
//        (`#patient.causeOfDeath_id_selection`, restricted to answers of
//        concept 1119). Focusing it with an empty value triggers the
//        dropdown immediately (minLength:0); "Unknown" is the only answer
//        configured in this instance. `setDeceased(true, ...)` picks the
//        first autocomplete suggestion to satisfy this.
//      - Save button is `#addButton`, value="Save" — NOT "Save Patient" as
//        the brief guessed.
//      - Success message is the literal text "Patient saved" in
//        `#openmrs_msg` on the resulting patientDashboard.form page — NOT
//        "patient .* saved"/"patient information saved" as the brief
//        guessed (there's no filler text between "patient" and "saved").
// ---------------------------------------------------------------------------

/** Converts an ISO 'YYYY-MM-DD' date to the 'MM/DD/YYYY' format this instance's date fields expect. */
function toUsDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${month}/${day}/${year}`;
}

/** Force-hides the jQuery UI datepicker overlay opened by focusing a date field — it otherwise intercepts later clicks. */
async function hideDatepicker(page: Page): Promise<void> {
  await page.evaluate(() => {
    const el = document.getElementById('ui-datepicker-div');
    if (el) {
      (el as HTMLElement).style.display = 'none';
    }
  });
}

export class SimilarPatientsPage {
  constructor(private page: Page) {}

  /**
   * UNVERIFIED — see file header note 2. This interstitial was never observed
   * against the live instance even with genuine exact-match duplicates; this
   * is a best-effort selector kept for interface/type compatibility only.
   */
  async chooseNewPatient(): Promise<FullPatientFormPage> {
    await this.page.getByText(/none of these|continue creating/i).click();
    await this.page.waitForLoadState('networkidle');
    return new FullPatientFormPage(this.page);
  }
}

export class FullPatientFormPage {
  constructor(private page: Page) {}

  async addIdentifier(opts: { identifierTypeName: string; identifier: string }): Promise<void> {
    await this.page.locator('#identifiers0\\.identifierType').selectOption({ label: opts.identifierTypeName });
    await this.page.locator('input[name="identifiers[0].identifier"]').fill(opts.identifier);
  }

  async setDeceased(dead: boolean, deathDate?: string): Promise<void> {
    const checkbox = this.page.locator('#personDead');
    if (dead) {
      await checkbox.check();
      if (deathDate) {
        await this.page.locator('#deathDate').fill(toUsDate(deathDate));
        await hideDatepicker(this.page);
      }

      // Cause of death is server-side required whenever dead=true (see file
      // header note 3). The brief's interface has no parameter for it, so
      // default to the first available concept-answer suggestion.
      const causeInput = this.page.locator('#patient\\.causeOfDeath_id_selection');
      await causeInput.click();
      await this.page.waitForSelector('.ui-autocomplete li a', { state: 'visible' });
      await this.page.locator('.ui-autocomplete li a').first().click();
    } else {
      await checkbox.uncheck();
    }
  }

  /** True if the address hierarchy's district field already has a value selected. */
  private async hasAddress(): Promise<boolean> {
    const value = await this.page.locator('select[name="personAddress.stateProvince"]').inputValue();
    return !!value;
  }

  // Address is unconditionally required by this instance's validation to
  // save (see file header note 3), but the brief's interface has no address
  // step — fill a known-good default so save() succeeds.
  private async fillDefaultAddress(): Promise<void> {
    await this.page.locator('select[name="personAddress.stateProvince"]').selectOption('Neno');
    await this.page.waitForFunction(() => {
      const select = document.querySelector('select[name="personAddress.countyDistrict"]') as HTMLSelectElement | null;
      return !!select && select.options.length > 1;
    });
    await this.page.locator('select[name="personAddress.countyDistrict"]').selectOption('Chekucheku');
    await this.page.waitForFunction(() => {
      const select = document.querySelector('select[name="personAddress.cityVillage"]') as HTMLSelectElement | null;
      return !!select && select.options.length > 1;
    });
    await this.page.locator('select[name="personAddress.cityVillage"]').selectOption('Chapingasa');
  }

  async save(): Promise<void> {
    if (!(await this.hasAddress())) {
      await this.fillDefaultAddress();
    }
    await this.page.locator('#addButton').click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectSaveSuccess(): Promise<void> {
    await expect(this.page.locator('#openmrs_msg')).toHaveText('Patient saved');
  }
}

export class CreatePatientWizardPage {
  constructor(private page: Page) {}

  static async openShortForm(page: Page): Promise<CreatePatientWizardPage> {
    // No leading slash: baseURL is `<E2E_BASE_URL>/` (trailing slash), so a
    // leading-slash path here would resolve from the host root and drop
    // "/openmrs" — see playwright.config.ts's baseURL comment.
    await page.goto('findPatient.htm');
    await page.waitForLoadState('networkidle');
    return new CreatePatientWizardPage(page);
  }

  async fillShortForm(opts: { givenName: string; familyName: string; gender: 'M' | 'F'; birthdate?: string; age?: number }): Promise<void> {
    // The live form has a single free-text name field, not separate
    // given/family inputs — see file header note 1.
    await this.page.locator('#personName').fill(`${opts.givenName} ${opts.familyName}`);
    if (opts.birthdate) {
      await this.page.locator('#birthdate').fill(toUsDate(opts.birthdate));
      await hideDatepicker(this.page);
    } else if (opts.age) {
      await this.page.locator('#age').fill(String(opts.age));
    }
    await this.page.locator(opts.gender === 'F' ? '#gender-F' : '#gender-M').check();
  }

  async clickCreatePerson(): Promise<SimilarPatientsPage | FullPatientFormPage> {
    await this.page.getByRole('button', { name: 'Create Person', exact: true }).click();
    await this.page.waitForLoadState('networkidle');
    // See file header note 2: this always resolves to FullPatientFormPage
    // against this instance — the similar-patients interstitial was never
    // reproduced. #addButton (the Save button) only exists on the full form.
    const onFullForm = await this.page.locator('#addButton').isVisible().catch(() => false);
    return onFullForm ? new FullPatientFormPage(this.page) : new SimilarPatientsPage(this.page);
  }
}
