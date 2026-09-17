package org.openmrs.module.pihmalawi.web.taglibs;

import javax.servlet.jsp.tagext.BodyTagSupport;

import org.apache.commons.lang.StringUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.openmrs.Concept;
import org.openmrs.Encounter;
import org.openmrs.EncounterType;
import org.openmrs.Form;
import org.openmrs.Obs;
import org.openmrs.Patient;
import org.openmrs.Person;
import org.openmrs.api.context.Context;
import org.openmrs.module.pihmalawi.PihMalawiConfigConstants;
import org.openmrs.module.pihmalawi.Utils;
import org.openmrs.module.reporting.common.DateUtil;

import javax.servlet.jsp.JspException;
import javax.servlet.jsp.JspWriter;
import java.io.IOException;
import java.util.*;


public class ETraceAccessTag extends BodyTagSupport {

    private static final long serialVersionUID = 2662380903505241973L;

    private static final String DATE_OF_NEXT_TRACKING_ATTEMPT = "Date of next tracking attempt";
    private final Log log = LogFactory.getLog(getClass());

    private Integer patientId;
    private String form;
    private String initialEncounterType;
    private String followupEncounterType;
    private boolean readonly = false;
    private boolean includeAppointmentInfo = true;

    public int doStartTag() throws JspException {

        JspWriter o = pageContext.getOut();
        try {
            Patient p = Context.getPatientService().getPatient(getPatientId());
            Form f = Helper.getForm(getForm());
            EncounterType initialEncounterType = Helper.getEncounterType(getInitialEncounterType());
            EncounterType followupEncounterType = Helper.getEncounterType(getFollowupEncounterType());

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

            // Ensure no more than one initial encounter is found
            List<Encounter> initials = Utils.getEncounters(p, initialEncounterType);

            if (initials.size() > 1) {
                o.write("Not available: Multiple " + f.getName() + " forms found");
                release();
                return SKIP_BODY;
            }

            if (initials.size() == 0) {
                if (p.isDead()) {
                    o.write("Not available: Patient dead (" + f.getName() + ")");
                } else {
                    o.write(createNewCardHtmlTag(p, f));
                }
            }

            if (initials.size() == 1) {
                if (!Helper.userHasEditPrivilege()) {
                    o.write(createViewCardHtmlTag(p, f, initials.get(0), followupEncounterType, null));
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
        headerForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_TRACE_INITIAL_NAME, "trace-mastercard");
        Map<String, List<String>> flowsheetForms = new LinkedHashMap<String, List<String>>();
        flowsheetForms.put(PihMalawiConfigConstants.ENCOUNTERTYPE_TRACE_INITIAL_NAME, Arrays.asList("trace-attempt"));

        String encType = f.getEncounterType().getName();
        String headerForm = headerForms.get(encType);
        List<String> flowsheets = flowsheetForms.get(encType);

        if (headerForm != null && flowsheets != null) {
            StringBuilder sb = new StringBuilder();
            sb.append("/openmrs/htmlformentryui/htmlform/flowsheet.page?");
            sb.append("headerForm=file:configuration/htmlforms/").append(headerForm).append(".xml");
            for (String flowsheet : flowsheets) {
                sb.append("&flowsheets=file:configuration/htmlforms/").append(flowsheet).append(".xml");
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

    protected String createNewCardHtmlTag(Patient p, Form f) {
        String link = "";
        String newMasterCardConfig = getNewMasterCardConfiguration(f);
        if (newMasterCardConfig != null) {

            String uuid = UUID.randomUUID().toString();
            String jQueryDateFormat = Helper.toJQueryDateFormat(Context.getDateFormat().toPattern());

            // special case here to allow us to pre-pick the encounter date
            link = "<a onclick=\"window.location.href='"
                    + newMasterCardConfig
                    + "&patientId=" + p.getPatientId()
                    + "&encounterDate=' + $j.datepicker.formatDate('yy-mm-dd', $j.datepicker.parseDate('" + jQueryDateFormat + "', $j('#date-" + uuid + "').val()))"
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

    protected String createEditCardHtmlTag(Patient p, Form f, Encounter initialEncounter, EncounterType followupEncounterType) {
        String link = "";
        String newMasterCardConfig = getNewMasterCardConfiguration(f);
        if (newMasterCardConfig != null) {
            link = "<a href=\"" + newMasterCardConfig + "&patientId="+p.getPatientId()+"\">";
        }
        else {
            link = "<a href=\"/openmrs/module/htmlformentry/htmlFormEntry.form?encounterId=" + initialEncounter.getId() + "&mode=EDIT\">";
        }

        return link + "Edit " + f.getName() + "</a><br/>" + (includeAppointmentInfo ? getDetails(p, initialEncounter, followupEncounterType) + "<br/>" : "");

    }



    protected String getDetails(Patient p, Encounter initialEncounter, EncounterType followupEncounterType) {
        List<Encounter> followups = Utils.getEncounters(p, followupEncounterType);
        String created = "Created: " + Helper.formatDate(initialEncounter.getEncounterDatetime());
        String visited = "Last Tracking Date: no";
        String rvd = "Next Tracking Attempt: none";
        if (!followups.isEmpty()) {
            Encounter lastFollowup = followups.get(followups.size() - 1);
            visited = "Last Tracking Date: " + Helper.formatDate(lastFollowup.getEncounterDatetime()) + " at " + lastFollowup.getLocation().getName();
            Concept nextTrackingDate = Context.getConceptService().getConcept(DATE_OF_NEXT_TRACKING_ATTEMPT);
            Date startOfDay = DateUtil.getStartOfDay(lastFollowup.getEncounterDatetime());
            Date endOfDay = DateUtil.getEndOfDay(lastFollowup.getEncounterDatetime());
            List<Obs> os = Context.getObsService().getObservations(Arrays.asList((Person) p), null, Arrays.asList(nextTrackingDate), null, null, null, Arrays.asList("dateCreated"), 1, null, startOfDay, endOfDay, false);
            if (!os.isEmpty()) {
                rvd = "Next Tracking Attempt: " + Helper.formatDate(os.get(0).getValueDatetime());
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

    public boolean isReadonly() {
        return readonly;
    }

    public void setReadonly(boolean readonly) {
        this.readonly = readonly;
    }

    public boolean isIncludeAppointmentInfo() {
        return includeAppointmentInfo;
    }

    public void setIncludeAppointmentInfo(boolean includeAppointmentInfo) {
        this.includeAppointmentInfo = includeAppointmentInfo;
    }

}
