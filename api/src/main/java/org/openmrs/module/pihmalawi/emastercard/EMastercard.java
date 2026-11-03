package org.openmrs.module.pihmalawi.emastercard;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * The definition of one eMastercard shown on the patient dashboard: which form and encounter types it uses,
 * which program states and identifier a patient needs for it, and which flowsheet forms it opens
 */
public class EMastercard {

	/**
	 * Extra conditions, beyond the access rules, on whether the dashboard shows the card at all
	 */
	public enum Display {
		ALWAYS,
		/** Patients over 5 and under 30 with an HIV program enrollment, or with a Teen club program enrollment */
		TEEN_CLUB,
		/** Only while the pihmalawi.showOldChronicCareCard global property is "true" */
		OLD_CHRONIC_CARE
	}

	public static final String VIEW_CLINICAL_DATA = "View clinical data";

	private String key;
	private String group;
	private String formName;
	private String initialEncounterType;
	private String followupEncounterType;
	private String patientIdentifierType;
	private List<String> activeStateUuids = Collections.emptyList();
	private String conditionConceptUuid;
	private List<String> conditionAnswerUuids = Collections.emptyList();
	private String headerForm;
	private List<String> flowsheetForms = Collections.emptyList();
	private String requiredPrivilege = VIEW_CLINICAL_DATA;
	private Display display = Display.ALWAYS;
	private boolean readonlyOnceArtInitial = false;
	private boolean kaposisSarcoma = false;

	private EMastercard() {
	}

	public static Builder builder(String key, String group, String formName) {
		return new Builder(key, group, formName);
	}

	public String getKey() {
		return key;
	}

	public String getGroup() {
		return group;
	}

	public String getFormName() {
		return formName;
	}

	public String getInitialEncounterType() {
		return initialEncounterType;
	}

	public String getFollowupEncounterType() {
		return followupEncounterType;
	}

	public String getPatientIdentifierType() {
		return patientIdentifierType;
	}

	public List<String> getActiveStateUuids() {
		return activeStateUuids;
	}

	public String getConditionConceptUuid() {
		return conditionConceptUuid;
	}

	public List<String> getConditionAnswerUuids() {
		return conditionAnswerUuids;
	}

	public String getHeaderForm() {
		return headerForm;
	}

	public List<String> getFlowsheetForms() {
		return flowsheetForms;
	}

	/**
	 * @return the privilege needed to see the card at all, or null when anyone can see it
	 */
	public String getRequiredPrivilege() {
		return requiredPrivilege;
	}

	public Display getDisplay() {
		return display;
	}

	/**
	 * @return true when the card is read-only once the patient has an ART initial encounter
	 */
	public boolean isReadonlyOnceArtInitial() {
		return readonlyOnceArtInitial;
	}

	/**
	 * @return true for the Kaposi's sarcoma flowsheet, which has its own simpler rules
	 */
	public boolean isKaposisSarcoma() {
		return kaposisSarcoma;
	}

	public static class Builder {

		private final EMastercard m = new EMastercard();

		private Builder(String key, String group, String formName) {
			m.key = key;
			m.group = group;
			m.formName = formName;
		}

		public Builder encounterTypes(String initial, String followup) {
			m.initialEncounterType = initial;
			m.followupEncounterType = followup;
			return this;
		}

		public Builder identifierType(String identifierType) {
			m.patientIdentifierType = identifierType;
			return this;
		}

		public Builder activeStates(String csvStateUuids) {
			m.activeStateUuids = split(csvStateUuids);
			return this;
		}

		public Builder condition(String conceptUuid, String csvAnswerUuids) {
			m.conditionConceptUuid = conceptUuid;
			m.conditionAnswerUuids = split(csvAnswerUuids);
			return this;
		}

		public Builder flowsheet(String headerForm, String... flowsheetForms) {
			m.headerForm = headerForm;
			m.flowsheetForms = Collections.unmodifiableList(Arrays.asList(flowsheetForms));
			return this;
		}

		public Builder requiredPrivilege(String privilege) {
			m.requiredPrivilege = privilege;
			return this;
		}

		public Builder display(Display display) {
			m.display = display;
			return this;
		}

		public Builder readonlyOnceArtInitial() {
			m.readonlyOnceArtInitial = true;
			return this;
		}

		public Builder kaposisSarcoma() {
			m.kaposisSarcoma = true;
			return this;
		}

		public EMastercard build() {
			return m;
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
