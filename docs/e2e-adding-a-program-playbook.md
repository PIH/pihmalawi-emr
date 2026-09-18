# Playbook: adding a new program/mastercard to the E2E suite

This is a process guide for extending `e2e/` (see the "End-to-End Tests" section of the root
README) to a new program, following the HIV/ART pilot's pattern. Written so a **fresh session**
can pick up a new program without needing any prior conversation history — everything it needs is
either in this doc, in `docs/program-eligibility-rules.md`, or in the `e2e/` code itself (the page
objects carry extensive "verification notes" comments documenting exactly how each quirky field
was discovered — read those before writing new ones).

## Prerequisites to read first

- Root `README.md`'s "End-to-End Tests" section.
- `docs/program-eligibility-rules.md` — both for its HIV/ART content (the worked example) and its
  own "Other programs" note pointing at the extraction method.
- `e2e/pages/mastercard-page.ts` in full — the shared field-filling helpers (`fillField`,
  `selectRadio`, `selectDropdown`, `cellAt`, `fillHeaderField`, the `ID_LIKE` guard) and their
  comments explaining which htmlformentry rendering quirks each one exists for.
- `e2e/core/test.ts` — the `eligibleHivArtPatient` fixture, as the pattern to mirror.

## Step-by-step method

1. **Extract the new program's eligibility rules first**, before writing any code — same method
   already used for HIV/ART: grep `EMastercardAccessTag`/quick-programs tag usages for this
   program in `omod/src/main/webapp/portlets/malawiPatientDashboard.jsp`, then resolve the
   program/workflow/state/identifier-type UUIDs it references against
   `content/content.properties` and `content/configuration/backend_configuration/{programs,
   programworkflows, programworkflowstates, patientidentifiertypes}/*.csv`. Add a new section to
   `docs/program-eligibility-rules.md` in the same table shape as the HIV/ART one, including the
   mastercard launch URL and any quick-programs mechanics specific to this program (e.g. does it
   use `initialStateIds` or `workflowIds` — see that doc's existing note on why this matters).

   **Don't assume one program = one mastercard.** Several `htmlforms/*.xml` files (e.g. the
   chronic-kidney-disease, chronic-lung-disease, cardiac-and-vascular-disease,
   hypertension-and-diabetes, ncd-other, sickle-cell-disease forms) likely all gate on the same
   underlying **Chronic Care Program** enrollment with different workflow/state/identifier
   combinations per condition. Confirm the real program↔mastercard mapping from the JSP tags
   themselves, not from form file naming.

2. **Add new UUID constants** to `e2e/core/constants.ts`, sourced only from the repo's own config
   files (never invented) — same convention as the existing HIV/ART constants.

3. **Add a new eligible-patient fixture** (extend `e2e/core/test.ts`, following
   `eligibleHivArtPatient`'s exact shape: create patient via REST → assign the qualifying
   identifier type at the enrollment location → enroll in the program with the qualifying initial
   state → refresh the patient object → teardown in the correct order: purge encounters, then
   program enrollments, then the patient — see the FK-ordering gotcha below).

4. **Read the relevant htmlform XML file(s) in full** before writing any page-object code, to
   build a field inventory. Do NOT trust the XML alone for selector strategy — `htmlformentry`'s
   actual rendering has repeatedly diverged from what the XML suggests (macros expand
   unpredictably, `style="checkbox"` can render as a `<select>`, several separate single-answer
   `<obs>` tags can render as independent checkboxes rather than a radio group, some rows share one
   `<td>` across multiple fields with no sub-labels, some label `<td>`s are genuinely empty and
   need positional targeting instead). Live-verify every non-trivial selector against the actual
   rendered DOM (`page.content()` dumps, `page.locator(...).count()`/`.evaluate()` experiments) —
   there is no display server in most dev/CI environments, so do this via `curl` and headless
   Playwright scripts, never `--headed`/`--debug`.

5. **Build page objects/specs incrementally, one form at a time**, reusing the shared helpers in
   `mastercard-page.ts` — add a new method there only for a genuinely new rendering shape, not a
   parallel/competing abstraction. For each form:
   - Write the spec first, filling **every editable field** (not a representative subset) — the
     ART pilot's own header/visit specs both started with a partial-field first pass that a review
     caught and had to fix; do the full inventory from the start this time.
   - Every field's REST assertion must check the **actual value** that was entered against the
     real `display` string (query the live REST API to confirm the real string before writing each
     regex — never a presence-only "some obs with this label exists" check).
   - Run the full suite (not just the new spec) after each form to confirm no regressions in the
     shared page-object file.

6. **Get an independent review pass per task** (spec compliance + code quality) before moving to
   the next form — the ART pilot's reviews consistently caught real gaps (missing field coverage,
   presence-only assertions, a save() race that only manifested under load) that the implementer's
   own report claimed were already handled. Don't skip this because the pattern is now familiar.

## Known gotchas — apply directly, don't rediscover

- **OpenMRS rejects any digit in a person's given/family name.** Keep test-patient names purely
  alphabetic; put uniqueness in identifier values (`Date.now()` etc. is fine there).
- **Deleting a patient via REST purge 500s (FK violation) if they have ANY program enrollment or
  encounter/obs.** Fixture teardown must always purge encounters, then program enrollments, then
  the patient, in that order (see `purgeEncountersForPatient`/`purgeProgramEnrollments` in
  `e2e/commands/`).
- **`playwright.config.ts`'s `baseURL` needs a trailing slash, and every `page.goto()` call must
  NOT have a leading slash** — see that file's comment. Getting this backwards silently drops
  `/openmrs` from every navigation.
- **The live instance still has a real, if now much less frequent, concurrency limitation under
  real parallel test execution** (`workers: 1` is pinned in `playwright.config.ts` — read its
  comment for the current, up-to-date reasoning, which has changed over time as root causes were
  found). Don't remove that pin without re-validating extensively; a fix to one contributing bug
  does not mean the suite is reliably parallel-safe.
- **OpenMRS REST list endpoints paginate at 50 by default.** Add `&limit=100` (or handle real
  pagination) on any list GET used for cleanup or verification once a patient could plausibly have
  more than 50 of something.
- **Not every report is self-contained.** Check whether a candidate verification report has an
  external data dependency (like `HIVCohortReport`'s data-warehouse requirement) *before*
  committing to it — grep the report's Java class for `setConnectionPropertyFile`/non-default
  dataset connections. If a report genuinely can't run in this environment, `test.fixme()` it with
  the full evidence chain in a comment (see `e2e/specs/hiv-art/art-report.spec.ts`) — never fake a
  pass or leave a permanently-red test.
- **Node 22+ is required** (`e2e/.nvmrc`). Keep `.nvmrc`, `package.json`'s `engines`, and the CI
  workflow's `node-version-file` in sync — `.nvmrc` is the single source of truth; the other two
  should reference it, not duplicate the version number.

## Programs not yet covered

From `content/configuration/backend_configuration/programs/programs.csv`, active (non-retired)
programs other than HIV: Chronic Care, Mental Health Care, Nutrition, Old TB, Palliative Care,
PDC (Pediatric Development Clinic), TB, Teen Club, VHW, MDR-TB, Kaposi's Sarcoma, Maternity, ANC,
Diabetes, OPD, IPD. (`ART`, `PRE-ART`, `Early Infant Diagnosis`, and `FOOD` are marked retired —
skip these unless something specifically needs their legacy data model.)

Prioritize based on which programs matter most for real testing needs, not this list's order —
this is an inventory, not a sequencing recommendation.

## Suggested workflow for picking up the next program

1. Open a fresh session in this repo. Point it at this playbook, plus which program to build.
2. A full `brainstorming`→`writing-plans` pass is probably unnecessary now that the pattern is
   established — a short plan (roughly: extract eligibility rules → constants/fixture → header
   form → visit form → any summary/report check, one task each) is likely sufficient, executed via
   `subagent-driven-development` the same way the pilot was.
3. Confirm the branch/issue-key convention with the user before creating a branch, same as always.
