import { type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Verification notes (Task 8) — confirmed against a live instance
// (http://localhost:8080/openmrs) two ways: (1) reading
// omod/src/main/java/org/openmrs/module/pihmalawi/web/taglibs/EMastercardAccessTag.java
// (the JSP tag `malawiPatientDashboard.jsp:122` uses to render this row —
// `<pihmalawi:eMastercardAccess ... form="ART eMastercard" .../>`), and
// (2) observing patientDashboard.form's rendered output at each of the three
// gating stages for a real test patient created via the REST API. NOT
// guessed from the brief's placeholder selector.
//
// 1. The brief guessed the "Create new" link would be an
//    `a[href*="flowsheet.page"][href*="art-emastercard"]`. It is NOT.
//    `EMastercardAccessTag.createNewCardHtmlTag` (the branch taken when all
//    gates pass and no ART_INITIAL encounter exists yet) renders:
//      <a onclick="window.location.href='/openmrs/htmlformentryui/htmlform/
//        flowsheet.page?...&patientId=<id>&encounterDate=' +
//        $j.datepicker.formatDate(...)">Create new ART eMastercard</a>
//    — there is NO `href` ATTRIBUTE at all on this element (confirmed via
//    `elementHandle.outerHTML` on a live eligible patient). A
//    `[href*=...]` selector will never match it. The reliable signal is the
//    literal link TEXT "Create new " + Form.getName(), and the ART
//    eMastercard form's name is exactly "ART eMastercard" (confirmed via the
//    same tag's "Not available: ..." messages below, which embed the same
//    `f.getName()`).
//
// 2. The three gating stages actually observed live, all inside
//    `<div class="portlet" id="pihmalawi.malawiPatientDashboard">` in the row
//    labeled "ART Patient Card:" (that label itself is static JSP markup,
//    distinct from the tag's dynamic second cell):
//      - No program enrollment yet:
//        "Not available: Inactive program state (ART eMastercard)"
//      - Enrolled in HIV Program / On antiretrovirals, but no ARV Number
//        identifier yet: "Not available: No identifier (ART eMastercard)"
//      - ARV Number identifier added at the enrollment's location:
//        "Create new ART eMastercard" onclick link, `.isVisible()` true.
//    This matches docs/program-eligibility-rules.md exactly.
//
// 3. The real rendered URL's `patientId` param is the LEGACY INTEGER patient
//    id (`p.getPatientId()`), not a UUID — e.g. observed
//    "...&patientId=109&encounterDate=...". `buildCreateUrl` below still
//    takes a UUID, per this task's brief/interface (Task 9's job is the
//    actual form-filling page and will need to reconcile this — flagging it
//    here as a real discrepancy from the brief. This task's spec never
//    navigates to the URL, only checks the dashboard link's VISIBILITY, so
//    it isn't exercised here).
// ---------------------------------------------------------------------------

export class MastercardGatePage {
  static buildCreateUrl(patientUuid: string, encounterDate: string): string {
    const params = new URLSearchParams({
      headerForm: 'file:configuration/htmlforms/art-emastercard.xml',
      dashboardUrl: 'legacyui',
      customizationProvider: 'pihmalawi',
      customizationFragment: 'mastercard',
      patientId: patientUuid,
      encounterDate,
    });
    params.append('flowsheets', 'file:configuration/htmlforms/viral-load-tests.xml');
    params.append('flowsheets', 'file:configuration/htmlforms/art-follow-up-testing.xml');
    params.append('flowsheets', 'file:configuration/htmlforms/art-visit.xml');
    // No leading slash — see playwright.config.ts's baseURL comment. Callers
    // pass this straight to page.goto(), which resolves it against baseURL.
    return `htmlformentryui/htmlform/flowsheet.page?${params.toString()}`;
  }

  static async isCreateLinkVisibleOnDashboard(page: Page, patientUuid: string): Promise<boolean> {
    // No leading slash — see playwright.config.ts's baseURL comment.
    await page.goto(`patientDashboard.form?patientId=${patientUuid}`);
    await page.waitForLoadState('networkidle');
    return page
      .locator('#pihmalawi\\.malawiPatientDashboard a')
      .filter({ hasText: /Create new ART eMastercard/i })
      .first()
      .isVisible()
      .catch(() => false);
  }
}
