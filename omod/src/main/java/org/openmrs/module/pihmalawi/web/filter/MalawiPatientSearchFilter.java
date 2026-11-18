package org.openmrs.module.pihmalawi.web.filter;

import org.openmrs.module.pihmalawi.rest.search.MalawiPatientSearchHandler;
import org.openmrs.module.webservices.rest.web.RestConstants;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletRequestWrapper;
import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Sends a plain patient search, {@code GET /ws/rest/v1/patient?q=...} (with includeDead and paging at most), to the
 * Malawi search ({@link MalawiPatientSearchHandler}) instead of the core one, as the O3 patient search asks for it and
 * can't name a search. A request naming a search ({@code s=default}, for the core one) or with other parameters is left
 * as it is.
 */
public class MalawiPatientSearchFilter implements Filter {

	/** What a plain search may have besides q */
	private static final Set<String> PLAIN_SEARCH_PARAMETERS = new HashSet<String>(Arrays.asList(
	    MalawiPatientSearchHandler.QUERY, MalawiPatientSearchHandler.INCLUDE_DEAD, RestConstants.REQUEST_PROPERTY_FOR_REPRESENTATION,
	    RestConstants.REQUEST_PROPERTY_FOR_LIMIT, RestConstants.REQUEST_PROPERTY_FOR_START_INDEX,
	    RestConstants.REQUEST_PROPERTY_FOR_TOTAL_COUNT, RestConstants.REQUEST_PROPERTY_FOR_INCLUDE_ALL));

	@Override
	public void init(FilterConfig filterConfig) {
	}

	@Override
	public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException,
	        ServletException {
		if (request instanceof HttpServletRequest && isPlainSearch((HttpServletRequest) request)) {
			request = withSearchId((HttpServletRequest) request);
		}
		chain.doFilter(request, response);
	}

	@Override
	public void destroy() {
	}

	static boolean isPlainSearch(HttpServletRequest request) {
		if (!"GET".equalsIgnoreCase(request.getMethod())) {
			return false;
		}
		Map<String, String[]> parameters = request.getParameterMap();
		return parameters.containsKey(MalawiPatientSearchHandler.QUERY)
		        && PLAIN_SEARCH_PARAMETERS.containsAll(parameters.keySet());
	}

	static HttpServletRequest withSearchId(HttpServletRequest request) {
		final Map<String, String[]> parameters = new LinkedHashMap<String, String[]>(request.getParameterMap());
		parameters.put(RestConstants.REQUEST_PROPERTY_FOR_SEARCH_ID, new String[] { MalawiPatientSearchHandler.ID });
		final Map<String, String[]> unmodifiable = Collections.unmodifiableMap(parameters);
		return new HttpServletRequestWrapper(request) {

			@Override
			public String getParameter(String name) {
				String[] values = unmodifiable.get(name);
				return values == null || values.length == 0 ? null : values[0];
			}

			@Override
			public Map<String, String[]> getParameterMap() {
				return unmodifiable;
			}

			@Override
			public Enumeration<String> getParameterNames() {
				return Collections.enumeration(unmodifiable.keySet());
			}

			@Override
			public String[] getParameterValues(String name) {
				return unmodifiable.get(name);
			}
		};
	}
}
