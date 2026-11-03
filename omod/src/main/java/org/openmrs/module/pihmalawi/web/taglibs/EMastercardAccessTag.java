package org.openmrs.module.pihmalawi.web.taglibs;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.openmrs.Patient;
import org.openmrs.api.context.Context;
import org.openmrs.module.pihmalawi.common.Helper;
import org.openmrs.module.pihmalawi.emastercard.EMastercard;
import org.openmrs.module.pihmalawi.emastercard.EMastercardAccess;
import org.openmrs.module.pihmalawi.emastercard.EMastercardRegistry;
import org.openmrs.module.pihmalawi.emastercard.EMastercardService;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.jsp.JspException;
import javax.servlet.jsp.JspWriter;
import javax.servlet.jsp.tagext.BodyTagSupport;
import java.io.IOException;
import java.util.Date;
import java.util.UUID;

/**
 * Renders one eMastercard of the patient dashboard: a link to create, edit or view it, or why it is not available.
 * The card and its rules come from {@link EMastercardRegistry} and {@link EMastercardService}. With a var attribute,
 * the tag renders nothing and instead puts the card's {@link EMastercardAccess} in that page attribute.
 */
public class EMastercardAccessTag extends BodyTagSupport {

	public static final long serialVersionUID = 128234353L;

	private final Log log = LogFactory.getLog(getClass());

	private Integer patientId;
	private String mastercard;
	private String var;

	public int doStartTag() throws JspException {

		JspWriter o = pageContext.getOut();
		try {
			Patient p = Context.getPatientService().getPatient(getPatientId());
			EMastercard m = EMastercardRegistry.get(getMastercard());
			if (m == null) {
				o.write("Not available: Wrong configuration");
				return SKIP_BODY;
			}
			EMastercardService service = Context.getRegisteredComponent("emastercardService", EMastercardService.class);
			EMastercardAccess access = service.evaluate(p, m);
			if (var != null) {
				pageContext.setAttribute(var, access);
				return SKIP_BODY;
			}
			o.write(render(access));
		}
		catch (Throwable e) {
			try {
				o.write("Unknown error, call help!");
			}
			catch (IOException e1) {
			}
			log.error("Could not write to pageContext", e);
		}
		return SKIP_BODY;
	}

	protected String render(EMastercardAccess access) {
		if (!access.isDisplayed()) {
			return "&NonBreakingSpace;";
		}
		String html;
		switch (access.getState()) {
			case CREATE:
				html = access.getMastercard().isKaposisSarcoma() ? kaposisSarcomaLink(access, "Create new KS file")
				        : createNewCardHtmlTag(access);
				break;
			case EDIT:
				html = access.getMastercard().isKaposisSarcoma() ? kaposisSarcomaLink(access, "Edit KS file")
				        : createEditCardHtmlTag(access);
				break;
			case VIEW:
				html = createViewCardHtmlTag(access);
				break;
			default:
				html = access.getMessage();
		}
		if (access.isReadonlyNote()) {
			html += " (Readonly: ART Initial Encounter)";
		}
		return html;
	}

	protected String kaposisSarcomaLink(EMastercardAccess access, String text) {
		String contextPath = ((HttpServletRequest) pageContext.getRequest()).getContextPath();
		return "<a href=\"" + contextPath + "/" + access.getLegacyFlowsheetPath() + "\">" + text + "</a>";
	}

	protected String createViewCardHtmlTag(EMastercardAccess access) {
		String link = "<a href=\"/openmrs/" + access.getFlowsheetBasePath() + "&viewOnly=true&patientId="
		        + access.getPatient().getPatientId() + "\">";
		return link + "View " + access.getMastercard().getFormName() + "</a><br/>" + getDetails(access) + "<br/>" + "("
		        + access.getMessage() + ")";
	}

	protected String createEditCardHtmlTag(EMastercardAccess access) {
		String link = "<a href=\"/openmrs/" + access.getFlowsheetPath() + "\">";
		return link + "Edit " + access.getMastercard().getFormName() + "</a><br/>" + getDetails(access) + "<br/>";
	}

	protected String createNewCardHtmlTag(EMastercardAccess access) {
		String uuid = UUID.randomUUID().toString();
		String jQueryDateFormat = Helper.toJQueryDateFormat(Context.getDateFormat().toPattern());

		// special case here to allow us to pre-pick the encounter date
		String link = "<a onclick=\"window.location.href='/openmrs/"
		        + access.getFlowsheetPath()
		        + "&encounterDate=' + $j.datepicker.formatDate('yy-mm-dd', $j.datepicker.parseDate('" + jQueryDateFormat
		        + "', $j('#date-" + uuid + "').val()))"
		        + "\">";

		return link + "Create new " + access.getMastercard().getFormName() + "</a> on " + dateTag("date-" + uuid, "date-" + uuid);
	}

	protected String getDetails(EMastercardAccess access) {
		String created = "Created: " + Helper.formatDate(access.getCreated());
		String visited = "Visited: no";
		String rvd = "Appointment: none";
		if (access.getLastVisitDate() != null) {
			visited = "Visited: " + Helper.formatDate(access.getLastVisitDate()) + " at " + access.getLastVisitLocation();
			if (access.getAppointmentDate() != null) {
				rvd = "Appointment: " + Helper.formatDate(access.getAppointmentDate());
			}
		}
		return created + ", " + visited + ", " + rvd;
	}

	private String dateTag(String id, String name) {
		String today = Context.getDateFormat().format(new Date());
		return "<input type=\"text\" id=\"" + id + "\" name=\"" + name + "\" size=\"10\" onClick=\"showCalendar(this)\" value=\"" + today + "\" />";
	}

	public int doEndTag() {
		patientId = null;
		mastercard = null;
		var = null;

		return EVAL_PAGE;
	}

	public Integer getPatientId() {
		return patientId;
	}

	public void setPatientId(Integer patientId) {
		this.patientId = patientId;
	}

	public String getMastercard() {
		return mastercard;
	}

	public void setMastercard(String mastercard) {
		this.mastercard = mastercard;
	}

	public String getVar() {
		return var;
	}

	public void setVar(String var) {
		this.var = var;
	}
}
