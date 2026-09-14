# MLW-1846 Phase 1 (part 2): Global Property Fixup + Concept DataConverters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `gp.xml`'s core-owned `concept.*`/`dashboard.header.showConcept` global properties, and 3 report `DataConverter` classes, from depending on a specific install's concept primary keys — without waiting on the separate, larger "map every concept in the dictionary" effort, since both of these only touch a small, fully-enumerated set of concepts that can be resolved by UUID directly.

**Architecture:**
- For the global properties: OpenMRS core's `AdministrationService` only accepts a raw integer concept ID for these properties (there is no UUID-accepting alternative core API) — the value in `gp.xml` genuinely must stay a number. The fix is a new install-time step that runs *after* concepts are loaded, resolves each affected concept by its stable UUID, and overwrites the GP with that concept's *current* id. This repo already has exactly this shape of extension point: `PihMalawiModuleActivator.getInitializers()` runs a list of pihmalawi-owned `Initializer` implementations in order during module startup, and the first one (`MetadataInitializer`) is what actually triggers every `openmrs-module-initializer` CSV domain to load (confirmed: `openmrs-distro.properties` sets `property.initializer.startup.load=disabled`, so Initializer's own automatic startup load is off, and `MetadataInitializer.started()` — which iterates `InitializerService.getLoaders()` and calls `loadUnsafe()` on each — is what actually loads `gp.xml`/`concepts.csv`/etc). Since `org.openmrs.module.initializer` is a required module (`config.xml`), pihmalawi's own `started()` is guaranteed to run after Initializer's module is fully started; and since `getInitializers()` runs its list in order, a new `Initializer` placed right after `MetadataInitializer` is guaranteed to run after every CSV domain (concepts included) has already loaded.
- For the `DataConverter` classes: no database lookup is needed at all. `Concept.getUuid()` is a plain in-memory field — comparing it directly against a hardcoded UUID constant is simpler, faster, and more robust than looking anything up via `ConceptService`, and keeps these classes exactly as dependency-free as they are today.

**Tech Stack:** Java (OpenMRS module `api` layer), JUnit, `BaseModuleContextSensitiveTest`, Maven.

**Spec:** `docs/superpowers/specs/2026-09-14-mlw1846-metadata-pk-references-design.md`

## Global Constraints

- Every concept UUID used below was verified against a policy-compliant, metadata-only production extract (patient/clinical/employee tables excluded) — not guessed.
- `TbStatusConverter`'s existing mapping of concept id `1067` to the display string `"Never"` is very likely a pre-existing labeling bug — concept `1067` is actually the generic **"Unknown"** answer concept (synonyms "Do not know"/"Don't know"), not anything TB-treatment-specific. This plan **preserves the existing behavior exactly** (still maps that same concept to `"Never"`) — fixing whether that label is *correct* is a separate, out-of-scope behavioral question, not a primary-key-portability one. Do not "fix" this mapping as part of this plan.
- Do not touch htmlforms, `concepts.csv`, or any concept SAME-AS mapping infrastructure — those are a separate, later effort.
- This work lives in the `api` module, which has real context-sensitive test infrastructure (`BaseModuleContextSensitiveTest`) — write and run real automated tests for both tasks, unlike the Phase 1 portlets/taglibs plan (which lives in the untested `omod` module).

---

### Task 1: Add a global-property concept-id fixup step

**Files:**
- Create: `api/src/main/java/org/openmrs/module/pihmalawi/activator/GlobalPropertyConceptFixupInitializer.java`
- Modify: `api/src/main/java/org/openmrs/module/pihmalawi/activator/PihMalawiModuleActivator.java`
- Test: `api/src/test/java/org/openmrs/module/pihmalawi/activator/GlobalPropertyConceptFixupInitializerTest.java`

**Interfaces:**
- Produces: `GlobalPropertyConceptFixupInitializer implements org.openmrs.module.pihmalawi.activator.Initializer` — `started()` resolves each of 13 known concepts by UUID and overwrites the corresponding global property with that concept's current numeric id; throws `IllegalStateException` if any concept cannot be resolved (consistent with `MetadataInitializer`'s existing fail-loud behavior on a broken load).

- [ ] **Step 1: Write the new `GlobalPropertyConceptFixupInitializer` class**

Create `api/src/main/java/org/openmrs/module/pihmalawi/activator/GlobalPropertyConceptFixupInitializer.java`:
```java
package org.openmrs.module.pihmalawi.activator;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.openmrs.Concept;
import org.openmrs.api.context.Context;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Overwrites the small set of OpenMRS-core (and core-adjacent module) global properties whose
 * legal value is a raw concept id, since core's AdministrationService offers no UUID-accepting
 * alternative for these. Must run after concepts are loaded, which is guaranteed by running
 * after MetadataInitializer in PihMalawiModuleActivator#getInitializers().
 */
public class GlobalPropertyConceptFixupInitializer implements Initializer {

    protected static final Log log = LogFactory.getLog(GlobalPropertyConceptFixupInitializer.class);

    protected static final Map<String, String> GLOBAL_PROPERTY_CONCEPT_UUIDS = new LinkedHashMap<String, String>();
    static {
        GLOBAL_PROPERTY_CONCEPT_UUIDS.put("concept.true", "655e2f90-977f-11e1-8993-905e29aff6c1");
        GLOBAL_PROPERTY_CONCEPT_UUIDS.put("concept.false", "655e3148-977f-11e1-8993-905e29aff6c1");
        GLOBAL_PROPERTY_CONCEPT_UUIDS.put("concept.causeOfDeath", "6569569a-977f-11e1-8993-905e29aff6c1");
        GLOBAL_PROPERTY_CONCEPT_UUIDS.put("concept.height", "6569c562-977f-11e1-8993-905e29aff6c1");
        GLOBAL_PROPERTY_CONCEPT_UUIDS.put("concept.weight", "6569c44a-977f-11e1-8993-905e29aff6c1");
        GLOBAL_PROPERTY_CONCEPT_UUIDS.put("concept.medicalRecordObservations", "65588874-977f-11e1-8993-905e29aff6c1");
        GLOBAL_PROPERTY_CONCEPT_UUIDS.put("concept.none", "6557987e-977f-11e1-8993-905e29aff6c1");
        GLOBAL_PROPERTY_CONCEPT_UUIDS.put("concept.otherNonCoded", "656cce7e-977f-11e1-8993-905e29aff6c1");
        GLOBAL_PROPERTY_CONCEPT_UUIDS.put("concept.patientDied", "655b5e46-977f-11e1-8993-905e29aff6c1");
        GLOBAL_PROPERTY_CONCEPT_UUIDS.put("concept.problemList", "6558c8ca-977f-11e1-8993-905e29aff6c1");
        GLOBAL_PROPERTY_CONCEPT_UUIDS.put("concept.reasonExitedCare", "655baf40-977f-11e1-8993-905e29aff6c1");
        GLOBAL_PROPERTY_CONCEPT_UUIDS.put("concept.reasonOrderStopped", "655bb044-977f-11e1-8993-905e29aff6c1");
        GLOBAL_PROPERTY_CONCEPT_UUIDS.put("dashboard.header.showConcept", "656c327a-977f-11e1-8993-905e29aff6c1");
    }

    @Override
    public void started() {
        for (Map.Entry<String, String> entry : GLOBAL_PROPERTY_CONCEPT_UUIDS.entrySet()) {
            String globalPropertyName = entry.getKey();
            String conceptUuid = entry.getValue();
            Concept concept = Context.getConceptService().getConceptByUuid(conceptUuid);
            if (concept == null) {
                throw new IllegalStateException("Could not resolve concept with uuid " + conceptUuid
                        + " needed to set global property " + globalPropertyName);
            }
            log.info("Setting global property " + globalPropertyName + " to concept id " + concept.getConceptId());
            Context.getAdministrationService().setGlobalProperty(globalPropertyName, concept.getConceptId().toString());
        }
    }

    @Override
    public void stopped() {
    }
}
```

- [ ] **Step 2: Register the new initializer in `PihMalawiModuleActivator`**

Replace:
```java
	public List<Initializer> getInitializers() {
		List<Initializer> l = new ArrayList<Initializer>();
		l.add(new MetadataInitializer());
		l.add(new LocationInitializer());
```
With:
```java
	public List<Initializer> getInitializers() {
		List<Initializer> l = new ArrayList<Initializer>();
		l.add(new MetadataInitializer());
		l.add(new GlobalPropertyConceptFixupInitializer());
		l.add(new LocationInitializer());
```

- [ ] **Step 3: Write the test**

Create `api/src/test/java/org/openmrs/module/pihmalawi/activator/GlobalPropertyConceptFixupInitializerTest.java`:
```java
package org.openmrs.module.pihmalawi.activator;

import org.junit.Assert;
import org.junit.Test;
import org.openmrs.Concept;
import org.openmrs.api.context.Context;
import org.openmrs.test.BaseModuleContextSensitiveTest;

import java.util.Map;

public class GlobalPropertyConceptFixupInitializerTest extends BaseModuleContextSensitiveTest {

    @Test
    public void shouldSetEveryGlobalPropertyToTheCurrentIdOfItsMappedConcept() {
        for (Map.Entry<String, String> entry : GlobalPropertyConceptFixupInitializer.GLOBAL_PROPERTY_CONCEPT_UUIDS.entrySet()) {
            String globalPropertyName = entry.getKey();
            String conceptUuid = entry.getValue();

            Concept concept = new Concept();
            concept.setUuid(conceptUuid);
            concept.setDatatype(Context.getConceptService().getConceptDatatypeByName("N/A"));
            concept.setConceptClass(Context.getConceptService().getConceptClassByName("Misc"));
            concept.addName(new org.openmrs.ConceptName(globalPropertyName + " test concept", java.util.Locale.ENGLISH));
            Context.getConceptService().saveConcept(concept);
        }

        new GlobalPropertyConceptFixupInitializer().started();

        for (Map.Entry<String, String> entry : GlobalPropertyConceptFixupInitializer.GLOBAL_PROPERTY_CONCEPT_UUIDS.entrySet()) {
            String globalPropertyName = entry.getKey();
            String conceptUuid = entry.getValue();
            Concept concept = Context.getConceptService().getConceptByUuid(conceptUuid);
            String actualGpValue = Context.getAdministrationService().getGlobalProperty(globalPropertyName);
            Assert.assertEquals(concept.getConceptId().toString(), actualGpValue);
        }
    }

    @Test(expected = IllegalStateException.class)
    public void shouldFailLoudlyIfAConceptCannotBeResolved() {
        new GlobalPropertyConceptFixupInitializer().started();
    }
}
```

Note: the second test relies on none of the 13 UUIDs existing in the base test dataset (so resolution fails immediately on the first one) — this is expected to hold for `BaseModuleContextSensitiveTest`'s standard in-memory dataset, which does not include these specific concepts.

- [ ] **Step 4: Run the new tests**

Run: `cd /home/mseaton/code/github/pih/pihmalawi-emr && mvn -pl api -am test -Dtest=GlobalPropertyConceptFixupInitializerTest -q`
Expected: both tests `BUILD SUCCESS`, 2/2 passing.

- [ ] **Step 5: Compile the whole project**

Run: `cd /home/mseaton/code/github/pih/pihmalawi-emr && mvn compile -q`
Expected: `BUILD SUCCESS`

- [ ] **Step 6: Commit**

```bash
git add api/src/main/java/org/openmrs/module/pihmalawi/activator/GlobalPropertyConceptFixupInitializer.java \
        api/src/main/java/org/openmrs/module/pihmalawi/activator/PihMalawiModuleActivator.java \
        api/src/test/java/org/openmrs/module/pihmalawi/activator/GlobalPropertyConceptFixupInitializerTest.java
git commit -m "$(cat <<'EOF'
MLW-1846: Fix up core-owned concept-id global properties after install

Core's AdministrationService only accepts a raw concept id for properties
like concept.true/concept.false/concept.causeOfDeath - there's no
UUID-based alternative. Adds a new Initializer step, run right after
MetadataInitializer (which loads every Initializer CSV domain, concepts
included), that resolves each affected concept by UUID and overwrites the
property with that concept's current id - so these properties are correct
on every install regardless of what id Initializer happened to assign.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Fix the 3 concept-id `DataConverter` classes

**Files:**
- Modify: `api/src/main/java/org/openmrs/module/pihmalawi/reporting/definition/data/converter/ObsValueBooleanYesNoConverter.java`
- Modify: `api/src/main/java/org/openmrs/module/pihmalawi/reporting/definition/data/converter/PregnantLactatingConverter.java`
- Modify: `api/src/main/java/org/openmrs/module/pihmalawi/reporting/definition/data/converter/TbStatusConverter.java`
- Test: `api/src/test/java/org/openmrs/module/pihmalawi/reporting/definition/data/converter/ObsValueBooleanYesNoConverterTest.java`
- Test: `api/src/test/java/org/openmrs/module/pihmalawi/reporting/definition/data/converter/PregnantLactatingConverterTest.java`
- Test: `api/src/test/java/org/openmrs/module/pihmalawi/reporting/definition/data/converter/TbStatusConverterTest.java`

**Interfaces:**
- No cross-task interfaces; each converter's public `convert(Object)`/`getDataType()`/`getInputDataType()` signatures are unchanged.

- [ ] **Step 1: Fix `ObsValueBooleanYesNoConverter`**

Replace the entire file content of `api/src/main/java/org/openmrs/module/pihmalawi/reporting/definition/data/converter/ObsValueBooleanYesNoConverter.java` with:
```java
/**
 * The contents of this file are subject to the OpenMRS Public License
 * Version 1.0 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://license.openmrs.org
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 *
 * Copyright (C) OpenMRS, LLC.  All Rights Reserved.
 */
package org.openmrs.module.pihmalawi.reporting.definition.data.converter;

import org.openmrs.Concept;
import org.openmrs.Obs;
import org.openmrs.module.reporting.common.ObjectUtil;
import org.openmrs.module.reporting.data.converter.DataConverter;

/**
 * Who Stage data converter
 */
public class ObsValueBooleanYesNoConverter implements DataConverter  {

	public static final String TRUE_CONCEPT_UUID = "655e2f90-977f-11e1-8993-905e29aff6c1";
	public static final String FALSE_CONCEPT_UUID = "655e3148-977f-11e1-8993-905e29aff6c1";

	//***** CONSTRUCTORS *****

	/**
	 * Default constructor
	 */
	public ObsValueBooleanYesNoConverter() { }

	//***** INSTANCE METHODS *****

	/**
	 * @see DataConverter#convert(Object)
	 */
	public Object convert(Object original) {
        Obs o = (Obs)original;
        if (o != null) {
            String conceptUuid = o.getValueCoded().getUuid();
            if (TRUE_CONCEPT_UUID.equals(conceptUuid)) { return "Yes"; }
            if (FALSE_CONCEPT_UUID.equals(conceptUuid)) { return "No"; }
            return ObjectUtil.format(o.getValueCoded());
        }
        return null;
	}

	/**
	 * @see DataConverter#getDataType()
	 */
	public Class<?> getDataType() {
		return String.class;
	}

	/**
	 * @see DataConverter#getInputDataType()
	 */
	public Class<?> getInputDataType() {
		return Concept.class;
	}
}
```

- [ ] **Step 2: Write `ObsValueBooleanYesNoConverterTest`**

Create `api/src/test/java/org/openmrs/module/pihmalawi/reporting/definition/data/converter/ObsValueBooleanYesNoConverterTest.java`:
```java
package org.openmrs.module.pihmalawi.reporting.definition.data.converter;

import org.junit.Assert;
import org.junit.Test;
import org.openmrs.Concept;
import org.openmrs.Obs;

public class ObsValueBooleanYesNoConverterTest {

    @Test
    public void shouldConvertTrueConceptToYes() {
        Concept trueConcept = new Concept();
        trueConcept.setUuid(ObsValueBooleanYesNoConverter.TRUE_CONCEPT_UUID);
        Obs o = new Obs();
        o.setValueCoded(trueConcept);

        Assert.assertEquals("Yes", new ObsValueBooleanYesNoConverter().convert(o));
    }

    @Test
    public void shouldConvertFalseConceptToNo() {
        Concept falseConcept = new Concept();
        falseConcept.setUuid(ObsValueBooleanYesNoConverter.FALSE_CONCEPT_UUID);
        Obs o = new Obs();
        o.setValueCoded(falseConcept);

        Assert.assertEquals("No", new ObsValueBooleanYesNoConverter().convert(o));
    }

    @Test
    public void shouldReturnNullForNullObs() {
        Assert.assertNull(new ObsValueBooleanYesNoConverter().convert(null));
    }
}
```

- [ ] **Step 3: Fix `PregnantLactatingConverter`**

Replace the entire file content of `api/src/main/java/org/openmrs/module/pihmalawi/reporting/definition/data/converter/PregnantLactatingConverter.java` with:
```java
/**
 * The contents of this file are subject to the OpenMRS Public License
 * Version 1.0 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://license.openmrs.org
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 *
 * Copyright (C) OpenMRS, LLC.  All Rights Reserved.
 */
package org.openmrs.module.pihmalawi.reporting.definition.data.converter;

import org.openmrs.Concept;
import org.openmrs.Obs;
import org.openmrs.module.reporting.common.ObjectUtil;
import org.openmrs.module.reporting.data.converter.DataConverter;

/**
 * Who Stage data converter
 */
public class PregnantLactatingConverter implements DataConverter  {

	public static final String NO_CONCEPT_UUID = "6557646c-977f-11e1-8993-905e29aff6c1";
	public static final String PREGNANT_CONCEPT_UUID = "655b6bac-977f-11e1-8993-905e29aff6c1";
	public static final String LACTATING_CONCEPT_UUID = "656cdab8-977f-11e1-8993-905e29aff6c1";

	//***** CONSTRUCTORS *****

	/**
	 * Default constructor
	 */
	public PregnantLactatingConverter() { }

	//***** INSTANCE METHODS *****

	/**
	 * @see DataConverter#convert(Object)
	 */
	public Object convert(Object original) {
        Obs o = (Obs)original;
        if (o != null) {
            String conceptUuid = o.getValueCoded().getUuid();
            if (NO_CONCEPT_UUID.equals(conceptUuid)) { return "No"; }
            if (PREGNANT_CONCEPT_UUID.equals(conceptUuid)) { return "Pregnant"; }
            if (LACTATING_CONCEPT_UUID.equals(conceptUuid)) { return "Lactating"; }
            return ObjectUtil.format(o.getValueCoded());
        }
        return null;
	}

	/**
	 * @see DataConverter#getDataType()
	 */
	public Class<?> getDataType() {
		return String.class;
	}

	/**
	 * @see DataConverter#getInputDataType()
	 */
	public Class<?> getInputDataType() {
		return Concept.class;
	}
}
```

- [ ] **Step 4: Write `PregnantLactatingConverterTest`**

Create `api/src/test/java/org/openmrs/module/pihmalawi/reporting/definition/data/converter/PregnantLactatingConverterTest.java`:
```java
package org.openmrs.module.pihmalawi.reporting.definition.data.converter;

import org.junit.Assert;
import org.junit.Test;
import org.openmrs.Concept;
import org.openmrs.Obs;

public class PregnantLactatingConverterTest {

    @Test
    public void shouldConvertNoConceptToNo() {
        Concept noConcept = new Concept();
        noConcept.setUuid(PregnantLactatingConverter.NO_CONCEPT_UUID);
        Obs o = new Obs();
        o.setValueCoded(noConcept);

        Assert.assertEquals("No", new PregnantLactatingConverter().convert(o));
    }

    @Test
    public void shouldConvertPregnantConceptToPregnant() {
        Concept pregnantConcept = new Concept();
        pregnantConcept.setUuid(PregnantLactatingConverter.PREGNANT_CONCEPT_UUID);
        Obs o = new Obs();
        o.setValueCoded(pregnantConcept);

        Assert.assertEquals("Pregnant", new PregnantLactatingConverter().convert(o));
    }

    @Test
    public void shouldConvertLactatingConceptToLactating() {
        Concept lactatingConcept = new Concept();
        lactatingConcept.setUuid(PregnantLactatingConverter.LACTATING_CONCEPT_UUID);
        Obs o = new Obs();
        o.setValueCoded(lactatingConcept);

        Assert.assertEquals("Lactating", new PregnantLactatingConverter().convert(o));
    }

    @Test
    public void shouldReturnNullForNullObs() {
        Assert.assertNull(new PregnantLactatingConverter().convert(null));
    }
}
```

- [ ] **Step 5: Fix `TbStatusConverter`**

Replace the entire file content of `api/src/main/java/org/openmrs/module/pihmalawi/reporting/definition/data/converter/TbStatusConverter.java` with:
```java
/**
 * The contents of this file are subject to the OpenMRS Public License
 * Version 1.0 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://license.openmrs.org
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 *
 * Copyright (C) OpenMRS, LLC.  All Rights Reserved.
 */
package org.openmrs.module.pihmalawi.reporting.definition.data.converter;

import org.openmrs.Concept;
import org.openmrs.Obs;
import org.openmrs.module.reporting.common.ObjectUtil;
import org.openmrs.module.reporting.data.converter.DataConverter;

/**
 * Who Stage data converter
 */
public class TbStatusConverter implements DataConverter  {

	public static final String NEVER_CONCEPT_UUID = "65576584-977f-11e1-8993-905e29aff6c1";
	public static final String LAST_CONCEPT_UUID = "655b3ccc-977f-11e1-8993-905e29aff6c1";
	public static final String CURR_CONCEPT_UUID = "6559c054-977f-11e1-8993-905e29aff6c1";

	//***** CONSTRUCTORS *****

	/**
	 * Default constructor
	 */
	public TbStatusConverter() { }

	//***** INSTANCE METHODS *****

	/**
	 * @see DataConverter#convert(Object)
	 */
	public Object convert(Object original) {
        Obs o = (Obs)original;
        if (o != null) {
            String conceptUuid = o.getValueCoded().getUuid();
            if (NEVER_CONCEPT_UUID.equals(conceptUuid)) { return "Never"; }
            if (LAST_CONCEPT_UUID.equals(conceptUuid)) { return "Last"; }
            if (CURR_CONCEPT_UUID.equals(conceptUuid)) { return "Curr"; }
            return ObjectUtil.format(o.getValueCoded());
        }
        return null;
	}

	/**
	 * @see DataConverter#getDataType()
	 */
	public Class<?> getDataType() {
		return String.class;
	}

	/**
	 * @see DataConverter#getInputDataType()
	 */
	public Class<?> getInputDataType() {
		return Concept.class;
	}
}
```

Note this drops the previously-unused `import org.openmrs.module.pihmalawi.metadata.HivMetadata;` — it was never referenced anywhere in the original file.

- [ ] **Step 6: Write `TbStatusConverterTest`**

Create `api/src/test/java/org/openmrs/module/pihmalawi/reporting/definition/data/converter/TbStatusConverterTest.java`:
```java
package org.openmrs.module.pihmalawi.reporting.definition.data.converter;

import org.junit.Assert;
import org.junit.Test;
import org.openmrs.Concept;
import org.openmrs.Obs;

public class TbStatusConverterTest {

    @Test
    public void shouldConvertNeverConceptToNever() {
        Concept neverConcept = new Concept();
        neverConcept.setUuid(TbStatusConverter.NEVER_CONCEPT_UUID);
        Obs o = new Obs();
        o.setValueCoded(neverConcept);

        Assert.assertEquals("Never", new TbStatusConverter().convert(o));
    }

    @Test
    public void shouldConvertLastConceptToLast() {
        Concept lastConcept = new Concept();
        lastConcept.setUuid(TbStatusConverter.LAST_CONCEPT_UUID);
        Obs o = new Obs();
        o.setValueCoded(lastConcept);

        Assert.assertEquals("Last", new TbStatusConverter().convert(o));
    }

    @Test
    public void shouldConvertCurrConceptToCurr() {
        Concept currConcept = new Concept();
        currConcept.setUuid(TbStatusConverter.CURR_CONCEPT_UUID);
        Obs o = new Obs();
        o.setValueCoded(currConcept);

        Assert.assertEquals("Curr", new TbStatusConverter().convert(o));
    }

    @Test
    public void shouldReturnNullForNullObs() {
        Assert.assertNull(new TbStatusConverter().convert(null));
    }
}
```

- [ ] **Step 7: Run all 3 new test classes**

Run: `cd /home/mseaton/code/github/pih/pihmalawi-emr && mvn -pl api -am test -Dtest=ObsValueBooleanYesNoConverterTest,PregnantLactatingConverterTest,TbStatusConverterTest -q`
Expected: `BUILD SUCCESS`, 11/11 tests passing (3 + 4 + 4).

- [ ] **Step 8: Compile the whole project**

Run: `cd /home/mseaton/code/github/pih/pihmalawi-emr && mvn compile -q`
Expected: `BUILD SUCCESS`

- [ ] **Step 9: Commit**

```bash
git add api/src/main/java/org/openmrs/module/pihmalawi/reporting/definition/data/converter/ObsValueBooleanYesNoConverter.java \
        api/src/main/java/org/openmrs/module/pihmalawi/reporting/definition/data/converter/PregnantLactatingConverter.java \
        api/src/main/java/org/openmrs/module/pihmalawi/reporting/definition/data/converter/TbStatusConverter.java \
        api/src/test/java/org/openmrs/module/pihmalawi/reporting/definition/data/converter/ObsValueBooleanYesNoConverterTest.java \
        api/src/test/java/org/openmrs/module/pihmalawi/reporting/definition/data/converter/PregnantLactatingConverterTest.java \
        api/src/test/java/org/openmrs/module/pihmalawi/reporting/definition/data/converter/TbStatusConverterTest.java
git commit -m "$(cat <<'EOF'
MLW-1846: Compare converter concepts by UUID, not raw concept id

ObsValueBooleanYesNoConverter/PregnantLactatingConverter/TbStatusConverter
compared Obs.getValueCoded().getConceptId() against a hardcoded literal -
wrong on any install where that concept doesn't have that exact id. Compares
by UUID instead, which needs no database lookup at all since Concept.getUuid()
is a plain field. Preserves TbStatusConverter's existing "Never" label for
the concept currently mapped to it, even though that concept's real identity
("Unknown") suggests the label itself may be a pre-existing bug - a separate,
out-of-scope behavioral question from this fix.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
