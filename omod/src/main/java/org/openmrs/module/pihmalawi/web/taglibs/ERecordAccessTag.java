package org.openmrs.module.pihmalawi.web.taglibs;

import java.io.IOException;
import java.util.List;

import javax.servlet.jsp.JspException;
import javax.servlet.jsp.JspWriter;
import javax.servlet.jsp.tagext.BodyTagSupport;

import org.apache.commons.lang.StringUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.openmrs.Encounter;
import org.openmrs.EncounterType;
import org.openmrs.Form;
import org.openmrs.Patient;
import org.openmrs.PatientIdentifierType;
import org.openmrs.ProgramWorkflowState;
import org.openmrs.api.context.Context;
import org.openmrs.module.pihmalawi.Utils;

public class ERecordAccessTag extends BodyTagSupport {

	public static final long serialVersionUID = 128234353L;

	private final Log log = LogFactory.getLog(getClass());

	private Integer patientId;
	private String form;
	private String encounterType;
	private boolean readonly = false;
	private String programWorkflowStates;
	private String patientIdentifierType;

	public int doStartTag() throws JspException {
		JspWriter o = pageContext.getOut();

		Patient p = Context.getPatientService().getPatient(getPatientId());
		Form f = Helper.getForm(getForm());
		EncounterType initialEncounterType = Helper.getEncounterType(getEncounterType());

		try {
			if (f == null || initialEncounterType == null) {
				o.write("Not available: Wrong configuration");
				release();
				return SKIP_BODY;
			}
			PatientIdentifierType resolvedPatientIdentifierType = Helper.getPatientIdentifierType(getPatientIdentifierType());
			if (resolvedPatientIdentifierType == null && StringUtils.isNotBlank(getPatientIdentifierType())) {
				o.write("Not available: Wrong configuration");
				release();
				return SKIP_BODY;
			}
			List<ProgramWorkflowState> stateList = Helper.getProgramWorkflowStatesFromCsvIds(programWorkflowStates);
			if (!Helper.isInProgramWorkflowState(p, stateList)) {
				o.write("Not available: Inactive program state");
			} else {
				if (!Helper.hasIdentifierType(p, resolvedPatientIdentifierType)) {
					o.write("Not available: No identifier");
				} else {
					// if (!hasIdentifierForEnrollmentLocation(p,
					// getPatientIdentifierType())) {
					// o.write("Not available: No identifier for enrollment location");
					// } else {
					if (isReadonly()) {
						o.write("Not available");
					} else {
						if (p.isDead()) {
							o.write("Not available: Patient dead");
						} else {
							o.write(createNewCardHtmlTag(p, f));
						}
					}
				}
			}
			List<Encounter> initials = Utils.getEncounters(p, initialEncounterType);
			if (!initials.isEmpty()) {
				o.write("<br/>");
			}
			for (Encounter initial : initials) {
				if (!Helper.isInProgramWorkflowState(p, stateList)) {
					o.write(createViewCardHtmlTag(p, f, initial,
							"Readonly: Inactive program state"));
				} else if (!Helper.hasIdentifierType(p, resolvedPatientIdentifierType)) {
					o.write(createViewCardHtmlTag(p, f, initial,
							"Readonly: No identifier"));
				} else
				// todo: enrollment location seems to be hacky
				// if (!hasIdentifierForEnrollmentLocation(p,
				// getPatientIdentifierType())) {
				// o.write(createViewCardHtmlTag(p, f, initial,
				// "Readonly: No identifier for enrollment location"));
				// } else
				if (isReadonly()) {
					o.write(createViewCardHtmlTag(p, f, initial, null));
				} else if (p.isDead()) {
					o.write(createViewCardHtmlTag(p, f, initial, null));
				} else
					o.write(createEditCardHtmlTag(p, f, initial));
				o.write("<br/>");
			}
		} catch (Throwable e) {
			try {
				o.write("Unknown error, call help!");
			} catch (IOException e1) {
			}
			log.error("Could not write to pageContext", e);
		}
		release();
		return SKIP_BODY;
	}

	private String createViewCardHtmlTag(Patient p, Form f,
			Encounter initialEncounter, String additionalMessage) {
		String created = "Created: "
				+ Helper.formatDate(initialEncounter.getEncounterDatetime());
		Integer encounterId = initialEncounter.getId();
		String details = created;
		String encounterType = initialEncounter.getEncounterType().getName();
		String location = initialEncounter.getLocation().getName();
		String encounterDate = Helper.formatDate(initialEncounter
				.getEncounterDatetime());
		// TODO: clash in OpenMRS 1.7?
		String provider = ""; // encounter.getProvider().getGivenName() +
								// " " +
								// encounter.getProvider().getFamilyName();
		return "<a href=\"javascript:void(0)\" onClick=\"loadUrlIntoEncounterPopup('"
				+ encounterType
				+ "@"
				+ location
				+ " | "
				+ encounterDate
				+ " | "
				+ provider
				+ "', '/openmrs/module/htmlformentry/htmlFormEntry.form?encounterId="
				+ encounterId
				+ "&inPopup=true'); return false;\">View "
				+ f.getName()
				+ "</a> ("
				+ details
				+ ") ("
				+ additionalMessage + ")";
	}

	private String createEditCardHtmlTag(Patient p, Form f,
			Encounter initialEncounter) {
		String created = "Created: "
				+ Helper.formatDate(initialEncounter.getEncounterDatetime());
		Integer encounterId = initialEncounter.getId();
		String details = created;
		return "<a href=\"/openmrs/module/htmlformentry/htmlFormEntry.form?encounterId="
				+ encounterId
				+ "&mode=EDIT\">Edit "
				+ f.getName()
				+ "</a> (" + details + ")";
	}

	private String createNewCardHtmlTag(Patient p, Form f) {
		return "<a href=\"/openmrs/module/htmlformentry/htmlFormEntry.form?personId="
				+ p.getPersonId()
				+ "&patientId="
				+ p.getPatientId()
				+ "&returnUrl=%2fopenmrs%2fpatientDashboard.form&formId="
				+ f.getFormId() + "\">Create new " + f.getName() + "</a>";
	}

	public int doEndTag() {
		patientId = null;
		form = null;
		encounterType = null;
		readonly = false;
		patientIdentifierType = null;
		programWorkflowStates = null;

		return EVAL_PAGE;
	}

	public Integer getPatientId() {
		return patientId;
	}

	public void setPatientId(Integer patientId) {
		this.patientId = patientId;
	}

	public String getForm() {
		return form;
	}

	public void setForm(String form) {
		this.form = form;
	}

	public String getEncounterType() {
		return encounterType;
	}

	public void setEncounterType(String encounterType) {
		this.encounterType = encounterType;
	}

	public boolean isReadonly() {
		return readonly;
	}

	public void setReadonly(boolean readonly) {
		this.readonly = readonly;
	}

	public String getProgramWorkflowStates() {
		return programWorkflowStates;
	}

	public void setProgramWorkflowStates(String programWorkflowStates) {
		this.programWorkflowStates = programWorkflowStates;
	}

	public String getPatientIdentifierType() {
		return patientIdentifierType;
	}

	public void setPatientIdentifierType(String patientIdentifierType) {
		this.patientIdentifierType = patientIdentifierType;
	}
}
