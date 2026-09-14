# MLW-1846: Stop referencing metadata by database primary key

## Background

MLW-1839 made a from-scratch install of pihmalawi produce a database that is functionally
identical to production, using `openmrs-module-initializer` CSV/XML config. Metadata rows (concepts,
encounter types, forms, programs, etc.) get consistent **UUIDs** and names across any install, but
their **primary key IDs** (`concept_id`, `form_id`, `encounter_type_id`, ...) are assigned by
auto-increment at load time and will differ between a fresh install and production, and between two
fresh installs of the same config.

This ticket addresses code and configuration in this repo that references metadata **by primary key
ID** instead of by UUID, name, or a stable concept mapping code. Anything doing this will silently
break (resolve to the wrong metadata, or nothing) on any install whose IDs don't happen to match
whatever the code was written against.

## Scope

In scope, as one spec covering all categories, implemented as separate staged PRs:

1. Global properties (`gp.xml`) that store a raw metadata ID as their value
2. `htmlforms` content — both the Initializer-managed domain and the OMOD web-resource copy (see
   below) — hardcoded `conceptId`/`formId`/other FK-shaped attributes
3. Portlets/taglibs (`malawiPatientDashboard.jsp`, `EMastercardAccessTag`, `QuickProgramsTag`,
   `Helper`) and any other JSP/fragment code with hardcoded metadata IDs
4. Reports — SQL report descriptors and Java reporting definitions
5. Misc application code (scheduled tasks, etc.) found by the systematic sweep

Out of scope (already tracked in MLW-1839's own follow-up tickets, not re-litigated here):
production data cleanup (voided/duplicate concept rows, dead Form Builder forms, orphaned global
properties for uninstalled modules), the legacy Malawi geography tables
(`district`/`region`/`village`/`tribe`/`traditional_authority`), the address hierarchy "Region"
level gap, and upstream `openmrs-module-initializer`/`addresshierarchy` bugs.

## Findings so far (illustrative, not the full inventory)

These were confirmed by direct inspection (grep + reading the actual files, plus decompiling
`htmlformentry-api-7.2.1.jar` from the local `.m2` to confirm feasibility of one of the fixes) —
they establish that the problem is real and roughly where it lives, but Task 1 below is what
produces the complete, checked-in inventory.

- **`gp.xml`**: several *OpenMRS-core-owned* (or other module-owned) global properties store a raw
  concept ID as their only legal value: `concept.true` (2257), `concept.false` (2258),
  `concept.causeOfDeath` (5002), `concept.height` (5090), `concept.weight` (5089),
  `concept.medicalRecordObservations` (1238), `concept.none` (1107), `concept.otherNonCoded` (5622),
  `concept.patientDied` (1742), `concept.problemList` (1284), `concept.reasonExitedCare` (1811),
  `concept.reasonOrderStopped` (1812), `dashboard.header.showConcept` (5497). Core's
  `AdministrationService` does not accept a UUID for these — the fix has to happen by rewriting the
  ID at install time, not by changing the value format.
- **`content/configuration/backend_configuration/htmlforms/*.xml`** (the Initializer-managed
  domain, 112 files): 23 files hardcode `conceptId="1234"`-style raw concept IDs inside `<obs>`
  tags (e.g. `chronic-care-emastercard.xml` alone has ~35 occurrences of `conceptId="3683"` and
  others). Separately, 4 files (3 of them already flagged `z-deprecated-*` in MLW-1839) have
  `<htmlformflowsheet formId="61"/>`-style tags referencing another HtmlForm by raw `form_id` — that
  tag belongs to the external `htmlformentryui` module, not this repo.
- **`omod/src/main/webapp/resources/htmlforms/*.xml`** (95 files): a **second, separate copy** of
  htmlform content, packaged as an OMOD web resource rather than loaded into the DB via Initializer.
  It's actively read at runtime — `EMastercardAccessTag.getNewMasterCardConfiguration()` builds URLs
  like `pihmalawi:htmlforms/art_visit.xml`, which is this directory, not the Initializer one. Same
  filenames appear to exist in both locations under different naming conventions (`art_visit.xml`
  here vs. `art-visit.xml` in the Initializer domain), and `art_visit.xml` here has a `<macros>`
  block hardcoding `height=5090` / `weight=5089` — the same two concept IDs as the `gp.xml` findings
  above. Whether these two copies are meant to be identical, and whether both need the same fix
  applied, is an open question Task 1 needs to resolve (not assumed here).
- **`malawiPatientDashboard.jsp`**: mixes two styles for the same kind of card. Some rows already use
  `formName`/`initialEncounterTypeName`/UUID-valued `programWorkflowStates` variables (e.g. the Teen
  Club card). Others hardcode raw IDs (e.g. the ART card: `formId="64" initialEncounterTypeId="9"
  followupEncounterTypeId="10" patientIdentifierType="4" programWorkflowStates="7"`). **Every** row,
  old and new style alike, hardcodes `patientIdentifierType` as a raw integer — there is no
  name/UUID path for it anywhere in the code. Root cause: `Helper.hasIdentifierType()` and
  `Helper.hasIdentifierForEnrollmentLocation()` only accept `Integer`; `EMastercardAccessTag` has no
  UUID/name-resolving alternative to offer the JSP. `QuickProgramsTag`'s use of
  `Helper.getProgramWorkflowStatesFromCsvIds()` already supports either an int ID or a UUID per
  token, but the JSP still passes raw IDs in several places (e.g. HIV Program's
  `initialStateIds="120,7"` / `terminalStateIds="2,12,119"`) instead of the UUID style used
  elsewhere in the same file.
- **Reports**: `art_register.sql` already does this correctly — `select program_id into @hivProgram
  from program where name = 'HIV PROGRAM'`, lookups by `name`/`uuid` throughout, no hardcoded IDs.
  This is the template for "correct" and should be used as the pattern for anything found to be
  wrong elsewhere in reports. The other 3 SQL descriptors have not been checked yet. On the Java
  side, a targeted sweep of the 124-file `reporting` package for this specific shape (`getConceptId()
  == <literal>`-style comparisons) found exactly 3 offenders, all in
  `reporting/definition/data/converter/`: `ObsValueBooleanYesNoConverter` (`2257`/`2258` for
  Yes/No), `PregnantLactatingConverter` (`1066`/`1755`/`5632` for No/Pregnant/Lactating), and
  `TbStatusConverter` (`1067`/`1714`/`1432` for Never/Last/Curr) — each does
  `o.getValueCoded().getConceptId() == <int literal>` instead of comparing against a concept
  resolved by UUID/mapping (`TbStatusConverter` already imports `HivMetadata` in this same file
  without using it for this purpose, suggesting the UUID-based metadata class was available and
  just wasn't used here). The full audit (Task 1) still needs to sweep the rest of the `reporting`
  package for other shapes of the same problem (e.g. hardcoded IDs passed into cohort/data
  definitions rather than compared against inline).
- **`MigrateViralLoadAndEIDTestResultsTask`**: hardcodes `Context.getPersonService().getPerson(16576)`
  ("Unknown" person, comment says "same on Neno and Lisungwi" — i.e. relied on two specific existing
  production databases happening to share this ID, which a fresh install has no reason to) and
  `Context.getEncounterService().getEncounterRole(1)`. This class is already flagged in MLW-1839's
  classification doc as dead/unwired code pending a separate repo-owner decision — included here for
  completeness of the inventory, not to force that decision.
- **Confirmed clean**: outside test code, no application Java calls `getConcept(int)` /
  `getEncounterType(int)` / `getProgram(int)` / `getPersonAttributeType(int)` / `getForm(int)` /
  `getPatientIdentifierType(int)` with an integer literal anywhere in `api` or `omod`. The problem is
  concentrated in JSP/taglib parameters, htmlform XML/macro content, and a handful of GP values and
  task classes — not spread through the core service layer.

## Task 1: Systematic audit (produces the full inventory)

Spot checks undercounted this on the first pass (the `MigrateViralLoadAndEIDTestResultsTask` find,
via `getPerson`/`getEncounterRole`, was missed by the initial grep set). The audit needs to cover:

- Every `<Service>.get<Metadata>(<int literal>)` call in `api` and `omod` main source (not test), for
  every metadata/reference-data domain: Concept, EncounterType, EncounterRole, Form, Program,
  ProgramWorkflow/ProgramWorkflowState, PatientIdentifierType, PersonAttributeType, Location,
  RelationshipType, VisitType, OrderType, Provider, and any hardcoded "known" Person/Provider IDs
  used as placeholders (like the "Unknown" person above).
- Every FK-shaped numeric attribute (`conceptId`, `formId`, `encounterTypeId`, `programWorkflowId`,
  `locationId`, `providerId`, etc.) in both htmlforms locations — first resolving what the
  relationship between the two directories actually is and whether both are live.
- Every numeric-only value in `gp.xml`, cross-referenced against which module owns each property, to
  know whether a UUID-based fix is even legal for that GP or whether it needs the fixup-loader
  treatment.
- Every JSP/fragment under `omod/src/main/webapp` for taglib attributes carrying a metadata
  identifier (not just `malawiPatientDashboard.jsp`).
- The remaining 3 report SQL files and the rest of the 124-file Java `reporting` package for the
  `getConceptId() == <literal>` shape (confirmed present in 3 `DataConverter` classes so far — see
  above) and any other shape of the same problem (e.g. hardcoded IDs passed into cohort/data
  definitions), checked against the `art_register.sql` template.

Output: a checked-in table/list in this repo (exact location TBD in the implementation plan) of
every instance found, categorized by area, used to drive the staged PRs below.

## Remediation patterns

- **Core/module-owned integer-only GPs**: new custom Initializer-style domain, modeled directly on
  the existing `org.openmrs.module.pihmalawi.initializer.providerroles` package (`ProviderRolesLoader`
  extends `BaseCsvLoader`, registered as a `@Component`, picked up automatically by Initializer's
  loading engine). A CSV maps GP name → concept UUID (or mapping code); a loader resolves the concept
  and writes the resulting numeric ID via `AdministrationService`. Custom domains load after all of
  Initializer's built-in domains (including `concepts`), so the concepts it needs are guaranteed to
  already exist.
- **htmlforms `conceptId`**: convert to UUID, or to a `source:code` concept mapping where a stable
  one already exists (preferred — survives concept edits, not just reinstalls). Confirmed safe:
  decompiled `HtmlFormEntryUtil.getConcept(String)` from `htmlformentry-api-7.2.1.jar` — it tries, in
  order, integer ID → `source:code` mapping → UUID → static-constant-then-recurse, so a UUID or
  mapping value is fully supported today.
- **`<htmlformflowsheet formId="...">`**: check whether the `htmlformentryui` tag handler (external
  module, not this repo) accepts a UUID-based alternative before touching these; low volume, and 3 of
  4 affected files are already dead per MLW-1839.
- **Portlets/taglibs**: add a UUID/name-resolving overload for `patientIdentifierType` (mirroring the
  `initialEncounterTypeName` / `getEncounterType(String)` pattern already in `EMastercardAccessTag`),
  then convert every JSP usage off raw ints, reconciling the old-style mastercard rows (ART, Pre-ART,
  Exposed Child, old Chronic Care card, HIV Program quick-programs states) to the name/UUID style the
  newer rows in the same file already use.
- **Reports**: bring any offending SQL/Java definitions in line with the `art_register.sql`
  name/uuid-lookup template. For the 3 known converter offenders specifically, the fix is to compare
  against a `Concept` resolved through the existing `metadata` classes rather than a raw int:
  `CommonMetadata` already has `getYesConcept()` (`YES_CONCEPT = "Yes"`, name-based lookup) — usable
  directly by `ObsValueBooleanYesNoConverter` for the Yes case (its No case, and both converters'
  other answer concepts — No/Pregnant/Lactating, Never/Last/Curr — aren't question concepts like the
  existing `TB_STATUS`/`PREGNANT_OR_LACTATING_CONCEPT` constants, they're the *answer* concepts, so
  new named constants for each individual answer will likely need to be added to `CommonMetadata`
  alongside the existing ones, following the same name-based-lookup convention). `TbStatusConverter`
  already imports `HivMetadata` without using it here, suggesting the intent to use a metadata class
  existed but wasn't finished.
- **`MigrateViralLoadAndEIDTestResultsTask`**: included in the inventory; the spec calls out the
  hardcoded-ID pattern but does not itself decide whether to fix vs. leave this dead code alone —
  that's the pre-existing MLW-1839 repo-owner decision to make, separately.

## Validation

Reuse MLW-1839's own validation method: spin up a fresh install via the existing OpenMRS SDK deploy
path (`malawiDeploy.sh`), and confirm the affected forms/portlets/reports resolve correctly. Ideally
prove independence from ID assignment by comparing two independently fresh-installed instances (or a
fresh install against a real production copy, the way MLW-1839 used a downloaded production dump) —
i.e. show the fix works regardless of *which* IDs a given install happened to land on, not just that
it works once.

## Work breakdown (staged PRs)

1. Systematic audit (Task 1 above) — produces the full inventory, no functional changes.
2. Global properties fixup (new Initializer-style loader + CSV).
3. htmlforms `conceptId`/macro conversion (both directories, once their relationship is resolved).
4. Portlet/taglib Java + JSP fixes (`Helper`, `EMastercardAccessTag`, `QuickProgramsTag`,
   `malawiPatientDashboard.jsp`).
5. Reports audit and fixes.
6. `MigrateViralLoadAndEIDTestResultsTask` and any other misc findings from the sweep.

Each PR gets its own review and can be reverted independently.
