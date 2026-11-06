package org.openmrs.module.pihmalawi.rest.controller;

import org.openmrs.Patient;
import org.openmrs.PatientProgram;
import org.openmrs.PatientState;
import org.openmrs.api.PatientService;
import org.openmrs.api.context.Context;
import org.openmrs.module.pihmalawi.emastercard.EMastercard;
import org.openmrs.module.pihmalawi.emastercard.EMastercardAccess;
import org.openmrs.module.pihmalawi.emastercard.EMastercardFormIndex;
import org.openmrs.module.pihmalawi.emastercard.EMastercardService;
import org.openmrs.module.webservices.rest.SimpleObject;
import org.openmrs.module.webservices.rest.web.RestConstants;
import org.openmrs.util.PrivilegeConstants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * The eMastercards a patient's dashboard shows, with what the current user can do with each of them, for the
 * O3 patient chart
 */
@Controller
@RequestMapping("/rest/" + RestConstants.VERSION_1 + EMastercardRestController.PIHMALAWI + EMastercardRestController.EMASTERCARDS)
public class EMastercardRestController {

	public static final String PIHMALAWI = "/pihmalawi";
	public static final String EMASTERCARDS = "/emastercards";

	/** Tags the locations the ART forms (and other Neno forms) may be recorded at */
	public static final String SYSTEM_LOCATIONS_TAG = "pihmalawi.systemLocationsTag";

	@Autowired
	private PatientService patientService;

	@Autowired
	private EMastercardService emastercardService;

	@Autowired
	private EMastercardFormIndex emastercardFormIndex;

	@RequestMapping(method = RequestMethod.GET)
	@ResponseBody
	public ResponseEntity<SimpleObject> get(@RequestParam("patient") String patientUuid) {
		Patient patient = patientService.getPatientByUuid(patientUuid);
		if (patient == null || patient.getVoided()) {
			SimpleObject error = new SimpleObject().add("error", new SimpleObject().add("message", "Patient not found"));
			return new ResponseEntity<SimpleObject>(error, HttpStatus.NOT_FOUND);
		}
		List<SimpleObject> results = new ArrayList<SimpleObject>();
		for (EMastercardAccess access : emastercardService.evaluateAll(patient)) {
			if (access.isDisplayed()) {
				results.add(toSimpleObject(access));
			}
		}
		SimpleObject body = new SimpleObject().add("results", results).add("systemLocationsTag", systemLocationsTag());
		return new ResponseEntity<SimpleObject>(body, HttpStatus.OK);
	}

	private SimpleObject toSimpleObject(EMastercardAccess access) {
		EMastercard m = access.getMastercard();
		SimpleObject ret = new SimpleObject();
		ret.add("key", m.getKey());
		ret.add("group", m.getGroup());
		ret.add("label", m.getFormName());
		ret.add("state", access.getState().name());
		ret.add("message", access.getMessage());
		ret.add("readonlyNote", access.isReadonlyNote());
		ret.add("initialEncounterUuid", access.getInitialEncounter() == null ? null : access.getInitialEncounter().getUuid());
		ret.add("created", format(access.getCreated()));
		ret.add("lastVisit", format(access.getLastVisitDate()));
		ret.add("lastVisitLocation", access.getLastVisitLocation());
		ret.add("appointment", format(access.getAppointmentDate()));
		ret.add("enrolment", enrolment(access.getEnrolment(), access.getTreatmentState()));
		ret.add("flowsheetPath", access.getFlowsheetPath());
		ret.add("formUuids", emastercardFormIndex.formUuidsFor(m));
		ret.add("encounterTypeUuids", new ArrayList<String>(emastercardFormIndex.encounterTypeUuidsFor(m)));
		return ret;
	}

	/**
	 * @return the card's program enrolment as the chart shows it: the state of the card's own workflow and since when ("On treatment since
	 *         16-Oct-2026 at Neno District Hospital"), else the enrolment date
	 */
	private SimpleObject enrolment(PatientProgram pp, PatientState state) {
		if (pp == null) {
			return null;
		}
		SimpleObject ret = new SimpleObject();
		ret.add("uuid", pp.getUuid());
		ret.add("program", pp.getProgram().getName());
		ret.add("dateEnrolled", format(pp.getDateEnrolled()));
		ret.add("dateCompleted", format(pp.getDateCompleted()));
		ret.add("location", pp.getLocation() == null ? null
		        : new SimpleObject().add("uuid", pp.getLocation().getUuid()).add("display", pp.getLocation().getName()));
		ret.add("state", state == null ? null
		        : new SimpleObject().add("name", state.getState().getConcept().getName().getName())
		                .add("startDate", format(state.getStartDate())));
		return ret;
	}

	private String systemLocationsTag() {
		try {
			Context.addProxyPrivilege(PrivilegeConstants.GET_GLOBAL_PROPERTIES);
			return Context.getAdministrationService().getGlobalProperty(SYSTEM_LOCATIONS_TAG);
		}
		finally {
			Context.removeProxyPrivilege(PrivilegeConstants.GET_GLOBAL_PROPERTIES);
		}
	}

	private String format(Date date) {
		return date == null ? null : new SimpleDateFormat("yyyy-MM-dd").format(date);
	}
}
