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
public class GlobalPropertyConceptFixupInitializer implements Initializer {

    protected static final Log log = LogFactory.getLog(GlobalPropertyConceptFixupInitializer.class);

    protected static final Map<String, String> GLOBAL_PROPERTY_CONCEPT_UUIDS;
    static {
        Map<String, String> m = new LinkedHashMap<String, String>();
        m.put("concept.true", "655e2f90-977f-11e1-8993-905e29aff6c1");
        m.put("concept.false", "655e3148-977f-11e1-8993-905e29aff6c1");
        m.put("concept.unknown", "65576584-977f-11e1-8993-905e29aff6c1");
        m.put("concept.causeOfDeath", "6569569a-977f-11e1-8993-905e29aff6c1");
        m.put("concept.height", "6569c562-977f-11e1-8993-905e29aff6c1");
        m.put("concept.weight", "6569c44a-977f-11e1-8993-905e29aff6c1");
        m.put("concept.medicalRecordObservations", "65588874-977f-11e1-8993-905e29aff6c1");
        m.put("concept.none", "6557987e-977f-11e1-8993-905e29aff6c1");
        m.put("concept.otherNonCoded", "656cce7e-977f-11e1-8993-905e29aff6c1");
        m.put("concept.patientDied", "655b5e46-977f-11e1-8993-905e29aff6c1");
        m.put("concept.problemList", "6558c8ca-977f-11e1-8993-905e29aff6c1");
        m.put("concept.reasonExitedCare", "655baf40-977f-11e1-8993-905e29aff6c1");
        m.put("concept.reasonOrderStopped", "655bb044-977f-11e1-8993-905e29aff6c1");
        m.put("dashboard.header.showConcept", "656c327a-977f-11e1-8993-905e29aff6c1");
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
