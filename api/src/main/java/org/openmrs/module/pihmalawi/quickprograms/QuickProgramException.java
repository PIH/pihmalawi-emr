package org.openmrs.module.pihmalawi.quickprograms;

import org.openmrs.api.APIException;

/**
 * Thrown when a Quick Programs action isn't one Quick Programs offers the patient, with a message for the user
 */
public class QuickProgramException extends APIException {

	public QuickProgramException(String message) {
		super(message);
	}
}
