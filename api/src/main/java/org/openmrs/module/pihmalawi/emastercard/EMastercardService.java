package org.openmrs.module.pihmalawi.emastercard;

import org.apache.commons.lang.StringUtils;
import org.openmrs.Concept;
import org.openmrs.Encounter;
import org.openmrs.EncounterType;
import org.openmrs.Form;
import org.openmrs.Obs;
import org.openmrs.Patient;
import org.openmrs.PatientIdentifierType;
import org.openmrs.PatientProgram;
import org.openmrs.PatientState;
import org.openmrs.Person;
import org.openmrs.Program;
import org.openmrs.ProgramWorkflow;
import org.openmrs.ProgramWorkflowState;
import org.openmrs.api.context.Context;
import org.openmrs.module.pihmalawi.Utils;
import org.openmrs.module.pihmalawi.common.Helper;
import org.openmrs.module.reporting.common.DateUtil;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;

/**
 * Decides, for a patient and the current user, how each eMastercard is shown: whether it can be created, edited or
 * only viewed, or why it is not available. These are the rules the legacy patient dashboard has always applied.
 */
@Component("emastercardService")
public class EMastercardService {

	private static final String APPOINTMENT_DATE = "Appointment date";
	private static final String SHOW_OLD_CHRONIC_CARE_CARD = "pihmalawi.showOldChronicCareCard";

	public List<EMastercardAccess> evaluateAll(Patient patient) {
		List<EMastercardAccess> ret = new ArrayList<EMastercardAccess>();
		for (EMastercard m : EMastercardRegistry.getAll()) {
			ret.add(evaluate(patient, m));
		}
		return ret;
	}

	public EMastercardAccess evaluate(Patient p, EMastercard m) {
		EMastercardAccess access = new EMastercardAccess(m, p);
		access.setDisplayed(isDisplayed(p, m));
		if (!access.isDisplayed()) {
			return access;
		}
		if (m.isKaposisSarcoma()) {
			evaluateKaposisSarcoma(p, access);
			return access;
		}

		Form f = Helper.getForm(m.getFormName());
		EncounterType initialEncounterType = Helper.getEncounterType(m.getInitialEncounterType());
		EncounterType followupEncounterType = Helper.getEncounterType(m.getFollowupEncounterType());
		PatientIdentifierType identifierType = Helper.getPatientIdentifierType(m.getPatientIdentifierType());
		if (f == null || initialEncounterType == null
		        || (followupEncounterType == null && StringUtils.isNotBlank(m.getFollowupEncounterType()))
		        || (identifierType == null && StringUtils.isNotBlank(m.getPatientIdentifierType()))) {
			return unavailable(access, "Not available: Wrong configuration");
		}

		List<Encounter> initials = Utils.getEncounters(p, initialEncounterType);
		if (initials.size() > 1) {
			return unavailable(access, "Not available: Multiple " + f.getName() + " forms found");
		}

		List<ProgramWorkflowState> states = Helper.getProgramWorkflowStatesFromCsvIds(StringUtils.join(m.getActiveStateUuids(), ","));
		List<ProgramWorkflow> workflows = new ArrayList<ProgramWorkflow>();
		for (ProgramWorkflowState state : states) {
			if (!workflows.contains(state.getProgramWorkflow())) {
				workflows.add(state.getProgramWorkflow());
			}
		}
		access.setEnrolment(enrolment(p, workflows));
		access.setTreatmentState(treatmentState(p, m, states));
		boolean readonly = m.isReadonlyOnceArtInitial() && hasEncounterOfType(p, "ART_INITIAL");
		access.setReadonlyNote(readonly);
		String name = f.getName();

		if (initials.isEmpty()) {
			if (!Helper.userHasEditPrivilege()) {
				return unavailable(access, "Not available: User does not have privileges to edit patient");
			}
			if (!Helper.isInProgramWorkflowState(p, states)) {
				return unavailable(access, "Not available: Inactive program state (" + name + ")");
			}
			if (!Helper.hasIdentifierType(p, identifierType)) {
				return unavailable(access, "Not available: No identifier (" + name + ")");
			}
			if (!Helper.hasIdentifierForEnrollmentLocation(p, identifierType, workflows)) {
				return unavailable(access, "Not available: No identifier for current enrollment location (" + name + ")");
			}
			String missingCondition = missingCondition(p, m);
			if (missingCondition != null) {
				return unavailable(access, "Not available: " + missingCondition + " diagnosis (" + name + ")");
			}
			if (readonly) {
				return unavailable(access, "Not available (" + name + ")");
			}
			if (p.isDead()) {
				return unavailable(access, "Not available: Patient dead (" + name + ")");
			}
			access.setState(EMastercardState.CREATE);
			return access;
		}

		access.setInitialEncounter(initials.get(0));
		addVisitDetails(p, access, followupEncounterType);
		if (!Helper.userHasEditPrivilege()) {
			return view(access, null);
		}
		if (!Helper.isInProgramWorkflowState(p, states)) {
			return view(access, "Readonly: Inactive program state");
		}
		if (!Helper.hasIdentifierType(p, identifierType)) {
			return view(access, "Readonly: No identifier");
		}
		if (!Helper.hasIdentifierForEnrollmentLocation(p, identifierType, workflows)) {
			return view(access, "Readonly: No identifier for current enrollment location");
		}
		if (readonly || p.isDead()) {
			return view(access, null);
		}
		access.setState(EMastercardState.EDIT);
		return access;
	}

	private boolean isDisplayed(Patient p, EMastercard m) {
		if (m.getRequiredPrivilege() != null && !Context.hasPrivilege(m.getRequiredPrivilege())) {
			return false;
		}
		if (m.getDisplay() == EMastercard.Display.OLD_CHRONIC_CARE) {
			String gp = Context.getAdministrationService().getGlobalProperty(SHOW_OLD_CHRONIC_CARE_CARD, "true");
			return "true".equals(gp);
		}
		if (m.getDisplay() == EMastercard.Display.TEEN_CLUB) {
			Integer age = p.getAge();
			boolean eligibleAge = age != null && age > 5 && age < 30;
			return (eligibleAge && hasProgramEnrollment(p, "HIV PROGRAM")) || hasProgramEnrollment(p, "Teen club program");
		}
		return true;
	}

	private void evaluateKaposisSarcoma(Patient p, EMastercardAccess access) {
		if (!Helper.userHasEditPrivilege()) {
			unavailable(access, "Not available: User does not have privileges to edit patient");
		} else if (hasEncounterOfType(p, "CHEMOTHERAPY") || hasEncounterOfType(p, "PATIENT EVALUATION")) {
			access.setState(EMastercardState.EDIT);
		} else {
			access.setState(EMastercardState.CREATE);
		}
	}

	/**
	 * @return null when the card has no diagnosis condition or the patient has one of its diagnoses, otherwise the
	 *         diagnoses the card needs, as the dashboard lists them
	 */
	private String missingCondition(Patient p, EMastercard m) {
		if (StringUtils.isBlank(m.getConditionConceptUuid()) || m.getConditionAnswerUuids().isEmpty()) {
			return null;
		}
		Concept condition = Context.getConceptService().getConceptByUuid(m.getConditionConceptUuid());
		List<Concept> answers = Helper.getConceptsFromString(StringUtils.join(m.getConditionAnswerUuids(), ","));
		if (condition == null || answers.isEmpty() || Helper.hasCondition(p, condition, answers)) {
			return null;
		}
		List<String> names = new ArrayList<String>();
		for (Concept answer : answers) {
			names.add(answer.getDisplayString());
		}
		return StringUtils.join(names, ",");
	}

	private void addVisitDetails(Patient p, EMastercardAccess access, EncounterType followupEncounterType) {
		List<Encounter> followups = Utils.getEncounters(p, followupEncounterType);
		if (followups.isEmpty()) {
			return;
		}
		Encounter lastFollowup = followups.get(followups.size() - 1);
		access.setLastVisitDate(lastFollowup.getEncounterDatetime());
		access.setLastVisitLocation(lastFollowup.getLocation() == null ? null : lastFollowup.getLocation().getName());
		Concept appointment = Context.getConceptService().getConcept(APPOINTMENT_DATE);
		Date startOfDay = DateUtil.getStartOfDay(lastFollowup.getEncounterDatetime());
		Date endOfDay = DateUtil.getEndOfDay(lastFollowup.getEncounterDatetime());
		List<Obs> obs = Context.getObsService().getObservations(Arrays.asList((Person) p), Arrays.asList(lastFollowup),
		    Arrays.asList(appointment), null, null, null, Arrays.asList("dateCreated"), 1, null, startOfDay, endOfDay, false);
		if (!obs.isEmpty()) {
			access.setAppointmentDate(obs.get(0).getValueDatetime());
		}
	}

	/**
	 * @return the patient's enrolment in the programs of the card's workflows: the active one enrolled most recently,
	 *         else the one enrolled most recently, or null when there is none
	 */
	private PatientProgram enrolment(Patient p, List<ProgramWorkflow> workflows) {
		List<Program> programs = new ArrayList<Program>();
		for (ProgramWorkflow workflow : workflows) {
			if (!programs.contains(workflow.getProgram())) {
				programs.add(workflow.getProgram());
			}
		}
		PatientProgram latest = null;
		PatientProgram latestActive = null;
		for (Program program : programs) {
			for (PatientProgram pp : Context.getProgramWorkflowService().getPatientPrograms(p, program, null, null, null, null, false)) {
				if (pp.getDateEnrolled() == null) {
					continue;
				}
				if (latest == null || pp.getDateEnrolled().after(latest.getDateEnrolled())) {
					latest = pp;
				}
				if (pp.getActive() && (latestActive == null || pp.getDateEnrolled().after(latestActive.getDateEnrolled()))) {
					latestActive = pp;
				}
			}
		}
		return latestActive != null ? latestActive : latest;
	}

	/**
	 * @return the patient's current state in the card's own workflows: those of the states only this card lists.
	 *         The mental health and epilepsy cards share the Chronic care treatment status workflow, but each has its
	 *         own treatment workflow, whose state is the one that card's page shows.
	 */
	private PatientState treatmentState(Patient p, EMastercard m, List<ProgramWorkflowState> states) {
		List<ProgramWorkflow> own = new ArrayList<ProgramWorkflow>();
		for (ProgramWorkflowState state : states) {
			if (!listedByAnotherCard(m, state.getUuid()) && !own.contains(state.getProgramWorkflow())) {
				own.add(state.getProgramWorkflow());
			}
		}
		PatientState latest = null;
		for (ProgramWorkflow workflow : own) {
			PatientState ps = Helper.getMostRecentStateAtDate(p, workflow, new Date());
			if (ps != null && (latest == null || ps.getStartDate().after(latest.getStartDate()))) {
				latest = ps;
			}
		}
		return latest;
	}

	private boolean listedByAnotherCard(EMastercard m, String stateUuid) {
		for (EMastercard other : EMastercardRegistry.getAll()) {
			if (other != m) {
				for (String uuid : other.getActiveStateUuids()) {
					if (uuid.equalsIgnoreCase(stateUuid)) {
						return true;
					}
				}
			}
		}
		return false;
	}

	private boolean hasEncounterOfType(Patient p, String encounterTypeName) {
		EncounterType type = Context.getEncounterService().getEncounterType(encounterTypeName);
		return type != null && !Utils.getEncounters(p, type).isEmpty();
	}

	private boolean hasProgramEnrollment(Patient p, String programName) {
		for (PatientProgram pp : Context.getProgramWorkflowService().getPatientPrograms(p, null, null, null, null, null, false)) {
			if (programName.equals(pp.getProgram().getName())) {
				return true;
			}
		}
		return false;
	}

	private EMastercardAccess unavailable(EMastercardAccess access, String message) {
		access.setState(EMastercardState.UNAVAILABLE);
		access.setMessage(message);
		return access;
	}

	private EMastercardAccess view(EMastercardAccess access, String message) {
		access.setState(EMastercardState.VIEW);
		access.setMessage(message);
		return access;
	}
}
