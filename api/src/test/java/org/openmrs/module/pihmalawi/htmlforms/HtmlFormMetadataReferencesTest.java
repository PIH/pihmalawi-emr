package org.openmrs.module.pihmalawi.htmlforms;

import au.com.bytecode.opencsv.CSVReader;
import org.junit.Assert;
import org.junit.Test;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Every htmlform's metadata references (concept, location, form) must be by uuid or, for concepts
 * only, a "source:code" mapping - never an install-specific raw primary key (see
 * MLW-1846/MLW-1851). Covers two invariants:
 * <ol>
 * <li>no module-defined tag attribute or macro value is a bare integer or comma-separated
 * integer list anywhere under the htmlforms directory (a permanent regression guard, independent
 * of whether any individual uuid/mapping below is correct);</li>
 * <li>every concept/location/form reference that IS present resolves to something real: for
 * concepts, either a uuid known to this repo's own concepts.csv, or a "source:code" mapping
 * verified against concepts.csv's own mapping columns (both are valid resolution paths supported
 * by HtmlFormEntryUtil#getConcept); for locations/htmlformflowsheet's formId, a uuid known to
 * locations.csv, or another htmlform's own declared formUuid, respectively.</li>
 * </ol>
 */
public class HtmlFormMetadataReferencesTest {

    /** Standard HTML tags - never metadata-carrying, excluded from the raw-id audit. */
    private static final Set<String> STANDARD_HTML = new HashSet<>(java.util.Arrays.asList(
            "b", "big", "br", "button", "div", "fieldset", "font", "h1", "h2", "h3", "h4", "h5",
            "hr", "i", "input", "li", "p", "script", "small", "span", "strong", "style", "sup",
            "table", "tbody", "td", "th", "thead", "tr", "u", "ul", "a", "img", "select", "option",
            "textarea", "label", "form", "head", "body", "html", "meta", "link", "title", "ol",
            "iframe", "canvas", "svg", "g", "path", "legend", "optgroup", "colgroup", "col",
            "caption", "abbr", "code", "pre", "blockquote", "cite", "q", "dl", "dt", "dd"
    ));

    /**
     * (tag, attribute) pairs confirmed NOT to be metadata references, despite carrying an integer
     * value - UI sizing, the form's own self-version, and literal display labels. See the design
     * discussion in MLW-1846 for how each was verified.
     */
    private static final Set<String> EXCLUDED_TAG_ATTRS = new HashSet<>(java.util.Arrays.asList(
            "obs.size", "obsreference.size", "encounterDate.size", "lookup.size",
            "obs.cols", "obs.rows", "htmlform.formVersion", "obs.answerLabels"
    ));

    /**
     * Note: the generic {@code <macro key= value=>} tag is deliberately excluded here - despite
     * being flagged by the raw-int audit above when its value was a bare integer, its "value" can
     * legitimately hold any metadata type's uuid depending on what "key" aliases (e.g.
     * art-visit.xml's formEncTypeUuid macro holds an encounter type uuid, not a concept), so it
     * can't be existence-checked against concepts.csv specifically.
     */
    private static final Set<String> CONCEPT_TAG_ATTRS = new HashSet<>(java.util.Arrays.asList(
            "obs.conceptId", "obs.answerConceptId", "obs.answerConceptIds", "obsgroup.groupingConceptId",
            "obsreference.conceptId", "obsreference.answerConceptId", "render.conceptId"
    ));

    private static final Set<String> LOCATION_TAG_ATTRS = new HashSet<>(java.util.Arrays.asList(
            "encounterLocation.default", "encounterLocation.order"
    ));

    private static final Pattern TAG_PATTERN =
            Pattern.compile("<([a-zA-Z][a-zA-Z0-9_:-]*)((?:\\s+[a-zA-Z_:][\\w:.-]*\\s*=\\s*\"[^\"]*\")*)\\s*/?>");
    private static final Pattern ATTR_PATTERN = Pattern.compile("([a-zA-Z_:][\\w:.-]*)\\s*=\\s*\"([^\"]*)\"");
    private static final Pattern MACROS_BLOCK_PATTERN = Pattern.compile("<macros>(.*?)</macros>", Pattern.DOTALL);
    private static final Pattern MACRO_LINE_PATTERN = Pattern.compile("^[ \\t]*([a-zA-Z_][\\w]*)\\s*=\\s*([^\\r\\n]*)$", Pattern.MULTILINE);
    private static final Pattern FORM_UUID_PATTERN = Pattern.compile("<htmlform\\b[^>]*?\\bformUuid\\s*=\\s*\"([^\"]*)\"");
    private static final Pattern INT_PATTERN = Pattern.compile("^\\d+$");
    private static final Pattern INT_LIST_PATTERN = Pattern.compile("^\\d+(,\\d+)+$");

    /**
     * Shape of a value checked directly against a uuid set (concepts.csv/locations.csv). A
     * "source:code" concept mapping is a separate, equally valid shape for a concept reference -
     * see {@link #SOURCE_CODE_PATTERN} and {@link #checkConceptReference}, which checks it against
     * concepts.csv's own mapping columns instead of this set. A $-prefixed macro placeholder or a
     * repeat-tag template like "{0}"/"{name}" defers resolution elsewhere and isn't checked directly
     * at all; a plain-text macro label/list (e.g. regimenLabels) isn't a metadata reference in the
     * first place.
     */
    private static final Pattern UUID_SHAPE_PATTERN =
            Pattern.compile("^[0-9a-zA-Z]{8}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{12}$");

    private static class AttrFinding {
        final String file;
        final int line;
        final String tag;
        final String attr;
        final String value;

        AttrFinding(String file, int line, String tag, String attr, String value) {
            this.file = file;
            this.line = line;
            this.tag = tag;
            this.attr = attr;
            this.value = value;
        }

        String key() {
            return tag + "." + attr;
        }
    }

    private static class MacroFinding {
        final String file;
        final int line;
        final String name;
        final String value;

        MacroFinding(String file, int line, String name, String value) {
            this.file = file;
            this.line = line;
            this.name = name;
            this.value = value;
        }
    }

    private File htmlformsDir() throws IOException {
        String basedir = System.getProperty("basedir", System.getProperty("user.dir"));
        return new File(basedir, "../content/configuration/backend_configuration/htmlforms").getCanonicalFile();
    }

    private List<AttrFinding> attrFindings = null;
    private List<MacroFinding> macroFindings = null;
    private Set<String> declaredFormUuids = null;

    private void scanIfNeeded() throws IOException {
        if (attrFindings != null) {
            return;
        }
        attrFindings = new ArrayList<>();
        macroFindings = new ArrayList<>();
        declaredFormUuids = new HashSet<>();

        File dir = htmlformsDir();
        Assert.assertTrue("Expected htmlforms directory to exist: " + dir, dir.isDirectory());
        File[] files = dir.listFiles((d, name) -> name.endsWith(".xml"));
        Assert.assertNotNull(files);

        for (File file : files) {
            String text = new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
            String fname = file.getName();

            Matcher formUuidMatcher = FORM_UUID_PATTERN.matcher(text);
            while (formUuidMatcher.find()) {
                declaredFormUuids.add(formUuidMatcher.group(1));
            }

            Matcher tagMatcher = TAG_PATTERN.matcher(text);
            while (tagMatcher.find()) {
                String tag = tagMatcher.group(1);
                if (STANDARD_HTML.contains(tag.toLowerCase()) || "macros".equals(tag)) {
                    continue;
                }
                int line = countLines(text, tagMatcher.start());
                Matcher attrMatcher = ATTR_PATTERN.matcher(tagMatcher.group(2));
                while (attrMatcher.find()) {
                    attrFindings.add(new AttrFinding(fname, line, tag, attrMatcher.group(1), attrMatcher.group(2)));
                }
            }

            Matcher macrosBlockMatcher = MACROS_BLOCK_PATTERN.matcher(text);
            while (macrosBlockMatcher.find()) {
                String block = macrosBlockMatcher.group(1);
                int blockStart = macrosBlockMatcher.start(1);
                Matcher lineMatcher = MACRO_LINE_PATTERN.matcher(block);
                while (lineMatcher.find()) {
                    int line = countLines(text, blockStart + lineMatcher.start());
                    macroFindings.add(new MacroFinding(fname, line, lineMatcher.group(1), lineMatcher.group(2).trim()));
                }
            }
        }
    }

    private static int countLines(String text, int upToIndex) {
        int lines = 1;
        for (int i = 0; i < upToIndex; i++) {
            if (text.charAt(i) == '\n') {
                lines++;
            }
        }
        return lines;
    }

    private static Set<String> readFirstColumnAsUuidSet(File csvFile) throws Exception {
        Set<String> uuids = new HashSet<>();
        try (CSVReader reader = new CSVReader(new FileReader(csvFile))) {
            reader.readNext(); // header
            String[] row;
            while ((row = reader.readNext()) != null) {
                if (row.length > 0 && row[0] != null && !row[0].trim().isEmpty()) {
                    uuids.add(row[0].trim().toLowerCase());
                }
            }
        }
        return uuids;
    }

    @Test
    public void noModuleDefinedTagAttributeOrMacroShouldBeARawIntegerOrIntegerList() throws Exception {
        scanIfNeeded();
        List<String> violations = new ArrayList<>();

        for (AttrFinding f : attrFindings) {
            if (EXCLUDED_TAG_ATTRS.contains(f.key())) {
                continue;
            }
            if (INT_PATTERN.matcher(f.value).matches() || INT_LIST_PATTERN.matcher(f.value).matches()) {
                violations.add(f.file + ":" + f.line + " <" + f.tag + " " + f.attr + "=\"" + f.value + "\">");
            }
        }
        for (MacroFinding f : macroFindings) {
            if (INT_PATTERN.matcher(f.value).matches() || INT_LIST_PATTERN.matcher(f.value).matches()) {
                violations.add(f.file + ":" + f.line + " macro " + f.name + "=" + f.value);
            }
        }

        Assert.assertTrue(
                "Found raw-integer metadata references in htmlforms:\n" + String.join("\n", violations),
                violations.isEmpty());
    }

    /** A repeat-tag template placeholder - positional (e.g. "{0}") or named (e.g. "{conceptId}",
     * substituted from a sibling &lt;render&gt; element's own attribute of that name) - resolved to
     * a real value before the form is parsed. Not a literal reference itself. */
    private static final Pattern REPEAT_PLACEHOLDER_PATTERN = Pattern.compile("^\\{[a-zA-Z_]\\w*\\}$|^\\{\\d+\\}$");

    private static final Pattern SOURCE_CODE_PATTERN = Pattern.compile("^([^:]+):(.+)$");

    /**
     * Parses every {@code mappings|<map type>|<source>} column in concepts.csv into a
     * source-name -> set-of-codes map (aggregated across map types, matching how
     * ConceptService#getConceptByMapping resolves a "source:code" reference regardless of map
     * type), so a htmlform's "source:code" concept reference can be verified against it.
     */
    private static Map<String, Set<String>> readConceptMappingsBySource(File csvFile) throws Exception {
        Map<String, Set<String>> bySource = new HashMap<>();
        try (CSVReader reader = new CSVReader(new FileReader(csvFile))) {
            String[] header = reader.readNext();
            Map<Integer, String> sourceByColumn = new HashMap<>();
            for (int i = 0; i < header.length; i++) {
                String col = header[i] == null ? "" : header[i].trim();
                if (col.startsWith("mappings|")) {
                    String[] parts = col.split("\\|");
                    sourceByColumn.put(i, parts[parts.length - 1].trim());
                }
            }
            String[] row;
            while ((row = reader.readNext()) != null) {
                for (Map.Entry<Integer, String> e : sourceByColumn.entrySet()) {
                    int idx = e.getKey();
                    if (idx >= row.length || row[idx] == null || row[idx].trim().isEmpty()) {
                        continue;
                    }
                    Set<String> codes = bySource.computeIfAbsent(e.getValue(), k -> new HashSet<>());
                    for (String code : row[idx].split(";")) {
                        if (!code.trim().isEmpty()) {
                            codes.add(code.trim());
                        }
                    }
                }
            }
        }
        return bySource;
    }

    private static String checkConceptReference(String token, Set<String> knownConceptUuids, Map<String, Set<String>> mappingsBySource) {
        if (token.isEmpty() || token.startsWith("$") || REPEAT_PLACEHOLDER_PATTERN.matcher(token).matches()) {
            return null; // deferred - resolved elsewhere (macros block, or repeat-tag templating)
        }
        if (UUID_SHAPE_PATTERN.matcher(token).matches()) {
            return knownConceptUuids.contains(token.toLowerCase()) ? null : "unknown concept uuid \"" + token + "\"";
        }
        Matcher sourceCodeMatcher = SOURCE_CODE_PATTERN.matcher(token);
        if (sourceCodeMatcher.matches()) {
            String source = sourceCodeMatcher.group(1).trim();
            String code = sourceCodeMatcher.group(2).trim();
            Set<String> codes = mappingsBySource.get(source);
            if (codes == null) {
                return "unknown concept source \"" + source + "\" in mapping \"" + token + "\"";
            }
            return codes.contains(code) ? null : "unknown code \"" + code + "\" for concept source \"" + source + "\" in mapping \"" + token + "\"";
        }
        return "concept reference \"" + token + "\" is neither a uuid nor a source:code mapping";
    }

    @Test
    public void everyConceptReferenceShouldResolveToAKnownConceptByUuidOrMapping() throws Exception {
        scanIfNeeded();
        File conceptsCsv = new File(htmlformsDir(), "../concepts/concepts.csv").getCanonicalFile();
        Set<String> knownConceptUuids = readFirstColumnAsUuidSet(conceptsCsv);
        Map<String, Set<String>> mappingsBySource = readConceptMappingsBySource(conceptsCsv);

        List<String> violations = new ArrayList<>();
        for (AttrFinding f : attrFindings) {
            if (!CONCEPT_TAG_ATTRS.contains(f.key())) {
                continue;
            }
            for (String token : f.value.split(",")) {
                String problem = checkConceptReference(token.trim(), knownConceptUuids, mappingsBySource);
                if (problem != null) {
                    violations.add(f.file + ":" + f.line + " <" + f.tag + " " + f.attr + "=\"" + f.value + "\"> -> " + problem);
                }
            }
        }
        // <macros> block entries are a general-purpose key/value store, not exclusively concept
        // references (e.g. regimenLabels holds a comma list of display text, not concepts) - so
        // only existence-check values that are actually shaped like a concept reference, rather
        // than requiring every entry to be one.
        for (MacroFinding f : macroFindings) {
            String value = f.value.trim();
            boolean looksLikeConceptRef = UUID_SHAPE_PATTERN.matcher(value).matches() || SOURCE_CODE_PATTERN.matcher(value).matches();
            if (!looksLikeConceptRef) {
                continue;
            }
            String problem = checkConceptReference(value, knownConceptUuids, mappingsBySource);
            if (problem != null) {
                violations.add(f.file + ":" + f.line + " macro " + f.name + "=" + f.value + " -> " + problem);
            }
        }

        Assert.assertTrue(
                "Found htmlform concept references that don't resolve to a known concept:\n" + String.join("\n", violations),
                violations.isEmpty());
    }

    @Test
    public void everyLocationReferenceShouldResolveToAKnownLocation() throws Exception {
        scanIfNeeded();
        File locationsCsv = new File(htmlformsDir(), "../locations/locations.csv").getCanonicalFile();
        Set<String> knownLocationUuids = readFirstColumnAsUuidSet(locationsCsv);

        List<String> violations = new ArrayList<>();
        for (AttrFinding f : attrFindings) {
            if (!LOCATION_TAG_ATTRS.contains(f.key())) {
                continue;
            }
            for (String token : f.value.split(",")) {
                token = token.trim();
                if (!UUID_SHAPE_PATTERN.matcher(token).matches()) {
                    continue;
                }
                if (!knownLocationUuids.contains(token.toLowerCase())) {
                    violations.add(f.file + ":" + f.line + " <" + f.tag + " " + f.attr + "=\"" + f.value + "\"> -> unknown location uuid \"" + token + "\"");
                }
            }
        }

        Assert.assertTrue(
                "Found htmlform location references that don't resolve to a known location:\n" + String.join("\n", violations),
                violations.isEmpty());
    }

    @Test
    public void everyHtmlFormFlowsheetFormIdShouldResolveToAnotherHtmlFormsDeclaredUuid() throws Exception {
        scanIfNeeded();

        List<String> violations = new ArrayList<>();
        for (AttrFinding f : attrFindings) {
            if (!"htmlformflowsheet.formId".equals(f.key())) {
                continue;
            }
            String value = f.value.trim();
            if (value.isEmpty()) {
                continue;
            }
            if (!declaredFormUuids.contains(value)) {
                violations.add(f.file + ":" + f.line + " <" + f.tag + " " + f.attr + "=\"" + f.value + "\"> -> no htmlform declares this formUuid");
            }
        }

        Assert.assertTrue(
                "Found htmlformflowsheet formId references that don't match any htmlform's own declared formUuid:\n"
                        + String.join("\n", violations),
                violations.isEmpty());
    }
}
