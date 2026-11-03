package org.openmrs.module.pihmalawi.emastercard;

import org.apache.commons.io.FileUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.openmrs.EncounterType;
import org.openmrs.api.context.Context;
import org.openmrs.util.OpenmrsUtil;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Reads, from the htmlform files in the configuration directory, the form and encounter type each of an
 * eMastercard's forms saves with, so an encounter can be traced back to the eMastercard it belongs to
 */
@Component("emastercardFormIndex")
public class EMastercardFormIndex {

	private static final Log log = LogFactory.getLog(EMastercardFormIndex.class);

	private final File htmlformsDir;

	private final Map<String, Map<String, String>> attributesByForm = new ConcurrentHashMap<String, Map<String, String>>();

	public EMastercardFormIndex() {
		this(null);
	}

	/**
	 * @param htmlformsDir the directory holding the htmlform files, or null for configuration/htmlforms in the
	 *            OpenMRS application data directory
	 */
	public EMastercardFormIndex(File htmlformsDir) {
		this.htmlformsDir = htmlformsDir;
	}

	/**
	 * @param htmlformName the file name of the htmlform, without .xml
	 * @return the uuid of the form it saves encounters with, or null if there is no such file
	 */
	public String formUuidFor(String htmlformName) {
		return attributesFor(htmlformName).get("formUuid");
	}

	/**
	 * @param htmlformName the file name of the htmlform, without .xml
	 * @return the uuid of the encounter type it saves encounters with, or null if there is no such file
	 */
	public String formEncounterTypeFor(String htmlformName) {
		return attributesFor(htmlformName).get("formEncounterType");
	}

	/**
	 * @return the uuids of the forms of the card's header and flowsheets, for those that exist
	 */
	public List<String> formUuidsFor(EMastercard m) {
		List<String> ret = new ArrayList<String>();
		for (String form : formsOf(m)) {
			String uuid = formUuidFor(form);
			if (uuid != null) {
				ret.add(uuid.toLowerCase());
			}
		}
		return ret;
	}

	/**
	 * @return the uuids of the card's initial and follow-up encounter types and of the encounter types its forms save
	 */
	public Set<String> encounterTypeUuidsFor(EMastercard m) {
		Set<String> ret = new LinkedHashSet<String>();
		for (String name : new String[] { m.getInitialEncounterType(), m.getFollowupEncounterType() }) {
			EncounterType type = name == null ? null : Context.getEncounterService().getEncounterType(name);
			if (type != null) {
				ret.add(type.getUuid().toLowerCase());
			}
		}
		for (String form : formsOf(m)) {
			String uuid = formEncounterTypeFor(form);
			if (uuid != null) {
				ret.add(uuid.toLowerCase());
			}
		}
		return ret;
	}

	private List<String> formsOf(EMastercard m) {
		List<String> forms = new ArrayList<String>();
		forms.add(m.getHeaderForm());
		forms.addAll(m.getFlowsheetForms());
		return forms;
	}

	private Map<String, String> attributesFor(String htmlformName) {
		Map<String, String> attributes = attributesByForm.get(htmlformName);
		if (attributes == null) {
			attributes = readAttributes(new File(getHtmlformsDir(), htmlformName + ".xml"));
			attributesByForm.put(htmlformName, attributes);
		}
		return attributes;
	}

	/**
	 * Reads the attributes of the opening htmlform element, the only place formUuid and formEncounterType are set
	 */
	private Map<String, String> readAttributes(File file) {
		Map<String, String> ret = new ConcurrentHashMap<String, String>();
		if (!file.isFile()) {
			return ret;
		}
		try {
			String xml = FileUtils.readFileToString(file, StandardCharsets.UTF_8);
			int start = xml.indexOf("<htmlform");
			int end = start < 0 ? -1 : xml.indexOf('>', start);
			if (end > start) {
				Matcher matcher = Pattern.compile("\\s(\\w+)=\"([^\"]*)\"").matcher(xml.substring(start, end));
				while (matcher.find()) {
					ret.put(matcher.group(1), matcher.group(2));
				}
			}
		}
		catch (IOException e) {
			log.warn("Unable to read htmlform " + file, e);
		}
		return ret;
	}

	private File getHtmlformsDir() {
		if (htmlformsDir != null) {
			return htmlformsDir;
		}
		return new File(new File(OpenmrsUtil.getApplicationDataDirectory(), "configuration"), "htmlforms");
	}
}
