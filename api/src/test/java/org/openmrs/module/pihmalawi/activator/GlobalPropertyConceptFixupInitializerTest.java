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
