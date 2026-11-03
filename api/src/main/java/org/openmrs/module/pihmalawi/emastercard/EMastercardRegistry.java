package org.openmrs.module.pihmalawi.emastercard;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Every eMastercard on the patient dashboard, in the order the legacy dashboard shows them. This is the one place
 * the cards are defined: the legacy dashboard's eMastercardAccess tag and the eMastercards REST endpoint both read it.
 */
public class EMastercardRegistry {

	private static final String ARV_NUMBER = "ARV Number";
	private static final String HCC_NUMBER = "HCC Number";
	private static final String CHRONIC_CARE_NUMBER = "Chronic Care Number";
	private static final String PDC_IDENTIFIER = "PDC Identifier";
	private static final String NUTRITION_PROGRAM_NUMBER = "Nutrition Program Number";

	private static final String CHRONIC_CARE_RECORD = "Chronic Care Record";
	private static final String MENTAL_HEALTH_RECORD = "Mental Health Record";
	private static final String PDC_RECORD = "Pediatric Development Clinic Record";
	private static final String NUTRITION_RECORD = "Nutrition Record";

	private static final String DIAGNOSIS = "656292d8-977f-11e1-8993-905e29aff6c1";

	private static final String TEEN_CLUB_ACTIVE_STATES = "F179C6EA-6AF7-4F66-8587-AFE23521400C,3E9BB98B-6BB0-431D-BCD5-B3E277922C04";
	private static final String CHRONIC_CARE_ACTIVE_STATES = "66882650-977f-11e1-8993-905e29aff6c1,7c4d2e56-c8c2-11e8-9bc6-0242ac110001";
	private static final String HTN_DM_ACTIVE_STATES = "d5d2d3bf-9cca-4a1f-9c69-f7713ed8fff4,00be3c91-ecd2-482e-8c7a-7bdd49c997e7";
	private static final String ASTHMA_ACTIVE_STATES = "7f2fc125-f9bc-4195-b879-3060a386468a,8f395143-5f5a-4171-8e10-aef931e16bcf";
	private static final String CHF_ACTIVE_STATES = "3a9724e5-fc65-4a48-8d0b-2b1265106552,b002c86b-e22c-484a-a9a5-a12543b4a1b1";
	private static final String CKD_ACTIVE_STATES = "908552d7-2bb3-4e4f-9ba1-ec22c2c3f2b6,c5ddd2d0-33f3-4d1e-8f7d-f58beec5ece9";
	private static final String SCD_ACTIVE_STATES = "C2B106C6-18B6-4342-B2E7-FAA0540E6DC2,03A8A8DF-E95E-4875-B730-2D3CD86502EF";
	private static final String NCD_OTHER_ACTIVE_STATES = "cfec993e-ae2f-4f16-bea5-4bd26752bc89,05865dda-5934-4fcd-93eb-3d149edbdba0";
	private static final String MENTAL_HEALTH_ACTIVE_STATES = "5925718D-EA5E-43EB-9AE2-1CB342D8E318,E0381FF3-2976-41F0-B853-28E842400E84,2F76D426-56A9-4651-B253-A2299B442C09,79F2CAB1-E674-433E-AF42-447678FDB443";
	private static final String EPILEPSY_ACTIVE_STATES = "5925718D-EA5E-43EB-9AE2-1CB342D8E318,E0381FF3-2976-41F0-B853-28E842400E84,CB86C6FE-4263-4A4C-AF54-49D5308459D4,61190A43-95FF-4C84-8A3F-DD7F5354171C";
	private static final String PDC_ACTIVE_STATES = "b84735a5-82ae-4e3b-87db-250c43113977,28f67846-3204-4dc5-9c7f-043acc3e4b6c";
	private static final String PALLIATIVE_ON_TREATMENT_STATE = "7c1f852e-5120-4371-8136-f64614f5dfc7";
	private static final String TB_ACTIVE_STATES = "5088F779-AD8D-4EEF-A504-9B5C2D96ED62,77DCD910-2E24-4ECD-B71F-EBCA67F02478";
	private static final String NUTRITION_ACTIVE_STATES = "4F148482-8B25-4ACD-A23C-B2A1D4701C2D,35AF01AE-AAC7-4F9B-A9A1-0EFDEB84AD5B";

	private static final String DEVELOPMENTAL_DELAY = "76e0ba08-d931-4baf-9651-9946543cc623,1be62437-3093-4530-b4ab-1cd4626b9704";
	private static final String TRISOMY_21 = "fc4bf95c-b445-44e3-959b-435145e79f01";
	private static final String CLEFT_LIP_PALATE = "c415db67-75e8-4077-a0f2-ba2864ae52b1,abe71d88-3f2c-4380-854b-c49b74946a01";
	private static final String OTHER_DIAGNOSIS = "6575742a-977f-11e1-8993-905e29aff6c1,26071668-6ad4-4d30-b661-a7a07cece1ac,657169d4-977f-11e1-8993-905e29aff6c1,a94e5963-f6b1-4c91-b676-48dfb370a1f8,6575742a-977f-11e1-8993-905e29aff6c1,f541084c-84c7-48a6-b502-d9ddbb3bb3b9,6562c316-977f-11e1-8993-905e29aff6c1,6546938a-977f-11e1-8993-905e29aff6c1";

	private static final String[] PDC_COMMON_FLOWSHEETS = { "pdc-hospitalization-history", "pdc-complications", "vision-test",
			"pdc-hearing-test", "pdc-radiology-screening" };

	private static final List<EMastercard> ALL;

	static {
		List<EMastercard> l = new ArrayList<EMastercard>();

		l.add(EMastercard.builder("art", "ART Patient Card", "ART eMastercard")
				.encounterTypes("ART_INITIAL", "ART_FOLLOWUP").identifierType(ARV_NUMBER)
				.activeStates("6687fa7c-977f-11e1-8993-905e29aff6c1")
				.flowsheet("art-emastercard", "viral-load-tests", "art-follow-up-testing", "art-visit").build());
		l.add(EMastercard.builder("teen-club", "Teen Club Record", "Teen Club eMastercard")
				.encounterTypes("TEEN_CLUB_INITIAL", "TEEN_CLUB_FOLLOWUP").identifierType(ARV_NUMBER)
				.activeStates(TEEN_CLUB_ACTIVE_STATES).display(EMastercard.Display.TEEN_CLUB)
				.flowsheet("teen-club-emastercard", "teen-club-visit", "teen-club-intake-survey").build());
		l.add(EMastercard.builder("pre-art", "Pre-ART Patient Card", "Pre-ART eMastercard")
				.encounterTypes("PART_INITIAL", "PART_FOLLOWUP").identifierType(HCC_NUMBER)
				.activeStates("6687f284-977f-11e1-8993-905e29aff6c1").readonlyOnceArtInitial()
				.flowsheet("pre-art-emastercard", "pre-art-visit").build());
		l.add(EMastercard.builder("exposed-child", "Exposed Child Patient Card", "Exposed Child eMastercard")
				.encounterTypes("EXPOSED_CHILD_INITIAL", "EXPOSED_CHILD_FOLLOWUP").identifierType(HCC_NUMBER)
				.activeStates("668847a2-977f-11e1-8993-905e29aff6c1").readonlyOnceArtInitial()
				.flowsheet("exposed-child-emastercard", "exposed-child-visit", "eid-test-results").build());
		l.add(EMastercard.builder("chronic-care", CHRONIC_CARE_RECORD, "Chronic Care eMastercard")
				.encounterTypes("CHRONIC_CARE_INITIAL", "CHRONIC_CARE_FOLLOWUP").identifierType(CHRONIC_CARE_NUMBER)
				.activeStates(CHRONIC_CARE_ACTIVE_STATES).display(EMastercard.Display.OLD_CHRONIC_CARE)
				.flowsheet("chronic-care-emastercard", "chronic-care-visit").build());
		l.add(EMastercard.builder("htn-dm", CHRONIC_CARE_RECORD, "Hypertension and Diabetes eMastercard")
				.encounterTypes("DIABETES HYPERTENSION INITIAL VISIT", "DIABETES HYPERTENSION FOLLOWUP")
				.identifierType(CHRONIC_CARE_NUMBER).activeStates(HTN_DM_ACTIVE_STATES)
				.flowsheet("hypertension-and-diabetes-emastercard", "hypertension-and-diabetes-quarterly-laboratory-tests",
				    "hypertension-and-diabetes-annual-laboratory-tests", "hypertension-and-diabetes-hospitalization-history",
				    "hypertension-and-diabetes-visit").build());
		l.add(EMastercard.builder("asthma", CHRONIC_CARE_RECORD, "Chronic Lung Disease eMastercard")
				.encounterTypes("ASTHMA_INITIAL", "ASTHMA_FOLLOWUP").identifierType(CHRONIC_CARE_NUMBER)
				.activeStates(ASTHMA_ACTIVE_STATES)
				.flowsheet("chronic-lung-disease-emastercard", "chronic-lung-disease-visit", "chronic-lung-disease-peak-flow",
				    "chronic-lung-disease-hospitalization").build());
		l.add(EMastercard.builder("chf", CHRONIC_CARE_RECORD, "Cardiac and Vascular Disease eMastercard")
				.encounterTypes("CHF_INITIAL", "CHF_FOLLOWUP").identifierType(CHRONIC_CARE_NUMBER)
				.activeStates(CHF_ACTIVE_STATES)
				.flowsheet("cardiac-and-vascular-disease-emastercard", "echocardiogram-ultrasound-imaging-results",
				    "electrocardiographic-ekg-imaging-results", "chest-x-ray-cxr-imaging-results",
				    "cardiac-and-vascular-disease-quarterly-laboratory-tests",
				    "cardiac-and-vascular-disease-frequency-per-protocol-laboratory-tests",
				    "cardiac-and-vascular-disease-hospitalization-history", "cardiac-and-vascular-disease-visit").build());
		l.add(EMastercard.builder("ckd", CHRONIC_CARE_RECORD, "Chronic Kidney Disease eMastercard")
				.encounterTypes("CKD_INITIAL", "CKD_FOLLOWUP").identifierType(CHRONIC_CARE_NUMBER)
				.activeStates(CKD_ACTIVE_STATES)
				.flowsheet("chronic-kidney-disease-emastercard", "chronic-kidney-disease-quarterly-laboratory-tests",
				    "chronic-kidney-disease-annual-laboratory-tests", "chronic-kidney-disease-imaging-results",
				    "chronic-kidney-disease-hospitalization-history", "chronic-kidney-disease-visit").build());
		l.add(EMastercard.builder("scd", CHRONIC_CARE_RECORD, "Sickle Cell Disease eMastercard")
				.encounterTypes("SICKLE_CELL_DISEASE_INITIAL", "SICKLE_CELL_DISEASE_FOLLOWUP")
				.identifierType(CHRONIC_CARE_NUMBER).activeStates(SCD_ACTIVE_STATES)
				.flowsheet("sickle-cell-disease-emastercard", "sickle-cell-disease-quarterly-screening",
				    "sickle-cell-disease-annual-monitoring", "sickle-cell-disease-hospitalization-history",
				    "sickle-cell-disease-visit").build());
		l.add(EMastercard.builder("ncd-other", CHRONIC_CARE_RECORD, "NCD Other eMastercard")
				.encounterTypes("NCD_OTHER_INITIAL", "NCD_OTHER_FOLLOWUP").identifierType(CHRONIC_CARE_NUMBER)
				.activeStates(NCD_OTHER_ACTIVE_STATES)
				.flowsheet("ncd-other-emastercard", "ncd-other-quarterly-laboratory-tests", "ncd-other-annual-laboratory-tests",
				    "ncd-other-hospitalization-history", "ncd-other-visit").build());
		l.add(EMastercard.builder("mental-health", MENTAL_HEALTH_RECORD, "Mental Health eMastercard")
				.encounterTypes("MENTAL_HEALTH_INITIAL", "MENTAL_HEALTH_FOLLOWUP").identifierType(CHRONIC_CARE_NUMBER)
				.activeStates(MENTAL_HEALTH_ACTIVE_STATES)
				.flowsheet("mental-health-emastercard", "mental-health-screening", "mental-health-visit").build());
		l.add(EMastercard.builder("epilepsy", MENTAL_HEALTH_RECORD, "Epilepsy eMastercard")
				.encounterTypes("EPILEPSY_INITIAL", "EPILEPSY_FOLLOWUP").identifierType(CHRONIC_CARE_NUMBER)
				.activeStates(EPILEPSY_ACTIVE_STATES).flowsheet("epilepsy-emastercard", "epilepsy-visit").build());
		l.add(EMastercard.builder("pdc", PDC_RECORD, "PDC eMastercard")
				.encounterTypes("PDC_INITIAL", null).identifierType(PDC_IDENTIFIER).activeStates(PDC_ACTIVE_STATES)
				.flowsheet("pdc-emastercard").build());
		l.add(pdc("pdc-developmental-delay", "PDC Developmental Delay eMastercard", "PDC_DEVELOPMENTAL_DELAY", DEVELOPMENTAL_DELAY,
		    "pdc-developmental-delay-emastercard", "hie-developmental-delay-lab-tests", "developmental-delay-visit"));
		l.add(pdc("pdc-trisomy", "PDC Trisomy eMastercard", "PDC_TRISOMY21", TRISOMY_21, "pdc-trisomy-emastercard",
		    "trisomy-21-laboratory-tests", "pdc-trisomy-21-visit"));
		l.add(pdc("pdc-cleft-lip-palate", "PDC Cleft Lip / Palate eMastercard", "PDC_CLEFT_CLIP_PALLET", CLEFT_LIP_PALATE,
		    "pdc-cleft-lip-palate-emastercard", "pdc-hb-and-other-laboratory-tests", "cleft-lip-palate-visit"));
		l.add(pdc("pdc-other-diagnosis", "PDC Other Diagnosis eMastercard", "PDC_OTHER_DIAGNOSIS", OTHER_DIAGNOSIS,
		    "pdc-other-diagnosis-emastercard", "pdc-hb-and-other-laboratory-tests", "other-diagnosis-visit"));
		l.add(EMastercard.builder("palliative-care", "Palliative Care Record", "Palliative Care Mastercard")
				.encounterTypes("PALLIATIVE_INITIAL", "PALLIATIVE_FOLLOWUP").identifierType("Palliative Care Number")
				.activeStates(PALLIATIVE_ON_TREATMENT_STATE).flowsheet("palliative-care-mastercard", "palliative-care-visit")
				.build());
		l.add(EMastercard.builder("tb", "Tuberculosis Record", "TB eMastercard")
				.encounterTypes("TB_INITIAL", "TB_FOLLOWUP").identifierType("TB program identifier")
				.activeStates(TB_ACTIVE_STATES).flowsheet("tb-emastercard", "tb-visit", "tb-post-lung-disease").build());
		l.add(EMastercard.builder("ks", "Kaposis Sarcoma Flowsheet", "KS file").kaposisSarcoma()
				.flowsheet("kaposis-sarcoma-emastercard", "ks-evaluation-form", "ks-chemotherapy-form").build());
		l.add(nutrition("nutrition", "Nutrition eMastercard", "NUTRITION", "nutrition-emastercard", "nutrition-visit"));
		l.add(nutrition("nutrition-adults", "Nutrition Adults eMastercard", "NUTRITION_ADULTS", "nutrition-adults-emastercard",
		    "nutrition-adult-visit"));
		l.add(nutrition("nutrition-infant", "Nutrition Infant eMastercard", "NUTRITION_INFANT", "nutrition-infant-emastercard",
		    "nutrition-infant-visit"));
		l.add(nutrition("nutrition-pdc", "Nutrition PDC eMastercard", "NUTRITION_PDC", "nutrition-pdc-emastercard",
		    "nutrition-pdc-visit"));
		l.add(nutrition("nutrition-pregnant-teens", "Nutrition Pregnant Teens eMastercard", "NUTRITION_PREGNANT_TEENS",
		    "nutrition-pregnant-teens-emastercard", "nutrition-pregnant-teens-visit"));

		ALL = Collections.unmodifiableList(l);
	}

	public static List<EMastercard> getAll() {
		return ALL;
	}

	/**
	 * @return the card with the given key, or null if there is none
	 */
	public static EMastercard get(String key) {
		for (EMastercard m : ALL) {
			if (m.getKey().equals(key)) {
				return m;
			}
		}
		return null;
	}

	private static EMastercard pdc(String key, String formName, String encounterTypePrefix, String diagnoses,
	        String headerForm, String labForm, String visitForm) {
		String[] flowsheets = new String[PDC_COMMON_FLOWSHEETS.length + 2];
		flowsheets[0] = labForm;
		System.arraycopy(PDC_COMMON_FLOWSHEETS, 0, flowsheets, 1, PDC_COMMON_FLOWSHEETS.length);
		flowsheets[flowsheets.length - 1] = visitForm;
		return EMastercard.builder(key, PDC_RECORD, formName)
				.encounterTypes(encounterTypePrefix + "_INITIAL", encounterTypePrefix + "_FOLLOWUP")
				.identifierType(PDC_IDENTIFIER).activeStates(PDC_ACTIVE_STATES).condition(DIAGNOSIS, diagnoses)
				.flowsheet(headerForm, flowsheets).build();
	}

	private static EMastercard nutrition(String key, String formName, String encounterTypePrefix, String headerForm,
	        String visitForm) {
		return EMastercard.builder(key, NUTRITION_RECORD, formName)
				.encounterTypes(encounterTypePrefix + "_INITIAL", encounterTypePrefix + "_FOLLOWUP")
				.identifierType(NUTRITION_PROGRAM_NUMBER).activeStates(NUTRITION_ACTIVE_STATES).requiredPrivilege(null)
				.flowsheet(headerForm, visitForm).build();
	}
}
