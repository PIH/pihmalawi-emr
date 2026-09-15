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
import org.openmrs.module.pihmalawi.common.JsonObject;
import org.openmrs.util.OpenmrsConstants;

/**
 * Encapsulates the functionality for providing a widget for changing program enrollment states
 */
public class QuickProgramsTag extends BodyTagSupport {

	public static final long serialVersionUID = 128233353L;

	public static final String TRANSFERRED_OUT_CONCEPT = "655b604e-977f-11e1-8993-905e29aff6c1";
	public static final String PATIENT_DIED_CONCEPT = "655b5e46-977f-11e1-8993-905e29aff6c1";

	private final Log log = LogFactory.getLog(getClass());

	private Integer patientId;
	private String stateIds;
	private String initialStateIds;
	private String terminalStateIds;
	private String workflowIds;

	/**
	 * @see javax.servlet.jsp.tagext.BodyTagSupport#doStartTag()
	 */
	public int doStartTag() throws JspException {
		JspWriter o = pageContext.getOut();

		try {

			List<ProgramWorkflowState> states = Helper.getProgramWorkflowStatesFromCsvIds(stateIds);
			List<ProgramWorkflowState> initialStates = Helper.getProgramWorkflowStatesFromCsvIds(initialStateIds);
			List<ProgramWorkflowState> terminalStates = Helper.getProgramWorkflowStatesFromCsvIds(terminalStateIds);
			List<ProgramWorkflow> programWorkflows = Helper.getProgramWorkflowsFromUuidsList(workflowIds);

			ProgramWorkflow programWorkflow = initialStates.get(0).getProgramWorkflow();
			Program program = programWorkflow.getProgram();
			Patient patient = Context.getPatientService().getPatient(patientId);

			PatientProgram patientProgram = currentPatientProgram(program, patient);
			PatientState currentState = null;
			if (patientProgram != null) {
				currentState = patientProgram.getCurrentState(initialStates.get(0).getProgramWorkflow());
			}

			boolean quickProgramsAvailable = false;
			if (!patient.isDead()) {
				if (!programWorkflows.isEmpty()) {
					List<ProgramWorkflow> pwToEnroll = new ArrayList<>();
					Map<ProgramWorkflow, List<ProgramWorkflowState>> changeableWfStates = new HashMap<>();
					List<ProgramWorkflowState> commonTerminalStates = new ArrayList<>();
					for (ProgramWorkflow workflow : programWorkflows) {
						if ( !hasOpenProgramWorkflow(workflow, patient) ) {
							quickProgramsAvailable = true;
							pwToEnroll.add(workflow);
						} else {
							// patient is already enrolled in this program workflow
							List<ProgramWorkflowState> programWorkflowStates = Helper.getProgramWorkflowStates(workflow, null, Boolean.FALSE);
							changeableWfStates.put(workflow, programWorkflowStates);
							commonTerminalStates.addAll(Helper.getProgramWorkflowStates(workflow, null, Boolean.TRUE));
						}
					}
					if (!pwToEnroll.isEmpty()) {
						for (ProgramWorkflow workflow : pwToEnroll) {
							quickProgramsAvailable = true;
							o.write(enrollProgramWorkflowForm(program, patient, workflow));
						}
					}
					if ( !changeableWfStates.isEmpty()) {
						for (ProgramWorkflow workflow : changeableWfStates.keySet()) {
							quickProgramsAvailable = true;
							if (patientProgram != null) {
								currentState = patientProgram.getCurrentState(workflow);
							}
							o.write(changeToSelectedStateSubmitTag("Change",
									patientProgram,
									workflow, "stateIdForWorkflow" + workflow.getId(),
									"'dateForPWS" + workflow.getId() + "'")
									+ " " + workflow.getConcept().getName() +" to "
									+ ""
									+ pwStateTag("stateIdForWorkflow" + workflow.getId() , "pwStateName" + workflow.getId(), changeableWfStates.get(workflow), currentState)
									+ " on "
									+ dateTag("dateForPWS" + workflow.getId(), "dateForPWS")
									+ " at " + patientProgram.getLocation().getName() + "<br/><br/>");
						}
					}
					if (!commonTerminalStates.isEmpty()) {
						for (ProgramWorkflowState terminalState : commonTerminalStates) {
							if (patientProgram != null) {
								currentState = patientProgram.getCurrentState(terminalState.getProgramWorkflow());
							}
							if (!(currentState != null && currentState.getState().equals(terminalState))) {
								quickProgramsAvailable = true;
								if (StringUtils.equalsIgnoreCase(terminalState.getConcept().getUuid(), TRANSFERRED_OUT_CONCEPT)) {
									o.write(transferOutForm(program, patient, terminalState, terminalState.getProgramWorkflow()));
								} else if (StringUtils.equalsIgnoreCase(terminalState.getConcept().getUuid(), PATIENT_DIED_CONCEPT)) {
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
						}
					}
				} else {
					if (!hasOpenProgramWorkflow(programWorkflow, patient)) {
						// no or closed program enrollment available
						for (ProgramWorkflowState pws : initialStates) {
							quickProgramsAvailable = true;
							o.write(enrollForm(program, patient, pws));
						}
					} else {
						// open program enrollment available
						for (ProgramWorkflowState pws : states) {
							if (!(currentState != null && currentState.getState().equals(pws))) {
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
						}
						for (ProgramWorkflowState pws : terminalStates) {
							if (!(currentState != null && currentState.getState().equals(pws))) {
								quickProgramsAvailable = true;
								if (StringUtils.equalsIgnoreCase(pws.getConcept().getUuid(), TRANSFERRED_OUT_CONCEPT)) {
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

	private String enrollProgramWorkflowForm(Program program, Patient patient, ProgramWorkflow workflow) {
		String s = "";
		if (workflow != null ) {
			List<ProgramWorkflowState> programWorkflowInitialStates = Helper.getProgramWorkflowStates(workflow, Boolean.TRUE, Boolean.FALSE);
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
	 * Private utility method for returning whether a patient has a currently active state in the passed program workflow
	 */
	private boolean hasOpenProgramWorkflow(ProgramWorkflow programWorkflow, Patient patient) {
		// hm, it feels like there should be a *much* better way...
		for (org.openmrs.PatientProgram pp : Context.getProgramWorkflowService()
				.getPatientPrograms(patient, programWorkflow.getProgram(), null, null, new Date(), null, false)) {
			for (PatientState ps : pp.getStates()) {
				if (ps.getState().getProgramWorkflow().equals(programWorkflow)) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * @see javax.servlet.jsp.tagext.BodyTagSupport#doEndTag()
	 */
	public int doEndTag() {
		patientId = null;
		terminalStateIds = null;
		stateIds = null;
		initialStateIds = null;
		workflowIds = null;
		return EVAL_PAGE;
	}
	
    /**
     * @return the patientId
     */
    public Integer getPatientId() {
    	return patientId;
    }
	
    /**
     * @param patientId the patientId to set
     */
    public void setPatientId(Integer patientId) {
    	this.patientId = patientId;
    }
	
    /**
     * @return the stateIds
     */
    public String getStateIds() {
    	return stateIds;
    }
	
    /**
     * @param stateIds the stateIds to set
     */
    public void setStateIds(String stateIds) {
    	this.stateIds = stateIds;
    }
	
    /**
     * @return the initialStateIds
     */
    public String getInitialStateIds() {
    	return initialStateIds;
    }
	
    /**
     * @param initialStateIds the initialStateIds to set
     */
    public void setInitialStateIds(String initialStateIds) {
    	this.initialStateIds = initialStateIds;
    }
	
    /**
     * @return the terminalStateIds
     */
    public String getTerminalStateIds() {
    	return terminalStateIds;
    }

    /**
     * @param terminalStateIds the terminalStateIds to set
     */
    public void setTerminalStateIds(String terminalStateIds) {
    	this.terminalStateIds = terminalStateIds;
    }

	public String getWorkflowIds() {
		return workflowIds;
	}

	public void setWorkflowIds(String workflowIds) {
		this.workflowIds = workflowIds;
	}
}
