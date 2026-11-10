package org.openmrs.module.pihmalawi.rest.controller;

import org.apache.commons.lang.StringUtils;
import org.openmrs.Location;
import org.openmrs.Patient;
import org.openmrs.PatientProgram;
import org.openmrs.PatientState;
import org.openmrs.ProgramWorkflowState;
import org.openmrs.api.APIAuthenticationException;
import org.openmrs.api.APIException;
import org.openmrs.api.context.Context;
import org.openmrs.module.pihmalawi.quickprograms.QuickProgram;
import org.openmrs.module.pihmalawi.quickprograms.QuickProgramException;
import org.openmrs.module.pihmalawi.quickprograms.QuickProgramRegistry;
import org.openmrs.module.pihmalawi.quickprograms.QuickProgramService;
import org.openmrs.module.pihmalawi.quickprograms.QuickProgramStatus;
import org.openmrs.module.pihmalawi.quickprograms.QuickProgramWorkflowStatus;
import org.openmrs.module.webservices.rest.SimpleObject;
import org.openmrs.module.webservices.rest.web.RestConstants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * The patient dashboard's Quick Programs for the O3 patient chart: what each program offers a patient, and the
 * enroll, change state and exit actions, with the same rules as the legacy dashboard
 */
@Controller
@RequestMapping("/rest/" + RestConstants.VERSION_1 + QuickProgramsRestController.PIHMALAWI + QuickProgramsRestController.QUICK_PROGRAMS)
public class QuickProgramsRestController {

	public static final String PIHMALAWI = "/pihmalawi";
	public static final String QUICK_PROGRAMS = "/quickprograms";
	private static final String EDIT_PATIENTS = "Edit Patients";

	@Autowired
	private QuickProgramService quickProgramService;

	@RequestMapping(method = RequestMethod.GET)
	@ResponseBody
	public ResponseEntity<SimpleObject> get(@RequestParam("patient") String patientUuid) {
		Patient patient = Context.getPatientService().getPatientByUuid(patientUuid);
		if (patient == null || patient.getVoided()) {
			return error(HttpStatus.NOT_FOUND, "Patient not found");
		}
		List<SimpleObject> results = new ArrayList<SimpleObject>();
		for (QuickProgramStatus status : quickProgramService.statusAll(patient)) {
			if (status.isDisplayed() && !status.getWorkflows().isEmpty()) {
				results.add(toSimpleObject(status));
			}
		}
		return new ResponseEntity<SimpleObject>(new SimpleObject().add("results", results), HttpStatus.OK);
	}

	@RequestMapping(value = "/enrol", method = RequestMethod.POST)
	@ResponseBody
	public ResponseEntity<SimpleObject> enrol(@RequestBody Map<String, Object> body) {
		if (!Context.hasPrivilege(EDIT_PATIENTS)) {
			return error(HttpStatus.FORBIDDEN, "You don't have privileges to edit patients");
		}
		Patient patient = Context.getPatientService().getPatientByUuid(string(body, "patient"));
		QuickProgram program = QuickProgramRegistry.get(string(body, "program"));
		if (patient == null || patient.getVoided() || program == null) {
			return error(HttpStatus.NOT_FOUND, patient == null ? "Patient not found" : "Program not found");
		}
		List<ProgramWorkflowState> states = new ArrayList<ProgramWorkflowState>();
		Object stateUuids = body.get("states");
		if (stateUuids instanceof List) {
			for (Object uuid : (List<?>) stateUuids) {
				ProgramWorkflowState state = Context.getProgramWorkflowService().getStateByUuid(String.valueOf(uuid));
				if (state == null) {
					return error(HttpStatus.NOT_FOUND, "State not found: " + uuid);
				}
				states.add(state);
			}
		}
		Location location = StringUtils.isBlank(string(body, "location")) ? null
		        : Context.getLocationService().getLocationByUuid(string(body, "location"));
		try {
			quickProgramService.enrol(patient, program, states, date(body), location);
		}
		catch (APIException e) {
			return apiError(e);
		}
		return new ResponseEntity<SimpleObject>(toSimpleObject(quickProgramService.status(patient, program)), HttpStatus.OK);
	}

	@RequestMapping(value = "/change", method = RequestMethod.POST)
	@ResponseBody
	public ResponseEntity<SimpleObject> change(@RequestBody Map<String, Object> body) {
		return changeOrExit(body, false);
	}

	@RequestMapping(value = "/exit", method = RequestMethod.POST)
	@ResponseBody
	public ResponseEntity<SimpleObject> exit(@RequestBody Map<String, Object> body) {
		return changeOrExit(body, true);
	}

	private ResponseEntity<SimpleObject> changeOrExit(Map<String, Object> body, boolean exit) {
		if (!Context.hasPrivilege(EDIT_PATIENTS)) {
			return error(HttpStatus.FORBIDDEN, "You don't have privileges to edit patients");
		}
		PatientProgram pp = Context.getProgramWorkflowService().getPatientProgramByUuid(string(body, "patientProgram"));
		if (pp == null || pp.getVoided()) {
			return error(HttpStatus.NOT_FOUND, "Enrollment not found");
		}
		// change takes "states", one per workflow, or a single "state"; exit takes "state"
		List<String> stateUuids = new ArrayList<String>();
		if (!exit && body.get("states") instanceof List) {
			for (Object uuid : (List<?>) body.get("states")) {
				stateUuids.add(String.valueOf(uuid));
			}
		} else if (string(body, "state") != null) {
			stateUuids.add(string(body, "state"));
		}
		List<ProgramWorkflowState> states = new ArrayList<ProgramWorkflowState>();
		for (String uuid : stateUuids) {
			ProgramWorkflowState state = Context.getProgramWorkflowService().getStateByUuid(uuid);
			if (state == null) {
				return error(HttpStatus.NOT_FOUND, "State not found: " + uuid);
			}
			states.add(state);
		}
		if (exit && states.isEmpty()) {
			return error(HttpStatus.BAD_REQUEST, "Choose how the patient leaves the program");
		}
		QuickProgram program = programOf(pp);
		if (program == null) {
			return error(HttpStatus.NOT_FOUND, "This enrollment isn't in any of the Quick Programs");
		}
		try {
			if (exit) {
				quickProgramService.exit(program, pp, states.get(0), date(body), string(body, "transferredOutLocation"));
			} else {
				quickProgramService.changeStates(program, pp, states, date(body));
			}
		}
		catch (APIException e) {
			return apiError(e);
		}
		return new ResponseEntity<SimpleObject>(toSimpleObject(quickProgramService.status(pp.getPatient(), program)),
		        HttpStatus.OK);
	}

	/**
	 * A rule the action broke, as 400 with its message, rather than a server error; core's own validation of the
	 * enrollment and its privileges included
	 */
	private ResponseEntity<SimpleObject> apiError(APIException e) {
		if (e instanceof APIAuthenticationException) {
			return error(HttpStatus.FORBIDDEN, e.getMessage());
		}
		return error(HttpStatus.BAD_REQUEST, e instanceof QuickProgramException ? e.getMessage()
		        : "The enrollment couldn't be saved: " + e.getMessage());
	}

	/**
	 * @return the quick program whose states belong to the enrollment's program
	 */
	private QuickProgram programOf(PatientProgram pp) {
		for (QuickProgram program : QuickProgramRegistry.getAll()) {
			for (QuickProgramWorkflowStatus ws : quickProgramService.status(pp.getPatient(), program).getWorkflows()) {
				if (ws.getWorkflow().getProgram().equals(pp.getProgram())) {
					return program;
				}
			}
		}
		return null;
	}

	private SimpleObject toSimpleObject(QuickProgramStatus status) {
		SimpleObject ret = new SimpleObject();
		ret.add("key", status.getProgram().getKey());
		ret.add("label", status.getProgram().getLabel());
		ret.add("available", status.isAvailable());
		ret.add("canEdit", Context.hasPrivilege(EDIT_PATIENTS));
		ret.add("multipleWorkflows", !status.getProgram().getWorkflowUuids().isEmpty());
		ret.add("enrolment", enrolment(status.getPatientProgram()));
		SimpleObject last = enrolment(status.getLastEnrolment());
		if (last != null) {
			last.add("dateCompleted", format(status.getLastEnrolment().getDateCompleted()));
			last.add("exitState", exitState(status.getLastEnrolment()));
		}
		ret.add("lastEnrolment", last);
		List<SimpleObject> workflows = new ArrayList<SimpleObject>();
		for (QuickProgramWorkflowStatus ws : status.getWorkflows()) {
			SimpleObject w = new SimpleObject();
			w.add("uuid", ws.getWorkflow().getUuid());
			w.add("name", ws.getWorkflow().getConcept().getName().getName());
			w.add("open", ws.isOpen());
			PatientState current = ws.getCurrentState();
			w.add("currentState", current == null ? null : state(current.getState()).add("startDate", format(current.getStartDate())));
			w.add("enrolStates", states(ws.getEnrolStates()));
			w.add("changeStates", states(ws.getChangeStates()));
			workflows.add(w);
		}
		ret.add("workflows", workflows);
		ret.add("enrolStates", states(status.getEnrolStates()));
		ret.add("changeStates", states(status.getChangeStates()));
		List<SimpleObject> exitStates = new ArrayList<SimpleObject>();
		for (ProgramWorkflowState s : status.getExitStates()) {
			exitStates.add(state(s).add("workflow", s.getProgramWorkflow().getConcept().getName().getName())
			        .add("kind", quickProgramService.exitKind(s).name()));
		}
		ret.add("exitStates", exitStates);
		return ret;
	}

	private SimpleObject enrolment(PatientProgram pp) {
		if (pp == null) {
			return null;
		}
		SimpleObject location = pp.getLocation() == null ? null
		        : new SimpleObject().add("uuid", pp.getLocation().getUuid()).add("display", pp.getLocation().getName());
		return new SimpleObject().add("uuid", pp.getUuid()).add("dateEnrolled", format(pp.getDateEnrolled())).add("location",
		    location);
	}

	/**
	 * @return how the enrollment ended: the terminal state it was completed with, else the outcome recorded when it was
	 *         completed (e.g. from the Programs tab), if any
	 */
	private SimpleObject exitState(PatientProgram pp) {
		PatientState last = null;
		for (PatientState ps : pp.getStates()) {
			if (!ps.getVoided() && ps.getState().getTerminal()
			        && (last == null || (ps.getStartDate() != null && last.getStartDate() != null
			                && ps.getStartDate().after(last.getStartDate())))) {
				last = ps;
			}
		}
		if (last != null) {
			return state(last.getState());
		}
		if (pp.getOutcome() != null) {
			return new SimpleObject().add("uuid", pp.getOutcome().getUuid()).add("name", pp.getOutcome().getName().getName());
		}
		return null;
	}

	private List<SimpleObject> states(List<ProgramWorkflowState> states) {
		List<SimpleObject> ret = new ArrayList<SimpleObject>();
		for (ProgramWorkflowState s : states) {
			ret.add(state(s));
		}
		return ret;
	}

	private SimpleObject state(ProgramWorkflowState s) {
		return new SimpleObject().add("uuid", s.getUuid()).add("name", s.getConcept().getName().getName());
	}

	private ResponseEntity<SimpleObject> error(HttpStatus status, String message) {
		return new ResponseEntity<SimpleObject>(new SimpleObject().add("error", new SimpleObject().add("message", message)),
		        status);
	}

	private String string(Map<String, Object> body, String key) {
		Object value = body.get(key);
		return value == null ? null : String.valueOf(value);
	}

	private Date date(Map<String, Object> body) {
		String value = string(body, "date");
		if (StringUtils.isBlank(value)) {
			return null;
		}
		try {
			return new SimpleDateFormat("yyyy-MM-dd").parse(value);
		}
		catch (ParseException e) {
			throw new QuickProgramException("The date must be yyyy-MM-dd");
		}
	}

	private String format(Date date) {
		return date == null ? null : new SimpleDateFormat("yyyy-MM-dd").format(date);
	}
}
