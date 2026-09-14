package org.openmrs.module.pihmalawi.test;

import au.com.bytecode.opencsv.CSVReader;
import org.apache.commons.io.FileUtils;
import org.junit.Assert;
import org.junit.Ignore;
import org.junit.Test;
import org.openmrs.module.pihmalawi.BaseMalawiTest;
import org.openmrs.test.BaseModuleContextSensitiveTest;

import java.io.File;
import java.io.FileReader;
import java.nio.file.Files;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/**
 * Validates that the FULL production concept CSVs (<code>configuration/configuration/concepts/concepts.csv</code>
 * and friends - <code>conceptsets</code>, <code>conceptclasses</code>, <code>conceptsources</code>) load correctly
 * via Initializer, by comparing aggregate counts computed directly from the CSVs against the same aggregates
 * queried from the database after loading - not a hardcoded expected count or a spot-check of a few UUIDs, so
 * this stays correct as the CSVs change.
 * <p>
 * This is deliberately NOT part of the routine {@code mvn test} run: loading the full ~8,400-concept production
 * set through Initializer's service-layer processing (as opposed to {@link BaseMalawiTest}'s small, targeted
 * test-only concept set - see MLW-1839 Task 6) is slow and would be a serious drag on every ordinary test run.
 * Instead, this is a manually-run, on-demand check that the full concept CSVs remain loadable and internally
 * consistent, following the same {@code @Ignore}d, manually-run convention already used by
 * {@link org.openmrs.module.pihmalawi.reporting.PerformanceTest} in this module.
 * <p>
 * <b>To run:</b> remove the {@code @Ignore} annotation (or run via
 * {@code mvn test -pl api -Dtest=ValidateFullConceptSetup -DfailIfNoTests=false}) and re-add the annotation
 * afterward.
 */
@Ignore
public class ValidateFullConceptSetup extends BaseModuleContextSensitiveTest {

    private static final Set<String> DOMAINS_TO_LOAD = new HashSet<>(Arrays.asList("conceptclasses", "conceptsources", "concepts", "conceptsets"));

    @Test
    public void fullConceptCsvsShouldLoadAndMatchExpectedCount() throws Exception {
        this.deleteAllData();
        this.initializeInMemoryDatabase();
        this.authenticate();

        // concept_datatype/concept_map_type are standard OpenMRS core defaults with no Initializer domain of
        // their own (see BaseMalawiTest's identical note) - initializeInMemoryDatabase() doesn't seed them, so
        // every concept row's datatype/mapping-type reference would otherwise fail to resolve.
        executeDataSet("org/openmrs/module/pihmalawi/metadata/concept_datatype.xml");
        executeDataSet("org/openmrs/module/pihmalawi/metadata/concept_map_type.xml");

        String basedir = System.getProperty("basedir", System.getProperty("user.dir"));
        File realConfigRoot = new File(basedir, "../content").getCanonicalFile();
        File realConfigSource = new File(realConfigRoot, "configuration/backend_configuration");
        Assert.assertTrue("Expected to find the real Initializer configuration directory at " + realConfigSource,
            realConfigSource.isDirectory());

        ConceptSummary expected = summarizeConceptsCsv(new File(realConfigSource, "concepts/concepts.csv"));

        // Copy just the domains this test needs into a scratch app-data directory, rather than
        // pointing Initializer directly at the real checkout - this avoids writing checksum files
        // into the actual working tree on every manual run.
        File tempRoot = Files.createTempDirectory("pihmalawi-validate-full-concepts").toFile();
        File configDest = new File(tempRoot, "configuration");
        FileUtils.forceMkdir(configDest);
        for (String domain : DOMAINS_TO_LOAD) {
            FileUtils.copyDirectory(new File(realConfigSource, domain), new File(configDest, domain));
        }

        BaseMalawiTest.loadInitializerDomains(tempRoot, DOMAINS_TO_LOAD);

        ConceptSummary actual = summarizeConceptTable();

        Assert.assertEquals("total concept count", expected.total, actual.total);
        Assert.assertEquals("retired concept count", expected.retired, actual.retired);
        Assert.assertEquals("concept counts by datatype", expected.countsByDatatype, actual.countsByDatatype);
        Assert.assertEquals("concept counts by class", expected.countsByClass, actual.countsByClass);
        Assert.assertEquals("concept name count", expected.nameCount, actual.nameCount);
        Assert.assertEquals("concept mapping counts by source", expected.mappingCountsBySource, actual.mappingCountsBySource);
    }

    /**
     * The aggregate shape of a concept set, computed either from concepts.csv directly or from the
     * database after loading it - comparing these two is a stronger check than a total count or a
     * handful of spot-checked UUIDs, without needing to hardcode any expected numbers.
     */
    private static class ConceptSummary {

        int total;

        int retired;

        int nameCount;

        Map<String, Integer> countsByDatatype = new TreeMap<>();

        Map<String, Integer> countsByClass = new TreeMap<>();

        Map<String, Integer> mappingCountsBySource = new TreeMap<>();
    }

    private static ConceptSummary summarizeConceptsCsv(File csvFile) throws Exception {
        ConceptSummary summary = new ConceptSummary();
        try (CSVReader reader = new CSVReader(new FileReader(csvFile))) {
            String[] header = reader.readNext();
            int voidIdx = indexOfHeader(header, "void/retire");
            int classIdx = indexOfHeader(header, "data class");
            int typeIdx = indexOfHeader(header, "data type");

            List<Integer> nameIdxs = new ArrayList<>();
            Map<Integer, String> mappingSourceByIdx = new LinkedHashMap<>();
            for (int i = 0; i < header.length; i++) {
                String col = header[i] == null ? "" : header[i].trim().toLowerCase();
                if (col.startsWith("fully specified name") || col.startsWith("short name") || col.startsWith("synonym")) {
                    nameIdxs.add(i);
                }
                else if (col.startsWith("mappings|")) {
                    String[] parts = header[i].split("\\|");
                    mappingSourceByIdx.put(i, parts[parts.length - 1].trim());
                }
            }

            String[] row;
            while ((row = reader.readNext()) != null) {
                summary.total++;
                if ("true".equalsIgnoreCase(cell(row, voidIdx))) {
                    summary.retired++;
                }
                increment(summary.countsByClass, cell(row, classIdx));
                increment(summary.countsByDatatype, cell(row, typeIdx));
                for (int idx : nameIdxs) {
                    if (!isBlank(cell(row, idx))) {
                        summary.nameCount++;
                    }
                }
                for (Map.Entry<Integer, String> e : mappingSourceByIdx.entrySet()) {
                    String mappingCell = cell(row, e.getKey());
                    if (!isBlank(mappingCell)) {
                        // a mapping cell can hold multiple semicolon-delimited codes for the same
                        // source (e.g. "9374;Every 12 hours;Q12H") - each becomes its own
                        // concept_reference_map row, so count segments, not cells.
                        for (String code : mappingCell.split(";")) {
                            if (!isBlank(code)) {
                                increment(summary.mappingCountsBySource, e.getValue());
                            }
                        }
                    }
                }
            }
        }
        return summary;
    }

    private ConceptSummary summarizeConceptTable() throws Exception {
        ConceptSummary summary = new ConceptSummary();
        summary.total = queryCount("select count(*) from concept");
        summary.retired = queryCount("select count(*) from concept where retired = true");
        summary.nameCount = queryCount("select count(*) from concept_name where voided = false");
        queryGroupCounts("select cd.name, count(*) from concept c "
            + "join concept_datatype cd on c.datatype_id = cd.concept_datatype_id group by cd.name", summary.countsByDatatype);
        queryGroupCounts("select cc.name, count(*) from concept c "
            + "join concept_class cc on c.class_id = cc.concept_class_id group by cc.name", summary.countsByClass);
        queryGroupCounts("select crs.name, count(*) from concept_reference_map crm "
            + "join concept_reference_term crt on crm.concept_reference_term_id = crt.concept_reference_term_id "
            + "join concept_reference_source crs on crt.concept_source_id = crs.concept_source_id "
            + "group by crs.name", summary.mappingCountsBySource);
        return summary;
    }

    private int queryCount(String sql) throws Exception {
        try (PreparedStatement statement = getConnection().prepareStatement(sql); ResultSet rs = statement.executeQuery()) {
            rs.next();
            return rs.getInt(1);
        }
    }

    private void queryGroupCounts(String sql, Map<String, Integer> target) throws Exception {
        try (PreparedStatement statement = getConnection().prepareStatement(sql); ResultSet rs = statement.executeQuery()) {
            while (rs.next()) {
                target.put(rs.getString(1), rs.getInt(2));
            }
        }
    }

    private static int indexOfHeader(String[] header, String columnName) {
        for (int i = 0; i < header.length; i++) {
            if (columnName.equalsIgnoreCase(header[i] == null ? "" : header[i].trim())) {
                return i;
            }
        }
        throw new IllegalStateException("Expected concepts.csv to have a '" + columnName + "' column");
    }

    private static String cell(String[] row, int idx) {
        return idx < row.length ? row[idx] : null;
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static void increment(Map<String, Integer> counts, String key) {
        String k = isBlank(key) ? "" : key.trim();
        counts.merge(k, 1, Integer::sum);
    }
}
