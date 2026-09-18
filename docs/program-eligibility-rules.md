# Program / mastercard eligibility rules

Extracted from `EMastercardAccessTag.java`, `QuickProgramsTag.java`, and
`malawiPatientDashboard.jsp`. Each row is the exact set of conditions
`EMastercardAccessTag` checks before rendering a mastercard's "Create new" link.

## HIV / ART

| Condition | Value | Source |
|---|---|---|
| Program | HIV PROGRAM | `program.hiv.uuid` = `66850b0a-977f-11e1-8993-905e29aff6c1` (`content/content.properties:23`) |
| Workflow | hivTreatmentStatus | `programWorkflow.hivTreatmentStatus.uuid` = `6686ffe6-977f-11e1-8993-905e29aff6c1` (`content/content.properties:56`) |
| Qualifying state | On antiretrovirals / On ARVs | state uuid `6687fa7c-977f-11e1-8993-905e29aff6c1`, concept `655a68b0-977f-11e1-8993-905e29aff6c1`, `Initial=true` (`content/configuration/backend_configuration/programworkflowstates/programWorkflowStates.csv:50`) |
| Identifier type | ARV Number | `66784d84-977f-11e1-8993-905e29aff6c1` (`content/configuration/backend_configuration/patientidentifiertypes/identifierTypes.csv:2`) |
| Identifier location | Must equal the program enrollment's location | `EMastercardAccessTag` / `Helper.hasIdentifierForEnrollmentLocation` |
| Encounter types unlocked | ART_INITIAL (header), ART_FOLLOWUP (visit) | header encounter type `664b8574-977f-11e1-8993-905e29aff6c1`; visit encounter type `664b8650-977f-11e1-8993-905e29aff6c1` |
| Forms | `art-emastercard.xml` (form uuid `a3cbdf5f-8c15-41b4-b97d-903ba3bd0532`), `art-visit.xml` (form uuid `64db7fd5-c28d-4b85-87c4-d01e92ae004a`) | `content/configuration/backend_configuration/htmlforms/` |
| Gate on the tag itself | `malawiPatientDashboard.jsp:122`: `<pihmalawi:eMastercardAccess patientId="${model.patientId}" form="ART eMastercard" initialEncounterType="ART_INITIAL" followupEncounterType="ART_FOLLOWUP" patientIdentifierType="ARV Number" programWorkflowStates="6687fa7c-977f-11e1-8993-905e29aff6c1"/>` | verbatim from the JSP |
| Additional gate logic | Patient must not be dead; the "Create new" link only renders while **no** `ART_INITIAL` encounter exists for the patient (`initials.size() == 0`) — if exactly one exists, an edit/view link renders instead; if more than one exists, the tag renders "Multiple forms found" | `EMastercardAccessTag.doStartTag` |

**Note on a historical inconsistency**: `programs.csv` marks the separate, older `ART PROGRAM`
(`program.art.uuid`) as retired (`Void/Retire=true`), and there is a *different*, also-still-active
`artTreatmentStatus` workflow attached to that retired program. The live ART mastercard gate does
**not** use that workflow — it uses `hivTreatmentStatus` under the active `HIV PROGRAM`, per the
JSP line above and confirmed directly against `programWorkflowStates.csv:50`. Do not confuse the
two when reading older code/forms (e.g. `z-deprecated-art-*.xml` forms belong to the old model).

## Mastercard launch URL pattern

Built by `EMastercardAccessTag.getNewMasterCardConfiguration`:

```
/openmrs/htmlformentryui/htmlform/flowsheet.page?
  headerForm=file:configuration/htmlforms/art-emastercard.xml
  &flowsheets=file:configuration/htmlforms/viral-load-tests.xml
  &flowsheets=file:configuration/htmlforms/art-follow-up-testing.xml
  &flowsheets=file:configuration/htmlforms/art-visit.xml
  &dashboardUrl=legacyui&customizationProvider=pihmalawi&customizationFragment=mastercard
  &patientId=<id>&encounterDate=YYYY-MM-DD
```

View mode appends `&viewOnly=true`. The pilot's "visit encounter" scenario targets the `art-visit`
tab specifically (one of three flowsheet tabs alongside `viral-load-tests` and
`art-follow-up-testing`).

## Quick-programs enrollment mechanics

Plain HTML form POST: `/openmrs/module/quickprograms/enrollInProgramWithStateOnDateAtLocation.form`
— hidden inputs `method=enroll`, `patientId`, `returnPage`, `programId`, `programworkflowStateId`,
a `dateEnrolled` text input, and a `locationId` `<select>`; submit button labeled "Enroll".

Whether `programworkflowStateId` is a hidden input or a `<select>` depends on which JSP tag
attribute is used, not on how many initial states a workflow has (`QuickProgramsTag.java`):
- `initialStateIds` (used by the HIV row in `malawiPatientDashboard.jsp:329`) → `enrollForm()`
  (~line 241) renders **one `<form>` per candidate initial state**, each with a **hidden**
  `programworkflowStateId` input set to that state's id. For HIV, `initialStateIds` includes both
  "On ARVs" (`6687fa7c-...`) and "Exposed Child" (`668847a2-...`), so two separate forms/buttons are
  rendered — never a `<select>`.
- `workflowIds` (used by other programs, e.g. Chronic Care / Mental Health rows) → a *different*
  method, `enrollProgramWorkflowForm()` (~line 215), renders a single form with a `<select>`
  populated from the workflow's initial states.

**Changing state on an already-enrolled patient is not a form POST** — it's a DWR/AJAX call
(`changeToState(patientProgramId, workflowId, stateId, dateField)` → page refresh triggered by
clicking a "Change"/"Complete" button). A UI-driven test must click the real button and wait for
the resulting reload; there is no plain-form path for this once a patient is already enrolled.

## Other programs

Not documented yet — out of scope for this pilot. Follow the same extraction method
(`EMastercardAccessTag` usages in `malawiPatientDashboard.jsp`, cross-referenced against
`programs.csv`/`programWorkflows.csv`/`programWorkflowStates.csv`) when a given program's tests
are built.
