package org.openmrs.module.pihmalawi.quickprograms;

/**
 * How leaving a program in a terminal state is recorded
 */
public enum ExitKind {
	/** Also records where the patient was transferred to, as a program attribute */
	TRANSFER_OUT,
	/** Also moves the program's other workflows to their own patient died state */
	DIED,
	/** Just moves the workflow to the state */
	COMPLETE
}
