import { type Page, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Verification notes (Task 11) — confirmed against a live instance
// (http://localhost:8080/openmrs) by creating a real ART_INITIAL header
// encounter and an ART_FOLLOWUP visit encounter (via `MastercardFormPage`)
// for a real `eligibleHivArtPatient`, then observing `page.content()` at
// each step — NOT guessed from the task brief's placeholder code.
//
// 1. Entry point — the brief's guess was right in substance: there IS a
//    real "HIV Patient Summary" link rendered on `patientDashboard.form`.
//    It comes from the `org.openmrs.patientDashboard.Header` extension
//    point (`PrintableSummaryExtension.java`), which renders
//    `<a href="pihmalawi/printableSummary.page?patientId=<id>">HIV Patient
//    Summary</a>` unconditionally for any user with "View clinical data"
//    (no ART-specific gating, unlike Tasks 8-10's mastercard widgets).
//    Confirmed live: clicking it from a real patient's dashboard navigated
//    to exactly that URL. BUT its href's `patientId` is the LEGACY INTEGER
//    id (e.g. `...?patientId=172`), not a uuid — same pattern as Task 8's
//    "Create new ART eMastercard" link.
//
// 2. `printableSummary.page`'s own `@RequestParam(value="patientId")
//    Patient patient` binding, however, accepts a UUID string directly too
//    — the same OpenMRS UI-framework behavior Task 9 found for
//    `flowsheet.page`. Confirmed live: navigating straight to
//    `pihmalawi/printableSummary.page?patientId=<realUuid>` (no dashboard
//    hop, no legacy-id lookup) rendered the `#printable-summary` page for
//    that exact patient. `openForPatient` below navigates directly with the
//    uuid, matching `MastercardFormPage.openCreate`'s direct-URL pattern
//    rather than clicking through the dashboard link.
//
// 3. Weight rendering: the "Last Weight:" row shows e.g. "62.0 kg on
//    17/09/2026" in its value `<td>` — but that same number ALSO appears
//    verbatim in the separate "Weights over time" history table further
//    down the page (`<td>62</td>`). A page-wide `getByText(weight)` matches
//    BOTH and throws a Playwright strict-mode violation (multiple matching
//    elements). `expectWeightDisplayed` therefore scopes its search to the
//    "Last Weight:" row's own value cell.
//
// 4. Regimen rendering: the value shown is NOT just the option label chosen
//    on the ART Visit form's `artRegimenObs` dropdown (e.g. "1A") — it's
//    the full regimen-change display text, e.g. "1A: d4T / 3TC / NVP
//    (previous 1L) on 17/09/2026", rendered as its own `<div>` under an
//    "ARV Regimens:" section title (both are direct children of the same
//    `<td>`). `expectRegimenDisplayed` scopes its search to that `<td>` so
//    a short regimen code like "1A" still matches via substring, and stays
//    unambiguous even though "ARV Regimens:" itself contains letters that
//    could otherwise coincidentally match elsewhere on the page.
// ---------------------------------------------------------------------------

export class HivPatientSummaryPage {
  constructor(private page: Page) {}

  static async openForPatient(page: Page, patientUuid: string): Promise<HivPatientSummaryPage> {
    // No leading slash — see playwright.config.ts's baseURL comment.
    await page.goto(`pihmalawi/printableSummary.page?patientId=${patientUuid}`);
    await page.waitForLoadState('networkidle');
    return new HivPatientSummaryPage(page);
  }

  async expectWeightDisplayed(weight: string): Promise<void> {
    await expect(this.weightValueCell().getByText(new RegExp(weight))).toBeVisible();
  }

  async expectRegimenDisplayed(regimen: string): Promise<void> {
    await expect(this.regimenSection().getByText(new RegExp(regimen, 'i'))).toBeVisible();
  }

  // The "Last Weight:" label's own <td>, exact-matched (see verification
  // note 3 above), followed by its immediate next <td> sibling — the same
  // shape MastercardFormPage's inputCellFor uses for label-adjacent values.
  private weightValueCell() {
    return this.page.getByText('Last Weight:', { exact: true }).locator('xpath=following-sibling::td[1]');
  }

  // The <td> containing the "ARV Regimens:" title div and its sibling
  // regimen-change <div>s (see verification note 4 above).
  private regimenSection() {
    return this.page.getByText('ARV Regimens:', { exact: true }).locator('xpath=..');
  }
}
