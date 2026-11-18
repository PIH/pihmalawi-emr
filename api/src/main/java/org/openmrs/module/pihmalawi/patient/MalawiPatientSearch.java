package org.openmrs.module.pihmalawi.patient;

import org.apache.commons.lang.StringUtils;
import org.openmrs.Cohort;
import org.openmrs.Patient;
import org.openmrs.api.context.Context;
import org.openmrs.module.pihmalawi.reporting.definition.cohort.definition.PatientSearchCohortDefinition;
import org.openmrs.module.pihmalawi.reporting.definition.cohort.definition.PatientSearchCohortDefinition.MatchMode;
import org.openmrs.module.reporting.cohort.definition.service.CohortDefinitionService;
import org.openmrs.module.reporting.evaluation.EvaluationContext;
import org.openmrs.module.reporting.evaluation.EvaluationException;
import org.openmrs.module.reporting.evaluation.querybuilder.HqlQueryBuilder;
import org.openmrs.module.reporting.evaluation.service.EvaluationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;

/**
 * Finds patients the way the legacy Find Patient page does (FindPatientPortletController): a patient's uuid; else an
 * identifier exactly as typed; else identifiers starting with it; and when no identifier matches, patients with every
 * word of the phrase somewhere in a given or family name. A phrase starting with "s:" or ending with ":s" is searched
 * for by how the names sound (name phonetics). Voided patients are left out, as are dead ones unless included.
 */
@Component
public class MalawiPatientSearch {

	public static final String SOUNDEX_PREFIX = "s:";

	public static final String SOUNDEX_SUFFIX = ":s";

	@Autowired
	private CohortDefinitionService cohortDefinitionService;

	@Autowired
	private EvaluationService evaluationService;

	/** The matching patients, newest registered first */
	public List<Patient> search(String phrase, boolean includeDead) {
		List<Patient> ret = new ArrayList<Patient>();
		for (Integer patientId : searchIds(phrase, includeDead)) {
			ret.add(Context.getPatientService().getPatient(patientId));
		}
		return ret;
	}

	/** The ids of the matching patients, newest registered first; loading only a page of them is up to the caller */
	public List<Integer> searchIds(String phrase, boolean includeDead) {
		if (StringUtils.isBlank(phrase)) {
			return new ArrayList<Integer>();
		}
		boolean soundex = isSoundex(phrase);
		String searchPhrase = withoutSoundexMarker(phrase);
		if (StringUtils.isBlank(searchPhrase)) {
			return new ArrayList<Integer>();
		}
		Set<Integer> matches = matching(searchPhrase, MatchMode.EXACT, soundex);
		if (matches.isEmpty()) {
			matches = matching(searchPhrase, MatchMode.START, soundex);
		}
		if (matches.isEmpty()) {
			return new ArrayList<Integer>();
		}
		HqlQueryBuilder q = new HqlQueryBuilder();
		q.select("p.patientId").from(Patient.class, "p").whereIdIn("p.patientId", matches);
		q.whereEqual("p.voided", false);
		if (!includeDead) {
			q.whereEqual("p.dead", false);
		}
		List<Integer> ret = new ArrayList<Integer>(evaluationService.evaluateToList(q, Integer.class, new EvaluationContext()));
		Collections.sort(ret, Collections.<Integer>reverseOrder());
		return ret;
	}

	private Set<Integer> matching(String phrase, MatchMode identifierMatchMode, boolean soundex) {
		PatientSearchCohortDefinition cd = new PatientSearchCohortDefinition();
		cd.setSearchPhrase(phrase);
		cd.setSoundexEnabled(soundex);
		cd.setIdentifierMatchMode(identifierMatchMode);
		try {
			Cohort c = cohortDefinitionService.evaluate(cd, new EvaluationContext());
			return c.getMemberIds();
		}
		catch (EvaluationException e) {
			throw new IllegalStateException("Unable to search for patients", e);
		}
	}

	/** Whether the phrase asks for names that sound like it */
	public static boolean isSoundex(String phrase) {
		String p = StringUtils.trimToEmpty(phrase).toLowerCase();
		return p.startsWith(SOUNDEX_PREFIX) || p.endsWith(SOUNDEX_SUFFIX);
	}

	/** The phrase without its soundex marker, trimmed */
	public static String withoutSoundexMarker(String phrase) {
		String p = StringUtils.trimToEmpty(phrase);
		if (p.toLowerCase().startsWith(SOUNDEX_PREFIX)) {
			p = p.substring(SOUNDEX_PREFIX.length());
		}
		else if (p.toLowerCase().endsWith(SOUNDEX_SUFFIX)) {
			p = p.substring(0, p.length() - SOUNDEX_SUFFIX.length());
		}
		return p.trim();
	}
}
