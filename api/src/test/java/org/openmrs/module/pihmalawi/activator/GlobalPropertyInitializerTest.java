package org.openmrs.module.pihmalawi.activator;

import org.apache.commons.lang.StringUtils;
import org.junit.Assert;
import org.junit.Test;
import org.openmrs.Concept;
import org.openmrs.ConceptName;
import org.openmrs.GlobalProperty;
import org.openmrs.Program;
import org.openmrs.ProgramWorkflow;
import org.openmrs.api.context.Context;
import org.openmrs.test.BaseModuleContextSensitiveTest;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

public class GlobalPropertyInitializerTest extends BaseModuleContextSensitiveTest {

    private Concept saveTestConcept(String uuid, String name) {
        Concept concept = new Concept();
        concept.setUuid(uuid);
        concept.setDatatype(Context.getConceptService().getConceptDatatypeByName("N/A"));
        concept.setConceptClass(Context.getConceptService().getConceptClassByName("Misc"));
        concept.addName(new ConceptName(name, Locale.ENGLISH));
        return Context.getConceptService().saveConcept(concept);
    }

    private void saveAllEntities() {
        for (GlobalPropertyInitializer.Entry entry : GlobalPropertyInitializer.GLOBAL_PROPERTY_METADATA_UUIDS) {
            for (String uuid : entry.uuids) {
                switch (entry.type) {
                    case CONCEPT:
                        if (Context.getConceptService().getConceptByUuid(uuid) == null) {
                            saveTestConcept(uuid, uuid + " test concept");
                        }
                        break;
                    case PROGRAM:
                        if (Context.getProgramWorkflowService().getProgramByUuid(uuid) == null) {
                            Concept programConcept = saveTestConcept(UUID.randomUUID().toString(), uuid + " program concept");
                            Program program = new Program();
                            program.setUuid(uuid);
                            program.setName(uuid + " test program");
                            program.setConcept(programConcept);
                            Context.getProgramWorkflowService().saveProgram(program);
                        }
                        break;
                    case PROGRAM_WORKFLOW:
                        if (Context.getProgramWorkflowService().getWorkflowByUuid(uuid) == null) {
                            Concept workflowConcept = saveTestConcept(UUID.randomUUID().toString(), uuid + " workflow concept");
                            Concept programConcept = saveTestConcept(UUID.randomUUID().toString(), uuid + " workflow's program concept");
                            Program program = new Program();
                            program.setName(uuid + " test program for workflow");
                            program.setConcept(programConcept);
                            program = Context.getProgramWorkflowService().saveProgram(program);
                            ProgramWorkflow workflow = new ProgramWorkflow();
                            workflow.setUuid(uuid);
                            workflow.setConcept(workflowConcept);
                            program.addWorkflow(workflow);
                            Context.getProgramWorkflowService().saveProgram(program);
                        }
                        break;
                }
            }
        }
    }

    @Test
    public void shouldSetEveryGlobalPropertyToTheCurrentIdsOfItsMappedMetadata() {
        saveAllEntities();

        new GlobalPropertyInitializer().started();

        for (GlobalPropertyInitializer.Entry entry : GlobalPropertyInitializer.GLOBAL_PROPERTY_METADATA_UUIDS) {
            List<String> expectedIds = new ArrayList<String>();
            for (String uuid : entry.uuids) {
                switch (entry.type) {
                    case CONCEPT:
                        expectedIds.add(Context.getConceptService().getConceptByUuid(uuid).getConceptId().toString());
                        break;
                    case PROGRAM:
                        expectedIds.add(Context.getProgramWorkflowService().getProgramByUuid(uuid).getProgramId().toString());
                        break;
                    case PROGRAM_WORKFLOW:
                        expectedIds.add(Context.getProgramWorkflowService().getWorkflowByUuid(uuid).getProgramWorkflowId().toString());
                        break;
                }
            }
            String expectedValue = StringUtils.join(expectedIds, ",");
            String actualValue = Context.getAdministrationService().getGlobalProperty(entry.globalPropertyName);
            Assert.assertEquals("Mismatch for " + entry.globalPropertyName, expectedValue, actualValue);
        }
    }

    @Test
    public void shouldFailLoudlyIfMetadataCannotBeResolved() {
        try {
            new GlobalPropertyInitializer().started();
            Assert.fail("Expected an IllegalStateException to be thrown");
        }
        catch (IllegalStateException e) {
            Assert.assertTrue(e.getMessage().contains("concept.true"));
        }
    }

    @Test
    public void shouldDeleteStaleGlobalPropertiesIfPresent() {
        String staleName = GlobalPropertyInitializer.GLOBAL_PROPERTIES_TO_DELETE.get(0);
        GlobalProperty stale = new GlobalProperty(staleName, "33,32,31");
        Context.getAdministrationService().saveGlobalProperty(stale);
        Assert.assertNotNull(Context.getAdministrationService().getGlobalPropertyObject(staleName));

        saveAllEntities();
        new GlobalPropertyInitializer().started();

        Assert.assertNull(Context.getAdministrationService().getGlobalPropertyObject(staleName));
    }

    @Test
    public void shouldNotFailWhenStaleGlobalPropertiesAreAlreadyAbsent() {
        for (String staleName : GlobalPropertyInitializer.GLOBAL_PROPERTIES_TO_DELETE) {
            Assert.assertNull(Context.getAdministrationService().getGlobalPropertyObject(staleName));
        }

        saveAllEntities();
        // Should not throw, even though none of the stale properties exist to delete.
        new GlobalPropertyInitializer().started();
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
            if (initializers.get(i) instanceof GlobalPropertyInitializer) {
                fixupIndex = i;
            }
        }
        Assert.assertTrue("MetadataInitializer should be present", metadataIndex >= 0);
        Assert.assertTrue("GlobalPropertyInitializer should be present", fixupIndex >= 0);
        Assert.assertTrue("GlobalPropertyInitializer must run after MetadataInitializer", fixupIndex > metadataIndex);
    }
}
