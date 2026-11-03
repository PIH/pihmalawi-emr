package org.openmrs.module.pihmalawi.quickprograms;

import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.openmrs.Concept;
import org.openmrs.Location;
import org.openmrs.Patient;
import org.openmrs.PatientIdentifierType;
import org.openmrs.PatientProgram;
import org.openmrs.PatientState;
import org.openmrs.Privilege;
import org.openmrs.Program;
import org.openmrs.ProgramWorkflowState;
import org.openmrs.Role;
import org.openmrs.User;
import org.openmrs.api.context.Context;
import org.openmrs.contrib.testdata.builder.PatientBuilder;
import org.openmrs.module.pihmalawi.BaseMalawiTest;
import org.openmrs.module.reporting.common.DateUtil;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class QuickProgramServiceTest extends BaseMalawiTest {

    private static final String EXPOSED_CHILD_CONTINUE = "668847a2-977f-11e1-8993-905e29aff6c1";
    private static final String ON_ARVS = "6687fa7c-977f-11e1-8993-905e29aff6c1";
    private static final String PRE_ART_CONTINUE = "6687f284-977f-11e1-8993-905e29aff6c1";
    private static final String HIV_TERMINAL_1 = "6687f50e-977f-11e1-8993-905e29aff6c1";
    private static final String HIV_TERMINAL_2 = "6687fff4-977f-11e1-8993-905e29aff6c1";
    private static final String HIV_TERMINAL_3 = "668846d0-977f-11e1-8993-905e29aff6c1";

    private static final String HTN_DM_WORKFLOW = "9b571347-8dc3-40fe-9994-e82071fa8290";
    private static final String HTN_DM_ON_TREATMENT = "d5d2d3bf-9cca-4a1f-9c69-f7713ed8fff4";
    private static final String ASTHMA_WORKFLOW = "319838b7-23cb-4e04-9b36-ad1e83cbeaaf";
    private static final String ASTHMA_ON_TREATMENT = "7f2fc125-f9bc-4195-b879-3060a386468a";

    private static final String EPILEPSY_WORKFLOW = "26FD314D-138F-4A5C-8890-E01791C06336";
    private static final String MENTAL_HEALTH_WORKFLOW = "DA69BBCB-01FE-4C59-9D46-8A2659ABBD73";
    private static final String MENTAL_HEALTH_ON_TREATMENT = "2F76D426-56A9-4651-B253-A2299B442C09";
    private static final String MENTAL_HEALTH_DIED = "5FB84A00-8AEC-42F5-8CE0-6006A1B58653";
    private static final String EPILEPSY_ON_TREATMENT = "CB86C6FE-4263-4A4C-AF54-49D5308459D4";
    private static final String EPILEPSY_DIED = "FB0B61BD-A641-499B-BA87-421DC7E1CA2C";
    private static final String HTN_DM_IN_ADVANCED_CARE = "00be3c91-ecd2-482e-8c7a-7bdd49c997e7";

    @Autowired
    private QuickProgramService quickProgramService;

    private Location location;

    @Before
    public void setUp() {
        location = Context.getLocationService().getLocation("Neno District Hospital");
    }

    @After
    public void restoreUser() {
        Context.logout();
        authenticate();
    }

    @Test
    public void registryListsProgramsInLegacyOrder() {
        List<String> keys = new ArrayList<String>();
        for (QuickProgram p : QuickProgramRegistry.getAll()) {
            keys.add(p.getKey());
        }
        Assert.assertEquals(Arrays.asList("hiv", "teen-club", "chronic-care", "mental-health", "pdc", "palliative-care", "tb",
                "nutrition"), keys);
        Assert.assertEquals("HIV Program", QuickProgramRegistry.get("hiv").getLabel());
    }

    @Test
    public void hivNotEnrolledOffersTheLegacyInitialStates() {
        QuickProgramStatus status = quickProgramService.status(basePatient().save(), QuickProgramRegistry.get("hiv"));
        Assert.assertTrue(status.isAvailable());
        Assert.assertNull(status.getPatientProgram());
        Assert.assertEquals(uuids(EXPOSED_CHILD_CONTINUE, ON_ARVS), uuidsOf(status.getEnrolStates()));
    }

    @Test
    public void hivEnrolledOffersChangeAndExitStatesExceptCurrent() {
        Patient p = basePatient().save();
        enroll(p, "HIV PROGRAM", ON_ARVS);
        QuickProgramStatus status = quickProgramService.status(p, QuickProgramRegistry.get("hiv"));
        Assert.assertNotNull(status.getPatientProgram());
        Assert.assertTrue(status.getChangeStates().isEmpty());
        Assert.assertEquals(uuids(HIV_TERMINAL_1, HIV_TERMINAL_2, HIV_TERMINAL_3), uuidsOf(status.getExitStates()));
        Assert.assertEquals(ON_ARVS, status.getWorkflows().get(0).getCurrentState().getState().getUuid());
    }

    @Test
    public void chronicCareOffersEachUnopenedWorkflowItsInitialStates() {
        Patient p = basePatient().save();
        enroll(p, "CHRONIC CARE PROGRAM", HTN_DM_ON_TREATMENT);
        QuickProgramStatus status = quickProgramService.status(p, QuickProgramRegistry.get("chronic-care"));

        QuickProgramWorkflowStatus htnDm = workflow(status, HTN_DM_WORKFLOW);
        Assert.assertTrue(htnDm.isOpen());
        Assert.assertTrue(htnDm.getEnrolStates().isEmpty());
        Assert.assertFalse(uuidsOf(htnDm.getChangeStates()).contains(HTN_DM_ON_TREATMENT));
        for (ProgramWorkflowState s : htnDm.getChangeStates()) {
            Assert.assertFalse(s.getTerminal());
        }

        QuickProgramWorkflowStatus asthma = workflow(status, ASTHMA_WORKFLOW);
        Assert.assertFalse(asthma.isOpen());
        Assert.assertTrue(uuidsOf(asthma.getEnrolStates()).contains(ASTHMA_ON_TREATMENT));
        for (ProgramWorkflowState s : asthma.getEnrolStates()) {
            Assert.assertTrue(s.getInitial());
        }

        Assert.assertFalse(status.getExitStates().isEmpty());
        for (ProgramWorkflowState s : status.getExitStates()) {
            Assert.assertTrue(s.getTerminal());
            Assert.assertEquals(HTN_DM_WORKFLOW, s.getProgramWorkflow().getUuid());
        }
    }

    @Test
    public void mentalHealthUsesTheLegacyWorkflowList() {
        QuickProgramStatus status = quickProgramService.status(basePatient().save(), QuickProgramRegistry.get("mental-health"));
        Set<String> workflows = new HashSet<String>();
        for (QuickProgramWorkflowStatus w : status.getWorkflows()) {
            workflows.add(w.getWorkflow().getUuid());
        }
        Assert.assertEquals(new HashSet<String>(Arrays.asList(EPILEPSY_WORKFLOW, MENTAL_HEALTH_WORKFLOW)), workflows);
    }

    @Test
    public void deadPatientHasNothingAvailable() {
        Patient p = basePatient().save();
        p.setDead(true);
        p.setDeathDate(new Date());
        p.setCauseOfDeath(Context.getConceptService().getConceptByUuid("656292d8-977f-11e1-8993-905e29aff6c1"));
        Context.getPatientService().savePatient(p);
        Assert.assertFalse(quickProgramService.status(p, QuickProgramRegistry.get("hiv")).isAvailable());
    }

    @Test
    public void teenClubHiddenOutsideEligibility() {
        Patient adult = basePatient().birthdate(DateUtil.getDateTime(1960, 1, 1)).save();
        enroll(adult, "HIV PROGRAM", ON_ARVS);
        Assert.assertFalse(quickProgramService.status(adult, QuickProgramRegistry.get("teen-club")).isDisplayed());

        Patient teen = basePatient().birthdate(DateUtil.adjustDate(new Date(), -15 * 365, Calendar.DATE)).save();
        enroll(teen, "HIV PROGRAM", ON_ARVS);
        Assert.assertTrue(quickProgramService.status(teen, QuickProgramRegistry.get("teen-club")).isDisplayed());
    }

    @Test
    public void nutritionShownWithoutViewClinicalData() {
        Patient p = basePatient().save();
        becomeUserWithPrivileges();
        Assert.assertTrue(quickProgramService.status(p, QuickProgramRegistry.get("nutrition")).isDisplayed());
        Assert.assertFalse(quickProgramService.status(p, QuickProgramRegistry.get("hiv")).isDisplayed());
    }

    @Test
    public void unknownStateUuidsAreSkipped() {
        QuickProgram missing = QuickProgram.builder("missing", "Missing Program")
                .initialStates("00000000-0000-0000-0000-000000000000").build();
        QuickProgramStatus status = quickProgramService.status(basePatient().save(), missing);
        Assert.assertFalse(status.isAvailable());
    }

    @Test
    public void enrolChronicCareInTwoConditionsAtOnce() {
        Patient p = basePatient().save();
        quickProgramService.enrol(p, QuickProgramRegistry.get("chronic-care"), states(HTN_DM_ON_TREATMENT, ASTHMA_ON_TREATMENT),
            DateUtil.getDateTime(2026, 1, 5), location);

        QuickProgramStatus status = quickProgramService.status(p, QuickProgramRegistry.get("chronic-care"));
        Assert.assertEquals(HTN_DM_ON_TREATMENT, workflow(status, HTN_DM_WORKFLOW).getCurrentState().getState().getUuid());
        Assert.assertEquals(ASTHMA_ON_TREATMENT, workflow(status, ASTHMA_WORKFLOW).getCurrentState().getState().getUuid());
        Assert.assertEquals(location, status.getPatientProgram().getLocation());
        Assert.assertEquals(DateUtil.getDateTime(2026, 1, 5), status.getPatientProgram().getDateEnrolled());
    }

    @Test(expected = QuickProgramException.class)
    public void enrolRejectsAStateNotOffered() {
        quickProgramService.enrol(basePatient().save(), QuickProgramRegistry.get("hiv"), states(PRE_ART_CONTINUE),
            DateUtil.getDateTime(2026, 1, 5), location);
    }

    @Test
    public void enrolRejectsAWorkflowAlreadyOpenAndSavesNothing() {
        Patient p = basePatient().save();
        enroll(p, "CHRONIC CARE PROGRAM", HTN_DM_ON_TREATMENT);
        try {
            quickProgramService.enrol(p, QuickProgramRegistry.get("chronic-care"), states(ASTHMA_ON_TREATMENT, HTN_DM_IN_ADVANCED_CARE),
                DateUtil.getDateTime(2026, 1, 5), location);
            Assert.fail("Expected a QuickProgramException");
        }
        catch (QuickProgramException e) {
            Assert.assertTrue(e.getMessage(), e.getMessage().contains("already enrolled"));
        }
        QuickProgramStatus status = quickProgramService.status(p, QuickProgramRegistry.get("chronic-care"));
        Assert.assertFalse(workflow(status, ASTHMA_WORKFLOW).isOpen());
    }

    @Test(expected = QuickProgramException.class)
    public void enrolRejectsFutureDate() {
        quickProgramService.enrol(basePatient().save(), QuickProgramRegistry.get("hiv"), states(ON_ARVS),
            DateUtil.adjustDate(new Date(), 2, Calendar.DATE), location);
    }

    @Test
    public void changeStateMovesToTheState() {
        Patient p = basePatient().save();
        PatientProgram pp = enroll(p, "CHRONIC CARE PROGRAM", HTN_DM_ON_TREATMENT);
        quickProgramService.changeState(QuickProgramRegistry.get("chronic-care"), pp, state(HTN_DM_IN_ADVANCED_CARE),
            DateUtil.getDateTime(2026, 2, 5));
        QuickProgramStatus status = quickProgramService.status(p, QuickProgramRegistry.get("chronic-care"));
        Assert.assertEquals(HTN_DM_IN_ADVANCED_CARE, workflow(status, HTN_DM_WORKFLOW).getCurrentState().getState().getUuid());
    }

    @Test(expected = QuickProgramException.class)
    public void changeStateRejectsADateBeforeEnrolment() {
        Patient p = basePatient().save();
        PatientProgram pp = enroll(p, "CHRONIC CARE PROGRAM", HTN_DM_ON_TREATMENT);
        quickProgramService.changeState(QuickProgramRegistry.get("chronic-care"), pp, state(HTN_DM_IN_ADVANCED_CARE),
            DateUtil.getDateTime(2024, 2, 5));
    }

    @Test
    public void exitDiedMovesOtherWorkflowsToDied() {
        Patient p = basePatient().save();
        PatientProgram pp = quickProgramService.enrol(p, QuickProgramRegistry.get("mental-health"),
            states(MENTAL_HEALTH_ON_TREATMENT, EPILEPSY_ON_TREATMENT), DateUtil.getDateTime(2026, 1, 5), location);
        quickProgramService.exit(QuickProgramRegistry.get("mental-health"), pp, state(MENTAL_HEALTH_DIED),
            DateUtil.getDateTime(2026, 2, 5), null);

        PatientProgram saved = Context.getProgramWorkflowService().getPatientProgram(pp.getPatientProgramId());
        // The enrolment is completed by the death, so it has no current states; check the states recorded.
        Assert.assertTrue(hasState(saved, EPILEPSY_DIED));
        Assert.assertTrue(hasState(saved, MENTAL_HEALTH_DIED));
    }

    @Test
    public void exitTransferredOutRecordsTheLocation() {
        Patient p = basePatient().save();
        PatientProgram pp = enroll(p, "HIV PROGRAM", ON_ARVS);
        ProgramWorkflowState transferredOut = exitStateOfKind(p, "hiv", ExitKind.TRANSFER_OUT);
        quickProgramService.exit(QuickProgramRegistry.get("hiv"), pp, transferredOut, DateUtil.getDateTime(2026, 2, 5), "Lilongwe");

        PatientProgram saved = Context.getProgramWorkflowService().getPatientProgram(pp.getPatientProgramId());
        Assert.assertEquals("Lilongwe", saved.getActiveAttributes().iterator().next().getValueReference());
        Assert.assertTrue(hasState(saved, transferredOut.getUuid()));
    }

    @Test(expected = QuickProgramException.class)
    public void exitTransferredOutNeedsALocation() {
        Patient p = basePatient().save();
        PatientProgram pp = enroll(p, "HIV PROGRAM", ON_ARVS);
        quickProgramService.exit(QuickProgramRegistry.get("hiv"), pp, exitStateOfKind(p, "hiv", ExitKind.TRANSFER_OUT),
            DateUtil.getDateTime(2026, 2, 5), " ");
    }

    @Test
    public void exitWithATerminalStateCompletesTheEnrolment() {
        Patient p = basePatient().save();
        PatientProgram pp = enroll(p, "HIV PROGRAM", ON_ARVS);
        quickProgramService.exit(QuickProgramRegistry.get("hiv"), pp, exitStateOfKind(p, "hiv", ExitKind.COMPLETE),
            DateUtil.getDateTime(2026, 2, 5), null);
        Assert.assertNotNull(Context.getProgramWorkflowService().getPatientProgram(pp.getPatientProgramId()).getDateCompleted());
    }

    @Test
    public void changeStatesAppliesSeveralConditionsAtOnce() {
        Patient p = basePatient().save();
        PatientProgram pp = quickProgramService.enrol(p, QuickProgramRegistry.get("chronic-care"),
            states(HTN_DM_ON_TREATMENT, ASTHMA_ON_TREATMENT), DateUtil.getDateTime(2026, 1, 5), location);
        ProgramWorkflowState asthmaChange = workflow(quickProgramService.status(p, QuickProgramRegistry.get("chronic-care")),
            ASTHMA_WORKFLOW).getChangeStates().get(0);

        quickProgramService.changeStates(QuickProgramRegistry.get("chronic-care"), pp,
            Arrays.asList(state(HTN_DM_IN_ADVANCED_CARE), asthmaChange), DateUtil.getDateTime(2026, 2, 5));

        QuickProgramStatus status = quickProgramService.status(p, QuickProgramRegistry.get("chronic-care"));
        Assert.assertEquals(HTN_DM_IN_ADVANCED_CARE, workflow(status, HTN_DM_WORKFLOW).getCurrentState().getState().getUuid());
        Assert.assertEquals(asthmaChange, workflow(status, ASTHMA_WORKFLOW).getCurrentState().getState());
    }

    @Test
    public void changeStatesSavesNothingWhenOneIsNotOffered() {
        Patient p = basePatient().save();
        PatientProgram pp = enroll(p, "CHRONIC CARE PROGRAM", HTN_DM_ON_TREATMENT);
        try {
            quickProgramService.changeStates(QuickProgramRegistry.get("chronic-care"), pp,
                Arrays.asList(state(HTN_DM_IN_ADVANCED_CARE), state(ASTHMA_ON_TREATMENT)), DateUtil.getDateTime(2026, 2, 5));
            Assert.fail("Expected a QuickProgramException");
        }
        catch (QuickProgramException e) {
            // expected
        }
        QuickProgramStatus status = quickProgramService.status(p, QuickProgramRegistry.get("chronic-care"));
        Assert.assertEquals(HTN_DM_ON_TREATMENT, workflow(status, HTN_DM_WORKFLOW).getCurrentState().getState().getUuid());
    }

    @Test
    public void changeStateRejectsADateBeforeTheCurrentStateStarted() {
        Patient p = basePatient().save();
        PatientProgram pp = enroll(p, "CHRONIC CARE PROGRAM", HTN_DM_ON_TREATMENT);
        quickProgramService.changeState(QuickProgramRegistry.get("chronic-care"), pp, state(HTN_DM_IN_ADVANCED_CARE),
            DateUtil.getDateTime(2026, 2, 5));
        try {
            quickProgramService.changeState(QuickProgramRegistry.get("chronic-care"), pp, state(HTN_DM_ON_TREATMENT),
                DateUtil.getDateTime(2026, 1, 5));
            Assert.fail("Expected a QuickProgramException");
        }
        catch (QuickProgramException e) {
            Assert.assertTrue(e.getMessage(), e.getMessage().contains("before"));
        }
    }

    @Test
    public void exitDiedOnASingleWorkflowProgramOnlyMovesThatWorkflow() {
        Patient p = basePatient().save();
        PatientProgram pp = quickProgramService.enrol(p, QuickProgramRegistry.get("mental-health"),
            states(MENTAL_HEALTH_ON_TREATMENT, EPILEPSY_ON_TREATMENT), DateUtil.getDateTime(2026, 1, 5), location);
        QuickProgram singleWorkflow = QuickProgram.builder("mh-single", "Mental Health")
                .initialStates(MENTAL_HEALTH_ON_TREATMENT).states(MENTAL_HEALTH_ON_TREATMENT).terminalStates(MENTAL_HEALTH_DIED)
                .build();

        quickProgramService.exit(singleWorkflow, pp, state(MENTAL_HEALTH_DIED), DateUtil.getDateTime(2026, 2, 5), null);

        PatientProgram saved = Context.getProgramWorkflowService().getPatientProgram(pp.getPatientProgramId());
        Assert.assertTrue(hasState(saved, MENTAL_HEALTH_DIED));
        Assert.assertFalse(hasState(saved, EPILEPSY_DIED));
    }

    private boolean hasState(PatientProgram pp, String stateUuid) {
        for (PatientState ps : pp.getStates()) {
            if (!ps.getVoided() && ps.getState().getUuid().equals(stateUuid)) {
                return true;
            }
        }
        return false;
    }

    private ProgramWorkflowState exitStateOfKind(Patient p, String key, ExitKind kind) {
        for (ProgramWorkflowState s : quickProgramService.status(p, QuickProgramRegistry.get(key)).getExitStates()) {
            if (quickProgramService.exitKind(s) == kind) {
                return s;
            }
        }
        throw new AssertionError("No " + kind + " exit state for " + key);
    }

    private ProgramWorkflowState state(String uuid) {
        ProgramWorkflowState s = Context.getProgramWorkflowService().getStateByUuid(uuid);
        Assert.assertNotNull(uuid, s);
        return s;
    }

    private List<ProgramWorkflowState> states(String... uuids) {
        List<ProgramWorkflowState> ret = new ArrayList<ProgramWorkflowState>();
        for (String uuid : uuids) {
            ret.add(state(uuid));
        }
        return ret;
    }

    private QuickProgramWorkflowStatus workflow(QuickProgramStatus status, String workflowUuid) {
        for (QuickProgramWorkflowStatus w : status.getWorkflows()) {
            if (w.getWorkflow().getUuid().equals(workflowUuid)) {
                return w;
            }
        }
        throw new AssertionError("No workflow " + workflowUuid);
    }

    private List<String> uuids(String... uuids) {
        List<String> ret = new ArrayList<String>(Arrays.asList(uuids));
        Collections.sort(ret);
        return ret;
    }

    private List<String> uuidsOf(List<ProgramWorkflowState> states) {
        List<String> ret = new ArrayList<String>();
        for (ProgramWorkflowState s : states) {
            ret.add(s.getUuid());
        }
        Collections.sort(ret);
        return ret;
    }

    private PatientBuilder basePatient() {
        PatientIdentifierType dummyId = Context.getPatientService().getPatientIdentifierTypeByName("Dummy ID");
        return tdm.patient().name("Qp", "Test").gender("F").birthdate(DateUtil.getDateTime(1990, 1, 1))
                .identifier(dummyId, "D" + System.nanoTime(), location);
    }

    private PatientProgram enroll(Patient p, String programName, String stateUuid) {
        Program program = Context.getProgramWorkflowService().getProgramByName(programName);
        Assert.assertNotNull(programName, program);
        Date enrolled = DateUtil.getDateTime(2025, 1, 1);
        PatientProgram pp = createPatientProgram(p, program, enrolled, null).get();
        pp.setLocation(location);
        createState(pp, Context.getProgramWorkflowService().getStateByUuid(stateUuid), enrolled);
        return pp;
    }

    private void becomeUserWithPrivileges(String... privilegeNames) {
        Role role = new Role("Quick programs test role " + System.nanoTime());
        role.setDescription("test");
        List<String> names = new ArrayList<String>(Arrays.asList("Get Patients", "Get People", "Get Encounters",
                "Get Encounter Types", "Get Observations", "Get Concepts", "Get Forms", "Get Identifier Types",
                "Get Patient Programs", "Get Programs", "Get Global Properties", "Get Locations"));
        names.addAll(Arrays.asList(privilegeNames));
        for (String name : names) {
            Privilege privilege = Context.getUserService().getPrivilege(name);
            if (privilege == null) {
                privilege = Context.getUserService().savePrivilege(new Privilege(name, name));
            }
            role.addPrivilege(privilege);
        }
        Context.getUserService().saveRole(role);
        User user = new User(basePatient().save().getPerson());
        user.setUsername("qp" + System.nanoTime());
        user.addRole(role);
        Context.getUserService().createUser(user, "Test1234");
        Context.flushSession();
        Context.logout();
        Context.authenticate(user.getUsername(), "Test1234");
    }
}
