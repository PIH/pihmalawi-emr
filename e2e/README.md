# End-to-end tests

Playwright-based regression suite that drives the real OpenMRS/htmlformentry UI (legacy UI mastercards/flowsheets, plus core patient registration) against a running pihmalawi-emr instance, and verifies results via the OpenMRS REST API. Runs in GitHub Actions (see `.github/workflows`) and locally.

## Running locally

The suite needs a running local instance to test against (see the main [README](../README.md#using-docker)), and Node.js 22+ (see [`.nvmrc`](.nvmrc); `nvm use` picks it up automatically if you use nvm).

```bash
cd e2e
npm install
npx playwright install chromium
cp .env.example .env   # edit if your instance's URL/credentials differ from the defaults
npx playwright test    # or: npm run test-e2e
```

To watch the tests run in a real, visible browser instead of headless, on a machine with a display:

```bash
npx playwright test --headed     # runs headed, but fast — the suite has no slowMo configured
npx playwright test --ui         # or: npm run test-e2e:ui — live preview, timeline, step-through
npx playwright test --debug      # pauses at each action via the Playwright Inspector
```

`--ui` is the most comfortable way to actually watch a run, since plain `--headed` tends to fly by.

### Continuous integration

[`e2e-tests.yml`](../.github/workflows/e2e-tests.yml) runs the suite against an ephemeral `openmrs-docker` instance. It's called automatically, after publishing, by [`build-and-deploy-to-openmrs-jfrog.yml`](../.github/workflows/build-and-deploy-to-openmrs-jfrog.yml) on every push to `master`, and can also be triggered manually via `workflow_dispatch` from the Actions tab to validate a change without running locally.

## Layout

- `e2e/specs/<condition>/` — one directory per clinical program/condition (e.g. `tb`, `nutrition-adults`, `pdc-trisomy`), each holding a `header-mastercard.spec.ts` and (where the program has a visit/flowsheet form) a `visit-mastercard.spec.ts`. A few directories have extra specs (see `hiv-art` below).
- `e2e/pages/` — page objects. `mastercard-page.ts` holds the generic `MastercardGatePage`/`MastercardFormPage` field-filling primitives shared by every program; each `<condition>-mastercard-page.ts` holds that program's create-URL builder (the literal `file:configuration/htmlforms/*.xml` list, which is the source of truth for which htmlforms a program's gate page can reach) plus its `fill<Condition>HeaderForm` / `fill<Condition>HeaderMinimum` / `fill<Condition>VisitForm` helpers.
- `e2e/commands/` — REST helpers for setting up/tearing down patients, encounters, and program enrollments.
- `e2e/fixtures/` — the `api` request-context fixture and per-condition `eligible<Condition>Patient` fixtures (patients constructed to pass that program's dashboard eligibility gate).
- `e2e/core/` — fixture wiring (`test.ts`), global setup, shared constants (encounter type UUIDs, etc).

## Test pattern

Every condition follows the same shape:

- **`header-mastercard.spec.ts`** opens the header eMastercard fresh (`<Condition>MastercardGatePage.buildCreateUrl`), fills a representative/exhaustive set of fields (`fill<Condition>HeaderForm` — page-object comments say "fills every editable field"), saves, then fetches the resulting encounter via the REST `api` fixture and asserts on its `obs[].display` values. This is **Enter Full** coverage for the header form.
- **`visit-mastercard.spec.ts`** has a `beforeEach` that creates a *minimal* header first (`fill<Condition>HeaderMinimum` — just enough required fields to pass validation and save), purely so the visit flowsheet becomes reachable via `enterNewFlowsheet('<Form Name>')` (an in-place AJAX swap, not a navigation). The test itself then fills a representative/exhaustive set of the visit form's fields, saves, and REST-verifies the result — **Enter Full** for the visit form. The header's minimal fill in `beforeEach` is exercised but not independently asserted beyond "save succeeded" — see the † marker in the table below.
- **`hiv-art`** has extra specs beyond the pattern above: `enrollment-and-eligibility.spec.ts` tests the dashboard's eligibility gating (not a specific htmlform), `hiv-patient-summary.spec.ts` enters an ART visit and cross-checks a separate "HIV Patient Summary" widget, and `art-report.spec.ts` exercises the warehouse-backed "HIV Cohort Report" — it shells out to `openmrs-docker <instance> run-service petl` mid-test, so it requires `E2E_DOCKER_INSTANCE` set and `openmrs-docker` on `PATH`.
- **`patient-creation`** drives core OpenMRS's own patient-registration UI (`findPatient.htm` → `shortPatientForm.form`), not any pihmalawi htmlform — it's setup plumbing, not htmlform coverage.
- **`sanity`** (`api-smoke.spec.ts`, `eligible-patient-fixture.spec.ts`) tests the REST command helpers and the eligibility fixtures themselves, not any htmlform.

### What "Minimal" and "Full" mean

- **Minimal** — the smallest set of fields needed to satisfy required-field validation and save successfully.
- **Full** — a representative-to-exhaustive set of the form's editable fields, checked against the resulting encounter's REST `obs`.

### What isn't covered yet

As of this writing, **no spec anywhere in the suite reopens a saved encounter to view its read-only rendering, or to edit it.** Every test is a fresh "Create"/"Enter New" flow. That means the "View" and "Edit" columns below are empty everywhere — this is a known, suite-wide gap, not a per-form omission.

## Coverage table

Legend: ✅ = dedicated test, verified via the REST API · ✅† = only exercised as minimal `beforeEach` setup for a visit-form test (save success is checked in the UI, but the minimal encounter's data isn't independently REST-asserted) · blank = not covered.

Forms not listed in a program's table are either referenced only in that program's flowsheet list (never opened by a test) — noted inline — or not referenced anywhere in `e2e/` at all.

### ART / HIV (`e2e/specs/hiv-art/`)

| Htmlform | View Min | View Full | Enter Min | Enter Full | Edit Min | Edit Full | Notes |
|---|---|---|---|---|---|---|---|
| art-emastercard.xml | | | ✅† | ✅ | | | header-mastercard.spec.ts (full); visit/hiv-patient-summary specs' `beforeEach` (minimal) |
| art-visit.xml | | | | ✅ | | | visit-mastercard.spec.ts. `hiv-patient-summary.spec.ts` also reads the values back via a separate "HIV Patient Summary" widget (not the mastercard's own view mode) — not counted as View here |
| art-follow-up-testing.xml | | | | | | | referenced in the create-URL flowsheet list, not exercised |
| viral-load-tests.xml | | | | | | | referenced in the create-URL flowsheet list, not exercised |

### Pre-ART (`e2e/specs/pre-art/`)

| Htmlform | View Min | View Full | Enter Min | Enter Full | Edit Min | Edit Full | Notes |
|---|---|---|---|---|---|---|---|
| pre-art-emastercard.xml | | | ✅† | ✅ | | | header-mastercard.spec.ts; visit spec `beforeEach` |
| pre-art-visit.xml | | | | ✅ | | | visit-mastercard.spec.ts |

### Chronic Care Program conditions

| Htmlform | View Min | View Full | Enter Min | Enter Full | Edit Min | Edit Full | Notes |
|---|---|---|---|---|---|---|---|
| chronic-care-emastercard.xml | | | ✅† | ✅ | | | e2e/specs/chronic-care |
| chronic-care-visit.xml | | | | ✅ | | | e2e/specs/chronic-care |
| cardiac-and-vascular-disease-emastercard.xml | | | ✅† | ✅ | | | e2e/specs/cardiac-and-vascular-disease |
| cardiac-and-vascular-disease-visit.xml | | | | ✅ | | | e2e/specs/cardiac-and-vascular-disease |
| cardiac-and-vascular-disease-quarterly-laboratory-tests.xml | | | | | | | referenced in flowsheet list, not exercised |
| cardiac-and-vascular-disease-frequency-per-protocol-laboratory-tests.xml | | | | | | | referenced in flowsheet list, not exercised |
| cardiac-and-vascular-disease-hospitalization-history.xml | | | | | | | referenced in flowsheet list, not exercised |
| echocardiogram-ultrasound-imaging-results.xml | | | | | | | referenced in flowsheet list, not exercised |
| electrocardiographic-ekg-imaging-results.xml | | | | | | | referenced in flowsheet list, not exercised |
| chest-x-ray-cxr-imaging-results.xml | | | | | | | referenced in flowsheet list, not exercised |
| chronic-kidney-disease-emastercard.xml | | | ✅† | ✅ | | | e2e/specs/chronic-kidney-disease |
| chronic-kidney-disease-visit.xml | | | | ✅ | | | e2e/specs/chronic-kidney-disease |
| chronic-kidney-disease-quarterly-laboratory-tests.xml | | | | | | | referenced in flowsheet list, not exercised |
| chronic-kidney-disease-annual-laboratory-tests.xml | | | | | | | referenced in flowsheet list, not exercised |
| chronic-kidney-disease-imaging-results.xml | | | | | | | referenced in flowsheet list, not exercised |
| chronic-kidney-disease-hospitalization-history.xml | | | | | | | referenced in flowsheet list, not exercised |
| chronic-lung-disease-emastercard.xml | | | ✅† | ✅ | | | e2e/specs/chronic-lung-disease |
| chronic-lung-disease-visit.xml | | | | ✅ | | | e2e/specs/chronic-lung-disease |
| chronic-lung-disease-peak-flow.xml | | | | | | | referenced in flowsheet list, not exercised |
| chronic-lung-disease-hospitalization.xml | | | | | | | referenced in flowsheet list, not exercised |
| hypertension-and-diabetes-emastercard.xml | | | ✅† | ✅ | | | e2e/specs/hypertension-and-diabetes |
| hypertension-and-diabetes-visit.xml | | | | ✅ | | | e2e/specs/hypertension-and-diabetes |
| hypertension-and-diabetes-quarterly-laboratory-tests.xml | | | | | | | referenced in flowsheet list, not exercised |
| hypertension-and-diabetes-annual-laboratory-tests.xml | | | | | | | referenced in flowsheet list, not exercised |
| hypertension-and-diabetes-hospitalization-history.xml | | | | | | | referenced in flowsheet list, not exercised |
| ncd-other-emastercard.xml | | | ✅† | ✅ | | | e2e/specs/ncd-other |
| ncd-other-visit.xml | | | | ✅ | | | e2e/specs/ncd-other |
| ncd-other-quarterly-laboratory-tests.xml | | | | | | | referenced in flowsheet list, not exercised |
| ncd-other-annual-laboratory-tests.xml | | | | | | | referenced in flowsheet list, not exercised |
| ncd-other-hospitalization-history.xml | | | | | | | referenced in flowsheet list, not exercised |
| sickle-cell-disease-emastercard.xml | | | ✅† | ✅ | | | e2e/specs/sickle-cell-disease |
| sickle-cell-disease-visit.xml | | | | ✅ | | | e2e/specs/sickle-cell-disease |
| sickle-cell-disease-quarterly-screening.xml | | | | | | | referenced in flowsheet list, not exercised |
| sickle-cell-disease-annual-monitoring.xml | | | | | | | referenced in flowsheet list, not exercised |
| sickle-cell-disease-hospitalization-history.xml | | | | | | | referenced in flowsheet list, not exercised |
| epilepsy-emastercard.xml | | | ✅† | ✅ | | | e2e/specs/epilepsy |
| epilepsy-visit.xml | | | | ✅ | | | e2e/specs/epilepsy |
| mental-health-emastercard.xml | | | ✅† | ✅ | | | e2e/specs/mental-health |
| mental-health-visit.xml | | | | ✅ | | | e2e/specs/mental-health |
| mental-health-screening.xml | | | | | | | referenced in flowsheet list, not exercised |

### TB (`e2e/specs/tb/`)

| Htmlform | View Min | View Full | Enter Min | Enter Full | Edit Min | Edit Full | Notes |
|---|---|---|---|---|---|---|---|
| tb-emastercard.xml | | | ✅† | ✅ | | | |
| tb-visit.xml | | | | ✅ | | | |
| tb-post-lung-disease.xml | | | | | | | referenced in flowsheet list, not exercised |
| tb-tests.xml | | | | | | | not referenced anywhere (commented out of the flowsheet list in the page object) |

### Exposed Child (`e2e/specs/exposed-child/`)

| Htmlform | View Min | View Full | Enter Min | Enter Full | Edit Min | Edit Full | Notes |
|---|---|---|---|---|---|---|---|
| exposed-child-emastercard.xml | | | ✅† | ✅ | | | |
| exposed-child-visit.xml | | | | ✅ | | | |

### Teen Club (`e2e/specs/teen-club/`)

| Htmlform | View Min | View Full | Enter Min | Enter Full | Edit Min | Edit Full | Notes |
|---|---|---|---|---|---|---|---|
| teen-club-emastercard.xml | | | ✅† | ✅ | | | |
| teen-club-visit.xml | | | | ✅ | | | |
| teen-club-intake-survey.xml | | | | | | | referenced in flowsheet list, not exercised |

### Palliative Care (`e2e/specs/palliative-care/`)

| Htmlform | View Min | View Full | Enter Min | Enter Full | Edit Min | Edit Full | Notes |
|---|---|---|---|---|---|---|---|
| palliative-care-mastercard.xml | | | ✅† | ✅ | | | |
| palliative-care-visit.xml | | | | ✅ | | | |

### Trace (`e2e/specs/trace/`)

| Htmlform | View Min | View Full | Enter Min | Enter Full | Edit Min | Edit Full | Notes |
|---|---|---|---|---|---|---|---|
| trace-mastercard.xml | | | ✅ | ✅ | | | Form has no `<obs>` fields at all (read-only display + submit), so minimal/full entry are the same no-op save |
| trace-attempt.xml | | | | ✅ | | | Exhaustively filled/labeled |

### Nutrition family

| Htmlform | View Min | View Full | Enter Min | Enter Full | Edit Min | Edit Full | Notes |
|---|---|---|---|---|---|---|---|
| nutrition-emastercard.xml | | | ✅† | ✅ | | | e2e/specs/nutrition |
| nutrition-visit.xml | | | | ✅ | | | e2e/specs/nutrition |
| nutrition-adults-emastercard.xml | | | ✅† | ✅ | | | e2e/specs/nutrition-adults |
| nutrition-adult-visit.xml | | | | ✅ | | | e2e/specs/nutrition-adults |
| nutrition-infant-emastercard.xml | | | ✅† | ✅ | | | e2e/specs/nutrition-infant |
| nutrition-infant-visit.xml | | | | ✅ | | | e2e/specs/nutrition-infant |
| nutrition-pdc-emastercard.xml | | | ✅† | ✅ | | | e2e/specs/nutrition-pdc |
| nutrition-pdc-visit.xml | | | | ✅ | | | e2e/specs/nutrition-pdc |
| nutrition-pregnant-teens-emastercard.xml | | | ✅† | ✅ | | | e2e/specs/nutrition-pregnant-teens |
| nutrition-pregnant-teens-visit.xml | | | | ✅ | | | e2e/specs/nutrition-pregnant-teens |

### Pediatric Development Clinic (PDC) family

| Htmlform | View Min | View Full | Enter Min | Enter Full | Edit Min | Edit Full | Notes |
|---|---|---|---|---|---|---|---|
| pdc-emastercard.xml | | | ✅† | ✅ | | | Full: e2e/specs/pdc/header-mastercard.spec.ts; minimal reused as prerequisite by the four diagnosis-specific specs below via `fillGenericPdcHeaderWithDiagnosis` |
| pdc-visit.xml | | | | | | | Not reachable — `PdcMastercardGatePage` lists no flowsheets at all (not linked from the live UI either, per the page object's own note) |
| pdc-cleft-lip-palate-emastercard.xml | | | ✅† | ✅ | | | e2e/specs/pdc-cleft-lip-palate |
| cleft-lip-palate-visit.xml | | | | ✅ | | | e2e/specs/pdc-cleft-lip-palate |
| pdc-developmental-delay-emastercard.xml | | | ✅† | ✅ | | | e2e/specs/pdc-developmental-delay |
| developmental-delay-visit.xml | | | | ✅ | | | e2e/specs/pdc-developmental-delay |
| pdc-other-diagnosis-emastercard.xml | | | ✅† | ✅ | | | e2e/specs/pdc-other-diagnosis |
| other-diagnosis-visit.xml | | | | ✅ | | | e2e/specs/pdc-other-diagnosis |
| pdc-trisomy-emastercard.xml | | | ✅† | ✅ | | | e2e/specs/pdc-trisomy |
| pdc-trisomy-21-visit.xml | | | | ✅ | | | e2e/specs/pdc-trisomy |
| pdc-complications.xml | | | | | | | not referenced anywhere in e2e |
| pdc-hb-and-other-laboratory-tests.xml | | | | | | | not referenced anywhere in e2e |
| pdc-hearing-test.xml | | | | | | | not referenced anywhere in e2e |
| pdc-hospitalization-history.xml | | | | | | | not referenced anywhere in e2e |
| pdc-radiology-screening.xml | | | | | | | not referenced anywhere in e2e |

### Patient registration / administration

| Htmlform | View Min | View Full | Enter Min | Enter Full | Edit Min | Edit Full | Notes |
|---|---|---|---|---|---|---|---|
| patient-administration.xml | | | | | | | not referenced anywhere in e2e (`patient-creation` drives core OpenMRS's own registration UI, not this htmlform) |

### Forms with no e2e coverage at all

Not referenced by any spec or page object, in any form (not even as an untested flowsheet-list entry):

`annual-bp-screening.xml`, `cd4-count.xml`, `cd4-logbook.xml`, `dna-pcr-testing.xml`, `eid-test-results.xml`, `hie-developmental-delay-lab-tests.xml`, `kaposis-sarcoma-emastercard.xml`, `ks-chemotherapy-form.xml`, `ks-evaluation-form.xml`, `trisomy-21-laboratory-tests.xml`, `tuberculosis-record.xml`, `vision-test.xml`.

`blank-header.xml` is an unpublished, empty placeholder (`formPublished="false"`, no fields) rather than a real user-facing form — excluded from the table entirely.

### Deprecated forms (excluded)

The following are named/prefixed `z-deprecated-*` and are superseded by the forms above — out of scope for this table: `z-deprecated-art-emastercard.xml`, `z-deprecated-art-visit.xml`, `z-deprecated-infant-diagnosis-emastercard.xml`, `z-deprecated-infant-diagnosis-visit.xml`, `z-deprecated-malawi-art-card-followup.xml`, `z-deprecated-malawi-art-card-intake.xml`, `z-deprecated-pre-art-emastercard.xml`, `z-deprecated-pre-art-mastercard-adult-followup.xml`, `z-deprecated-pre-art-mastercard-adult-intake.xml`, `z-deprecated-pre-art-mastercard-pediatric-followup.xml`, `z-deprecated-pre-art-mastercard-pediatric-intake.xml`, `z-deprecated-pre-art-visit.xml`, `z-deprecated-simplified-pre-art-pediatric-initiation.xml`, `z-deprecated-simplified-pre-art-pediatric-visit.xml`.

## Keeping this table current

When adding or changing e2e coverage, update the relevant row(s) above in the same PR. When adding a new condition/program, add a new section following the existing pattern (one row per htmlform the program's gate page can reach, whether or not it's tested yet).
