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
