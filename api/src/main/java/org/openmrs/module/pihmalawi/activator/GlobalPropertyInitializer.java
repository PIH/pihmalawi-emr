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

import org.apache.commons.lang.StringUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.openmrs.Concept;
import org.openmrs.GlobalProperty;
import org.openmrs.Program;
import org.openmrs.ProgramWorkflow;
import org.openmrs.api.context.Context;
import org.openmrs.module.pihmalawi.metadata.HivMetadata;
import org.openmrs.module.pihmalawi.metadata.concept.CommonConcepts;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Overwrites the small set of OpenMRS-core (and core-adjacent module) global properties whose
 * legal value is one or more raw metadata ids (concept, program, or program workflow), since
 * core's AdministrationService offers no UUID-accepting alternative for these. Also deletes a
 * small set of known-stale global properties if they're present (e.g. leftover config for a
 * module no longer part of this distro).
 * <p>
 * Must run after concepts/programs/program workflows are loaded, which is guaranteed by running
 * after MetadataInitializer in PihMalawiModuleActivator#getInitializers().
 * <p>
 * Note: OpenMRS core caches some of these concepts (e.g. true/false/unknown) in static fields
 * on first access with no invalidation when the global property changes later - if anything
 * resolves one of these concepts before this initializer runs, the stale value could be cached
 * for the JVM's lifetime. In practice this class runs early enough in startup that this hasn't
 * been observed, but it's a latent risk worth knowing about.
 */
public class GlobalPropertyInitializer implements Initializer {

    protected static final Log log = LogFactory.getLog(GlobalPropertyInitializer.class);

    public enum MetadataType {
        CONCEPT, PROGRAM, PROGRAM_WORKFLOW
    }

    /**
     * One global property to fix up: its name, the kind of metadata its value(s) reference, and
     * the stable uuid(s) identifying that metadata (one uuid for a single-valued property like
     * concept.true; more than one for a property that accepts a comma-delimited list, like
     * dashboard.header.workflows_to_show).
     */
    public static final class Entry {
        public final String globalPropertyName;
        public final MetadataType type;
        public final List<String> uuids;

        public Entry(String globalPropertyName, MetadataType type, String... uuids) {
            this.globalPropertyName = globalPropertyName;
            this.type = type;
            this.uuids = Collections.unmodifiableList(Arrays.asList(uuids));
        }
    }

    protected static final List<Entry> GLOBAL_PROPERTY_METADATA_UUIDS;
    static {
        List<Entry> l = new ArrayList<Entry>();
        l.add(new Entry("concept.true", MetadataType.CONCEPT, CommonConcepts.Concepts.TRUE));
        l.add(new Entry("concept.false", MetadataType.CONCEPT, CommonConcepts.Concepts.FALSE));
        l.add(new Entry("concept.unknown", MetadataType.CONCEPT, CommonConcepts.Concepts.UNKNOWN));
        l.add(new Entry("concept.causeOfDeath", MetadataType.CONCEPT, CommonConcepts.Concepts.CAUSE_OF_DEATH));
        l.add(new Entry("concept.height", MetadataType.CONCEPT, CommonConcepts.Concepts.HEIGHT));
        l.add(new Entry("concept.weight", MetadataType.CONCEPT, CommonConcepts.Concepts.WEIGHT));
        l.add(new Entry("concept.medicalRecordObservations", MetadataType.CONCEPT, CommonConcepts.Concepts.MEDICAL_RECORD_OBSERVATIONS));
        l.add(new Entry("concept.none", MetadataType.CONCEPT, CommonConcepts.Concepts.NONE));
        l.add(new Entry("concept.otherNonCoded", MetadataType.CONCEPT, CommonConcepts.Concepts.OTHER));
        l.add(new Entry("concept.patientDied", MetadataType.CONCEPT, CommonConcepts.Concepts.PATIENT_DIED));
        l.add(new Entry("concept.problemList", MetadataType.CONCEPT, CommonConcepts.Concepts.PROBLEM_LIST));
        l.add(new Entry("concept.reasonExitedCare", MetadataType.CONCEPT, CommonConcepts.Concepts.REASON_EXITED_CARE));
        l.add(new Entry("concept.reasonOrderStopped", MetadataType.CONCEPT, CommonConcepts.Concepts.REASON_ORDER_STOPPED));
        l.add(new Entry("dashboard.header.showConcept", MetadataType.CONCEPT, CommonConcepts.Concepts.CD4_COUNT));
        l.add(new Entry("dashboard.header.programs_to_show", MetadataType.PROGRAM, HivMetadata.HIV_PROGRAM_UUID));
        l.add(new Entry("dashboard.header.workflows_to_show", MetadataType.PROGRAM_WORKFLOW, HivMetadata.HIV_PROGRAM_TREATMENT_STATUS_UUID));
        GLOBAL_PROPERTY_METADATA_UUIDS = Collections.unmodifiableList(l);
    }

    /**
     * Global properties known to be stale (e.g. leftover config for a module no longer part of
     * this distro) that should not exist at all - deleted if present, left alone if already
     * absent. Unlike the properties above, a fresh install's gp.xml never defines these; they
     * only show up when installing against an existing database that still carries them.
     */
    protected static final List<String> GLOBAL_PROPERTIES_TO_DELETE = Collections.unmodifiableList(Arrays.asList(
            "facilitydata.unsupportedFacilities",
            "facilitydata.dailyReportDaysOfWeek",
            "dashboard.identifiers"
    ));

    @Override
    public void started() {
        List<String> unresolved = new ArrayList<String>();
        for (Entry entry : GLOBAL_PROPERTY_METADATA_UUIDS) {
            List<String> ids = new ArrayList<String>();
            for (String uuid : entry.uuids) {
                String id = resolveId(entry.type, uuid);
                if (id == null) {
                    unresolved.add(entry.globalPropertyName + " (" + entry.type + " " + uuid + ")");
                } else {
                    ids.add(id);
                }
            }
            if (ids.size() == entry.uuids.size()) {
                String value = StringUtils.join(ids, ",");
                log.info("Setting global property " + entry.globalPropertyName + " to " + value);
                Context.getAdministrationService().setGlobalProperty(entry.globalPropertyName, value);
            }
        }

        for (String propertyName : GLOBAL_PROPERTIES_TO_DELETE) {
            GlobalProperty gp = Context.getAdministrationService().getGlobalPropertyObject(propertyName);
            if (gp != null) {
                log.info("Deleting stale global property " + propertyName);
                Context.getAdministrationService().purgeGlobalProperty(gp);
            }
        }

        if (!unresolved.isEmpty()) {
            throw new IllegalStateException("Could not resolve metadata needed to set the following global properties: " + unresolved);
        }
    }

    private String resolveId(MetadataType type, String uuid) {
        switch (type) {
            case CONCEPT:
                Concept concept = Context.getConceptService().getConceptByUuid(uuid);
                return concept == null ? null : concept.getConceptId().toString();
            case PROGRAM:
                Program program = Context.getProgramWorkflowService().getProgramByUuid(uuid);
                return program == null ? null : program.getProgramId().toString();
            case PROGRAM_WORKFLOW:
                ProgramWorkflow workflow = Context.getProgramWorkflowService().getWorkflowByUuid(uuid);
                return workflow == null ? null : workflow.getProgramWorkflowId().toString();
            default:
                throw new IllegalStateException("Unsupported metadata type: " + type);
        }
    }

    @Override
    public void stopped() {
    }
}
