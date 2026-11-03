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
package org.openmrs.module.pihmalawi.web.taglibs;

import org.openmrs.module.pihmalawi.common.Helper;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.jsp.JspException;
import javax.servlet.jsp.JspWriter;
import javax.servlet.jsp.tagext.BodyTagSupport;

import org.apache.commons.lang.StringUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.codehaus.jackson.map.util.JSONPObject;
import org.openmrs.Location;
import org.openmrs.Patient;
import org.openmrs.PatientState;
import org.openmrs.Program;
import org.openmrs.ProgramWorkflow;
import org.openmrs.ProgramWorkflowState;
import org.openmrs.api.context.Context;
import org.openmrs.PatientProgram;
import org.openmrs.module.pihmalawi.PihMalawiConstants;
import org.openmrs.module.pihmalawi.quickprograms.ExitKind;
import org.openmrs.module.pihmalawi.quickprograms.QuickProgramRegistry;
import org.openmrs.module.pihmalawi.quickprograms.QuickProgramService;
import org.openmrs.module.pihmalawi.quickprograms.QuickProgramStatus;
import org.openmrs.module.pihmalawi.quickprograms.QuickProgramWorkflowStatus;

/**
 * Encapsulates the functionality for providing a widget for changing program enrollment states
 */
public class QuickProgramsTag extends BodyTagSupport {

	public static final long serialVersionUID = 128233353L;

	private final Log log = LogFactory.getLog(getClass());

	private Integer patientId;
	private String program;
	private String var;

	/**
	 * Renders the program's enroll, change state and exit controls from {@link QuickProgramService}, as the legacy
	 * dashboard always has. With a var attribute, renders nothing and instead puts the program's
	 * {@link QuickProgramStatus} in that page attribute.
	 *
	 * @see javax.servlet.jsp.tagext.BodyTagSupport#doStartTag()
	 */
	public int doStartTag() throws JspException {
		JspWriter o = pageContext.getOut();

		try {
			Patient patient = Context.getPatientService().getPatient(patientId);
			QuickProgramService service = Context.getRegisteredComponent("quickProgramService", QuickProgramService.class);
			QuickProgramStatus status = service.status(patient, QuickProgramRegistry.get(program));
			if (var != null) {
				pageContext.setAttribute(var, status);
				return SKIP_BODY;
			}
			if (status.getWorkflows().isEmpty()) {
				throw new IllegalStateException("No states configured for quick program " + program);
			}
			Program program = status.getWorkflows().get(0).getWorkflow().getProgram();
			PatientProgram patientProgram = status.getPatientProgram();
			boolean multipleWorkflows = !status.getProgram().getWorkflowUuids().isEmpty();

			boolean quickProgramsAvailable = false;
			if (!patient.isDead()) {
				if (multipleWorkflows) {
					// the order the legacy tag listed workflows in
					Map<ProgramWorkflow, QuickProgramWorkflowStatus> changeable = new HashMap<>();
					for (QuickProgramWorkflowStatus ws : status.getWorkflows()) {
						quickProgramsAvailable = true;
						if (!ws.isOpen()) {
							o.write(enrollProgramWorkflowForm(program, patient, ws.getWorkflow(), ws.getEnrolStates()));
						} else {
							changeable.put(ws.getWorkflow(), ws);
						}
					}
					for (ProgramWorkflow workflow : changeable.keySet()) {
						QuickProgramWorkflowStatus ws = changeable.get(workflow);
						o.write(changeToSelectedStateSubmitTag("Change",
								patientProgram,
								workflow, "stateIdForWorkflow" + workflow.getId(),
								"'dateForPWS" + workflow.getId() + "'")
								+ " " + workflow.getConcept().getName() +" to "
								+ ""
								+ pwStateTag("stateIdForWorkflow" + workflow.getId() , "pwStateName" + workflow.getId(), ws.getChangeStates(), ws.getCurrentState())
								+ " on "
								+ dateTag("dateForPWS" + workflow.getId(), "dateForPWS")
								+ " at " + patientProgram.getLocation().getName() + "<br/><br/>");
					}
					for (ProgramWorkflowState terminalState : status.getExitStates()) {
						ExitKind kind = service.exitKind(terminalState);
						if (kind == ExitKind.TRANSFER_OUT) {
							o.write(transferOutForm(program, patient, terminalState, terminalState.getProgramWorkflow()));
						} else if (kind == ExitKind.DIED) {
							o.write(patientDiedForm(program, patient, terminalState));
						} else {
							o.write(changeToStateSubmitTag("Complete",
									patientProgram,
									terminalState.getProgramWorkflow(), terminalState,
									"'dateForPWS" + terminalState.getId() + "'")
									+ " " + terminalState.getProgramWorkflow().getConcept().getName() + " with "
									+ terminalState.getConcept().getName()
									+ " on "
									+ dateTag("dateForPWS" + terminalState.getId(), "dateForPWS")
									+ " at " + patientProgram.getLocation().getName() + "<br/>");
						}
					}
				} else {
					for (ProgramWorkflowState pws : status.getEnrolStates()) {
						quickProgramsAvailable = true;
						o.write(enrollForm(program, patient, pws));
					}
					for (ProgramWorkflowState pws : status.getChangeStates()) {
						quickProgramsAvailable = true;
						o.write(changeToStateSubmitTag("Change",
								patientProgram,
								pws.getProgramWorkflow(), pws,
								"'dateForPWS" + pws.getId() + "'")
								+ " to "
								+ pws.getConcept().getName()
								+ " on "
								+ dateTag("dateForPWS" + pws.getId(), "dateForPWS")
								+ " at " + patientProgram.getLocation().getName() + "<br/>");
					}
					for (ProgramWorkflowState pws : status.getExitStates()) {
						quickProgramsAvailable = true;
						if (service.exitKind(pws) == ExitKind.TRANSFER_OUT) {
							o.write(transferOutForm(program, patient, pws, null));
						} else {
							o.write(changeToStateSubmitTag("Complete",
									patientProgram,
									pws.getProgramWorkflow(), pws,
									"'dateForPWS" + pws.getId() + "'")
									+ " with "
									+ pws.getConcept().getName()
									+ " on "
									+ dateTag("dateForPWS" + pws.getId(), "dateForPWS")
									+ " at " + patientProgram.getLocation().getName() + "<br/>");
						}
					}
				}
			}
			if (!quickProgramsAvailable) {
				o.write("(not available)<br/>");
			}
		} 
		catch (Throwable e) {
			try {
				log.error("Error processing the QuickProgramsTag", e);
				o.write("Unknown error, call help!");
			} 
			catch (IOException e1) { }
			log.error("Could not write to pageContext", e);
		}
		release();
		return SKIP_BODY;
	}

	private String enrollProgramWorkflowForm(Program program, Patient patient, ProgramWorkflow workflow,
	        List<ProgramWorkflowState> programWorkflowInitialStates) {
		String s = "";
		if (workflow != null ) {
			if (programWorkflowInitialStates !=null && !programWorkflowInitialStates.isEmpty()) {
					s += "<form method=\"post\" action=\"/openmrs/module/quickprograms/enrollInProgramWithStateOnDateAtLocation.form\">\n";
					s += "<input id=\"quickEnrollSubmitButton-" + workflow.getId() + "\" type=\"submit\" value=\"Enroll\"/>\n";
					s += "<input type=\"hidden\" name=\"method\" value=\"enroll\"/>\n";
					s += "<input type=\"hidden\" name=\"patientId\" value=\"" + patient.getId() + "\"/>\n";
					s += "<input type=\"hidden\" name=\"returnPage\" value=\"/openmrs/patientDashboard.form?patientId=" + patient.getId() + "\"/>\n";
					s += "<input type=\"hidden\" name=\"programId\" value=\"" + program.getId() + "\"/>\n";
					s += " in " + workflow.getConcept().getName() + " with \n";
					s += pwStateTag("stateIdForWorkflow" + workflow.getId() , "programworkflowStateId", programWorkflowInitialStates, null) + " on \n";
					s += dateTag("dateEnrolled-" + workflow.getId(), "dateEnrolled") + "\n";
					s += " at <select name=\"locationId\">\n";
					s += "<option value=\"\">Choose a location...</option>\n";

					for (Location l : Context.getLocationService().getAllLocations(false)) {
						s += "<option value=\"" + l.getId() + "\">" + l.getName() + "</option>\n";
					}
					s += "</select>\n";
					s += "</form><br/>";
			}
		}
		return s;
	}
	/**
	 * Private method for constructing a new program enrollment form
	 */
	private String enrollForm(Program program, Patient patient, ProgramWorkflowState pws) {
		String s = "";
		s += "<form method=\"post\" action=\"/openmrs/module/quickprograms/enrollInProgramWithStateOnDateAtLocation.form\">\n";
		s += "<input id=\"quickEnrollSubmitButton-" + pws.getId() + "\" type=\"submit\" value=\"Enroll\"/>\n";
		s += "<input type=\"hidden\" name=\"method\" value=\"enroll\"/>\n";
		s += "<input type=\"hidden\" name=\"patientId\" value=\"" + patient.getId() + "\"/>\n";
		s += "<input type=\"hidden\" name=\"returnPage\" value=\"/openmrs/patientDashboard.form?patientId=" + patient.getId() + "\"/>\n";
		s += "<input type=\"hidden\" name=\"programId\" value=\"" + program.getId() + "\"/>\n";
		s += "<input type=\"hidden\" name=\"programworkflowStateId\" value=\"" + pws.getId() + "\"/>\n";
		s += " with " + pws.getConcept().getName() + " on \n";
		s += dateTag("dateEnrolled-" + pws.getId(), "dateEnrolled") + "\n";
		s += " at <select name=\"locationId\">\n";
		s += "<option value=\"\">Choose a location...</option>\n";

		for (Location l : Context.getLocationService().getAllLocations(false)) {
			s += "<option value=\"" + l.getId() + "\">" + l.getName() + "</option>\n";
		}
		s += "</select>\n";
		s += "</form>";
		return s;
	}

	private String patientDiedForm(Program program, Patient patient, ProgramWorkflowState pws) {
		String s = "";
		s += "<form method=\"post\" action=\"/openmrs/module/quickprograms/patientDied.form\">\n";
		s += "<input id=\"transferOutSubmitButton-" + pws.getId() + "\" type=\"submit\" value=\"Complete\"/>\n";
		s += "<input type=\"hidden\" name=\"method\" value=\"patientDied\"/>\n";
		s += "<input type=\"hidden\" name=\"returnPage\" value=\"/openmrs/patientDashboard.form?patientId=" + patient.getId() + "\"/>\n";
		s += "<input type=\"hidden\" name=\"patientProgramId\" value=\"" + currentPatientProgram(program, patient).getPatientProgramId() + "\"/>\n";
		s += "<input type=\"hidden\" name=\"programworkflowStateId\" value=\"" + pws.getId() + "\"/>\n";
		if ( pws != null && pws.getProgramWorkflow() != null ) {
			s += " " + pws.getProgramWorkflow().getConcept().getName();
		}
		s += " with " + pws.getConcept().getName();
		s += " on \n";
		s += dateTag("dateStateChanged-" + pws.getId(), "dateStateChanged") + "\n";
		s += " at " + currentPatientProgram(program, patient).getLocation().getName() + "<br/>";
		s += "</form>";
		return s;
	}

	/**
	 * Private method for constructing a new transferred out program state form
	 */
	private String transferOutForm(Program program, Patient patient, ProgramWorkflowState pws, ProgramWorkflow workflow) {
		String s = "";
		s += "<form method=\"post\" action=\"/openmrs/module/quickprograms/transferredOutToLocation.form\">\n";
		s += "<input id=\"transferOutSubmitButton-" + pws.getId() + "\" type=\"submit\" value=\"Complete\"/>\n";
		s += "<input type=\"hidden\" name=\"method\" value=\"transferOut\"/>\n";
		s += "<input type=\"hidden\" name=\"patientId\" value=\"" + patient.getId() + "\"/>\n";
		s += "<input type=\"hidden\" name=\"returnPage\" value=\"/openmrs/patientDashboard.form?patientId=" + patient.getId() + "\"/>\n";
		s += "<input type=\"hidden\" name=\"programId\" value=\"" + program.getId() + "\"/>\n";
		s += "<input type=\"hidden\" name=\"patientProgramId\" value=\"" + currentPatientProgram(program, patient).getPatientProgramId() + "\"/>\n";
		s += "<input type=\"hidden\" name=\"programworkflowStateId\" value=\"" + pws.getId() + "\"/>\n";
		if ( workflow != null ) {
			s += " " + workflow.getConcept().getName();
		}
		s += " with " + pws.getConcept().getName();
		s += " to " + transferToLocationTag(pws.getId());
		s += " on \n";
		s += dateTag("dateTransferredOut-" + pws.getId(), "dateTransferredOut") + "\n";
		s += " at " + currentPatientProgram(program, patient).getLocation().getName() + "<br/>";
		s += "</form>";
		return s;
	}

	/**
	 * Utility method for retrieving the current Patient Program for a given Program and Patient
	 */
	private PatientProgram currentPatientProgram(Program program, Patient patient) {
		List<org.openmrs.PatientProgram> pps = Context.getProgramWorkflowService()
				.getPatientPrograms(patient, program, null, null, new Date(), null, false);
		if (pps.size() > 0) {
			return (PatientProgram) pps.get(0);
		}
		return null;
	}

	/**
	 * Utility method for writing transfer out location field
	 */
	private String transferToLocationTag(Integer programId) {

		StringBuffer locations = new StringBuffer();
		for (Location l : Context.getLocationService().getAllLocations(false)) {
			if (locations.length() > 0 ) {
				locations.append( ",");
			}
			locations.append( "\"").append(l.getName()).append("\"");
		}
		String locationId = "transferredOutLocation_" +  programId.intValue();
		StringBuffer sb = new StringBuffer("");
		sb.append("<script type=\"text/javascript\">");
		sb.append("jQuery( function() {");
		sb.append("var availableLocations = [");
		sb.append(locations.toString());
		sb.append("];\n");
		sb.append("var searchedValue = null;\n");
		sb.append("jQuery( \"#").append(locationId).append("\" ).autocomplete({\n" +
				"        source: availableLocations,\n" +
				"		 minLength: 0,\n" +
				"        delay: 100\n" +
				"      })");
		sb.append(".on( \"autocompletesearch\", function(event, ui ) {        \n" +
				"        if ( event.target.value.length > 0 ) {\n" +
				"            searchedValue = event.target.value;\n" +
				"        }\n" +
				" });\n" +
				" jQuery(\"#" + locationId + "\").blur(function(){\n" +
				"		 if ( jQuery( \"#" + locationId + "\" ).val().length < 1 ) {\n" +
				"            jQuery( \"#" + locationId + "\" ).val(searchedValue);\n" +
				"        }\n" +
				"     });\n" +
				"});");
		sb.append("</script>");
		sb.append("<input id=\"" + locationId +"\" name=\"transferredOutLocation\" style=\"width: 150px\" placeholder=\"Type a location ...\">");
		return sb.toString();
	}
	/**
	 * Utility method for writing a change state field
	 */
	private String changeToStateSubmitTag(String label,
			PatientProgram patientProgram, ProgramWorkflow workflow,
			ProgramWorkflowState state, String dateField) {
		return "<input type=\"button\" value=\"" + label
				+ "\" onClick=\"changeToState(" + patientProgram.getId() + ", "
				+ workflow.getId() + ", " + state.getId() + ", " + dateField
				+ ")\" />";
	}

	private String changeToSelectedStateSubmitTag(String label,
										  PatientProgram patientProgram, ProgramWorkflow workflow,
										  String stateField, String dateField) {
		return "<input type=\"button\" value=\"" + label
				+ "\" onClick=\"changeToStateField(" + patientProgram.getId() + ", "
				+ workflow.getId() + ", " + stateField + ", " + dateField
				+ ")\" />";
	}

	/**
	 * Utility method for constructing a date field
	 */
	private String dateTag(String id, String name) {
		String today = Context.getDateFormat().format(new Date());
		return "<input type=\"text\" id=\"" + id + "\" name=\"" + name + "\" size=\"10\" onClick=\"showCalendar(this)\" value=\"" + today + "\" />";
	}

	/**
	 * Utility method for constructing an input select box of available workflow states
	 * @param id
	 * @param name
	 * @return
	 */
	private String pwStateTag(String id, String name, List<ProgramWorkflowState> pwStates, PatientState currentState) {
		String s = "<select id=\"" + id + "\"  name=\"" + name + "\" value=\"\">Select a state...</option>\n";
		s += "<option value=\"\">Select a state...</option>\n";
		if (pwStates != null && !pwStates.isEmpty()) {
			for (ProgramWorkflowState pws : pwStates) {
				if ((currentState == null)  || !(currentState != null && currentState.getState().equals(pws))) {
					s += "<option value=\"" + pws.getId().intValue() + "\">" + pws.getConcept().getName() + "</option>\n";
				}
			}
		}
		s += "</select>\n";
		return s;
	}

	/**
	 * @see javax.servlet.jsp.tagext.BodyTagSupport#doEndTag()
	 */
	public int doEndTag() {
		patientId = null;
		program = null;
		var = null;
		return EVAL_PAGE;
	}

	public Integer getPatientId() {
		return patientId;
	}

	public void setPatientId(Integer patientId) {
		this.patientId = patientId;
	}

	public String getProgram() {
		return program;
	}

	public void setProgram(String program) {
		this.program = program;
	}

	public String getVar() {
		return var;
	}

	public void setVar(String var) {
		this.var = var;
	}
}
