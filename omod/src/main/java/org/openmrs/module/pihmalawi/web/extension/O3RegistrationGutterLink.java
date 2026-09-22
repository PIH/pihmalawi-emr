package org.openmrs.module.pihmalawi.web.extension;

import org.openmrs.module.web.extension.LinkExt;

/**
 * Adds an "O3 - Registration" link to the legacy UI top navigation bar (gutter)
 */
public class O3RegistrationGutterLink extends LinkExt {

	@Override
	public String getLabel() {
		return "pihmalawi.gutter.o3Registration";
	}

	@Override
	public String getUrl() {
		return "spa/patient-registration";
	}

	@Override
	public String getRequiredPrivilege() {
		return "";
	}
}
