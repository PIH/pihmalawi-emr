/*
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
package org.openmrs.module.pihmalawi.metadata;

import org.openmrs.EncounterType;
import org.openmrs.Location;
import org.openmrs.PatientIdentifierType;
import org.openmrs.Program;
import org.openmrs.ProgramWorkflow;
import org.openmrs.ProgramWorkflowState;
import org.openmrs.module.pihmalawi.PihMalawiConfigConstants;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component("hivMetadata")
public class HivMetadata extends CommonMetadata {

	public static String HIV_PROGRAM = "HIV program";
	public static String HIV_PROGRAM_UUID = "66850b0a-977f-11e1-8993-905e29aff6c1";
	public static String HIV_PROGRAM_TREATMENT_STATUS = "Treatment status";
	public static String HIV_PROGRAM_TREATMENT_STATUS_UUID = "6686ffe6-977f-11e1-8993-905e29aff6c1";
	public static String HIV_PROGRAM_STATUS_EXPOSED_CHILD = "668847a2-977f-11e1-8993-905e29aff6c1";
	public static String HIV_PROGRAM_STATUS_PRE_ART = "Pre-ART (Continue)";
	public static String HIV_PROGRAM_STATUS_ON_ARVS = "6687fa7c-977f-11e1-8993-905e29aff6c1";
	public static String HIV_PROGRAM_STATUS_TRANSFERRED_OUT = "Patient transferred out";
	public static String HIV_PROGRAM_STATUS_DIED = "Patient died";
	public static String HIV_PROGRAM_STATUS_DEFAULTED = "Patient defaulted";
	public static String HIV_PROGRAM_STATUS_TRANSFERRED_INTERNALLY = "Transferred internally";
	public static String HIV_PROGRAM_STATUS_TREATMENT_STOPPED = "Treatment stopped";
	public static String HIV_PROGRAM_STATUS_DISCHARGED_UNINFECTED = "Discharged uninfected";

	public static String PRE_ART_INITIAL = "PART_INITIAL";
	public static String PRE_ART_FOLLOWUP = "PART_FOLLOWUP";

	public static String ART_INITIAL = "ART_INITIAL";
	public static String ART_FOLLOWUP = "ART_FOLLOWUP";

	public static String EXPOSED_CHILD_INITIAL = "EXPOSED_CHILD_INITIAL";
	public static String EXPOSED_CHILD_FOLLOWUP = "EXPOSED_CHILD_FOLLOWUP";

	public static String ADHERENCE_COUNSELING_ENCOUNTER_TYPE= "Adherence Counseling";

	public static String HCC_NUMBER = "HCC Number";
	public static String ARV_NUMBER = "ARV Number";
	public static String OLD_PART_NUMBER = "z_deprecated PART Number";
	public static String OLD_PRE_ART_NUMBER_OLD_FORMAT = "z_deprecated Pre ART Number (Old format)";

	public Program getHivProgram() {
		return getProgram(HIV_PROGRAM);
	}

	public ProgramWorkflow getTreatmentStatusWorkfow() {
		return getProgramWorkflow(HIV_PROGRAM, HIV_PROGRAM_TREATMENT_STATUS);
	}

	public ProgramWorkflowState getExposedChildState() {
		return getProgramWorkflowState(HIV_PROGRAM, HIV_PROGRAM_TREATMENT_STATUS, HIV_PROGRAM_STATUS_EXPOSED_CHILD);
	}

	public ProgramWorkflowState getPreArtState() {
		return getProgramWorkflowState(HIV_PROGRAM, HIV_PROGRAM_TREATMENT_STATUS, HIV_PROGRAM_STATUS_PRE_ART);
	}

	public ProgramWorkflowState getOnArvsState() {
		return getProgramWorkflowState(HIV_PROGRAM, HIV_PROGRAM_TREATMENT_STATUS, HIV_PROGRAM_STATUS_ON_ARVS);
	}

	public ProgramWorkflowState getTransferredOutState() {
		return getProgramWorkflowState(HIV_PROGRAM, HIV_PROGRAM_TREATMENT_STATUS, HIV_PROGRAM_STATUS_TRANSFERRED_OUT);
	}

	public ProgramWorkflowState getDiedState() {
		return getProgramWorkflowState(HIV_PROGRAM, HIV_PROGRAM_TREATMENT_STATUS, HIV_PROGRAM_STATUS_DIED);
	}

	public ProgramWorkflowState getDefaultedState() {
		return getProgramWorkflowState(HIV_PROGRAM, HIV_PROGRAM_TREATMENT_STATUS, HIV_PROGRAM_STATUS_DEFAULTED);
	}

	public ProgramWorkflowState getTransferredInternallyState() {
		return getProgramWorkflowState(HIV_PROGRAM, HIV_PROGRAM_TREATMENT_STATUS, HIV_PROGRAM_STATUS_TRANSFERRED_INTERNALLY);
	}

	public ProgramWorkflowState getTreatmentStoppedState() {
		return getProgramWorkflowState(HIV_PROGRAM, HIV_PROGRAM_TREATMENT_STATUS, HIV_PROGRAM_STATUS_TREATMENT_STOPPED);
	}

	public ProgramWorkflowState getDischargedUninfectedState() {
		return getProgramWorkflowState(HIV_PROGRAM, HIV_PROGRAM_TREATMENT_STATUS, HIV_PROGRAM_STATUS_DISCHARGED_UNINFECTED);
	}

	public List<ProgramWorkflowState> getAllStates() {
		List<ProgramWorkflowState> l = new ArrayList<ProgramWorkflowState>();
		l.add(getExposedChildState());
		l.add(getPreArtState());
		l.add(getOnArvsState());
		l.add(getTransferredOutState());
		l.add(getDiedState());
		l.add(getDefaultedState());
		l.add(getTransferredInternallyState());
		l.add(getTreatmentStoppedState());
		l.add(getDischargedUninfectedState());
		return l;
	}

	public List<ProgramWorkflowState> getTerminalStates() {
		List<ProgramWorkflowState> l = new ArrayList<ProgramWorkflowState>();
		l.add(getTransferredOutState());
		l.add(getDiedState());
		l.add(getDefaultedState());
		l.add(getTransferredInternallyState());
		l.add(getTreatmentStoppedState());
		l.add(getDischargedUninfectedState());
		return l;
	}

    public List<ProgramWorkflowState> getActiveHivStates() {
        List<ProgramWorkflowState> l = new ArrayList<ProgramWorkflowState>();
        l.add(getPreArtState());
        l.add(getOnArvsState());
        return l;
    }

	public EncounterType getPreArtInitialEncounterType() {
		return getEncounterType(PRE_ART_INITIAL);
	}

	public EncounterType getPreArtFollowupEncounterType() {
		return getEncounterType(PRE_ART_FOLLOWUP);
	}

	public List<EncounterType> getPreArtEncounterTypes() {
		List<EncounterType> l = new ArrayList<EncounterType>();
		l.add(getPreArtInitialEncounterType());
		l.add(getPreArtFollowupEncounterType());
		return l;
	}

	public EncounterType getArtInitialEncounterType() {
		return getEncounterType(ART_INITIAL);
	}

	public EncounterType getEidInitialEncounterType() {
		return getEncounterType(EXPOSED_CHILD_INITIAL);
	}


	public EncounterType getArtFollowupEncounterType() {
		return getEncounterType(ART_FOLLOWUP);
	}

	public List<EncounterType> getArtEncounterTypes() {
		List<EncounterType> l = new ArrayList<EncounterType>();
		l.add(getArtInitialEncounterType());
		l.add(getArtFollowupEncounterType());
		return l;
	}

	public List<EncounterType> getHivEncounterTypes() {
		List<EncounterType> l = new ArrayList<EncounterType>();
		l.addAll(getPreArtEncounterTypes());
		l.addAll(getArtEncounterTypes());
		return l;
	}

	public EncounterType getExposedChildInitialEncounterType() {
		return getEncounterType(EXPOSED_CHILD_INITIAL);
	}

	public EncounterType getExposedChildFollowupEncounterType() {
		return getEncounterType(EXPOSED_CHILD_FOLLOWUP);
	}

	public List<EncounterType> getExposedChildEncounterTypes() {
		List<EncounterType> l = new ArrayList<EncounterType>();
		l.add(getExposedChildInitialEncounterType());
		l.add(getExposedChildFollowupEncounterType());
		return l;
	}

	public List<EncounterType> getHivAndExposedChildEncounterTypes() {
		List<EncounterType> l = new ArrayList<EncounterType>();
		l.addAll(getHivEncounterTypes());
		l.addAll(getExposedChildEncounterTypes());
		return l;
	}

	public PatientIdentifierType getHccNumberIdentifierType() {
		return getPatientIdentifierType(HCC_NUMBER);
	}

	public PatientIdentifierType getArvNumberIdentifierType() {
		return getPatientIdentifierType(ARV_NUMBER);
	}

	public PatientIdentifierType getOldPartNumberIdentifierType() {
		return getPatientIdentifierType(OLD_PART_NUMBER);
	}

	public PatientIdentifierType getOldPreArtNumberOldFormatIdentifierType() {
		return getPatientIdentifierType(OLD_PRE_ART_NUMBER_OLD_FORMAT);
	}

	public List<Location> getHivStaticSystemLocations() {
		List<Location> l = getLocationsForTag(PihMalawiConfigConstants.LOCATIONTAG_HIV_STATIC_NAME);
		l.retainAll(getSystemLocations());
		return l;
	}
}
