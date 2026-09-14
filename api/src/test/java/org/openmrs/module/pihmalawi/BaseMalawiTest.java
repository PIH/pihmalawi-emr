package org.openmrs.module.pihmalawi;

import org.apache.commons.io.FileUtils;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.openmrs.Concept;
import org.openmrs.Drug;
import org.openmrs.Encounter;
import org.openmrs.EncounterType;
import org.openmrs.Obs;
import org.openmrs.Patient;
import org.openmrs.PatientProgram;
import org.openmrs.PatientState;
import org.openmrs.Program;
import org.openmrs.ProgramWorkflowState;
import org.openmrs.api.ConceptService;
import org.openmrs.api.context.Context;
import org.openmrs.contrib.testdata.TestDataManager;
import org.openmrs.contrib.testdata.builder.EncounterBuilder;
import org.openmrs.contrib.testdata.builder.ObsBuilder;
import org.openmrs.contrib.testdata.builder.PatientBuilder;
import org.openmrs.contrib.testdata.builder.PatientProgramBuilder;
import org.openmrs.module.initializer.api.ConfigDirUtil;
import org.openmrs.module.initializer.api.InitializerService;
import org.openmrs.module.initializer.api.loaders.Loader;
import org.openmrs.module.pihmalawi.metadata.ChronicCareMetadata;
import org.openmrs.module.pihmalawi.metadata.HivMetadata;
import org.openmrs.module.pihmalawi.metadata.Metadata;
import org.openmrs.module.pihmalawi.reporting.library.ChronicCarePatientDataLibrary;
import org.openmrs.module.pihmalawi.reporting.library.HivPatientDataLibrary;
import org.openmrs.module.reporting.data.patient.service.PatientDataService;
import org.openmrs.test.BaseModuleContextSensitiveTest;
import org.openmrs.util.OpenmrsConstants;
import org.openmrs.util.OpenmrsUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.Map;
import java.util.Properties;
import java.util.Set;

public abstract class BaseMalawiTest extends BaseModuleContextSensitiveTest {

    /**
     * Location, on the test classpath, of the small test-only concept CSVs (see MLW-1839 Task 6)
     * that get swapped in for the full production concept set when building the test Initializer
     * config directory below. Contains exactly: concepts referenced by UUID or name (case-insensitive)
     * anywhere in api/src, concepts referenced by the programs/programworkflows/programworkflowstates
     * CSVs (resolving constants.yml placeholders), and conceptAnswers.csv rows where both the question
     * and answer are already in that set - verified empirically (full suite still passes) rather than
     * assumed. See PR #268 for the verification behind this.
     */
    public static final String METADATA_XML_FOLDER = "org/openmrs/module/pihmalawi/metadata";

    /**
     * The root of a temp "OpenMRS application data directory" built once per test JVM run, whose
     * {@code configuration/} subfolder Initializer reads from. It is a copy of the module's real
     * {@code content/configuration/backend_configuration/} tree (see MLW-1839 Tasks 1-4), except the {@code concepts}
     * and {@code conceptsets} subfolders are replaced with {@link #METADATA_XML_FOLDER}'s small
     * test-only equivalents - loading the real ~8,400-concept production set through Initializer's
     * service-layer processing on every test run would be a serious performance regression.
     */
    private static File testConfigRootDir;

    /**
     * The Initializer domains actually equivalent to what the old DBUnit {@code TABLES} array loaded
     * (see git history) - an inclusion list, not just an exclusion of the new bulk domains. This
     * deliberately leaves out domains this test suite never exercised before (`roles`,
     * `globalproperties`, `metadatasets`, `metadatatermmappings`, `idgen`, `addresshierarchy`,
     * `htmlforms`, `providerroles`): loading those surfaces environment gaps the old fixture-based
     * setup never had to deal with - e.g. `roles.csv` references privileges like "Provider Management
     * API" that are self-registered by the `providermanagement` module at real startup, which isn't
     * "installed" in this bare test context, so role loading fails validation. Since no test needs
     * those domains, it's both correct and faster to leave them out here rather than work around that.
     */
    private static final String INITIALIZER_TEST_DOMAINS =
            "concepts,conceptsets,conceptclasses,conceptsources,encounterroles,encountertypes,"
            + "locations,locationtags,locationtagmaps,attributetypes,patientidentifiertypes,"
            + "personattributetypes,privileges,programs,programworkflows,programworkflowstates,"
            + "relationshiptypes,visittypes";

    /**
     * {@code concept_datatype} and {@code concept_map_type} have no Initializer domain at all (these
     * are meant to be standard OpenMRS core defaults - e.g. Numeric/Coded/Text datatypes,
     * SAME-AS/NARROWER-THAN map types - but unlike a real production database,
     * {@link #initializeInMemoryDatabase()} does not seed them). Both must be loaded before the
     * {@code concepts} domain, since concept rows name a datatype and (via their mappings columns) a
     * map type by these values.
     */
    private static final String[] LEGACY_TABLES_BEFORE_INITIALIZER = { "concept_datatype", "concept_map_type" };

    /**
     * {@code order_type} was in the old DBUnit {@code TABLES} array, but this repo has no
     * {@code ordertypes} Initializer domain yet (a real gap - flagged for follow-up, out of scope for
     * MLW-1839's Tasks 1-10). Keep loading this tiny fixture the old way so test coverage doesn't
     * regress while that gap is unresolved.
     * <p>
     * {@code drug} was ALSO in the old array, but its fixture (561 rows) hardcodes numeric
     * {@code concept_id}/{@code dosage_form} foreign keys against the *old* full concept.xml
     * fixture's exact auto-increment id numbering - ids that the new, much smaller Initializer-loaded
     * concept set can never reproduce (real concepts now get fresh, sparse ids in insertion order).
     * Rather than load a fixture guaranteed to reference the wrong concepts by id, this test suite
     * stops seeding {@code Drug} formulary rows entirely (verified via the Task 7 full-suite run that
     * nothing actually depends on them) - also flagged for follow-up alongside the missing
     * {@code drugs}/{@code ordertypes} Initializer domains.
     */
    private static final String[] LEGACY_TABLES_AFTER_INITIALIZER = { "order_type" };

    @Autowired
    protected TestDataManager tdm;

    @Autowired
    protected ConceptService conceptService;

	@Autowired
    protected HivPatientDataLibrary hivPatientDataLibrary;

    @Autowired
    protected ChronicCarePatientDataLibrary chronicCarePatientDataLibrary;

	@Autowired
    @Qualifier("reportingPatientDataService")
    protected PatientDataService patientDataService;

    @Autowired
    protected HivMetadata hivMetadata;

    @Autowired
    protected ChronicCareMetadata ccMetadata;

    @Override
    public Boolean useInMemoryDatabase() {
        return true;
    }

    /**
     * Threshold raised from the old value of 100 (originally chosen to distinguish "loaded" from
     * "not loaded" against the full ~8,058-concept production set) to comfortably below the size of
     * the test-only concept set this class now loads (~1,000+, see MLW-1839 Task 6) while staying
     * well above anything OpenMRS core's own {@code initializeInMemoryDatabase()} liquibase
     * changesets seed on their own - a safer margin than 100 for the same purpose.
     */
    private static final int CONCEPT_COUNT_SETUP_THRESHOLD = 500;

    public boolean isSetup() throws SQLException {
        boolean isSetup = false;
        try (PreparedStatement statement = getConnection().prepareStatement("select count(*) from concept")) {
            try (ResultSet rs = statement.executeQuery()) {
                if (rs.next()) {
                    isSetup = rs.getInt(1) > CONCEPT_COUNT_SETUP_THRESHOLD;
                }
            }
        }
        return isSetup;
    }

    @Before
    @Override
    public void baseSetupWithStandardDataAndAuthentication() throws SQLException {
        if (!Context.isSessionOpen()) {
            Context.openSession();
        }

        if (!isSetup()) {
            this.deleteAllData();
            if (this.useInMemoryDatabase()) {
                this.initializeInMemoryDatabase();
            } else {
                this.executeDataSet("org/openmrs/include/initialInMemoryTestDataSet.xml");
            }
            // Unlike the old DBUnit-based loading (raw JDBC inserts, bypassing the API layer entirely),
            // Initializer saves through the real service layer, which requires an authenticated user
            // with the relevant privileges - so authenticate before loading, not just at the end.
            this.authenticate();
            for (String table : LEGACY_TABLES_BEFORE_INITIALIZER) {
                executeDataSet(METADATA_XML_FOLDER + "/" + table + ".xml");
            }
            loadMetadataViaInitializer();
            for (String table : LEGACY_TABLES_AFTER_INITIALIZER) {
                executeDataSet(METADATA_XML_FOLDER + "/" + table + ".xml");
            }
            this.getConnection().commit();
            this.updateSearchIndex();
        }
        this.authenticate();
        Context.flushSession();
        Context.clearSession();
    }

    /**
     * Loads the module's real Initializer metadata CSVs (MLW-1732's existing domains plus MLW-1839's
     * new ones) via the real {@link InitializerService}, in place of the old hand-maintained DBUnit
     * XML fixtures. Only the domains in {@link #INITIALIZER_TEST_DOMAINS} are loaded, and the
     * {@code concepts}/{@code conceptsets} domains are loaded from a small test-only substitute (see
     * {@link #buildTestConfigDir()}) rather than the full production concept set, for performance
     * (see MLW-1839 Task 6/7).
     * <p>
     * This deliberately does NOT use the documented {@code initializer.domains} runtime property /
     * {@link InitializerService#loadUnsafe(boolean, boolean)}: that property is read once, at Spring
     * bean construction time, by {@code InitializerConfig.afterPropertiesSet()} - well before this
     * method (called from a JUnit {@code @Before}) ever runs, so setting it here has no effect (the
     * same "too late" pitfall documented for {@code System.setProperty} in the playbook, just via a
     * different mechanism). Instead, this mirrors {@code MetadataInitializer}'s own loader-by-loader
     * iteration pattern, filtering by domain name in application code instead.
     */
    private static synchronized void loadMetadataViaInitializer() {
        try {
            File configRoot = buildTestConfigDir();
            Set<String> includedDomains = new HashSet<>(Arrays.asList(INITIALIZER_TEST_DOMAINS.split(",")));
            loadInitializerDomains(configRoot, includedDomains);
        }
        catch (Exception e) {
            throw new IllegalStateException("Failed to load test metadata via Initializer", e);
        }
    }

    /**
     * Points Initializer at {@code configRoot} (an "OpenMRS application data directory" whose
     * {@code configuration/} subfolder holds the CSVs to load) and runs only the named domains
     * through it. Shared by this class and {@link org.openmrs.module.pihmalawi.test.ValidateFullConceptSetup},
     * which needs the same mechanics but against a different, one-off config directory and domain
     * set (the full production concept CSVs, not this class's small test-only substitute).
     */
    public static void loadInitializerDomains(File configRoot, Set<String> domainNames) throws Exception {
        OpenmrsUtil.setApplicationDataDirectory(configRoot.getAbsolutePath());
        System.setProperty("OPENMRS_APPLICATION_DATA_DIRECTORY", configRoot.getAbsolutePath());

        Properties runtimeProperties = Context.getRuntimeProperties();
        runtimeProperties.setProperty(OpenmrsConstants.APPLICATION_DATA_DIRECTORY_RUNTIME_PROPERTY, configRoot.getAbsolutePath());
        Context.setRuntimeProperties(runtimeProperties);

        InitializerService initializerService = Context.getService(InitializerService.class);

        // Clear checksums first - Initializer skips re-processing a file whose checksum is
        // unchanged, which would wrongly skip a reload against the same reused config directory.
        ConfigDirUtil.deleteFilesByExtension(initializerService.getChecksumsDirPath(), ConfigDirUtil.CHECKSUM_FILE_EXT);

        for (Loader loader : initializerService.getLoaders()) {
            if (domainNames.contains(loader.getDomainName())) {
                loader.loadUnsafe(Collections.<String> emptyList(), true);
            }
        }
    }

    /**
     * Builds (once per test JVM run) a temp "OpenMRS application data directory" whose
     * {@code configuration/} subfolder holds only the domains in {@link #INITIALIZER_TEST_DOMAINS},
     * copied from the module's real {@code content/configuration/backend_configuration/} tree, except with the
     * {@code concepts} and {@code conceptsets} subfolders replaced by the small test-only CSVs at
     * {@link #METADATA_XML_FOLDER} (see MLW-1839 Task 6). Copying only the needed domains (rather
     * than the whole tree, which includes the ~2.9MB addresshierarchy CSV and 139 htmlform files)
     * keeps this cheap to redo on every fresh test JVM.
     */
    private static File buildTestConfigDir() throws IOException {
        if (testConfigRootDir != null && testConfigRootDir.isDirectory()) {
            return testConfigRootDir;
        }

        // maven-surefire-plugin's default working directory for a forked test JVM is the module's
        // own base directory (here, "api/"), so the real config tree - a sibling Maven module - is
        // reachable via this relative path regardless of where the `mvn` invocation itself started.
        String basedir = System.getProperty("basedir", System.getProperty("user.dir"));
        File realConfigRoot = new File(basedir, "../content").getCanonicalFile();
        File realConfigSource = new File(realConfigRoot, "configuration/backend_configuration");
        if (!realConfigSource.isDirectory()) {
            throw new IllegalStateException("Could not locate the real Initializer configuration directory at " + realConfigSource
                    + " (expected the sibling 'content' Maven module's 'configuration/backend_configuration' resource tree)");
        }

        File tempRoot = Files.createTempDirectory("pihmalawi-test-appdata").toFile();
        File configDest = new File(tempRoot, "configuration");
        FileUtils.forceMkdir(configDest);

        for (String domain : INITIALIZER_TEST_DOMAINS.split(",")) {
            File domainSource = new File(realConfigSource, domain);
            if (domainSource.isDirectory()) {
                FileUtils.copyDirectory(domainSource, new File(configDest, domain));
            }
        }

        replaceDomainWithTestOnlyFile(configDest, "concepts", "concepts.csv", "testConcepts.csv");
        replaceDomainWithTestOnlyFile(configDest, "conceptsets", "conceptAnswers.csv", "testConceptAnswers.csv");

        // Real config CSVs contain unresolved ${dotted.key} placeholders (see content.properties)
        // normally filled in by the `content` module's own Maven build (resource filtering) - a step
        // that never runs for this test-only copy, so do the same substitution by hand here.
        Map<String, String> constants = loadContentProperties(new File(realConfigRoot, "content.properties"));
        substitutePlaceholdersInDirectory(configDest, constants);

        testConfigRootDir = tempRoot;
        return testConfigRootDir;
    }

    /**
     * Loads {@code content.properties} (a flat {@code java.util.Properties} file, every key prefixed
     * {@code var.} - see MLW-1843) and strips that prefix, returning a map keyed the same way
     * {@code constants.yml} used to be (e.g. {@code program.chronicCare.uuid}), matching the dotted
     * placeholder names (e.g. {@code ${program.chronicCare.uuid}}) used in the CSVs.
     */
    private static Map<String, String> loadContentProperties(File propertiesFile) throws IOException {
        Map<String, String> flat = new java.util.LinkedHashMap<>();
        if (!propertiesFile.isFile()) {
            return flat;
        }
        Properties properties = new Properties();
        try (java.io.InputStream in = new java.io.FileInputStream(propertiesFile)) {
            properties.load(in);
        }
        for (String name : properties.stringPropertyNames()) {
            if (name.startsWith("var.")) {
                flat.put(name.substring("var.".length()), properties.getProperty(name));
            }
        }
        return flat;
    }

    /**
     * Recursively replaces every {@code ${dotted.key}} placeholder in every file under {@code dir}
     * with its value from {@code constants}, mirroring the substitution the real build's Maven
     * resource filtering performs. Unmatched placeholders are left as-is (a missing constant is a
     * real problem, but not one to mask here - Initializer will fail loudly on the literal string,
     * same as today).
     */
    private static void substitutePlaceholdersInDirectory(File dir, Map<String, String> constants) throws IOException {
        if (constants.isEmpty()) {
            return;
        }
        java.io.File[] children = dir.listFiles();
        if (children == null) {
            return;
        }
        for (File child : children) {
            if (child.isDirectory()) {
                substitutePlaceholdersInDirectory(child, constants);
            }
            else {
                String content = FileUtils.readFileToString(child, "UTF-8");
                if (content.contains("${")) {
                    String replaced = content;
                    for (Map.Entry<String, String> entry : constants.entrySet()) {
                        replaced = replaced.replace("${" + entry.getKey() + "}", entry.getValue());
                    }
                    if (!replaced.equals(content)) {
                        FileUtils.writeStringToFile(child, replaced, "UTF-8");
                    }
                }
            }
        }
    }

    /**
     * Empties the given domain subfolder of the copied config tree and replaces its content with a
     * single test-only CSV file loaded from {@link #METADATA_XML_FOLDER} on the test classpath.
     */
    private static void replaceDomainWithTestOnlyFile(File configDest, String domain, String realFilename, String testResourceFilename) throws IOException {
        File domainDir = new File(configDest, domain);
        FileUtils.deleteDirectory(domainDir);
        FileUtils.forceMkdir(domainDir);

        String resourcePath = METADATA_XML_FOLDER + "/" + testResourceFilename;
        java.net.URL resourceUrl = BaseMalawiTest.class.getClassLoader().getResource(resourcePath);
        if (resourceUrl == null) {
            throw new IllegalStateException("Could not find test classpath resource: " + resourcePath);
        }
        try (java.io.InputStream in = resourceUrl.openStream()) {
            FileUtils.copyInputStreamToFile(in, new File(domainDir, realFilename));
        }
    }

    @After
    public void clearConceptCaches() {
        for (Metadata m : Context.getRegisteredComponents(Metadata.class)) {
            m.clearConceptCache();
        }
    }

    protected PatientBuilder createPatient() {
        return tdm.randomPatient();
    }

    protected EncounterBuilder createEncounter(Patient p, EncounterType type, Date encounterDate) {
        return tdm.encounter().patient(p).encounterDatetime(encounterDate).encounterType(type);
    }

    protected PatientProgramBuilder createPatientProgram(Patient p, Program program, Date dateEnrolled, Date dateCompleted) {
        return tdm.patientProgram().patient(p).program(program).dateEnrolled(dateEnrolled).dateCompleted(dateCompleted);
    }

    protected ObsBuilder createObs(Encounter e, Concept question, Object value) {
        ObsBuilder ob = tdm.obs().encounter(e).concept(question);
        if (value != null) {
            if (value instanceof Date) {
                ob.value((Date) value);
            }
            else if (value instanceof Concept) {
                ob.value((Concept) value);
            }
            else if (value instanceof String) {
                ob.value((String) value);
            }
            else if (value instanceof Number) {
                ob.value((Number) value);
            }
            else if (value instanceof Drug) {
                ob.value((Drug) value);
            }
            else {
                throw new IllegalArgumentException("Unable to handle value of type " + value.getClass());
            }
        }
        return ob;
    }

    protected PatientState createState(PatientProgram pp, ProgramWorkflowState state, Date startDate) {
        PatientState ps = new PatientState();
        ps.setPatientProgram(pp);
        ps.setState(state);
        ps.setStartDate(startDate);
        Set<PatientState> states = new HashSet<PatientState>();
        states.add(ps);
        pp.setStates(states);
        tdm.getProgramWorkflowService().savePatientProgram(pp);
        return ps;
    }

    protected Obs voidObs(Obs o) {
        return tdm.getObsService().voidObs(o, "Testing");
    }

    protected void assertBothNullOrEqual(Object o1, Object o2) {
        if (o1 == null) {
            Assert.assertNull(o2);
        }
        else if (o2 == null) {
            Assert.assertNull(o1);
        }
        else {
            Assert.assertEquals(o1, o2);
        }
    }
}
