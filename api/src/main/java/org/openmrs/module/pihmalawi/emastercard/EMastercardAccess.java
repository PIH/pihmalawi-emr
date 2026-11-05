package org.openmrs.module.pihmalawi.emastercard;

import org.openmrs.Encounter;
import org.openmrs.Patient;
import org.openmrs.PatientProgram;

import java.util.Date;

/**
 * The result of evaluating one eMastercard for a patient and the current user
 */
public class EMastercardAccess {

	private final EMastercard mastercard;
	private final Patient patient;
	private boolean displayed = true;
	private EMastercardState state = EMastercardState.UNAVAILABLE;
	private String message;
	private boolean readonlyNote;
	private Encounter initialEncounter;
	private Date lastVisitDate;
	private String lastVisitLocation;
	private Date appointmentDate;
	private PatientProgram enrolment;

	public EMastercardAccess(EMastercard mastercard, Patient patient) {
		this.mastercard = mastercard;
		this.patient = patient;
	}

	public EMastercard getMastercard() {
		return mastercard;
	}

	public Patient getPatient() {
		return patient;
	}

	/**
	 * @return false when the dashboard leaves this card out for the patient or user
	 */
	public boolean isDisplayed() {
		return displayed;
	}

	public void setDisplayed(boolean displayed) {
		this.displayed = displayed;
	}

	public EMastercardState getState() {
		return state;
	}

	public void setState(EMastercardState state) {
		this.state = state;
	}

	/**
	 * @return for UNAVAILABLE, the reason shown in place of a link; for VIEW, the note shown in brackets after the
	 *         link, which may be null
	 */
	public String getMessage() {
		return message;
	}

	public void setMessage(String message) {
		this.message = message;
	}

	/**
	 * @return true when the dashboard adds "(Readonly: ART Initial Encounter)" after the card
	 */
	public boolean isReadonlyNote() {
		return readonlyNote;
	}

	public void setReadonlyNote(boolean readonlyNote) {
		this.readonlyNote = readonlyNote;
	}

	public Encounter getInitialEncounter() {
		return initialEncounter;
	}

	public void setInitialEncounter(Encounter initialEncounter) {
		this.initialEncounter = initialEncounter;
	}

	public Date getCreated() {
		return initialEncounter == null ? null : initialEncounter.getEncounterDatetime();
	}

	public Date getLastVisitDate() {
		return lastVisitDate;
	}

	public void setLastVisitDate(Date lastVisitDate) {
		this.lastVisitDate = lastVisitDate;
	}

	public String getLastVisitLocation() {
		return lastVisitLocation;
	}

	public void setLastVisitLocation(String lastVisitLocation) {
		this.lastVisitLocation = lastVisitLocation;
	}

	public Date getAppointmentDate() {
		return appointmentDate;
	}

	public void setAppointmentDate(Date appointmentDate) {
		this.appointmentDate = appointmentDate;
	}

	/**
	 * @return the patient's enrolment in the card's program: the current one, else the latest, or null when the
	 *         card has no program or the patient was never enrolled
	 */
	public PatientProgram getEnrolment() {
		return enrolment;
	}

	public void setEnrolment(PatientProgram enrolment) {
		this.enrolment = enrolment;
	}

	/**
	 * @return the flowsheet page and its parameters, without the context path or the patient. The parameters load
	 *         the pihmalawi mastercard customization, which the flowsheet needs to be embedded in the O3 chart.
	 */
	public String getFlowsheetBasePath() {
		return flowsheetBasePath(true);
	}

	/**
	 * @return the flowsheet page for this patient, without the context path
	 */
	public String getFlowsheetPath() {
		return flowsheetPath(true);
	}

	/**
	 * @return the flowsheet page for this patient as the legacy dashboard has always linked to it: for the Kaposi's
	 *         sarcoma flowsheet, without the mastercard customization
	 */
	public String getLegacyFlowsheetPath() {
		return flowsheetPath(!mastercard.isKaposisSarcoma());
	}

	private String flowsheetPath(boolean customized) {
		String path = flowsheetBasePath(customized) + "&patientId=" + patient.getPatientId();
		if (mastercard.isKaposisSarcoma()) {
			path += "&requireEncounter=false";
		}
		return path;
	}

	private String flowsheetBasePath(boolean customized) {
		StringBuilder sb = new StringBuilder("htmlformentryui/htmlform/flowsheet.page?");
		sb.append("headerForm=file:configuration/htmlforms/").append(mastercard.getHeaderForm()).append(".xml");
		for (String flowsheet : mastercard.getFlowsheetForms()) {
			sb.append("&flowsheets=file:configuration/htmlforms/").append(flowsheet).append(".xml");
		}
		sb.append("&dashboardUrl=legacyui");
		if (customized) {
			sb.append("&customizationProvider=pihmalawi&customizationFragment=mastercard");
		}
		return sb.toString();
	}
}
