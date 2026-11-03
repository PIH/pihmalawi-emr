package org.openmrs.module.pihmalawi.quickprograms;

import org.openmrs.PatientProgram;
import org.openmrs.ProgramWorkflowState;

import java.util.ArrayList;
import java.util.List;

/**
 * Where a patient is in a quick program, and what Quick Programs offers them there: the states to enroll in, change
 * to or exit with
 */
public class QuickProgramStatus {

	private final QuickProgram program;
	private boolean displayed = true;
	private PatientProgram patientProgram;
	private PatientProgram lastEnrolment;
	private final List<QuickProgramWorkflowStatus> workflows = new ArrayList<QuickProgramWorkflowStatus>();
	private final List<ProgramWorkflowState> enrolStates = new ArrayList<ProgramWorkflowState>();
	private final List<ProgramWorkflowState> changeStates = new ArrayList<ProgramWorkflowState>();
	private final List<ProgramWorkflowState> exitStates = new ArrayList<ProgramWorkflowState>();

	public QuickProgramStatus(QuickProgram program) {
		this.program = program;
	}

	public QuickProgram getProgram() {
		return program;
	}

	/**
	 * @return false when the dashboard leaves this program out for the patient or user
	 */
	public boolean isDisplayed() {
		return displayed;
	}

	public void setDisplayed(boolean displayed) {
		this.displayed = displayed;
	}

	/**
	 * @return true when there is anything to enroll in, change to or exit with; the legacy dashboard shows
	 *         "(not available)" otherwise
	 */
	public boolean isAvailable() {
		if (!enrolStates.isEmpty() || !changeStates.isEmpty() || !exitStates.isEmpty()) {
			return true;
		}
		for (QuickProgramWorkflowStatus w : workflows) {
			if (!w.getEnrolStates().isEmpty() || !w.getChangeStates().isEmpty()) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @return the patient's current enrollment in the program, or null
	 */
	public PatientProgram getPatientProgram() {
		return patientProgram;
	}

	public void setPatientProgram(PatientProgram patientProgram) {
		this.patientProgram = patientProgram;
	}

	/**
	 * @return the patient's most recent completed enrollment, when there is no current one
	 */
	public PatientProgram getLastEnrolment() {
		return lastEnrolment;
	}

	public void setLastEnrolment(PatientProgram lastEnrolment) {
		this.lastEnrolment = lastEnrolment;
	}

	/**
	 * @return the workflows: the per-condition ones, or the program's one workflow
	 */
	public List<QuickProgramWorkflowStatus> getWorkflows() {
		return workflows;
	}

	/**
	 * @return for programs without per-condition workflows, the states the patient can be enrolled in
	 */
	public List<ProgramWorkflowState> getEnrolStates() {
		return enrolStates;
	}

	/**
	 * @return for programs without per-condition workflows, the states the patient can be changed to
	 */
	public List<ProgramWorkflowState> getChangeStates() {
		return changeStates;
	}

	/**
	 * @return the terminal states the patient can leave the program, or one of its workflows, with
	 */
	public List<ProgramWorkflowState> getExitStates() {
		return exitStates;
	}
}
