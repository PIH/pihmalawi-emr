package org.openmrs.module.pihmalawi.quickprograms;

import org.openmrs.PatientState;
import org.openmrs.ProgramWorkflow;
import org.openmrs.ProgramWorkflowState;

import java.util.ArrayList;
import java.util.List;

/**
 * Where a patient is in one workflow of a quick program, and what they can be enrolled in or changed to there
 */
public class QuickProgramWorkflowStatus {

	private final ProgramWorkflow workflow;
	private final PatientState currentState;
	private final boolean open;
	private final List<ProgramWorkflowState> enrolStates = new ArrayList<ProgramWorkflowState>();
	private final List<ProgramWorkflowState> changeStates = new ArrayList<ProgramWorkflowState>();

	public QuickProgramWorkflowStatus(ProgramWorkflow workflow, PatientState currentState, boolean open) {
		this.workflow = workflow;
		this.currentState = currentState;
		this.open = open;
	}

	public ProgramWorkflow getWorkflow() {
		return workflow;
	}

	/**
	 * @return the patient's current state in this workflow, in their current enrollment, or null
	 */
	public PatientState getCurrentState() {
		return currentState;
	}

	/**
	 * @return true when the patient's current enrollment has a state in this workflow
	 */
	public boolean isOpen() {
		return open;
	}

	/**
	 * @return the states the patient can be enrolled in, in this workflow, when it isn't open
	 */
	public List<ProgramWorkflowState> getEnrolStates() {
		return enrolStates;
	}

	/**
	 * @return the non-terminal states the patient can be changed to, in this workflow, when it is open
	 */
	public List<ProgramWorkflowState> getChangeStates() {
		return changeStates;
	}
}
