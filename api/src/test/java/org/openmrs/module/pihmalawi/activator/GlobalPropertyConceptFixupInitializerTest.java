package org.openmrs.module.pihmalawi.activator;

import org.junit.Assert;
import org.junit.Test;
import org.openmrs.Concept;
import org.openmrs.api.context.Context;
import org.openmrs.test.BaseModuleContextSensitiveTest;

import java.util.List;
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

    @Test
    public void shouldFailLoudlyIfAConceptCannotBeResolved() {
        try {
            new GlobalPropertyConceptFixupInitializer().started();
            Assert.fail("Expected an IllegalStateException to be thrown");
        }
        catch (IllegalStateException e) {
            Assert.assertTrue(e.getMessage().contains("concept.true"));
        }
    }

    @Test
    public void shouldRunAfterMetadataInitializerInActivatorList() {
        List<Initializer> initializers = new PihMalawiModuleActivator().getInitializers();
        int metadataIndex = -1;
        int fixupIndex = -1;
        for (int i = 0; i < initializers.size(); i++) {
            if (initializers.get(i) instanceof MetadataInitializer) {
                metadataIndex = i;
            }
            if (initializers.get(i) instanceof GlobalPropertyConceptFixupInitializer) {
                fixupIndex = i;
            }
        }
        Assert.assertTrue("MetadataInitializer should be present", metadataIndex >= 0);
        Assert.assertTrue("GlobalPropertyConceptFixupInitializer should be present", fixupIndex >= 0);
        Assert.assertTrue("GlobalPropertyConceptFixupInitializer must run after MetadataInitializer", fixupIndex > metadataIndex);
    }
}
