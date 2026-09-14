# MLW-1846 Phase 1: Portlets/Taglibs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `malawiPatientDashboard.jsp` and its supporting taglib Java code from referencing metadata (patient identifier types, forms, encounter types, program workflow states) by raw database primary key, so the dashboard portlet works correctly on any install regardless of what IDs Initializer happened to assign.

**Architecture:** `Helper.hasIdentifierType()`/`hasIdentifierForEnrollmentLocation()` change from taking a raw `Integer` identifier-type ID to taking an already-resolved `PatientIdentifierType` object — mirroring how `Form`/`EncounterType` are already resolved once in each tag's `doStartTag()` before use. `EMastercardAccessTag` and `ERecordAccessTag` gain a new `patientIdentifierTypeName` attribute (resolved by name first, falling back to the existing numeric attribute), matching the `formName`/`initialEncounterTypeName` pattern already established in the same classes. The JSP is then converted off every raw numeric attribute to the name/UUID equivalents.

**Tech Stack:** Java (OpenMRS module, JSP custom tags), JSP, Maven.

**Spec:** `docs/superpowers/specs/2026-09-14-mlw1846-metadata-pk-references-design.md` (see "Phasing" and "Non-concept ID mapping, verified" sections)

## Global Constraints

- This is Phase 1 only: htmlforms `conceptId`/macro conversion, `gp.xml`'s core-owned `concept.*` GPs, and the 3 concept-based `DataConverter` classes are explicitly **out of scope** for this plan (Phase 2, depends on a separate concept-mapping effort).
- The `omod` module has **no existing unit test infrastructure** (no `omod/src/test` directory at all, unlike `api` which has `BaseMalawiTest`/`StandaloneContextSensitiveTest`). Do not introduce a new test framework for this change alone — that would be a disproportionate, unrelated undertaking for one small fix in a codebase where every other taglib class is equally untested. Each Java task's "test" step is a compile check; Task 4 is the real functional verification, done by running the actual application per this project's standing instruction to verify UI changes in a browser rather than only compiling.
- Every ID→name/UUID mapping used below was verified against a policy-compliant, metadata-only production extract (patient/clinical/employee tables excluded) — not guessed. See the spec's mapping table for the full list and provenance.
- Do not touch `MigrateViralLoadAndEIDTestResultsTask.java` in this plan — it's already-known dead/unwired code with its own separate hardcoded-ID pattern (`getPerson(16576)`, `getEncounterRole(1)`), tracked in the spec as inventory only, not fixed here (that's a separate repo-owner decision from MLW-1839).

---

### Task 1: Change `Helper`'s identifier-type methods to take a resolved `PatientIdentifierType`

**Files:**
- Modify: `omod/src/main/java/org/openmrs/module/pihmalawi/web/taglibs/Helper.java`

**Interfaces:**
- Produces: `Helper.hasIdentifierType(Patient p, PatientIdentifierType patientIdentifierType)` (signature changed from `Integer` to `PatientIdentifierType`); `Helper.hasIdentifierForEnrollmentLocation(Patient p, PatientIdentifierType identifierType, List<ProgramWorkflow> workflows)` (same change); `Helper.getPatientIdentifierType(String name, Integer id)` (new) — tries `Context.getPatientService().getPatientIdentifierTypeByName(name)` first if `name` is non-blank, falls back to `Context.getPatientService().getPatientIdentifierType(id)` if that returns null or `name` was blank, returns null if neither resolves.

- [ ] **Step 1: Add the `import org.openmrs.PatientIdentifierType;` import**

`PatientIdentifierType` is already imported in this file (line 12: `import org.openmrs.PatientIdentifierType;`) — confirm it's there; no change needed if so. (It is already imported as of the current file — this step is a no-op check, not an edit.)

- [ ] **Step 2: Change `hasIdentifierType` to accept a resolved `PatientIdentifierType`**

Replace:
```java
	/**
	 * @return true if the passed patient has an identifier with the passed type id, false otherwise
	 */
	public static boolean hasIdentifierType(Patient p, Integer patientIdentifierType) {
		if (patientIdentifierType == null) {
			// no patientIdentifierType specified, simply accept
			return true;
		}
		PatientIdentifierType pit = Context.getPatientService().getPatientIdentifierType(patientIdentifierType);
		return !p.getPatientIdentifiers(pit).isEmpty();
	}
```
With:
```java
	/**
	 * @return true if the passed patient has an identifier of the passed type, false otherwise
	 */
	public static boolean hasIdentifierType(Patient p, PatientIdentifierType patientIdentifierType) {
		if (patientIdentifierType == null) {
			// no patientIdentifierType specified, simply accept
			return true;
		}
		return !p.getPatientIdentifiers(patientIdentifierType).isEmpty();
	}
```

- [ ] **Step 3: Change `hasIdentifierForEnrollmentLocation` to accept a resolved `PatientIdentifierType`**

Replace:
```java
	/**
	 * @return true if the passed patient has an identifier of the passed type whose location is the same as
	 * their current PatientProgram location that is associated with the passed states
	 */
	public static boolean hasIdentifierForEnrollmentLocation(Patient p, Integer identifierType, List<ProgramWorkflow> workflows) {
		if (identifierType == null) {
			// no identifierType specified, simply accept
			return true;
		}
		List<PatientIdentifier> pis = p.getPatientIdentifiers(Context.getPatientService().getPatientIdentifierType(identifierType));
		if ( workflows!= null && !workflows.isEmpty()) {
```
With:
```java
	/**
	 * @return true if the passed patient has an identifier of the passed type whose location is the same as
	 * their current PatientProgram location that is associated with the passed states
	 */
	public static boolean hasIdentifierForEnrollmentLocation(Patient p, PatientIdentifierType identifierType, List<ProgramWorkflow> workflows) {
		if (identifierType == null) {
			// no identifierType specified, simply accept
			return true;
		}
		List<PatientIdentifier> pis = p.getPatientIdentifiers(identifierType);
		if ( workflows!= null && !workflows.isEmpty()) {
```

- [ ] **Step 4: Add the new `getPatientIdentifierType(String, Integer)` resolver**

Add this method to `Helper.java`, directly after `getProgramWorkflowsFromUuidsList` (i.e. right before the existing `getProgramWorkflowStatesFromCsvIds` javadoc):
```java
	/**
	 * @return the PatientIdentifierType matching the given name if non-blank and found, otherwise the
	 * PatientIdentifierType matching the given id, otherwise null
	 */
	public static PatientIdentifierType getPatientIdentifierType(String name, Integer id) {
		PatientIdentifierType pit = null;
		if (StringUtils.isNotBlank(name)) {
			pit = Context.getPatientService().getPatientIdentifierTypeByName(name);
		}
		if (pit == null && id != null) {
			pit = Context.getPatientService().getPatientIdentifierType(id);
		}
		return pit;
	}
```

- [ ] **Step 5: Compile the omod module**

Run: `cd /home/mseaton/code/github/pih/pihmalawi-emr && mvn -pl omod -am compile -q`
Expected: `BUILD FAILURE` — `EMastercardAccessTag.java` and `ERecordAccessTag.java` still call the old `Helper.hasIdentifierType(p, Integer)`/`hasIdentifierForEnrollmentLocation(p, Integer, ...)` overloads, which no longer exist. This confirms the signature change took effect (that's what "the test fails first" means here, since there's no unit test to run); Task 2 fixes the call sites.

- [ ] **Step 6: Commit**

```bash
git add omod/src/main/java/org/openmrs/module/pihmalawi/web/taglibs/Helper.java
git commit -m "$(cat <<'EOF'
MLW-1846: Resolve PatientIdentifierType by object, not raw id, in Helper

hasIdentifierType/hasIdentifierForEnrollmentLocation now take an already-
resolved PatientIdentifierType, matching how Form/EncounterType are already
resolved before use elsewhere in the same taglib classes. Adds a name-first,
id-fallback resolver so callers can offer a name-based alternative to the
existing raw-id attribute.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Add `patientIdentifierTypeName` to `EMastercardAccessTag` and `ERecordAccessTag`

**Files:**
- Modify: `omod/src/main/java/org/openmrs/module/pihmalawi/web/taglibs/EMastercardAccessTag.java`
- Modify: `omod/src/main/java/org/openmrs/module/pihmalawi/web/taglibs/ERecordAccessTag.java`
- Modify: `omod/src/main/webapp/taglib/pihmalawi.tld`

**Interfaces:**
- Consumes: `Helper.getPatientIdentifierType(String, Integer)`, `Helper.hasIdentifierType(Patient, PatientIdentifierType)`, `Helper.hasIdentifierForEnrollmentLocation(Patient, PatientIdentifierType, List<ProgramWorkflow>)` from Task 1.
- Produces: new `patientIdentifierTypeName` JSP attribute on both `eMastercardAccess` and `eRecordAccess` tags.

- [ ] **Step 1: Add `PatientIdentifierType` import to `EMastercardAccessTag.java`**

Add, alongside the existing `import org.openmrs.Patient;` line:
```java
import org.openmrs.PatientIdentifierType;
```

- [ ] **Step 2: Add the `patientIdentifierTypeName` field to `EMastercardAccessTag.java`**

Replace:
```java
	private String programWorkflowStates;
	private Integer patientIdentifierType;
	private boolean includeAppointmentInfo = true;
```
With:
```java
	private String programWorkflowStates;
	private Integer patientIdentifierType;
	private String patientIdentifierTypeName;
	private boolean includeAppointmentInfo = true;
```

- [ ] **Step 3: Resolve the identifier type once in `doStartTag()` and use it at both call sites**

Replace:
```java
            // Ensure valid form and initial encounter type passed in
			if (f == null || initialEncounterType == null) {
				o.write("Not available: Wrong configuration");
				release();
				return SKIP_BODY;
			}
```
With:
```java
            // Ensure valid form and initial encounter type passed in
			if (f == null || initialEncounterType == null) {
				o.write("Not available: Wrong configuration");
				release();
				return SKIP_BODY;
			}

			PatientIdentifierType resolvedPatientIdentifierType = Helper.getPatientIdentifierType(getPatientIdentifierTypeName(), getPatientIdentifierType());
```

Then replace (first occurrence, inside the `initials.size() == 0` branch):
```java
					if (!Helper.hasIdentifierType(p, getPatientIdentifierType())) {
						o.write("Not available: No identifier (" + f.getName() + ")");
					} else {
						if (!Helper.hasIdentifierForEnrollmentLocation(p, getPatientIdentifierType(), programWorkflows)) {
```
With:
```java
					if (!Helper.hasIdentifierType(p, resolvedPatientIdentifierType)) {
						o.write("Not available: No identifier (" + f.getName() + ")");
					} else {
						if (!Helper.hasIdentifierForEnrollmentLocation(p, resolvedPatientIdentifierType, programWorkflows)) {
```

Then replace (second occurrence, inside the `initials.size() == 1` branch):
```java
				if (!Helper.hasIdentifierType(p, getPatientIdentifierType())) {
					o.write(createViewCardHtmlTag(p, f, initials.get(0), "Readonly: No identifier"));
					release();
					return SKIP_BODY;
				}
				if (!Helper.hasIdentifierForEnrollmentLocation(p, getPatientIdentifierType(), programWorkflows)) {
```
With:
```java
				if (!Helper.hasIdentifierType(p, resolvedPatientIdentifierType)) {
					o.write(createViewCardHtmlTag(p, f, initials.get(0), "Readonly: No identifier"));
					release();
					return SKIP_BODY;
				}
				if (!Helper.hasIdentifierForEnrollmentLocation(p, resolvedPatientIdentifierType, programWorkflows)) {
```

- [ ] **Step 4: Reset the new field in `doEndTag()`, add its getter/setter**

Replace:
```java
		readonly = false;
		patientIdentifierType = null;
		programWorkflowStates = null;
```
With:
```java
		readonly = false;
		patientIdentifierType = null;
		patientIdentifierTypeName = null;
		programWorkflowStates = null;
```

Add, directly after the existing `setPatientIdentifierType` method:
```java
	public String getPatientIdentifierTypeName() {
		return patientIdentifierTypeName;
	}

	public void setPatientIdentifierTypeName(String patientIdentifierTypeName) {
		this.patientIdentifierTypeName = patientIdentifierTypeName;
	}
```

- [ ] **Step 5: Apply the same 4 changes to `ERecordAccessTag.java`**

Add import:
```java
import org.openmrs.PatientIdentifierType;
```

Add field — replace:
```java
	private String programWorkflowStates;
	private Integer patientIdentifierType;
```
With:
```java
	private String programWorkflowStates;
	private Integer patientIdentifierType;
	private String patientIdentifierTypeName;
```

Resolve once and use at both call sites — replace:
```java
		try {
			if (f == null || initialEncounterType == null) {
				o.write("Not available: Wrong configuration");
				release();
				return SKIP_BODY;
			}
			List<ProgramWorkflowState> stateList = Helper.getProgramWorkflowStatesFromCsvIds(programWorkflowStates);
			if (!Helper.isInProgramWorkflowState(p, stateList)) {
				o.write("Not available: Inactive program state");
			} else {
				if (!Helper.hasIdentifierType(p, getPatientIdentifierType())) {
```
With:
```java
		try {
			if (f == null || initialEncounterType == null) {
				o.write("Not available: Wrong configuration");
				release();
				return SKIP_BODY;
			}
			PatientIdentifierType resolvedPatientIdentifierType = Helper.getPatientIdentifierType(getPatientIdentifierTypeName(), getPatientIdentifierType());
			List<ProgramWorkflowState> stateList = Helper.getProgramWorkflowStatesFromCsvIds(programWorkflowStates);
			if (!Helper.isInProgramWorkflowState(p, stateList)) {
				o.write("Not available: Inactive program state");
			} else {
				if (!Helper.hasIdentifierType(p, resolvedPatientIdentifierType)) {
```

Replace the second call site:
```java
				} else if (!Helper.hasIdentifierType(p, getPatientIdentifierType())) {
					o.write(createViewCardHtmlTag(p, f, initial,
							"Readonly: No identifier"));
```
With:
```java
				} else if (!Helper.hasIdentifierType(p, resolvedPatientIdentifierType)) {
					o.write(createViewCardHtmlTag(p, f, initial,
							"Readonly: No identifier"));
```

Reset in `doEndTag()` — replace:
```java
		readonly = false;
		patientIdentifierType = null;
		programWorkflowStates = null;
```
With:
```java
		readonly = false;
		patientIdentifierType = null;
		patientIdentifierTypeName = null;
		programWorkflowStates = null;
```

Add getter/setter, directly after the existing `setPatientIdentifierType` method:
```java
	public String getPatientIdentifierTypeName() {
		return patientIdentifierTypeName;
	}

	public void setPatientIdentifierTypeName(String patientIdentifierTypeName) {
		this.patientIdentifierTypeName = patientIdentifierTypeName;
	}
```

- [ ] **Step 6: Register the new attribute in `pihmalawi.tld` for both tags**

For `eMastercardAccess`, replace:
```xml
		<attribute>
			<name>patientIdentifierType</name>
			<required>false</required>
			<rtexprvalue>true</rtexprvalue>
		</attribute>
		<attribute>
			<name>programWorkflowStates</name>
			<required>false</required>
			<rtexprvalue>true</rtexprvalue>
		</attribute>
		<attribute>
			<name>includeAppointmentInfo</name>
			<required>false</required>
			<rtexprvalue>true</rtexprvalue>
		</attribute>
		<attribute>
			<name>condition</name>
			<required>false</required>
			<rtexprvalue>true</rtexprvalue>
		</attribute>
```
With:
```xml
		<attribute>
			<name>patientIdentifierType</name>
			<required>false</required>
			<rtexprvalue>true</rtexprvalue>
		</attribute>
		<attribute>
			<name>patientIdentifierTypeName</name>
			<required>false</required>
			<rtexprvalue>true</rtexprvalue>
		</attribute>
		<attribute>
			<name>programWorkflowStates</name>
			<required>false</required>
			<rtexprvalue>true</rtexprvalue>
		</attribute>
		<attribute>
			<name>includeAppointmentInfo</name>
			<required>false</required>
			<rtexprvalue>true</rtexprvalue>
		</attribute>
		<attribute>
			<name>condition</name>
			<required>false</required>
			<rtexprvalue>true</rtexprvalue>
		</attribute>
```

For `eRecordAccess`, replace:
```xml
		<attribute>
			<name>patientIdentifierType</name>
			<required>false</required>
			<rtexprvalue>true</rtexprvalue>
		</attribute>
		<attribute>
			<name>programWorkflowStates</name>
			<required>false</required>
			<rtexprvalue>true</rtexprvalue>
		</attribute>
	</tag>

	<tag>
		<description>Quick and clean programs management</description>
```
With:
```xml
		<attribute>
			<name>patientIdentifierType</name>
			<required>false</required>
			<rtexprvalue>true</rtexprvalue>
		</attribute>
		<attribute>
			<name>patientIdentifierTypeName</name>
			<required>false</required>
			<rtexprvalue>true</rtexprvalue>
		</attribute>
		<attribute>
			<name>programWorkflowStates</name>
			<required>false</required>
			<rtexprvalue>true</rtexprvalue>
		</attribute>
	</tag>

	<tag>
		<description>Quick and clean programs management</description>
```

- [ ] **Step 7: Compile the omod module**

Run: `cd /home/mseaton/code/github/pih/pihmalawi-emr && mvn -pl omod -am compile -q`
Expected: `BUILD SUCCESS`

- [ ] **Step 8: Commit**

```bash
git add omod/src/main/java/org/openmrs/module/pihmalawi/web/taglibs/EMastercardAccessTag.java \
        omod/src/main/java/org/openmrs/module/pihmalawi/web/taglibs/ERecordAccessTag.java \
        omod/src/main/webapp/taglib/pihmalawi.tld
git commit -m "$(cat <<'EOF'
MLW-1846: Add patientIdentifierTypeName attribute to eMastercard/eRecord tags

Mirrors the existing formName/initialEncounterTypeName pattern: resolves by
name first, falling back to the existing raw-id attribute. Lets JSPs stop
hardcoding patient identifier type database ids.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Convert `malawiPatientDashboard.jsp` off raw metadata IDs

**Files:**
- Modify: `omod/src/main/webapp/portlets/malawiPatientDashboard.jsp`

**Interfaces:**
- Consumes: `patientIdentifierTypeName` attribute from Task 2; existing `formName`/`initialEncounterTypeName`/`followupEncounterTypeName` attributes (already supported); existing UUID-or-id parsing in `Helper.getProgramWorkflowStatesFromCsvIds` (already supports UUIDs in `programWorkflowStates`/`initialStateIds`/`stateIds`/`terminalStateIds`, so these need only a value substitution, no code change).

- [ ] **Step 1: Replace every hardcoded `patientIdentifierType="N"` with the resolved name, using `replace_all` for each of the 7 distinct values**

Each of these is a literal find-and-replace-all across the whole file (each value maps to exactly one identifier type, verified in the spec's mapping table):

| Find (exact, replace_all) | Replace with |
|---|---|
| `patientIdentifierType="4"` | `patientIdentifierTypeName="ARV Number"` |
| `patientIdentifierType="19"` | `patientIdentifierTypeName="HCC Number"` |
| `patientIdentifierType="21"` | `patientIdentifierTypeName="Chronic Care Number"` |
| `patientIdentifierType="22"` | `patientIdentifierTypeName="Palliative Care Number"` |
| `patientIdentifierType="26"` | `patientIdentifierTypeName="PDC Identifier"` |
| `patientIdentifierType="28"` | `patientIdentifierTypeName="Nutrition Program Number"` |
| `patientIdentifierType="29"` | `patientIdentifierTypeName="TB program identifier"` |

Do these 7 replacements now (each with `replace_all: true`).

- [ ] **Step 2: Convert the ART Patient Card row off raw form/encounterType/state ids**

Replace:
```
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" formId="64" initialEncounterTypeId="9" followupEncounterTypeId="10" patientIdentifierTypeName="ARV Number" programWorkflowStates="7"/></td>
```
With:
```
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" formName="ART eMastercard" initialEncounterTypeName="ART_INITIAL" followupEncounterTypeName="ART_FOLLOWUP" patientIdentifierTypeName="ARV Number" programWorkflowStates="6687fa7c-977f-11e1-8993-905e29aff6c1"/></td>
```

- [ ] **Step 3: Convert both Pre-ART Patient Card rows**

Replace:
```
                <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" formId="66" initialEncounterTypeId="11" followupEncounterTypeId="12" patientIdentifierTypeName="HCC Number" programWorkflowStates="1" readonly="true"/> (Readonly: ART Initial Encounter)</td>
```
With:
```
                <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" formName="Pre-ART eMastercard" initialEncounterTypeName="PART_INITIAL" followupEncounterTypeName="PART_FOLLOWUP" patientIdentifierTypeName="HCC Number" programWorkflowStates="6687f284-977f-11e1-8993-905e29aff6c1" readonly="true"/> (Readonly: ART Initial Encounter)</td>
```

Replace:
```
                <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" formId="66" initialEncounterTypeId="11" followupEncounterTypeId="12" patientIdentifierTypeName="HCC Number" programWorkflowStates="1"/></td>
```
With:
```
                <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" formName="Pre-ART eMastercard" initialEncounterTypeName="PART_INITIAL" followupEncounterTypeName="PART_FOLLOWUP" patientIdentifierTypeName="HCC Number" programWorkflowStates="6687f284-977f-11e1-8993-905e29aff6c1"/></td>
```

- [ ] **Step 4: Convert both Exposed Child Patient Card rows**

Replace:
```
                <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" formId="68" initialEncounterTypeId="92" followupEncounterTypeId="93" patientIdentifierTypeName="HCC Number" programWorkflowStates="120" readonly="true"/> (Readonly: ART Initial Encounter)</td>
```
With:
```
                <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" formName="Exposed Child eMastercard" initialEncounterTypeName="EXPOSED_CHILD_INITIAL" followupEncounterTypeName="EXPOSED_CHILD_FOLLOWUP" patientIdentifierTypeName="HCC Number" programWorkflowStates="668847a2-977f-11e1-8993-905e29aff6c1" readonly="true"/> (Readonly: ART Initial Encounter)</td>
```

Replace:
```
                <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" formId="68" initialEncounterTypeId="92" followupEncounterTypeId="93" patientIdentifierTypeName="HCC Number" programWorkflowStates="120"/></td>
```
With:
```
                <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" formName="Exposed Child eMastercard" initialEncounterTypeName="EXPOSED_CHILD_INITIAL" followupEncounterTypeName="EXPOSED_CHILD_FOLLOWUP" patientIdentifierTypeName="HCC Number" programWorkflowStates="668847a2-977f-11e1-8993-905e29aff6c1"/></td>
```

- [ ] **Step 5: Convert the old Chronic Care Record row**

Replace:
```
            <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" formId="54" initialEncounterTypeId="67" followupEncounterTypeId="69" patientIdentifierTypeName="Chronic Care Number" programWorkflowStates="${ChronicCareActiveStates}"/></td>
```
With:
```
            <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" formName="Chronic Care eMastercard" initialEncounterTypeName="CHRONIC_CARE_INITIAL" followupEncounterTypeName="CHRONIC_CARE_FOLLOWUP" patientIdentifierTypeName="Chronic Care Number" programWorkflowStates="${ChronicCareActiveStates}"/></td>
```

- [ ] **Step 6: Convert the HIV Program quickPrograms row's raw state ids**

Replace:
```
        <td><pihmalawi:quickPrograms patientId="${model.patientId}" initialStateIds="120,7" stateIds="7" terminalStateIds="2,12,119"/><br /></td>
```
With:
```
        <td><pihmalawi:quickPrograms patientId="${model.patientId}" initialStateIds="668847a2-977f-11e1-8993-905e29aff6c1,6687fa7c-977f-11e1-8993-905e29aff6c1" stateIds="6687fa7c-977f-11e1-8993-905e29aff6c1" terminalStateIds="6687f50e-977f-11e1-8993-905e29aff6c1,6687fff4-977f-11e1-8993-905e29aff6c1,668846d0-977f-11e1-8993-905e29aff6c1"/><br /></td>
```

- [ ] **Step 7: Verify no raw numeric metadata-id attributes remain**

Run: `cd /home/mseaton/code/github/pih/pihmalawi-emr && grep -nE 'formId="[0-9]|initialEncounterTypeId="[0-9]|followupEncounterTypeId="[0-9]|patientIdentifierType="[0-9]|programWorkflowStates="[0-9]|initialStateIds="[0-9]|(^|[^a-zA-Z])stateIds="[0-9]|terminalStateIds="[0-9]' omod/src/main/webapp/portlets/malawiPatientDashboard.jsp`
Expected: no output (no matches).

- [ ] **Step 8: Compile the omod module (JSPs aren't compiled by Maven here, but confirms nothing else broke)**

Run: `cd /home/mseaton/code/github/pih/pihmalawi-emr && mvn -pl omod -am compile -q`
Expected: `BUILD SUCCESS`

- [ ] **Step 9: Commit**

```bash
git add omod/src/main/webapp/portlets/malawiPatientDashboard.jsp
git commit -m "$(cat <<'EOF'
MLW-1846: Stop hardcoding metadata primary keys in the patient dashboard

Converts every formId/initialEncounterTypeId/followupEncounterTypeId/
patientIdentifierType/programWorkflowStates/initialStateIds/stateIds/
terminalStateIds attribute that held a raw database id to the equivalent
name or UUID, verified against a metadata-only production extract. These
ids would not match on a freshly Initializer-provisioned install.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Manual verification against a running instance

**Files:** none (verification only)

- [ ] **Step 1: Deploy a fresh instance**

Run: `cd /home/mseaton/code/github/pih/pihmalawi-emr && ./malawiDeploy.sh <serverId>` (use an existing OpenMRS SDK server id, or create one first with `mvn openmrs-sdk:setup`).

- [ ] **Step 2: Log in and open a test patient's dashboard**

Navigate to a patient's dashboard (`patientDashboard.form?patientId=<id>`) for a patient enrolled in the HIV program, and one not enrolled in any program.

- [ ] **Step 3: Verify each converted mastercard row renders without "Not available: Wrong configuration"**

Check the ART Patient Card, Pre-ART Patient Card, Exposed Child Patient Card, and Chronic Care Record rows all show either a working "Create new"/"View"/"Edit" link or an expected "Not available: ..." message (e.g. "No identifier") — never "Wrong configuration", which would indicate a form/encounter-type name failed to resolve.

- [ ] **Step 4: Verify the HIV Program quick-programs widget**

For the HIV-enrolled test patient, confirm the "HIV Program" row under "Quick Programs" shows the expected current state and offers the expected transition options (matching what it showed before this change — compare against the same patient on the pre-change code if possible, e.g. by checking out the previous commit in a second server).

- [ ] **Step 5: Verify identifier-type gating still works**

Find or create a test patient who does **not** have an "ARV Number" identifier, and confirm the ART Patient Card now correctly shows "Not available: No identifier" rather than either erroring or incorrectly allowing access — this is the behavior that was previously driven by hardcoded id `4` and must still work by name.

No commit for this task — it's verification only. If any step fails, return to the relevant earlier task, fix, and re-run this task's steps.
