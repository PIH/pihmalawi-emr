package org.openmrs.module.pihmalawi.web.extension;

import org.apache.commons.lang.StringUtils;
import org.openmrs.Patient;
import org.openmrs.api.context.Context;
import org.openmrs.module.Extension;

/**
 * Adds an "O3 - Patient Chart" link to the legacy patient dashboard header, opening the same patient
 * in the O3 patient chart. Part of piloting the O3 patient dashboard alongside the legacy one.
 */
public class O3PatientChartLink extends Extension {

	public String getRequiredPrivilege() {
		return "View clinical data";
	}

	@Override
	public String getOverrideContent(String bodyContent) {
		String patientId = getParameterMap().get("patientId");
		if (!Context.getUserContext().hasPrivilege(getRequiredPrivilege()) || !StringUtils.isNumeric(patientId)) {
			return "";
		}
		Patient patient = Context.getPatientService().getPatient(Integer.valueOf(patientId));
		if (patient == null) {
			return "";
		}
		String label = Context.getMessageSourceService().getMessage("pihmalawi.patientDashboard.o3PatientChart");
		return "<a href=\"spa/patient/" + patient.getUuid() + "/chart\">" + label + "</a>&nbsp;&nbsp;<br />";
	}

	@Override
	public MEDIA_TYPE getMediaType() {
		return MEDIA_TYPE.html;
	}
}
