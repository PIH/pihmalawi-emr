package org.openmrs.module.pihmalawi.rest.search;

import org.openmrs.Patient;
import org.openmrs.api.context.Context;
import org.openmrs.module.pihmalawi.patient.MalawiPatientSearch;
import org.openmrs.module.webservices.rest.web.RequestContext;
import org.openmrs.module.webservices.rest.web.RestConstants;
import org.openmrs.module.webservices.rest.web.resource.api.PageableResult;
import org.openmrs.module.webservices.rest.web.resource.api.SearchConfig;
import org.openmrs.module.webservices.rest.web.resource.api.SearchHandler;
import org.openmrs.module.webservices.rest.web.resource.api.SearchQuery;
import org.openmrs.module.webservices.rest.web.resource.impl.AlreadyPaged;
import org.openmrs.module.webservices.rest.web.response.ResponseException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Searches patients as the legacy Find Patient page does (see {@link MalawiPatientSearch}), for the O3 patient search:
 * {@code GET /ws/rest/v1/patient?s=malawi&q=...&includeDead=...}. O3 asks for {@code ?q=...} without a search id;
 * {@link org.openmrs.module.pihmalawi.web.filter.MalawiPatientSearchFilter} sends those searches here. Only the
 * requested page of patients is loaded.
 */
@Component
public class MalawiPatientSearchHandler implements SearchHandler {

	public static final String ID = "malawi";

	public static final String QUERY = "q";

	public static final String INCLUDE_DEAD = "includeDead";

	private final SearchConfig searchConfig = new SearchConfig(ID, RestConstants.VERSION_1 + "/patient",
	        Arrays.asList("1.11.* - 9.*"),
	        Arrays.asList(new SearchQuery.Builder(
	                "Finds patients as the Malawi Find Patient page does: by uuid, exact identifier, identifier prefix, "
	                        + "then name; s:name for names that sound alike").withRequiredParameters(QUERY)
	                .withOptionalParameters(INCLUDE_DEAD).build()));

	@Autowired
	private MalawiPatientSearch patientSearch;

	@Override
	public SearchConfig getSearchConfig() {
		return searchConfig;
	}

	@Override
	public PageableResult search(RequestContext context) throws ResponseException {
		// as the core search reads it: only living patients unless includeDead=true
		boolean withDead = Boolean.parseBoolean(context.getParameter(INCLUDE_DEAD));
		List<Integer> ids = patientSearch.searchIds(context.getParameter(QUERY), withDead);

		int start = Math.min(context.getStartIndex(), ids.size());
		int end = Math.min(start + context.getLimit(), ids.size());
		List<Patient> page = new ArrayList<Patient>();
		for (Integer id : ids.subList(start, end)) {
			page.add(Context.getPatientService().getPatient(id));
		}
		return new AlreadyPaged<Patient>(context, page, end < ids.size(), (long) ids.size());
	}
}
