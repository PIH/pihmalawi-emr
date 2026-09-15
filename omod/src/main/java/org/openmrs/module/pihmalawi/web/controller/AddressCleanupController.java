package org.openmrs.module.pihmalawi.web.controller;

import au.com.bytecode.opencsv.CSVReader;
import org.apache.commons.io.IOUtils;
import org.openmrs.*;
import org.openmrs.api.context.Context;
import org.openmrs.module.pihmalawi.metadata.HivMetadata;
import org.openmrs.module.reporting.common.ObjectUtil;
import org.openmrs.util.OpenmrsClassLoader;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.*;

@Controller
public class AddressCleanupController {

	@RequestMapping("/module/pihmalawi/addressCleanup.form")
	public void addressCleanup(@RequestParam(value = "programId", required = false) Integer programId) throws Exception {

		// Load the replacements we want to search for
		Map<String, PersonAddress> replacementMap = new HashMap<String, PersonAddress>();
		InputStream is = null;
		try {
			is = OpenmrsClassLoader.getInstance().getResourceAsStream("apzu_map_address_to_hierarchy.csv");
			CSVReader csvReader = new CSVReader(new InputStreamReader(is));
			for (String[] row = csvReader.readNext(); row != null; row = csvReader.readNext()) {
				String sourceDistrict = ObjectUtil.nvl(row[0], "").trim();
				String sourceTA= ObjectUtil.nvl(row[1], "").trim();
				String sourceVillage = ObjectUtil.nvl(row[2], "").trim();
				String mapDistrict = ObjectUtil.nvl(row[3], "").trim();
				String mapTA= ObjectUtil.nvl(row[4], "").trim();
				String mapVillage = ObjectUtil.nvl(row[5], "").trim();
				if (!(sourceDistrict + sourceTA + sourceVillage).equals(mapDistrict + mapTA + mapVillage)) {
					String key = sourceDistrict + sourceTA + sourceVillage;
					PersonAddress pa = new PersonAddress();
					pa.setStateProvince(mapDistrict);
					pa.setCountyDistrict(mapTA);
					pa.setCityVillage(mapVillage);
					replacementMap.put(key, pa);
				}
			}
		}
		finally {
			IOUtils.closeQuietly(is);
		}

		System.out.println("Loaded " + replacementMap.size() + " address map entries from csv to check");

		if (programId == null) {
			Program hivProgram = Context.getProgramWorkflowService().getProgramByUuid(HivMetadata.HIV_PROGRAM_UUID);
			programId = hivProgram.getProgramId();
		}

		System.out.println("Retrieving patients in program " + programId + " to check");

		StringBuilder patientQuery = new StringBuilder();
		patientQuery.append("select distinct p.patient_id ");
		patientQuery.append("from 	patient p, patient_program pp ");
		patientQuery.append("where 	p.patient_id = pp.patient_id and p.voided = 0 and pp.voided = 0 ");
		patientQuery.append("and 	pp.program_id = " + programId);

		List<List<Object>> patIds = Context.getAdministrationService().executeSQL(patientQuery.toString(), true);
		System.out.println("Found " + patIds.size() + " to check");

		int totalChanged = 0;

		// Loops through patients to check anyone that needs cleaning up
		for (int i=0; i<patIds.size(); i++) {
			Patient patient = Context.getPatientService().getPatient((Integer)patIds.get(i).get(0));

			System.out.println("Starting check " + (i+1) + " / " + patIds.size());
			Set<PersonAddress> addresses = new HashSet<PersonAddress>(patient.getAddresses());
			System.out.println("Patient ID: " + patient.getPatientId() + ". Num addresses: " + addresses.size());
			boolean needsSaving = false;
			for (PersonAddress pa : addresses) {
				System.out.println("Checking: " + pa);
				if (pa.isVoided()) {
					System.out.println("Skipping since it is voided");
				}
				else {
					String currentDistrict = ObjectUtil.nvlStr(pa.getStateProvince(), "").trim();
					String currentTA = ObjectUtil.nvlStr(pa.getCountyDistrict(), "").trim();
					String currentVillage = ObjectUtil.nvlStr(pa.getCityVillage(), "").trim();
					String currentAddress1 = pa.getAddress1();
					String currentAddress2 = pa.getAddress2();
					boolean currentPreferred = pa.getPreferred();

					PersonAddress replacementTemplate = replacementMap.get(currentDistrict+currentTA+currentVillage);
					if (replacementTemplate != null) {
						System.out.println("Found replacement for this.  Going to clean up.");
						PersonAddress newPersonAddress = new PersonAddress();
						newPersonAddress.setPerson(patient);
						newPersonAddress.setStateProvince(replacementTemplate.getStateProvince());
						newPersonAddress.setCountyDistrict(replacementTemplate.getCountyDistrict());
						newPersonAddress.setCityVillage(replacementTemplate.getCityVillage());
						newPersonAddress.setAddress1(currentAddress1);
						newPersonAddress.setAddress2(currentAddress2);
						newPersonAddress.setPreferred(currentPreferred);
						patient.addAddress(newPersonAddress);

						pa.setVoided(true);
						pa.setVoidedBy(Context.getAuthenticatedUser());
						pa.setVoidReason("Mapped to structured address");
						System.out.println("Voided and replaced with: " + newPersonAddress);

						needsSaving = true;
						totalChanged++;
					}
				}
			}
			if (needsSaving) {
				System.out.println("Saving patient...");
				Context.getPatientService().savePatient(patient);
			}

			if (i%20 == 0) {
				Context.flushSession();
				Context.clearSession();
			}
		}

		System.out.println("Cleanup completed.  " + totalChanged + " addresses updated");
	}
}
