package org.openmrs.module.pihmalawi.quickprograms;

import org.apache.commons.lang.StringUtils;
import org.openmrs.Location;
import org.openmrs.Patient;
import org.openmrs.PatientProgram;
import org.openmrs.PatientProgramAttribute;
import org.openmrs.PatientState;
import org.openmrs.Program;
import org.openmrs.ProgramWorkflow;
import org.openmrs.ProgramAttributeType;
import org.openmrs.ProgramWorkflowState;
import org.openmrs.api.ProgramWorkflowService;
import org.openmrs.api.context.Context;
import org.openmrs.module.pihmalawi.common.Helper;
import org.openmrs.module.reporting.common.DateUtil;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.openmrs.module.pihmalawi.PihMalawiConstants.TRANSFERRED_OUT_PROGRAM_ATTRIBUTE_TYPE;

/**
 * The patient dashboard's Quick Programs: for a patient, what each program offers (the states to enroll in, change
 * to or exit with), and those actions. These are the rules the legacy Quick Programs section has always applied.
 */
@Component("quickProgramService")
public class QuickProgramService {

	public static final String TRANSFERRED_OUT_CONCEPT = "655b604e-977f-11e1-8993-905e29aff6c1";
	public static final String PATIENT_DIED_CONCEPT = "655b5e46-977f-11e1-8993-905e29aff6c1";

	public List<QuickProgramStatus> statusAll(Patient patient) {
		List<QuickProgramStatus> ret = new ArrayList<QuickProgramStatus>();
		for (QuickProgram program : QuickProgramRegistry.getAll()) {
			ret.add(status(patient, program));
		}
		return ret;
	}

	public QuickProgramStatus status(Patient patient, QuickProgram qp) {
		QuickProgramStatus status = new QuickProgramStatus(qp);
		status.setDisplayed(isDisplayed(patient, qp));
		if (!status.isDisplayed()) {
			return status;
		}
		List<ProgramWorkflowState> initialStates = states(qp.getInitialStateUuids());
		if (initialStates.isEmpty()) {
			return status;
		}
		ProgramWorkflow mainWorkflow = initialStates.get(0).getProgramWorkflow();
		Program program = mainWorkflow.getProgram();
		PatientProgram pp = currentPatientProgram(program, patient);
		status.setPatientProgram(pp);
		if (pp == null) {
			status.setLastEnrolment(lastPatientProgram(program, patient));
		}
		boolean dead = patient.isDead();

		List<ProgramWorkflow> conditionWorkflows = Helper.getProgramWorkflowsFromUuidsList(StringUtils.join(qp.getWorkflowUuids(), ","));
		if (!conditionWorkflows.isEmpty()) {
			for (ProgramWorkflow workflow : conditionWorkflows) {
				boolean open = hasOpenProgramWorkflow(workflow, patient);
				PatientState current = pp == null ? null : pp.getCurrentState(workflow);
				QuickProgramWorkflowStatus ws = new QuickProgramWorkflowStatus(workflow, current, open);
				status.getWorkflows().add(ws);
				if (dead) {
					continue;
				}
				if (!open) {
					ws.getEnrolStates().addAll(Helper.getProgramWorkflowStates(workflow, Boolean.TRUE, Boolean.FALSE));
				} else {
					ws.getChangeStates().addAll(except(Helper.getProgramWorkflowStates(workflow, null, Boolean.FALSE), current));
					status.getExitStates().addAll(except(Helper.getProgramWorkflowStates(workflow, null, Boolean.TRUE), current));
				}
			}
			return status;
		}

		boolean open = hasOpenProgramWorkflow(mainWorkflow, patient);
		PatientState current = pp == null ? null : pp.getCurrentState(mainWorkflow);
		status.getWorkflows().add(new QuickProgramWorkflowStatus(mainWorkflow, current, open));
		if (dead) {
			return status;
		}
		if (!open) {
			status.getEnrolStates().addAll(initialStates);
		} else {
			status.getChangeStates().addAll(except(states(qp.getStateUuids()), current));
			status.getExitStates().addAll(except(states(qp.getTerminalStateUuids()), current));
		}
		return status;
	}

	/**
	 * Enrolls the patient in the program, unless they have an enrollment that isn't completed on the date, and moves
	 * them into each of the states, one per workflow. Every state must be one Quick Programs offers the patient;
	 * otherwise nothing is saved.
	 */
	@Transactional
	public PatientProgram enrol(Patient patient, QuickProgram qp, List<ProgramWorkflowState> states, Date date,
	        Location location) {
		QuickProgramStatus status = status(patient, qp);
		if (states == null || states.isEmpty()) {
			throw new QuickProgramException("Choose a state to enroll in");
		}
		checkDate(date, status.getPatientProgram());
		List<ProgramWorkflowState> offered = new ArrayList<ProgramWorkflowState>(status.getEnrolStates());
		for (QuickProgramWorkflowStatus w : status.getWorkflows()) {
			offered.addAll(w.getEnrolStates());
		}
		Set<ProgramWorkflow> workflows = new HashSet<ProgramWorkflow>();
		for (ProgramWorkflowState state : states) {
			if (!offered.contains(state)) {
				for (QuickProgramWorkflowStatus w : status.getWorkflows()) {
					if (w.isOpen() && w.getWorkflow().equals(state.getProgramWorkflow())) {
						throw new QuickProgramException("The patient is already enrolled in " + workflowName(w.getWorkflow()));
					}
				}
				throw new QuickProgramException(stateName(state) + " can't be chosen when enrolling in " + qp.getLabel());
			}
			if (!workflows.add(state.getProgramWorkflow())) {
				throw new QuickProgramException("Choose one state for " + workflowName(state.getProgramWorkflow()));
			}
		}
		if (location == null && status.getPatientProgram() == null) {
			throw new QuickProgramException("Choose a location");
		}

		ProgramWorkflowService pws = Context.getProgramWorkflowService();
		Program program = states.get(0).getProgramWorkflow().getProgram();
		List<PatientProgram> enrolled = pws.getPatientPrograms(patient, program, null, null, date, null, false);
		PatientProgram pp;
		if (enrolled.isEmpty()) {
			pp = new PatientProgram();
			pp.setPatient(patient);
			pp.setProgram(program);
			pp.setLocation(location);
			pp.setDateEnrolled(date);
			pws.savePatientProgram(pp);
		} else {
			pp = enrolled.get(0);
		}
		for (ProgramWorkflowState state : states) {
			pp.transitionToState(state, date);
		}
		return pws.savePatientProgram(pp);
	}

	/**
	 * Moves the patient to the state on the date, as the legacy dashboard's change state does
	 */
	@Transactional
	public void changeState(QuickProgram qp, PatientProgram pp, ProgramWorkflowState state, Date date) {
		changeStates(qp, pp, java.util.Collections.singletonList(state), date);
	}

	/**
	 * Moves the patient to each of the states on the date, one per workflow. Every state must be one Quick Programs
	 * offers the patient; otherwise nothing is saved.
	 */
	@Transactional
	public void changeStates(QuickProgram qp, PatientProgram pp, List<ProgramWorkflowState> states, Date date) {
		QuickProgramStatus status = status(pp.getPatient(), qp);
		checkEnrolment(status, pp);
		checkDate(date, pp);
		if (states == null || states.isEmpty()) {
			throw new QuickProgramException("Choose a state");
		}
		List<ProgramWorkflowState> offered = new ArrayList<ProgramWorkflowState>(status.getChangeStates());
		for (QuickProgramWorkflowStatus w : status.getWorkflows()) {
			offered.addAll(w.getChangeStates());
		}
		Set<ProgramWorkflow> workflows = new HashSet<ProgramWorkflow>();
		for (ProgramWorkflowState state : states) {
			if (!offered.contains(state)) {
				throw new QuickProgramException("The patient can't be changed to " + stateName(state));
			}
			if (!workflows.add(state.getProgramWorkflow())) {
				throw new QuickProgramException("Choose one state for " + workflowName(state.getProgramWorkflow()));
			}
			checkAfterCurrentState(pp, state.getProgramWorkflow(), date);
		}
		for (ProgramWorkflowState state : states) {
			pp.transitionToState(state, date);
		}
		Context.getProgramWorkflowService().savePatientProgram(pp);
	}

	/**
	 * Moves the patient to the terminal state on the date. A transfer out also records where to, and a death also
	 * moves the program's other workflows to their own patient died state, as the legacy dashboard does.
	 */
	@Transactional
	public void exit(QuickProgram qp, PatientProgram pp, ProgramWorkflowState state, Date date, String transferredOutLocation) {
		QuickProgramStatus status = status(pp.getPatient(), qp);
		checkEnrolment(status, pp);
		checkDate(date, pp);
		if (!status.getExitStates().contains(state)) {
			throw new QuickProgramException("The patient can't leave " + qp.getLabel() + " with " + stateName(state));
		}
		ProgramWorkflowService pws = Context.getProgramWorkflowService();
		ExitKind kind = exitKind(state);
		// Legacy Quick Programs only carries a death across to the other workflows of per-condition programs
		boolean diedAcrossWorkflows = kind == ExitKind.DIED && !qp.getWorkflowUuids().isEmpty();
		checkAfterCurrentState(pp, state.getProgramWorkflow(), date);
		if (diedAcrossWorkflows) {
			for (ProgramWorkflow workflow : pp.getProgram().getWorkflows()) {
				checkAfterCurrentState(pp, workflow, date);
			}
		}
		if (kind == ExitKind.TRANSFER_OUT) {
			if (StringUtils.isBlank(transferredOutLocation)) {
				throw new QuickProgramException("Enter where the patient was transferred to");
			}
			ProgramAttributeType type = pws.getProgramAttributeTypeByUuid(TRANSFERRED_OUT_PROGRAM_ATTRIBUTE_TYPE);
			List<PatientProgramAttribute> active = pp.getActiveAttributes(type);
			if (!active.isEmpty()) {
				active.get(0).setValueReferenceInternal(transferredOutLocation.trim());
			} else {
				PatientProgramAttribute attribute = new PatientProgramAttribute();
				attribute.setAttributeType(type);
				attribute.setValueReferenceInternal(transferredOutLocation.trim());
				pp.setAttribute(attribute);
			}
		}
		pp.transitionToState(state, date);
		pws.savePatientProgram(pp);
		if (diedAcrossWorkflows) {
			for (ProgramWorkflow workflow : pp.getProgram().getWorkflows()) {
				if (workflow.equals(state.getProgramWorkflow())) {
					continue;
				}
				for (ProgramWorkflowState other : workflow.getStates()) {
					if (other.getConcept().getUuid().equalsIgnoreCase(state.getConcept().getUuid())) {
						pp.transitionToState(other, date);
						pws.savePatientProgram(pp);
					}
				}
			}
		}
	}

	private void checkEnrolment(QuickProgramStatus status, PatientProgram pp) {
		if (status.getPatientProgram() == null || !status.getPatientProgram().equals(pp)) {
			throw new QuickProgramException("This isn't the patient's current " + status.getProgram().getLabel() + " enrollment");
		}
	}

	private void checkDate(Date date, PatientProgram enrolment) {
		if (date == null) {
			throw new QuickProgramException("Enter a date");
		}
		if (date.after(DateUtil.getEndOfDay(new Date()))) {
			throw new QuickProgramException("The date can't be in the future");
		}
		if (enrolment != null && enrolment.getDateEnrolled() != null
		        && date.before(DateUtil.getStartOfDay(enrolment.getDateEnrolled()))) {
			throw new QuickProgramException("The date can't be before the enrollment date");
		}
	}

	/**
	 * Core rejects a state change dated before the workflow's current state started; say so instead
	 */
	private void checkAfterCurrentState(PatientProgram pp, ProgramWorkflow workflow, Date date) {
		PatientState current = pp.getCurrentState(workflow);
		if (current != null && current.getStartDate() != null && date.before(DateUtil.getStartOfDay(current.getStartDate()))) {
			throw new QuickProgramException("The date can't be before " + workflowName(workflow) + " started "
			        + stateName(current.getState()) + " (" + new java.text.SimpleDateFormat("dd-MMM-yyyy").format(current.getStartDate()) + ")");
		}
	}

	private String stateName(ProgramWorkflowState state) {
		return state.getConcept().getName().getName();
	}

	private String workflowName(ProgramWorkflow workflow) {
		return workflow.getConcept().getName().getName();
	}

	/**
	 * @return how leaving the program in the given terminal state is recorded
	 */
	public ExitKind exitKind(ProgramWorkflowState state) {
		String concept = state.getConcept().getUuid();
		if (StringUtils.equalsIgnoreCase(concept, TRANSFERRED_OUT_CONCEPT)) {
			return ExitKind.TRANSFER_OUT;
		}
		if (StringUtils.equalsIgnoreCase(concept, PATIENT_DIED_CONCEPT)) {
			return ExitKind.DIED;
		}
		return ExitKind.COMPLETE;
	}

	private boolean isDisplayed(Patient patient, QuickProgram qp) {
		if (qp.getRequiredPrivilege() != null && !Context.hasPrivilege(qp.getRequiredPrivilege())) {
			return false;
		}
		if (qp.getDisplay() == QuickProgram.Display.TEEN_CLUB) {
			Integer age = patient.getAge();
			boolean eligibleAge = age != null && age > 5 && age < 30;
			return (eligibleAge && hasEnrollment(patient, "HIV PROGRAM", false)) || hasEnrollment(patient, "Teen club program", true);
		}
		return true;
	}

	private boolean hasEnrollment(Patient patient, String programName, boolean activeOnly) {
		for (PatientProgram pp : Context.getProgramWorkflowService().getPatientPrograms(patient, null, null, null, null, null, false)) {
			if (programName.equals(pp.getProgram().getName()) && (!activeOnly || pp.getDateCompleted() == null)) {
				return true;
			}
		}
		return false;
	}

	private List<ProgramWorkflowState> states(List<String> uuids) {
		return Helper.getProgramWorkflowStatesFromCsvIds(StringUtils.join(uuids, ","));
	}

	private List<ProgramWorkflowState> except(List<ProgramWorkflowState> states, PatientState current) {
		List<ProgramWorkflowState> ret = new ArrayList<ProgramWorkflowState>();
		for (ProgramWorkflowState state : states) {
			if (current == null || !current.getState().equals(state)) {
				ret.add(state);
			}
		}
		return ret;
	}

	/**
	 * @return the patient's enrollment in the program that isn't completed as of now, or null
	 */
	PatientProgram currentPatientProgram(Program program, Patient patient) {
		List<PatientProgram> pps = Context.getProgramWorkflowService().getPatientPrograms(patient, program, null, null,
		    new Date(), null, false);
		return pps.isEmpty() ? null : pps.get(0);
	}

	private PatientProgram lastPatientProgram(Program program, Patient patient) {
		PatientProgram last = null;
		for (PatientProgram pp : Context.getProgramWorkflowService().getPatientPrograms(patient, program, null, null, null,
		    null, false)) {
			if (last == null || (pp.getDateEnrolled() != null && last.getDateEnrolled() != null
			        && pp.getDateEnrolled().after(last.getDateEnrolled()))) {
				last = pp;
			}
		}
		return last;
	}

	/**
	 * @return whether the patient has an enrollment, not completed as of now, with a state in the workflow
	 */
	boolean hasOpenProgramWorkflow(ProgramWorkflow workflow, Patient patient) {
		for (PatientProgram pp : Context.getProgramWorkflowService().getPatientPrograms(patient, workflow.getProgram(), null,
		    null, new Date(), null, false)) {
			for (PatientState ps : pp.getStates()) {
				if (ps.getState().getProgramWorkflow().equals(workflow)) {
					return true;
				}
			}
		}
		return false;
	}
}
