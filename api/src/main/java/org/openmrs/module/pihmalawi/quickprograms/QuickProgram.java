package org.openmrs.module.pihmalawi.quickprograms;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * One program of the patient dashboard's Quick Programs: the states a patient can be enrolled in, changed to and
 * exited with, and, for programs with one workflow per condition, those workflows
 */
public class QuickProgram {

	/**
	 * Extra conditions on whether the dashboard shows the program at all
	 */
	public enum Display {
		ALWAYS,
		/** Patients over 5 and under 30 with an HIV program enrollment, or with an active Teen club program enrollment */
		TEEN_CLUB
	}

	public static final String VIEW_CLINICAL_DATA = "View clinical data";

	private String key;
	private String label;
	private List<String> initialStateUuids = Collections.emptyList();
	private List<String> stateUuids = Collections.emptyList();
	private List<String> terminalStateUuids = Collections.emptyList();
	private List<String> workflowUuids = Collections.emptyList();
	private List<String> advancedCareOnlyWorkflowUuids = Collections.emptyList();
	private String requiredPrivilege = VIEW_CLINICAL_DATA;
	private Display display = Display.ALWAYS;

	private QuickProgram() {
	}

	public static Builder builder(String key, String label) {
		return new Builder(key, label);
	}

	public String getKey() {
		return key;
	}

	public String getLabel() {
		return label;
	}

	/**
	 * @return the states a patient not enrolled can be enrolled in, for programs without per-condition workflows. The
	 *         first one's workflow also identifies the program.
	 */
	public List<String> getInitialStateUuids() {
		return initialStateUuids;
	}

	/**
	 * @return the states an enrolled patient can be changed to, for programs without per-condition workflows
	 */
	public List<String> getStateUuids() {
		return stateUuids;
	}

	/**
	 * @return the states an enrolled patient can leave the program with, for programs without per-condition workflows
	 */
	public List<String> getTerminalStateUuids() {
		return terminalStateUuids;
	}

	/**
	 * @return the per-condition workflows, each enrolled in, changed and exited on its own; empty for other programs
	 */
	public List<String> getWorkflowUuids() {
		return workflowUuids;
	}

	/**
	 * @return whether the per-condition workflow is never on treatment: its patients are enrolled, and changed, only in
	 *         advanced care
	 */
	public boolean isAdvancedCareOnly(String workflowUuid) {
		for (String uuid : advancedCareOnlyWorkflowUuids) {
			if (uuid.equalsIgnoreCase(workflowUuid)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @return the privilege needed to see the program at all, or null when anyone can see it
	 */
	public String getRequiredPrivilege() {
		return requiredPrivilege;
	}

	public Display getDisplay() {
		return display;
	}

	public static class Builder {

		private final QuickProgram p = new QuickProgram();

		private Builder(String key, String label) {
			p.key = key;
			p.label = label;
		}

		public Builder initialStates(String csv) {
			p.initialStateUuids = split(csv);
			return this;
		}

		public Builder states(String csv) {
			p.stateUuids = split(csv);
			return this;
		}

		public Builder terminalStates(String csv) {
			p.terminalStateUuids = split(csv);
			return this;
		}

		public Builder workflows(String csv) {
			p.workflowUuids = split(csv);
			return this;
		}

		/**
		 * The per-condition workflows whose patients are never on treatment, only in advanced care
		 */
		public Builder advancedCareOnly(String csv) {
			p.advancedCareOnlyWorkflowUuids = split(csv);
			return this;
		}

		public Builder requiredPrivilege(String privilege) {
			p.requiredPrivilege = privilege;
			return this;
		}

		public Builder display(Display display) {
			p.display = display;
			return this;
		}

		public QuickProgram build() {
			return p;
		}

		private static List<String> split(String csv) {
			List<String> ret = new ArrayList<String>();
			for (String s : csv.split(",")) {
				if (!s.trim().isEmpty()) {
					ret.add(s.trim());
				}
			}
			return Collections.unmodifiableList(ret);
		}
	}
}
