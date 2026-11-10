package org.openmrs.module.pihmalawi.quickprograms;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Every program of the patient dashboard's Quick Programs, in the order the legacy dashboard shows them. The legacy
 * quickPrograms tag and the O3 Enrolments tab both read it.
 */
public class QuickProgramRegistry {

	private static final List<QuickProgram> ALL;

	static {
		List<QuickProgram> l = new ArrayList<QuickProgram>();
		l.add(QuickProgram.builder("hiv", "HIV Program")
				.initialStates("668847a2-977f-11e1-8993-905e29aff6c1,6687fa7c-977f-11e1-8993-905e29aff6c1")
				.states("6687fa7c-977f-11e1-8993-905e29aff6c1")
				.terminalStates("6687f50e-977f-11e1-8993-905e29aff6c1,6687fff4-977f-11e1-8993-905e29aff6c1,668846d0-977f-11e1-8993-905e29aff6c1")
				.build());
		l.add(QuickProgram.builder("teen-club", "Teen Club").display(QuickProgram.Display.TEEN_CLUB)
				.initialStates("F179C6EA-6AF7-4F66-8587-AFE23521400C,3E9BB98B-6BB0-431D-BCD5-B3E277922C04")
				.states("F179C6EA-6AF7-4F66-8587-AFE23521400C,3E9BB98B-6BB0-431D-BCD5-B3E277922C04")
				.terminalStates("BDAF0BE3-5135-423E-B22B-4A87DE3C5C4A,3700B846-6F87-454A-AB1C-1EB19BF0D48B,"
				        + "11DFAE63-7185-452B-9BE4-E0773AC91D34,051AB431-5F98-4351-A541-9EFE0829AE7C,"
				        + "BFB0D25A-96C7-44EB-B58A-8CA6DCDE36D8,E6C1B44A-8B02-4D47-944D-09A2E94D61F3")
				.build());
		l.add(QuickProgram.builder("chronic-care", "Chronic Care Program")
				.workflows("1A6C2438-99D7-41FF-8EB4-516DFCD1D199,4eda02b2-48ca-47dc-9166-483a6499bcbd,"
				        + "9b571347-8dc3-40fe-9994-e82071fa8290,cc76c7c2-8760-4ff6-8ed7-617a7378915b,"
				        + "62481c50-155c-45be-b4e9-39a38a9cbfda,319838b7-23cb-4e04-9b36-ad1e83cbeaaf")
				// sickle cell disease, chronic kidney disease, chronic heart failure and NCD other: in advanced care only
				.advancedCareOnly("1A6C2438-99D7-41FF-8EB4-516DFCD1D199,4eda02b2-48ca-47dc-9166-483a6499bcbd,"
				        + "cc76c7c2-8760-4ff6-8ed7-617a7378915b,62481c50-155c-45be-b4e9-39a38a9cbfda")
				.initialStates("66882650-977f-11e1-8993-905e29aff6c1,7c4d2e56-c8c2-11e8-9bc6-0242ac110001")
				.states("66882650-977f-11e1-8993-905e29aff6c1,7c4d2e56-c8c2-11e8-9bc6-0242ac110001")
				.terminalStates("6688275e-977f-11e1-8993-905e29aff6c1,6688297a-977f-11e1-8993-905e29aff6c1,"
				        + "3a4eb919-b942-4c9c-ba0e-defcebe5cd4b,dbe76d47-dbc4-4608-a578-97b6b62d9f63")
				.build());
		l.add(QuickProgram.builder("mental-health", "Mental Health Program")
				.workflows("26FD314D-138F-4A5C-8890-E01791C06336,DA69BBCB-01FE-4C59-9D46-8A2659ABBD73")
				.initialStates("5925718D-EA5E-43EB-9AE2-1CB342D8E318,E0381FF3-2976-41F0-B853-28E842400E84,"
				        + "2F76D426-56A9-4651-B253-A2299B442C09,79F2CAB1-E674-433E-AF42-447678FDB443")
				.states("5925718D-EA5E-43EB-9AE2-1CB342D8E318,E0381FF3-2976-41F0-B853-28E842400E84,"
				        + "2F76D426-56A9-4651-B253-A2299B442C09,79F2CAB1-E674-433E-AF42-447678FDB443")
				.terminalStates("42ACC789-C2BB-4EAA-8AC2-0BE7D0F5D4E8,9F6F188C-42AB-45D8-BC8B-DBE78948072D,"
				        + "D79B02C2-B473-47F1-A51C-6D40B2242B9C,41AF39C1-7CE6-47E0-9BA7-9FD7C0354C12,"
				        + "19CEF51A-0823-4876-A8AF-7285B7077494")
				.build());
		l.add(QuickProgram.builder("pdc", "Pediatric Development Clinic Program")
				.initialStates("b84735a5-82ae-4e3b-87db-250c43113977,28f67846-3204-4dc5-9c7f-043acc3e4b6c")
				.states("b84735a5-82ae-4e3b-87db-250c43113977,28f67846-3204-4dc5-9c7f-043acc3e4b6c")
				.terminalStates("38c0cc2f-eeda-4bf3-8496-4bb11736021e,4c03e13a-4372-42f5-bbb1-ac0bf77c233b,"
				        + "7451d3db-2400-4d38-b981-133dabf1558e,4b2027c3-f6a1-4cdd-81c3-a6c2068ef9a9,"
				        + "49853073-c864-4421-8ba4-41bb743107bd")
				.build());
		l.add(QuickProgram.builder("palliative-care", "Palliative Care Program")
				.initialStates("7c1f852e-5120-4371-8136-f64614f5dfc7")
				.terminalStates("b35ed57c-7d54-4795-b678-f0947a135fda,e92017b9-45cf-41b9-bc69-a5b0232544c1,"
				        + "0f034ef4-3f70-4514-a020-5fb928fc3394,4bed1c08-1fe9-4972-8e7e-e93323c9f2c4")
				.build());
		l.add(QuickProgram.builder("tb", "TB Program")
				.initialStates("5088F779-AD8D-4EEF-A504-9B5C2D96ED62,77DCD910-2E24-4ECD-B71F-EBCA67F02478")
				.terminalStates("B0EE543D-42D5-48BC-8D20-3FF6AF93FC9B")
				.build());
		l.add(QuickProgram.builder("nutrition", "Nutrition Program").requiredPrivilege(null)
				.initialStates("4F148482-8B25-4ACD-A23C-B2A1D4701C2D,35AF01AE-AAC7-4F9B-A9A1-0EFDEB84AD5B")
				.states("4F148482-8B25-4ACD-A23C-B2A1D4701C2D,35AF01AE-AAC7-4F9B-A9A1-0EFDEB84AD5B")
				.terminalStates("B633E826-943D-427F-BEC9-C19DBB31DAAE,228C3CE4-3685-459C-ABA3-41BAD3DED1D7,"
				        + "7988D58A-94B1-4E5F-8891-300F40D50D5B,9144608D-BE07-42E0-B9C3-7BF7B2E70B4B,"
				        + "51E67592-5751-491B-8DA5-D5737D320AC5")
				.build());
		ALL = Collections.unmodifiableList(l);
	}

	public static List<QuickProgram> getAll() {
		return ALL;
	}

	/**
	 * @return the program with the given key, or null if there is none
	 */
	public static QuickProgram get(String key) {
		for (QuickProgram p : ALL) {
			if (p.getKey().equals(key)) {
				return p;
			}
		}
		return null;
	}
}
