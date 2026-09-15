package org.openmrs.module.pihmalawi.web.taglibs;

import org.apache.commons.lang.StringUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.openmrs.Concept;
import org.openmrs.Encounter;
import org.openmrs.EncounterType;
import org.openmrs.Form;
import org.openmrs.Obs;
import org.openmrs.Patient;
import org.openmrs.PatientIdentifierType;
import org.openmrs.Person;
import org.openmrs.ProgramWorkflow;
import org.openmrs.ProgramWorkflowState;
import org.openmrs.api.context.Context;
import org.openmrs.module.pihmalawi.PihMalawiConfigConstants;
import org.openmrs.module.pihmalawi.Utils;
import org.openmrs.module.pihmalawi.metadata.CommonMetadata;
import org.openmrs.module.pihmalawi.metadata.HivMetadata;
import org.openmrs.module.reporting.common.DateUtil;
import org.springframework.core.env.EnvironmentCapable;

import javax.servlet.jsp.JspException;
import javax.servlet.jsp.JspWriter;
import javax.servlet.jsp.tagext.BodyTagSupport;
import java.io.IOException;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class EMastercardAccessTag extends BodyTagSupport {

	private static final String APPOINTMENT_DATE = "Appointment date";

	public static final long serialVersionUID = 128234353L;

	private final Log log = LogFactory.getLog(getClass());

	private Integer patientId;
	private String form;
	private String initialEncounterType;
	private String followupEncounterType;
	private boolean readonly = false;
	private String programWorkflowStates;
	private String patientIdentifierType;
	private boolean includeAppointmentInfo = true;
	private String condition=null;
	private String conditionAnswer=null;

	public int doStartTag() throws JspException {

		JspWriter o = pageContext.getOut();
		try {
			Patient p = Context.getPatientService().getPatient(getPatientId());
			Form f = Helper.getForm(getForm());
			EncounterType initialEncounterType = Helper.getEncounterType(getInitialEncounterType());
			EncounterType followupEncounterType = Helper.getEncounterType(getFollowupEncounterType());
			Concept conditionConcept = null;
			List<Concept> conditionConceptAnswers = null;
			if (StringUtils.isNotBlank(getCondition()) && StringUtils.isNotBlank(getConditionAnswer())){
				conditionConcept = Context.getConceptService().getConceptByUuid(getCondition());
				conditionConceptAnswers = Helper.getConceptsFromString(getConditionAnswer());
			}

            // Ensure valid form and initial encounter type passed in
			if (f == null || initialEncounterType == null) {
				o.write("Not available: Wrong configuration");
				release();
				return SKIP_BODY;
			}

			if (followupEncounterType == null && StringUtils.isNotBlank(getFollowupEncounterType())) {
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

            // Ensure no more than one initial encounter is found
			List<Encounter> initials = Utils.getEncounters(p, initialEncounterType);
			if (initials.size() > 1) {
				o.write("Not available: Multiple " + f.getName() + " forms found");
				release();
				return SKIP_BODY;
			}

            // Ensure that the patient has a valid program enrollment, identifier, and state
			List<ProgramWorkflowState> stateList = Helper.getProgramWorkflowStatesFromCsvIds(programWorkflowStates);
			List<ProgramWorkflow> programWorkflows = new ArrayList<>();
			if (stateList !=null && !stateList.isEmpty()) {
				for (ProgramWorkflowState pws : stateList) {
					if (!programWorkflows.contains(pws.getProgramWorkflow()) ) {
						programWorkflows.add(pws.getProgramWorkflow());
					}
				}
			}
			if (initials.size() == 0) {
                if (!Helper.userHasEditPrivilege()) {
                    o.write("Not available: User does not have privileges to edit patient");
                } else if (!Helper.isInProgramWorkflowState(p, stateList)) {
					o.write("Not available: Inactive program state (" + f.getName() + ")");
				} else {
					if (!Helper.hasIdentifierType(p, resolvedPatientIdentifierType)) {
						o.write("Not available: No identifier (" + f.getName() + ")");
					} else {
						if (!Helper.hasIdentifierForEnrollmentLocation(p, resolvedPatientIdentifierType, programWorkflows)) {
							o.write("Not available: No identifier for current enrollment location (" + f.getName() + ")");
						} else {
							if (conditionConcept !=null && conditionConceptAnswers !=null && (conditionConceptAnswers.size() > 0) && !Helper.hasCondition(p, conditionConcept, conditionConceptAnswers)) {
								List<String> diagnosis = new ArrayList<String>();
								for (Concept concept : conditionConceptAnswers) {
									diagnosis.add(concept.getDisplayString());
								}
								o.write("Not available: " + StringUtils.join(diagnosis, ",") + " diagnosis (" + f.getName() + ")");
							} else {
								if (isReadonly()) {
									o.write("Not available (" + f.getName() + ")");
								} else {
									if (p.isDead()) {
										o.write("Not available: Patient dead (" + f.getName() + ")");
									} else {
										o.write(createNewCardHtmlTag(p, f));
									}
								}
							}
						}
					}
				}
				release();
				return SKIP_BODY;
			}

            if (initials.size() == 1) {
                if (!Helper.userHasEditPrivilege()) {
                    o.write(createViewCardHtmlTag(p, f, initials.get(0), followupEncounterType, null));
                    release();
                    return SKIP_BODY;
                }
				if (!Helper.isInProgramWorkflowState(p, stateList)) {
					o.write(createViewCardHtmlTag(p, f, initials.get(0), followupEncounterType, "Readonly: Inactive program state"));
					release();
					return SKIP_BODY;
				}
				if (!Helper.hasIdentifierType(p, resolvedPatientIdentifierType)) {
					o.write(createViewCardHtmlTag(p, f, initials.get(0), followupEncounterType, "Readonly: No identifier"));
					release();
					return SKIP_BODY;
				}
				if (!Helper.hasIdentifierForEnrollmentLocation(p, resolvedPatientIdentifierType, programWorkflows)) {
					o.write(createViewCardHtmlTag(p, f, initials.get(0), followupEncounterType, "Readonly: No identifier for current enrollment location"));
					release();
					return SKIP_BODY;
				}
				if (isReadonly()) {
					o.write(createViewCardHtmlTag(p, f, initials.get(0), followupEncounterType, null));
					release();
					return SKIP_BODY;
				}
				if (p.isDead()) {
					o.write(createViewCardHtmlTag(p, f, initials.get(0), followupEncounterType, null));
					release();
					return SKIP_BODY;
				}
				o.write(createEditCardHtmlTag(p, f, initials.get(0), followupEncounterType));
				release();
				return SKIP_BODY;
			}
		}
        catch (Throwable e) {
			try {
				o.write("Unknown error, call help!");
			}
            catch (IOException e1) {
			}
			log.error("Could not write to pageContext", e);
		}
		release();
		return SKIP_BODY;
	}

    protected String getNewMasterCardConfiguration(Form f) {

		Map<String, String> headerForms = new LinkedHashMap<String, String>();
		headerForms.put(HivMetadata.PRE_ART_INITIAL, "pre-art-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_ASTHMA_INITIAL_NAME, "chronic-lung-disease-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_HTN_DIABETES_INITIAL_NAME, "hypertension-and-diabetes-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_EPILEPSY_INITIAL_NAME, "epilepsy-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_PALLIATIVE_INITIAL_NAME, "palliative-care-mastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_CHF_INITIAL_NAME, "cardiac-and-vascular-disease-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_CKD_INITIAL_NAME, "chronic-kidney-disease-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_NCD_OTHER_INITIAL_NAME, "ncd-other-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_MENTAL_HEALTH_INITIAL_NAME, "mental-health-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_CHRONIC_CARE_INITIAL_NAME, "chronic-care-emastercard");
		headerForms.put(HivMetadata.EXPOSED_CHILD_INITIAL, "exposed-child-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_ART_INITIAL_NAME, "art-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_PDC_INITIAL_NAME, "pdc-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_PDC_DEVELOPMENTAL_DELAY_INITIAL_NAME, "pdc-developmental-delay-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_PDC_TRISOMY21_INITIAL_NAME, "pdc-trisomy-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_PDC_CLEFT_CLIP_PALLET_INITIAL_NAME,"pdc-cleft-lip-palate-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_PDC_OTHER_DIAGNOSIS_INITIAL_NAME,"pdc-other-diagnosis-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_NUTRITION_INITIAL_NAME, "nutrition-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_TEEN_CLUB_INITIAL_NAME, "teen-club-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_NUTRITION_PREGNANT_TEENS_INITIAL_NAME,"nutrition-pregnant-teens-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_NUTRITION_ADULTS_INITIAL_NAME,"nutrition-adults-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_NUTRITION_INFANT_INITIAL_NAME,"nutrition-infant-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_NUTRITION_PDC_INITIAL_NAME,"nutrition-pdc-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_SICKLE_CELL_DISEASE_INITIAL_NAME, "sickle-cell-disease-emastercard");
		headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_TB_INITIAL_NAME, "tb-emastercard");

		Map<String, List<String>> flowsheetForms = new LinkedHashMap<String, List<String>>();
        flowsheetForms.put(HivMetadata.PRE_ART_INITIAL, Arrays.asList("pre-art-visit"));
        flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_ASTHMA_INITIAL_NAME, Arrays.asList("chronic-lung-disease-visit","chronic-lung-disease-peak-flow","chronic-lung-disease-hospitalization"));
        flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_HTN_DIABETES_INITIAL_NAME, Arrays.asList("hypertension-and-diabetes-quarterly-laboratory-tests","hypertension-and-diabetes-annual-laboratory-tests","hypertension-and-diabetes-hospitalization-history","hypertension-and-diabetes-visit"));
        flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_EPILEPSY_INITIAL_NAME, Arrays.asList("epilepsy-visit"));
		flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_PALLIATIVE_INITIAL_NAME, Arrays.asList("palliative-care-visit"));
		flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_CHF_INITIAL_NAME, Arrays.asList("echocardiogram-ultrasound-imaging-results","electrocardiographic-ekg-imaging-results","chest-x-ray-cxr-imaging-results","cardiac-and-vascular-disease-quarterly-laboratory-tests","cardiac-and-vascular-disease-frequency-per-protocol-laboratory-tests","cardiac-and-vascular-disease-hospitalization-history","cardiac-and-vascular-disease-visit"));
		flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_CKD_INITIAL_NAME, Arrays.asList("chronic-kidney-disease-quarterly-laboratory-tests","chronic-kidney-disease-annual-laboratory-tests","chronic-kidney-disease-imaging-results","chronic-kidney-disease-hospitalization-history","chronic-kidney-disease-visit"));
		flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_NCD_OTHER_INITIAL_NAME, Arrays.asList("ncd-other-quarterly-laboratory-tests","ncd-other-annual-laboratory-tests","ncd-other-hospitalization-history","ncd-other-visit"));
		flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_MENTAL_HEALTH_INITIAL_NAME, Arrays.asList("mental-health-screening","mental-health-visit"));
        flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_CHRONIC_CARE_INITIAL_NAME, Arrays.asList("chronic-care-visit"));
		flowsheetForms.put(HivMetadata.EXPOSED_CHILD_INITIAL, Arrays.asList("exposed-child-visit", "eid-test-results"));
		flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_ART_INITIAL_NAME, Arrays.asList("viral-load-tests","art-follow-up-testing", "art-visit"));
		flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_PDC_DEVELOPMENTAL_DELAY_INITIAL_NAME, Arrays.asList("hie-developmental-delay-lab-tests", "pdc-hospitalization-history","pdc-complications","vision-test","pdc-hearing-test","pdc-radiology-screening","developmental-delay-visit"));
		flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_PDC_TRISOMY21_INITIAL_NAME, Arrays.asList("trisomy-21-laboratory-tests","pdc-hospitalization-history","pdc-complications","vision-test","pdc-hearing-test","pdc-radiology-screening","pdc-trisomy-21-visit"));
		flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_PDC_CLEFT_CLIP_PALLET_INITIAL_NAME, Arrays.asList("pdc-hb-and-other-laboratory-tests","pdc-hospitalization-history","pdc-complications","vision-test","pdc-hearing-test","pdc-radiology-screening","cleft-lip-palate-visit"));
		flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_PDC_OTHER_DIAGNOSIS_INITIAL_NAME, Arrays.asList("pdc-hb-and-other-laboratory-tests","pdc-hospitalization-history","pdc-complications","vision-test","pdc-hearing-test","pdc-radiology-screening","other-diagnosis-visit"));
		flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_NUTRITION_INITIAL_NAME, Arrays.asList("nutrition-visit"));
		flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_TEEN_CLUB_INITIAL_NAME, Arrays.asList("teen-club-visit","teen-club-intake-survey"));
		flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_NUTRITION_PREGNANT_TEENS_INITIAL_NAME,Arrays.asList("nutrition-pregnant-teens-visit"));
		flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_NUTRITION_ADULTS_INITIAL_NAME,Arrays.asList("nutrition-adult-visit"));
		flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_NUTRITION_INFANT_INITIAL_NAME,Arrays.asList("nutrition-infant-visit"));
		flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_NUTRITION_PDC_INITIAL_NAME,Arrays.asList("nutrition-pdc-visit"));
		flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_SICKLE_CELL_DISEASE_INITIAL_NAME,
				Arrays.asList(
						"sickle-cell-disease-quarterly-screening",
						"sickle-cell-disease-annual-monitoring",
						"sickle-cell-disease-hospitalization-history",
						"sickle-cell-disease-visit"));
		flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_TB_INITIAL_NAME, Arrays.asList(/*"tb-tests",*/"tb-visit","tb-post-lung-disease"));

		// hack to append the byConcept to the few forms that we fetch "byConcept" instead of by encounter type
		// TODO: move this into a more organized customization
		String byConcept = "";

		if (f.getName().equals("Viral Load Tests")) {
			byConcept = CommonMetadata.HIV_VIRAL_LOAD_TEST_SET;
		}

		String encType = f.getEncounterType().getName();
		String headerForm = headerForms.get(encType);
		List<String> flowsheets = flowsheetForms.get(encType);

		if (headerForm != null ) {
			StringBuilder sb = new StringBuilder();
			sb.append("/openmrs/htmlformentryui/htmlform/flowsheet.page?");
			sb.append("headerForm=file:configuration/htmlforms/").append(headerForm).append(".xml");
			if (flowsheets != null) {
				for (String flowsheet : flowsheets) {
					sb.append("&flowsheets=file:configuration/htmlforms/").append(flowsheet).append(".xml");
				}
			}

			if (StringUtils.isNotBlank(byConcept)) {
				sb.append("&byConcept=").append(byConcept);
			}

			sb.append("&dashboardUrl=legacyui&customizationProvider=pihmalawi&customizationFragment=mastercard");
			return sb.toString();
		}
		return null;
    }

	protected String createViewCardHtmlTag(Patient p, Form f, Encounter initialEncounter, EncounterType followupEncounterType, String additionalMessage) {
        String link = "";
        String newMasterCardConfig = getNewMasterCardConfiguration(f);
        if (newMasterCardConfig != null) {
            link = "<a href=\"" + newMasterCardConfig + "&viewOnly=true&patientId="+p.getPatientId()+"\">";
        }
        else {
            link = "<a href=\"javascript:void(0)\" onClick=\"loadUrlIntoEncounterPopup('"
                    + initialEncounter.getEncounterType().getName()
                    + "@"
                    + initialEncounter.getLocation().getName()
                    + " | "
                    + Helper.formatDate(initialEncounter.getEncounterDatetime())
                    + " | "
                    + ""
                    + "', '/openmrs/module/htmlformentry/htmlFormEntry.form?encounterId="
                    + initialEncounter.getId()
                    + "&inPopup=true'); return false;\">";
        }
        return link + "View " + f.getName() + "</a><br/>"
                + (includeAppointmentInfo ? getDetails(p, initialEncounter, followupEncounterType) + "<br/>" : "")
                + "(" + additionalMessage + ")";
	}

	protected String createEditCardHtmlTag(Patient p, Form f, Encounter initialEncounter, EncounterType followupEncounterType) {
        String link = "";
        String newMasterCardConfig = getNewMasterCardConfiguration(f);
        if (newMasterCardConfig != null) {
            link = "<a href=\"" + newMasterCardConfig + "&patientId="+p.getPatientId()+"\">";
        }
        else {
            link = "<a href=\"/openmrs/module/htmlformentry/htmlFormEntry.form?encounterId=" + initialEncounter.getId() + "&mode=EDIT\">";
        }
		if (f.getName().equals("Viral Load Tests") || f.getName().equals("EID Test Results")) {
			return link + "Edit " + f.getName() + "</a><br/>";
        } else {
			return link + "Edit " + f.getName() + "</a><br/>" + (includeAppointmentInfo ? getDetails(p, initialEncounter, followupEncounterType) + "<br/>" : "");
		}
	}

    protected String createNewCardHtmlTag(Patient p, Form f) {
        String link = "";
        String newMasterCardConfig = getNewMasterCardConfiguration(f);
        if (newMasterCardConfig != null) {

			String uuid = UUID.randomUUID().toString();

			// special case here to allow us to pre-pick the encounter date
			link = "<a onclick=\"window.location.href='"
					+ newMasterCardConfig
					+ "&patientId=" + p.getPatientId()
					+ "&encounterDate=' + $j.datepicker.formatDate('yy-mm-dd', $j.datepicker.parseDate('dd/mm/yy', $j('#date-" + uuid + "').val()))"
					+ "\">";

			return link + "Create new " + f.getName() + "</a> on " + dateTag("date-" + uuid, "date-" + uuid);
		}
        else {

        	link = "<a href=\"/openmrs/module/htmlformentry/htmlFormEntry.form?personId="
                    + p.getPersonId()
                    + "&patientId="
                    + p.getPatientId()
                    + "&returnUrl=%2fopenmrs%2fpatientDashboard.form&formId="
                    + f.getFormId() + "\">";

			return link + "Create new " + f.getName() + "</a>";
        }
    }

    protected String getDetails(Patient p, Encounter initialEncounter, EncounterType followupEncounterType) {
        List<Encounter> followups = Utils.getEncounters(p, followupEncounterType);
        String created = "Created: " + Helper.formatDate(initialEncounter.getEncounterDatetime());
        String visited = "Visited: no";
        String rvd = "Appointment: none";
        if (!followups.isEmpty()) {
            Encounter lastFollowup = followups.get(followups.size() - 1);
            visited = "Visited: " + Helper.formatDate(lastFollowup.getEncounterDatetime()) + " at " + lastFollowup.getLocation().getName();
            Concept appt = Context.getConceptService().getConcept(APPOINTMENT_DATE);
            Date startOfDay = DateUtil.getStartOfDay(lastFollowup.getEncounterDatetime());
            Date endOfDay = DateUtil.getEndOfDay(lastFollowup.getEncounterDatetime());
            List<Obs> os = Context.getObsService().getObservations(Arrays.asList((Person) p), Arrays.asList(lastFollowup), Arrays.asList(appt), null, null, null, Arrays.asList("dateCreated"), 1, null, startOfDay, endOfDay, false);
            if (!os.isEmpty()) {
                rvd = "Appointment: " + Helper.formatDate(os.get(0).getValueDatetime());
            }
        }
        String details = created + ", " + visited + ", " + rvd;
        return details;
    }

	private String dateTag(String id, String name) {
		String today = Context.getDateFormat().format(new Date());
		return "<input type=\"text\" id=\"" + id + "\" name=\"" + name + "\" size=\"10\" onClick=\"showCalendar(this)\" value=\"" + today + "\" />";
	}

	public int doEndTag() {
		patientId = null;
		form = null;
		initialEncounterType = null;
		followupEncounterType = null;
		readonly = false;
		patientIdentifierType = null;
		programWorkflowStates = null;
		condition = null;
		conditionAnswer = null;

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

	public String getInitialEncounterType() {
		return initialEncounterType;
	}

	public void setInitialEncounterType(String initialEncounterType) {
		this.initialEncounterType = initialEncounterType;
	}

	public String getFollowupEncounterType() {
		return followupEncounterType;
	}

	public void setFollowupEncounterType(String followupEncounterType) {
		this.followupEncounterType = followupEncounterType;
	}

	public String getCondition() {
		return condition;
	}

	public void setCondition(String condition) {
		this.condition = condition;
	}

	public String getConditionAnswer() {
		return conditionAnswer;
	}

	public void setConditionAnswer(String conditionAnswer) {
		this.conditionAnswer = conditionAnswer;
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

	public boolean isIncludeAppointmentInfo() {
		return includeAppointmentInfo;
	}

	public void setIncludeAppointmentInfo(boolean includeAppointmentInfo) {
		this.includeAppointmentInfo = includeAppointmentInfo;
	}
}
