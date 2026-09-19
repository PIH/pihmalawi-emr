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

## Chronic Care Program

| Condition | Value | Source |
|---|---|---|
| Program | Chronic Care Program | `program.chronicCare.uuid` = `6685164a-977f-11e1-8993-905e29aff6c1` (`content/configuration/backend_configuration/programs/programs.csv`) |
| Identifier type | Chronic Care Number | `11a76c3e-1db8-4d16-9252-9a18b5ed1843` (`content/configuration/backend_configuration/patientidentifiertypes/identifierTypes.csv`) |
| Identifier location | Must equal the program enrollment's location | `EMastercardAccessTag` / `Helper.hasIdentifierForEnrollmentLocation` |
| Additional gate logic | Patient must not be dead; the "Create new" link only renders while **no** initial encounter exists for the respective condition (`initials.size() == 0`) — if exactly one exists, an edit/view link renders instead; if more than one exists, the tag renders "Multiple forms found" | `EMastercardAccessTag.doStartTag` |

### Hypertension and Diabetes

| Condition | Value | Source |
|---|---|---|
| Workflow | diabetesHypertensionTreatment | `programWorkflow.diabetesHypertensionTreatment.uuid` = `9b571347-8dc3-40fe-9994-e82071fa8290` (`content/configuration/backend_configuration/programworkflows/programWorkflows.csv`) |
| Qualifying states | On Treatment | state uuid `d5d2d3bf-9cca-4a1f-9c69-f7713ed8fff4`, `Initial=true`; in Advance Care state uuid `00be3c91-ecd2-482e-8c7a-7bdd49c997e7`, `Initial=true` (`content/configuration/backend_configuration/programworkflowstates/programWorkflowStates.csv`) |
| Encounter types unlocked | DIABETES HYPERTENSION INITIAL VISIT (header), DIABETES HYPERTENSION FOLLOWUP (visit) | header encounter type `664b9442-977f-11e1-8993-905e29aff6c1`; visit encounter type `66079de4-a8df-11e5-bf7f-feff819cdc9f` |
| Forms | `hypertension-and-diabetes-emastercard.xml` (form uuid `8cfee016-cacb-11e5-9956-625662870761`), `hypertension-and-diabetes-visit.xml` (form uuid `8cfedcc4-cacb-11e5-9956-625662870761`) | `content/configuration/backend_configuration/htmlforms/` |
| Gate on the tag itself | `malawiPatientDashboard.jsp:176`: `<pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Hypertension and Diabetes eMastercard" initialEncounterType="DIABETES HYPERTENSION INITIAL VISIT" followupEncounterType="DIABETES HYPERTENSION FOLLOWUP" programWorkflowStates="${DIABETESHYPERTENSIONActiveStates}" patientIdentifierType="Chronic Care Number"/>` | verbatim from the JSP |

### Chronic Lung Disease

| Condition | Value | Source |
|---|---|---|
| Workflow | asthmaTreatment | `programWorkflow.asthmaTreatment.uuid` = `319838b7-23cb-4e04-9b36-ad1e83cbeaaf` (`content/configuration/backend_configuration/programworkflows/programWorkflows.csv`) |
| Qualifying states | On Treatment | state uuid `7f2fc125-f9bc-4195-b879-3060a386468a`, `Initial=true`; in Advance Care state uuid `8f395143-5f5a-4171-8e10-aef931e16bcf`, `Initial=true` (`content/configuration/backend_configuration/programworkflowstates/programWorkflowStates.csv`) |
| Encounter types unlocked | ASTHMA_INITIAL (header), ASTHMA_FOLLOWUP (visit) | header encounter type `a95dc43f-925c-11e5-a1de-e82aea237783`; visit encounter type `f4596df5-925c-11e5-a1de-e82aea237783` |
| Forms | `chronic-lung-disease-emastercard.xml` (form uuid `08f273c2-8c38-11e5-80a3-c0430f805837`), `chronic-lung-disease-visit.xml` (form uuid `fcf29c1a-8c45-11e5-80a3-c0430f805837`) | `content/configuration/backend_configuration/htmlforms/` |
| Gate on the tag itself | `malawiPatientDashboard.jsp:180`: `<pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Chronic Lung Disease eMastercard" initialEncounterType="ASTHMA_INITIAL" followupEncounterType="ASTHMA_FOLLOWUP" programWorkflowStates="${ASTHMASTATEActiveStates}" patientIdentifierType="Chronic Care Number"/>` | verbatim from the JSP |

### Cardiac and Vascular Disease

| Condition | Value | Source |
|---|---|---|
| Workflow | chfTreatment | `programWorkflow.chfTreatment.uuid` = `cc76c7c2-8760-4ff6-8ed7-617a7378915b` (`content/configuration/backend_configuration/programworkflows/programWorkflows.csv`) |
| Qualifying states | On Treatment | state uuid `3a9724e5-fc65-4a48-8d0b-2b1265106552`, `Initial=true`; in Advance Care state uuid `b002c86b-e22c-484a-a9a5-a12543b4a1b1`, `Initial=true` (`content/configuration/backend_configuration/programworkflowstates/programWorkflowStates.csv`) |
| Encounter types unlocked | CHF_INITIAL (header), CHF_FOLLOWUP (visit) | header encounter type `cb337ef3-f5cb-4e10-af8d-8d717a3a139f`; visit encounter type `1f6ad830-6e94-4819-b1fd-8c4146e77280` |
| Forms | `cardiac-and-vascular-disease-emastercard.xml` (form uuid `40c59f30-794e-11e8-adc0-fa7ae01bbebc`), `cardiac-and-vascular-disease-visit.xml` (form uuid `4a5c17b8-794e-11e8-adc0-fa7ae01bbebc`) | `content/configuration/backend_configuration/htmlforms/` |
| Gate on the tag itself | `malawiPatientDashboard.jsp:184`: `<pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Cardiac and Vascular Disease eMastercard" initialEncounterType="CHF_INITIAL" followupEncounterType="CHF_FOLLOWUP" programWorkflowStates="${CHFActiveStates}" patientIdentifierType="Chronic Care Number"/>` | verbatim from the JSP |

### Chronic Kidney Disease

| Condition | Value | Source |
|---|---|---|
| Workflow | ckdTreatment | `programWorkflow.ckdTreatment.uuid` = `4eda02b2-48ca-47dc-9166-483a6499bcbd` (`content/configuration/backend_configuration/programworkflows/programWorkflows.csv`) |
| Qualifying states | On Treatment | state uuid `908552d7-2bb3-4e4f-9ba1-ec22c2c3f2b6`, `Initial=true`; in Advance Care state uuid `c5ddd2d0-33f3-4d1e-8f7d-f58beec5ece9`, `Initial=true` (`content/configuration/backend_configuration/programworkflowstates/programWorkflowStates.csv`) |
| Encounter types unlocked | CKD_INITIAL (header), CKD_FOLLOWUP (visit) | header encounter type `0a3621e2-974e-11e8-9eb6-529269fb1459`; visit encounter type `1ebe2272-974e-11e8-9eb6-529269fb1459` |
| Forms | `chronic-kidney-disease-emastercard.xml` (form uuid `ec0a340c-9751-11e8-9eb6-529269fb1459`), `chronic-kidney-disease-visit.xml` (form uuid `ec0a1fb2-9751-11e8-9eb6-529269fb1459`) | `content/configuration/backend_configuration/htmlforms/` |
| Gate on the tag itself | `malawiPatientDashboard.jsp:188`: `<pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Chronic Kidney Disease eMastercard" initialEncounterType="CKD_INITIAL" followupEncounterType="CKD_FOLLOWUP" programWorkflowStates="${CKDActiveStates}" patientIdentifierType="Chronic Care Number"/>` | verbatim from the JSP |

### NCD Other

| Condition | Value | Source |
|---|---|---|
| Workflow | ncdOtherTreatment | `programWorkflow.ncdOtherTreatment.uuid` = `62481c50-155c-45be-b4e9-39a38a9cbfda` (`content/configuration/backend_configuration/programworkflows/programWorkflows.csv`) |
| Qualifying states | On Treatment | state uuid `cfec993e-ae2f-4f16-bea5-4bd26752bc89`, `Initial=true`; in Advance Care state uuid `05865dda-5934-4fcd-93eb-3d149edbdba0`, `Initial=true` (`content/configuration/backend_configuration/programworkflowstates/programWorkflowStates.csv`) |
| Encounter types unlocked | NCD_OTHER_INITIAL (header), NCD_OTHER_FOLLOWUP (visit) | header encounter type `b562295c-e335-11e8-9f32-f2801f1b9fd1`; visit encounter type `b5622bf0-e335-11e8-9f32-f2801f1b9fd1` |
| Forms | `ncd-other-emastercard.xml` (form uuid `766c92e8-e35b-11e8-9f32-f2801f1b9fd1`), `ncd-other-visit.xml` (form uuid `766c8c30-e35b-11e8-9f32-f2801f1b9fd1`) | `content/configuration/backend_configuration/htmlforms/` |
| Gate on the tag itself | `malawiPatientDashboard.jsp:198`: `<pihmalawi:eMastercardAccess patientId="${model.patientId}" form="NCD Other eMastercard" initialEncounterType="NCD_OTHER_INITIAL" followupEncounterType="NCD_OTHER_FOLLOWUP" programWorkflowStates="${NCDOTHERActiveStates}" patientIdentifierType="Chronic Care Number"/>` | verbatim from the JSP |

### Sickle Cell Disease

| Condition | Value | Source |
|---|---|---|
| Workflow | sickleCellDiseaseTreatment | `programWorkflow.sickleCellDiseaseTreatment.uuid` = `1A6C2438-99D7-41FF-8EB4-516DFCD1D199` (`content/content.properties:77`, resolved into `content/configuration/backend_configuration/programworkflows/programWorkflows.csv`) |
| Qualifying states | On Treatment | state uuid `C2B106C6-18B6-4342-B2E7-FAA0540E6DC2`, `Initial=true`; in Advance Care state uuid `03A8A8DF-E95E-4875-B730-2D3CD86502EF`, `Initial=true` (`content/configuration/backend_configuration/programworkflowstates/programWorkflowStates.csv`) |
| Encounter types unlocked | SICKLE_CELL_DISEASE_INITIAL (header), SICKLE_CELL_DISEASE_FOLLOWUP (visit) | header encounter type `56C2D952-DB11-4B47-B248-79C1B2A88E88`; visit encounter type `D4073EB7-60B1-4586-B062-13FCE4CBC9E8` (`content/configuration/backend_configuration/encountertypes/encounterTypes.csv`) |
| Forms | `sickle-cell-disease-emastercard.xml` (form uuid `7AFEC71B-15D3-4E2D-8C42-D8CB2B75BC54`), `sickle-cell-disease-visit.xml` (form uuid `E68275D4-C300-46B0-8754-4C2CF2598B78`) | `content/configuration/backend_configuration/htmlforms/` |
| Gate on the tag itself | `malawiPatientDashboard.jsp:190-194`: `<td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Sickle Cell Disease eMastercard" initialEncounterType="SICKLE_CELL_DISEASE_INITIAL" followupEncounterType="SICKLE_CELL_DISEASE_FOLLOWUP" programWorkflowStates="${SCDActiveStates}" patientIdentifierType="Chronic Care Number"/></td>` | verbatim from the JSP |

**Correction to an earlier assumption in this doc** (this pilot re-verified live and found a prior note here was wrong): line 190 immediately above the `<tr>` is only a ONE-LINE, self-closing HTML comment — `<!-- uncomment this when all related Sickle cell disease forms are complete MLW-1568 -->` — it does **not** open a comment block that wraps the `<tr>` on lines 191-194, which is live, unconditional markup (no `<c:if>`/`<c:when>` around it either). Confirmed live: navigating to `patientDashboard.form` for a real `eligibleSickleCellDiseasePatient` fixture patient shows the "Create new Sickle Cell Disease eMastercard" link is present and visible (`count: 1`), with an `onclick` that resolves to exactly the same `headerForm`/`flowsheets` list this doc's own "Mastercard launch URL pattern" section below documents. So, unlike what an earlier pass through this doc assumed, Sickle Cell Disease's gate behaves exactly like every other condition in this table — MLW-1568's own "uncomment when complete" comment is now stale text next to already-live code, worth a trivial doc/comment cleanup in the JSP itself (not fixed here, out of this pilot's scope) but not a functional gap.

**Note on the generic Chronic Care eMastercard**: The `CHRONIC_CARE_INITIAL`/`CHRONIC_CARE_FOLLOWUP` workflow row (workflow `chronicCareTreatmentStatus` = `6687086a-977f-11e1-8993-905e29aff6c1`, states `66882650-977f-11e1-8993-905e29aff6c1`/`7c4d2e56-c8c2-11e8-9bc6-0242ac110001`) is a separate, generic mastercard not covered by this doc's condition-specific tables.

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

### NCD Other

Confirmed the same way as the HIV/ART pattern above — live-rendering `patientDashboard.form` for
an eligible fixture patient (`eligibleNcdOtherPatient`) and dumping the "Create new NCD Other
eMastercard" link's `onclick` (it has no `href` attribute either, same as ART's link):

```
/openmrs/htmlformentryui/htmlform/flowsheet.page?
  headerForm=file:configuration/htmlforms/ncd-other-emastercard.xml
  &flowsheets=file:configuration/htmlforms/ncd-other-quarterly-laboratory-tests.xml
  &flowsheets=file:configuration/htmlforms/ncd-other-annual-laboratory-tests.xml
  &flowsheets=file:configuration/htmlforms/ncd-other-hospitalization-history.xml
  &flowsheets=file:configuration/htmlforms/ncd-other-visit.xml
  &dashboardUrl=legacyui&customizationProvider=pihmalawi&customizationFragment=mastercard
  &patientId=<id>&encounterDate=YYYY-MM-DD
```

A completely different `headerForm` and flowsheet list than ART's — confirmed NOT reusable from
`EMastercardAccessTag.getNewMasterCardConfiguration`'s generic shape alone, since each program's
`malawiPatientDashboard.jsp` row supplies its own form name. `patientId` accepts a UUID
transparently, same as ART's (Task 9's resolution in `e2e/pages/mastercard-page.ts` applies here
too — see `e2e/pages/ncd-other-mastercard-page.ts`'s `NcdOtherMastercardGatePage.buildCreateUrl`).

### Hypertension and Diabetes

Confirmed the same way as ART/NCD Other above — live-rendering `patientDashboard.form` for an
eligible fixture patient (`eligibleHypertensionAndDiabetesPatient`) and dumping the "Create new
Hypertension and Diabetes eMastercard" link's `onclick`:

```
/openmrs/htmlformentryui/htmlform/flowsheet.page?
  headerForm=file:configuration/htmlforms/hypertension-and-diabetes-emastercard.xml
  &flowsheets=file:configuration/htmlforms/hypertension-and-diabetes-quarterly-laboratory-tests.xml
  &flowsheets=file:configuration/htmlforms/hypertension-and-diabetes-annual-laboratory-tests.xml
  &flowsheets=file:configuration/htmlforms/hypertension-and-diabetes-hospitalization-history.xml
  &flowsheets=file:configuration/htmlforms/hypertension-and-diabetes-visit.xml
  &dashboardUrl=legacyui&customizationProvider=pihmalawi&customizationFragment=mastercard
  &patientId=<id>&encounterDate=YYYY-MM-DD
```

Matches `EMastercardAccessTag.getNewMasterCardConfiguration`'s `flowsheetForms` map for
`ENCOUNTERTYPE_HTN_DIABETES_INITIAL_NAME` exactly (own Java source, not just the JSP tag). This
pilot's own e2e specs are scoped to the emastercard + `-visit.xml` flowsheet only (matching the NCD
Other pilot's scope decision) — see `e2e/pages/hypertension-and-diabetes-mastercard-page.ts`'s
`HypertensionAndDiabetesMastercardGatePage.buildCreateUrl`.

### Chronic Lung Disease

Confirmed against `EMastercardAccessTag.getNewMasterCardConfiguration`'s `flowsheetForms` map
(keyed by `PihMalawiConfigConstants.ENCOUNTERTYPE_ASTHMA_INITIAL_NAME`), not live-rendered:

```
/openmrs/htmlformentryui/htmlform/flowsheet.page?
  headerForm=file:configuration/htmlforms/chronic-lung-disease-emastercard.xml
  &flowsheets=file:configuration/htmlforms/chronic-lung-disease-visit.xml
  &flowsheets=file:configuration/htmlforms/chronic-lung-disease-peak-flow.xml
  &flowsheets=file:configuration/htmlforms/chronic-lung-disease-hospitalization.xml
  &dashboardUrl=legacyui&customizationProvider=pihmalawi&customizationFragment=mastercard
  &patientId=<id>&encounterDate=YYYY-MM-DD
```

Note the `chronic-lung-disease-visit` flowsheet tab is listed *first* here (unlike NCD Other/ART
where the "visit" form is listed last) — order matters only for which tab is initially selected in
the UI, not for form availability.

### Cardiac and Vascular Disease

Confirmed the same way as the NCD Other pattern above — live-rendering `patientDashboard.form` for
an eligible fixture patient (`eligibleCardiacAndVascularDiseasePatient`) and dumping the "Create new
Cardiac and Vascular Disease eMastercard" link's `onclick` (no `href` attribute, same as every other
program's link):

```
/openmrs/htmlformentryui/htmlform/flowsheet.page?
  headerForm=file:configuration/htmlforms/cardiac-and-vascular-disease-emastercard.xml
  &flowsheets=file:configuration/htmlforms/echocardiogram-ultrasound-imaging-results.xml
  &flowsheets=file:configuration/htmlforms/electrocardiographic-ekg-imaging-results.xml
  &flowsheets=file:configuration/htmlforms/chest-x-ray-cxr-imaging-results.xml
  &flowsheets=file:configuration/htmlforms/cardiac-and-vascular-disease-quarterly-laboratory-tests.xml
  &flowsheets=file:configuration/htmlforms/cardiac-and-vascular-disease-frequency-per-protocol-laboratory-tests.xml
  &flowsheets=file:configuration/htmlforms/cardiac-and-vascular-disease-hospitalization-history.xml
  &flowsheets=file:configuration/htmlforms/cardiac-and-vascular-disease-visit.xml
  &dashboardUrl=legacyui&customizationProvider=pihmalawi&customizationFragment=mastercard
  &patientId=<id>&encounterDate=YYYY-MM-DD
```

Note this flowsheet list includes THREE imaging-result forms
(`echocardiogram-ultrasound-imaging-results.xml`,
`electrocardiographic-ekg-imaging-results.xml`, `chest-x-ray-cxr-imaging-results.xml`) not named
after the condition at all, plus the condition's own quarterly/frequency-per-protocol lab and
hospitalization-history forms — all out of this pilot's scope (see this repo's e2e task scope), but
still required in the URL's flowsheet list for `flowsheet.page` to render the "Enter New Cardiac and
Vascular Disease Visit" action link correctly (same requirement NCD Other's own note already
established).

### Chronic Kidney Disease

Confirmed against `EMastercardAccessTag.getNewMasterCardConfiguration`'s `flowsheetForms` map
(keyed by `PihMalawiConfigConstants.ENCOUNTERTYPE_CKD_INITIAL_NAME`), not live-rendered:

```
/openmrs/htmlformentryui/htmlform/flowsheet.page?
  headerForm=file:configuration/htmlforms/chronic-kidney-disease-emastercard.xml
  &flowsheets=file:configuration/htmlforms/chronic-kidney-disease-quarterly-laboratory-tests.xml
  &flowsheets=file:configuration/htmlforms/chronic-kidney-disease-annual-laboratory-tests.xml
  &flowsheets=file:configuration/htmlforms/chronic-kidney-disease-imaging-results.xml
  &flowsheets=file:configuration/htmlforms/chronic-kidney-disease-hospitalization-history.xml
  &flowsheets=file:configuration/htmlforms/chronic-kidney-disease-visit.xml
  &dashboardUrl=legacyui&customizationProvider=pihmalawi&customizationFragment=mastercard
  &patientId=<id>&encounterDate=YYYY-MM-DD
```

Note the `chronic-kidney-disease-visit` flowsheet tab is listed *last* here, after the two
laboratory-test forms, the imaging-results form, and the hospitalization-history form (unlike
ART/NCD Other where `-visit` is also last, but with a differently-ordered/shorter sibling list —
order is whatever `EMastercardAccessTag`'s `flowsheetForms` map lists for
`ENCOUNTERTYPE_CKD_INITIAL_NAME`, not alphabetical or otherwise inferable).

### Sickle Cell Disease

Confirmed the same way as every other condition in this doc (see this doc's own correction above —
the dashboard link is live, not commented out) — live-rendering `patientDashboard.form` for an
eligible fixture patient (`eligibleSickleCellDiseasePatient`) and dumping the "Create new Sickle
Cell Disease eMastercard" link's `onclick` (it has no `href` attribute either, same as every other
condition's own link):

```
window.location.href='/openmrs/htmlformentryui/htmlform/flowsheet.page?
  headerForm=file:configuration/htmlforms/sickle-cell-disease-emastercard.xml
  &flowsheets=file:configuration/htmlforms/sickle-cell-disease-quarterly-screening.xml
  &flowsheets=file:configuration/htmlforms/sickle-cell-disease-annual-monitoring.xml
  &flowsheets=file:configuration/htmlforms/sickle-cell-disease-hospitalization-history.xml
  &flowsheets=file:configuration/htmlforms/sickle-cell-disease-visit.xml
  &dashboardUrl=legacyui&customizationProvider=pihmalawi&customizationFragment=mastercard
  &patientId=<legacy integer id>&encounterDate=' + ...'
```

`sickle-cell-disease-hospitalization-history.xml`, `sickle-cell-disease-annual-monitoring.xml`, and
`sickle-cell-disease-quarterly-screening.xml` are all real flowsheets on this condition's own
mastercard, confirmed present in the rendered `onclick` above — but, per this pilot's explicit
scope, none of the three are exercised beyond appearing as unclicked "Enter New ..." links; only
the header (emastercard) and visit forms are filled/saved by this pilot's specs. The normalized
form below (used by `SickleCellDiseaseMastercardGatePage.buildCreateUrl`) matches the live
`onclick` exactly:

```
/openmrs/htmlformentryui/htmlform/flowsheet.page?
  headerForm=file:configuration/htmlforms/sickle-cell-disease-emastercard.xml
  &flowsheets=file:configuration/htmlforms/sickle-cell-disease-quarterly-screening.xml
  &flowsheets=file:configuration/htmlforms/sickle-cell-disease-annual-monitoring.xml
  &flowsheets=file:configuration/htmlforms/sickle-cell-disease-hospitalization-history.xml
  &flowsheets=file:configuration/htmlforms/sickle-cell-disease-visit.xml
  &dashboardUrl=legacyui&customizationProvider=pihmalawi&customizationFragment=mastercard
  &patientId=<id>&encounterDate=YYYY-MM-DD
```

`patientId` accepts a UUID transparently, same as every other condition's (Task 9's resolution in
`e2e/pages/mastercard-page.ts` applies here too — see
`e2e/pages/sickle-cell-disease-mastercard-page.ts`'s
`SickleCellDiseaseMastercardGatePage.buildCreateUrl`).

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
are built. (Mental Health, TB, and other programs in `malawiPatientDashboard.jsp` remain to be documented.)
