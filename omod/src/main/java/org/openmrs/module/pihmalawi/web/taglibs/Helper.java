package org.openmrs.module.pihmalawi.web.taglibs;

import org.apache.commons.lang.StringUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.openmrs.Concept;
import org.openmrs.EncounterType;
import org.openmrs.Form;
import org.openmrs.Obs;
import org.openmrs.Location;
import org.openmrs.Patient;
import org.openmrs.Person;
import org.openmrs.PatientIdentifier;
import org.openmrs.PatientIdentifierType;
import org.openmrs.PatientProgram;
import org.openmrs.PatientState;
import org.openmrs.ProgramWorkflow;
import org.openmrs.ProgramWorkflowState;
import org.openmrs.api.ProgramWorkflowService;
import org.openmrs.api.context.Context;
import org.openmrs.util.OpenmrsUtil;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.StringTokenizer;

/**
 * Helper utility methods for use with the module
 */
public class Helper {

	protected static final Log log = LogFactory.getLog(Helper.class);
	
	/**
	 * @return true if the passed patient has an identifier of the passed type, false otherwise
	 */
	public static boolean hasIdentifierType(Patient p, PatientIdentifierType patientIdentifierType) {
		if (patientIdentifierType == null) {
			// no patientIdentifierType specified, simply accept
			return true;
		}
		return !p.getPatientIdentifiers(patientIdentifierType).isEmpty();
	}

	public static boolean hasCondition(Patient p, Concept condition, List<Concept> answers) {
		boolean conditionPresent = false;
		if (p!=null && condition !=null && answers != null && answers.size() > 0) {
			List<Obs> obs = Context.getObsService().getObservations(
					Arrays.asList((Person) p),
					null,
					Arrays.asList(condition),
					answers,
					null,
					null,
					null,
					1,
					null,
					null,
					null,
					false);
			if (!obs.isEmpty()) {
				conditionPresent = true;
			}

		}
		return conditionPresent;
	}
	
	/**
	 * @return true if the passed patient has an identifier of the passed type whose location is the same as
	 * their current PatientProgram location that is associated with the passed states
	 */
	public static boolean hasIdentifierForEnrollmentLocation(Patient p, PatientIdentifierType identifierType, List<ProgramWorkflow> workflows) {
		if (identifierType == null) {
			// no identifierType specified, simply accept
			return true;
		}
		List<PatientIdentifier> pis = p.getPatientIdentifiers(identifierType);
		if ( workflows!= null && !workflows.isEmpty()) {
			for (ProgramWorkflow workflow : workflows) {
				Location enrollmentLocation = currentEnrollmentLocation(p, workflow);
				for (PatientIdentifier pi : pis) {
					if (pi.getLocation() != null && enrollmentLocation != null && pi.getLocation().getId() == enrollmentLocation.getId()) {
						return true;
					}
				}
			}
		}

		return false;
	}
	
	/**
	 * @return true if the given patient is currently in one of the passed states
	 */
	public static boolean isInProgramWorkflowState(Patient p, List<ProgramWorkflowState> programWorkflowStates) {
		if (programWorkflowStates == null || programWorkflowStates.isEmpty()) {
			// no states specified, simply accept
			return true;
		}
		for (ProgramWorkflowState programWorkflowState : programWorkflowStates) {
			PatientState ps = getMostRecentStateAtDate(p, programWorkflowState.getProgramWorkflow(), new Date());
			if (ps != null && programWorkflowStates.contains(ps.getState())) {
				return true;
			}
		}
		return false;
	}

    public static boolean userHasEditPrivilege(){
        return Context.getAuthenticatedUser().hasPrivilege("Edit Patients");
    }
	/**
	 * @return the most recent state in the given ProgramWorkflow for the given Patient as of the passed endDate
	 */
	public static PatientState getMostRecentStateAtDate(Patient p, ProgramWorkflow programWorkflow, Date endDate) {
		PatientState lastStateOnDate = null;
		
		ProgramWorkflowService pws = Context.getProgramWorkflowService();
		List<PatientProgram> pps = pws.getPatientPrograms(p, programWorkflow.getProgram(), null, null, null, null, false);
		
		for (PatientProgram pp : pps) {
			if (pp.getActive(endDate)) {
				// assuming there is only one active PatientProgram (might be wrong)
				List<PatientState> states = statesInWorkflow(pp, programWorkflow);
				for (PatientState state : states) {
					if (state.getStartDate().getTime() < endDate.getTime()) {
						// assuming the states are ordered
						lastStateOnDate = state;
					}
				}
			}
		}
		return lastStateOnDate;
	}

	/**
	 *
	 * @param csvConceptIds a String containing comma-separated Concept UUIDs
	 * @return the List of Concept that match the given UUIDs
	 */
	public static List<Concept> getConceptsFromString(String csvConceptIds) {
		List<Concept> concepts = new ArrayList<Concept>();
		if (StringUtils.isNotBlank(csvConceptIds)) {
			StringTokenizer st = new StringTokenizer(csvConceptIds, ",");
			while (st.hasMoreTokens()) {
				Concept concept = null;
				String uuid = st.nextToken().trim();
				concept = Context.getConceptService().getConceptByUuid(uuid);
				if (concept != null) {
					concepts.add(concept);
				}
			}
		}
		return concepts;
	}

	public static List<ProgramWorkflow> getProgramWorkflowsFromUuidsList(String workflowUuids) {
		List<ProgramWorkflow> workflows = new ArrayList<>();
		if (StringUtils.isNotBlank(workflowUuids)) {
			StringTokenizer st = new StringTokenizer(workflowUuids, ",");
			while (st.hasMoreTokens()) {
				String uuid = st.nextToken().trim();
				ProgramWorkflow workflow = Context.getProgramWorkflowService().getWorkflowByUuid(uuid);
				if (workflow != null) {
					workflows.add(workflow);
				}
			}
		}
		return workflows;
	}

	/**
	 * @return the Form matching the given value as a UUID first, then as a name, otherwise null
	 */
	public static Form getForm(String uuidOrName) {
		if (StringUtils.isBlank(uuidOrName)) {
			return null;
		}
		Form f = Context.getFormService().getFormByUuid(uuidOrName);
		if (f == null) {
			f = Context.getFormService().getForm(uuidOrName);
		}
		return f;
	}

	/**
	 * @return the EncounterType matching the given value as a UUID first, then as a name, otherwise null
	 */
	public static EncounterType getEncounterType(String uuidOrName) {
		if (StringUtils.isBlank(uuidOrName)) {
			return null;
		}
		EncounterType et = Context.getEncounterService().getEncounterTypeByUuid(uuidOrName);
		if (et == null) {
			et = Context.getEncounterService().getEncounterType(uuidOrName);
		}
		return et;
	}

	/**
	 * @return the PatientIdentifierType matching the given value as a UUID first, then as a name, otherwise null
	 */
	public static PatientIdentifierType getPatientIdentifierType(String uuidOrName) {
		if (StringUtils.isBlank(uuidOrName)) {
			return null;
		}
		PatientIdentifierType pit = Context.getPatientService().getPatientIdentifierTypeByUuid(uuidOrName);
		if (pit == null) {
			pit = Context.getPatientService().getPatientIdentifierTypeByName(uuidOrName);
		}
		return pit;
	}

	/**
	 * @param csvStateIds a String containing comma-separated programWorkflowState ids or UUIDs
	 * @return the List of ProgramWorkflowStates that match the given ids
	 */
	@SuppressWarnings("deprecation")
	public static List<ProgramWorkflowState> getProgramWorkflowStatesFromCsvIds(String csvStateIds) {
		List<ProgramWorkflowState> states = new ArrayList<ProgramWorkflowState>();
		if (StringUtils.isBlank(csvStateIds)) {
			return states;
		}
		StringTokenizer st = new StringTokenizer(csvStateIds, ",");
		while (st.hasMoreTokens()) {
			ProgramWorkflowState state = null;
			String id = st.nextToken().trim();
			try {
				int anInt = Integer.parseInt(id);
				state = Context.getProgramWorkflowService().getState(new Integer(id));
			}catch (NumberFormatException ex) {
				// id is not an integer, it should be an UUID then
				state = Context.getProgramWorkflowService().getStateByUuid(id);
			}
			if (state != null ) {
				states.add(state);
			}
		}
		return states;
	}

	public static List<ProgramWorkflowState> getProgramWorkflowStates(ProgramWorkflow workflow, Boolean initial, Boolean terminal) {
		List<ProgramWorkflowState>	workflowStates = new ArrayList<>();
		if ( workflow != null ) {
			Set<ProgramWorkflowState> states = workflow.getStates();
			for (ProgramWorkflowState state : states) {
				if (!state.getRetired() ) {
					if ( (initial != null && !state.getInitial().equals(initial)) ||
							(terminal != null && !state.getTerminal().equals(terminal))) {
						//do not return states that do not match the requested Initial or Terminal requested value
						continue;
					}
					workflowStates.add(state);
				}
			}
		}
		return workflowStates;
	}

	/**
	 * 	Quick hack copied from bugfix for PatientProgram from ProgramLocation module
	 *  once OpenMRS can handle same-day-transitions this could be removed
	 *  @return all non-voided PatientStates for the given Patient and ProgramWorkflow, ordered by date asc
	 */
	public static List<PatientState> statesInWorkflow(PatientProgram patientProgram, ProgramWorkflow programWorkflow) {
		List<PatientState> ret = new ArrayList<PatientState>();
		for (PatientState st : patientProgram.getStates()) {
			if (st.getState().getProgramWorkflow().equals(programWorkflow) && !st.getVoided()) {
				ret.add(st);
			}
		}
		Collections.sort(ret, new Comparator<PatientState>() {
			public int compare(PatientState left, PatientState right) {
				// check if one of the states is active 
				if (left.getActive()) {
					return 1;
				}
				if (right.getActive()) {
					return -1;
				}
				return OpenmrsUtil.compareWithNullAsEarliest(left.getStartDate(), right.getStartDate());
			}
		});
		return ret;
	}
	
	/**
	 * @return a formatted Date
	 */
	public static String formatDate(Date date) {
		if (date == null) {
			return "??-???-????";
		}
		return new SimpleDateFormat("dd-MMM-yyyy").format(date);
	}
	
	/**
	 * @return the Location associated with the patients most recent enrollment in the given ProgramWorkflow
	 */
	public static Location currentEnrollmentLocation(Patient p, ProgramWorkflow programWorkflow) {
		PatientState ps = getMostRecentStateAtDate(p, programWorkflow, new Date());
		if (ps != null) {
            return ps.getPatientProgram().getLocation();
		}
		return null;
	}
}
