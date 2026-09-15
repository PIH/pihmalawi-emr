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
package org.openmrs.module.pihmalawi.activator;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.openmrs.Concept;
import org.openmrs.api.context.Context;
import org.openmrs.module.pihmalawi.metadata.concept.CommonConcepts;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Overwrites the small set of OpenMRS-core (and core-adjacent module) global properties whose
 * legal value is a raw concept id, since core's AdministrationService offers no UUID-accepting
 * alternative for these. Must run after concepts are loaded, which is guaranteed by running
 * after MetadataInitializer in PihMalawiModuleActivator#getInitializers().
 *
 * Note: OpenMRS core caches some of these concepts (e.g. true/false/unknown) in static fields
 * on first access with no invalidation when the global property changes later - if anything
 * resolves one of these concepts before this initializer runs, the stale value could be cached
 * for the JVM's lifetime. In practice this class runs early enough in startup that this hasn't
 * been observed, but it's a latent risk worth knowing about.
 */
public class GlobalPropertyConceptIdInitializer implements Initializer {

    protected static final Log log = LogFactory.getLog(GlobalPropertyConceptIdInitializer.class);

    protected static final Map<String, String> GLOBAL_PROPERTY_CONCEPT_UUIDS;
    static {
        Map<String, String> m = new LinkedHashMap<String, String>();
        m.put("concept.true", CommonConcepts.Concepts.TRUE);
        m.put("concept.false", CommonConcepts.Concepts.FALSE);
        m.put("concept.unknown", CommonConcepts.Concepts.UNKNOWN);
        m.put("concept.causeOfDeath", CommonConcepts.Concepts.CAUSE_OF_DEATH);
        m.put("concept.height", CommonConcepts.Concepts.HEIGHT);
        m.put("concept.weight", CommonConcepts.Concepts.WEIGHT);
        m.put("concept.medicalRecordObservations", CommonConcepts.Concepts.MEDICAL_RECORD_OBSERVATIONS);
        m.put("concept.none", CommonConcepts.Concepts.NONE);
        m.put("concept.otherNonCoded", CommonConcepts.Concepts.OTHER);
        m.put("concept.patientDied", CommonConcepts.Concepts.PATIENT_DIED);
        m.put("concept.problemList", CommonConcepts.Concepts.PROBLEM_LIST);
        m.put("concept.reasonExitedCare", CommonConcepts.Concepts.REASON_EXITED_CARE);
        m.put("concept.reasonOrderStopped", CommonConcepts.Concepts.REASON_ORDER_STOPPED);
        // dashboard.header.showConcept accepts a comma-delimited list of concept ids to display;
        // this install only shows CD4 count.
        m.put("dashboard.header.showConcept", CommonConcepts.Concepts.CD4_COUNT);
        GLOBAL_PROPERTY_CONCEPT_UUIDS = Collections.unmodifiableMap(m);
    }

    @Override
    public void started() {
        List<String> unresolved = new ArrayList<String>();
        for (Map.Entry<String, String> entry : GLOBAL_PROPERTY_CONCEPT_UUIDS.entrySet()) {
            String globalPropertyName = entry.getKey();
            String conceptUuid = entry.getValue();
            Concept concept = Context.getConceptService().getConceptByUuid(conceptUuid);
            if (concept == null) {
                unresolved.add(globalPropertyName + " (" + conceptUuid + ")");
                continue;
            }
            log.info("Setting global property " + globalPropertyName + " to concept id " + concept.getConceptId());
            Context.getAdministrationService().setGlobalProperty(globalPropertyName, concept.getConceptId().toString());
        }
        if (!unresolved.isEmpty()) {
            throw new IllegalStateException("Could not resolve concepts needed to set the following global properties: " + unresolved);
        }
    }

    @Override
    public void stopped() {
    }
}
