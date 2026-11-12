package org.openmrs.module.pihmalawi.emastercard;

import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.openmrs.Concept;
import org.openmrs.Encounter;
import org.openmrs.EncounterType;
import org.openmrs.Form;
import org.openmrs.GlobalProperty;
import org.openmrs.Location;
import org.openmrs.Patient;
import org.openmrs.PatientIdentifierType;
import org.openmrs.PatientProgram;
import org.openmrs.PatientState;
import org.openmrs.Privilege;
import org.openmrs.Program;
import org.openmrs.ProgramWorkflow;
import org.openmrs.ProgramWorkflowState;
import org.openmrs.Role;
import org.openmrs.User;
import org.openmrs.api.context.Context;
import org.openmrs.module.pihmalawi.BaseMalawiTest;
import org.openmrs.module.reporting.common.DateUtil;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;

public class EMastercardServiceTest extends BaseMalawiTest {

    private static final String ON_ARVS_STATE = "6687fa7c-977f-11e1-8993-905e29aff6c1";
    private static final String PRE_ART_CONTINUE_STATE = "6687f284-977f-11e1-8993-905e29aff6c1";
    private static final String CHRONIC_CARE_ON_TREATMENT_STATE = "5925718D-EA5E-43EB-9AE2-1CB342D8E318";
    private static final String MENTAL_HEALTH_ON_TREATMENT_STATE = "2F76D426-56A9-4651-B253-A2299B442C09";
    private static final String EPILEPSY_ADVANCED_CARE_STATE = "61190A43-95FF-4C84-8A3F-DD7F5354171C";
    private static final String PDC_ON_TREATMENT_STATE = "b84735a5-82ae-4e3b-87db-250c43113977";
    private static final String DIAGNOSIS_CONCEPT = "656292d8-977f-11e1-8993-905e29aff6c1";
    private static final String APPOINTMENT_DATE_CONCEPT = "6569cbd4-977f-11e1-8993-905e29aff6c1";

    @Autowired
    private EMastercardService emastercardService;

    private Location location;

    @Before
    public void setUp() {
        location = Context.getLocationService().getLocation("Neno District Hospital");
        Assert.assertNotNull(location);
    }

    @After
    public void restoreUser() {
        Context.logout();
        authenticate();
    }

    @Test
    public void registryListsCardsInLegacyDashboardOrder() {
        List<String> keys = new ArrayList<String>();
        for (EMastercard m : EMastercardRegistry.getAll()) {
            keys.add(m.getKey());
        }
        Assert.assertEquals(Arrays.asList("art", "teen-club", "pre-art", "exposed-child", "chronic-care", "htn-dm", "asthma",
                "chf", "ckd", "scd", "ncd-other", "mental-health", "epilepsy", "pdc", "pdc-developmental-delay", "pdc-trisomy",
                "pdc-cleft-lip-palate", "pdc-other-diagnosis", "palliative-care", "tb", "ks", "nutrition", "nutrition-adults",
                "nutrition-infant", "nutrition-pdc", "nutrition-pregnant-teens"), keys);
        Assert.assertEquals("ART Patient Card", EMastercardRegistry.get("art").getGroup());
        Assert.assertEquals("ART eMastercard", EMastercardRegistry.get("art").getFormName());
    }

    @Test
    public void artCreateWhenOnArvsWithArvNumberAndNoInitial() {
        createForm("ART eMastercard", "ART_INITIAL");
        Patient p = artPatient(true);
        EMastercardAccess access = emastercardService.evaluate(p, EMastercardRegistry.get("art"));
        Assert.assertTrue(access.isDisplayed());
        Assert.assertEquals(EMastercardState.CREATE, access.getState());
    }

    @Test
    public void artUnavailableWhenNotInActiveState() {
        createForm("ART eMastercard", "ART_INITIAL");
        Patient p = patientWithArvNumber(false);
        enroll(p, "HIV PROGRAM", PRE_ART_CONTINUE_STATE);
        assertUnavailable(p, "art", "Not available: Inactive program state (ART eMastercard)");
    }

    @Test
    public void artUnavailableWithoutIdentifier() {
        createForm("ART eMastercard", "ART_INITIAL");
        Patient p = basePatient().save();
        enroll(p, "HIV PROGRAM", ON_ARVS_STATE);
        assertUnavailable(p, "art", "Not available: No identifier (ART eMastercard)");
    }

    @Test
    public void artUnavailableForDeadPatient() {
        createForm("ART eMastercard", "ART_INITIAL");
        Patient p = artPatient(true);
        p.setDead(true);
        p.setDeathDate(new Date());
        p.setCauseOfDeath(Context.getConceptService().getConceptByUuid(DIAGNOSIS_CONCEPT));
        Context.getPatientService().savePatient(p);
        assertUnavailable(p, "art", "Not available: Patient dead (ART eMastercard)");
    }

    @Test
    public void artEditWithInitialEncounter() {
        createForm("ART eMastercard", "ART_INITIAL");
        Patient p = artPatient(true);
        Date created = DateUtil.getDateTime(2026, 1, 5);
        createEncounter(p, encounterType("ART_INITIAL"), created).location(location).save();
        Encounter followup = createEncounter(p, encounterType("ART_FOLLOWUP"), DateUtil.getDateTime(2026, 2, 5)).location(location).save();
        Date appointment = DateUtil.getDateTime(2026, 3, 5);
        createObs(followup, concept(APPOINTMENT_DATE_CONCEPT), appointment).save();

        EMastercardAccess access = emastercardService.evaluate(p, EMastercardRegistry.get("art"));
        Assert.assertEquals(EMastercardState.EDIT, access.getState());
        Assert.assertEquals(created, access.getCreated());
        Assert.assertEquals(DateUtil.getDateTime(2026, 2, 5), access.getLastVisitDate());
        Assert.assertEquals("Neno District Hospital", access.getLastVisitLocation());
        Assert.assertEquals(appointment, access.getAppointmentDate());
    }

    @Test
    public void enrolmentIsTheProgramEnrolmentNotTheCardDate() {
        createForm("ART eMastercard", "ART_INITIAL");
        Patient p = artPatient(true);
        createEncounter(p, encounterType("ART_INITIAL"), DateUtil.getDateTime(2026, 1, 5)).location(location).save();

        EMastercardAccess access = emastercardService.evaluate(p, EMastercardRegistry.get("art"));
        Assert.assertNotNull(access.getEnrolment());
        Assert.assertEquals("HIV PROGRAM", access.getEnrolment().getProgram().getName());
        Assert.assertEquals(DateUtil.getDateTime(2025, 1, 1), access.getEnrolment().getDateEnrolled());
        Assert.assertEquals(location, access.getEnrolment().getLocation());
    }

    @Test
    public void enrolmentPrefersTheActiveEnrolmentOverALaterCompletedOne() {
        createForm("ART eMastercard", "ART_INITIAL");
        Patient p = artPatient(true);
        Program hiv = Context.getProgramWorkflowService().getProgramByName("HIV PROGRAM");
        createPatientProgram(p, hiv, DateUtil.getDateTime(2025, 6, 1), DateUtil.getDateTime(2025, 7, 1)).save();

        EMastercardAccess access = emastercardService.evaluate(p, EMastercardRegistry.get("art"));
        Assert.assertEquals(DateUtil.getDateTime(2025, 1, 1), access.getEnrolment().getDateEnrolled());
    }

    @Test
    public void eachCardShowsTheStateOfItsOwnTreatmentWorkflow() {
        createForm("Mental Health eMastercard", "MENTAL_HEALTH_INITIAL");
        createForm("Epilepsy eMastercard", "EPILEPSY_INITIAL");
        PatientIdentifierType ccc = Context.getPatientService().getPatientIdentifierTypeByName("Chronic Care Number");
        Patient p = basePatient().identifier(ccc, "CCC 1", location).save();
        PatientProgram pp = enroll(p, createMentalHealthProgram(), CHRONIC_CARE_ON_TREATMENT_STATE);
        addState(pp, EPILEPSY_ADVANCED_CARE_STATE, DateUtil.getDateTime(2026, 1, 9));
        addState(pp, MENTAL_HEALTH_ON_TREATMENT_STATE, DateUtil.getDateTime(2026, 10, 16));

        EMastercardAccess mh = emastercardService.evaluate(p, EMastercardRegistry.get("mental-health"));
        Assert.assertEquals(DateUtil.getDateTime(2026, 10, 16), mh.getTreatmentState().getStartDate());
        Assert.assertEquals(MENTAL_HEALTH_ON_TREATMENT_STATE, mh.getTreatmentState().getState().getUuid());
        Assert.assertEquals(DateUtil.getDateTime(2025, 1, 1), mh.getEnrolment().getDateEnrolled());

        EMastercardAccess epilepsy = emastercardService.evaluate(p, EMastercardRegistry.get("epilepsy"));
        Assert.assertEquals(DateUtil.getDateTime(2026, 1, 9), epilepsy.getTreatmentState().getStartDate());
        Assert.assertEquals(EPILEPSY_ADVANCED_CARE_STATE, epilepsy.getTreatmentState().getState().getUuid());
    }

    @Test
    public void aCardWithoutAWorkflowOfItsOwnShowsTheStateOfTheWorkflowItShares() {
        createForm("PDC eMastercard", "PDC_INITIAL");
        PatientIdentifierType pdcId = Context.getPatientService().getPatientIdentifierTypeByName("PDC Identifier");
        Patient p = basePatient().identifier(pdcId, "PDC-1", location).save();
        enroll(p, "PEDIATRIC DEVELOPMENT CLINIC PROGRAM", PDC_ON_TREATMENT_STATE);

        // every PDC card lists the program's one treatment workflow
        EMastercardAccess access = emastercardService.evaluate(p, EMastercardRegistry.get("pdc"));
        Assert.assertNotNull(access.getTreatmentState());
        Assert.assertEquals(PDC_ON_TREATMENT_STATE, access.getTreatmentState().getState().getUuid());
    }

    @Test
    public void noEnrolmentWithoutTheProgram() {
        createForm("ART eMastercard", "ART_INITIAL");
        Patient p = basePatient().save();
        Assert.assertNull(emastercardService.evaluate(p, EMastercardRegistry.get("art")).getEnrolment());
    }

    @Test
    public void artUnavailableWhenTwoInitialEncounters() {
        createForm("ART eMastercard", "ART_INITIAL");
        Patient p = artPatient(true);
        createEncounter(p, encounterType("ART_INITIAL"), DateUtil.getDateTime(2026, 1, 5)).location(location).save();
        createEncounter(p, encounterType("ART_INITIAL"), DateUtil.getDateTime(2026, 1, 6)).location(location).save();
        assertUnavailable(p, "art", "Not available: Multiple ART eMastercard forms found");
    }

    @Test
    public void viewOnlyWithoutEditPatientsPrivilege() {
        createForm("ART eMastercard", "ART_INITIAL");
        createForm("Pre-ART eMastercard", "PART_INITIAL");
        Patient p = artPatient(true);
        createEncounter(p, encounterType("ART_INITIAL"), DateUtil.getDateTime(2026, 1, 5)).location(location).save();

        becomeUserWithPrivileges("View clinical data");
        Assert.assertEquals(EMastercardState.VIEW, emastercardService.evaluate(p, EMastercardRegistry.get("art")).getState());
        assertUnavailable(p, "pre-art", "Not available: User does not have privileges to edit patient");
    }

    @Test
    public void teenClubHiddenOutsideAge5To30WithoutHistory() {
        Patient p = basePatient().birthdate(DateUtil.getDateTime(1960, 1, 1)).save();
        enroll(p, "HIV PROGRAM", ON_ARVS_STATE);
        Assert.assertFalse(emastercardService.evaluate(p, EMastercardRegistry.get("teen-club")).isDisplayed());

        Patient teen = basePatient().birthdate(DateUtil.adjustDate(new Date(), -15 * 365, java.util.Calendar.DATE)).save();
        enroll(teen, "HIV PROGRAM", ON_ARVS_STATE);
        Assert.assertTrue(emastercardService.evaluate(teen, EMastercardRegistry.get("teen-club")).isDisplayed());
    }

    @Test
    public void preArtReadonlyOnceArtInitialExists() {
        createForm("Pre-ART eMastercard", "PART_INITIAL");
        Patient p = basePatient().save();
        createEncounter(p, encounterType("ART_INITIAL"), DateUtil.getDateTime(2026, 1, 5)).location(location).save();
        EMastercardAccess access = emastercardService.evaluate(p, EMastercardRegistry.get("pre-art"));
        Assert.assertTrue(access.isReadonlyNote());
        Assert.assertEquals(EMastercardState.UNAVAILABLE, access.getState());
    }

    @Test
    public void chronicCareHiddenWhenGlobalPropertyFalse() {
        Patient p = basePatient().save();
        Assert.assertTrue(emastercardService.evaluate(p, EMastercardRegistry.get("chronic-care")).isDisplayed());
        Context.getAdministrationService().saveGlobalProperty(new GlobalProperty("pihmalawi.showOldChronicCareCard", "false"));
        Assert.assertFalse(emastercardService.evaluate(p, EMastercardRegistry.get("chronic-care")).isDisplayed());
    }

    @Test
    public void nutritionDisplayedWithoutViewClinicalData() {
        Patient p = basePatient().save();
        becomeUserWithPrivileges();
        Assert.assertTrue(emastercardService.evaluate(p, EMastercardRegistry.get("nutrition")).isDisplayed());
        Assert.assertFalse(emastercardService.evaluate(p, EMastercardRegistry.get("art")).isDisplayed());
    }

    @Test
    public void ksRequiresEditPatientsForTheLink() {
        Patient p = basePatient().save();
        EMastercardAccess admin = emastercardService.evaluate(p, EMastercardRegistry.get("ks"));
        Assert.assertEquals(EMastercardState.CREATE, admin.getState());

        becomeUserWithPrivileges("View clinical data");
        assertUnavailable(p, "ks", "Not available: User does not have privileges to edit patient");
    }

    @Test
    public void pdcDevelopmentalDelayNeedsDiagnosis() {
        createForm("PDC Developmental Delay eMastercard", "PDC_DEVELOPMENTAL_DELAY_INITIAL");
        PatientIdentifierType pdcId = Context.getPatientService().getPatientIdentifierTypeByName("PDC Identifier");
        Patient p = basePatient().identifier(pdcId, "PDC-1", location).save();
        enroll(p, "PEDIATRIC DEVELOPMENT CLINIC PROGRAM", PDC_ON_TREATMENT_STATE);

        EMastercardAccess access = emastercardService.evaluate(p, EMastercardRegistry.get("pdc-developmental-delay"));
        Assert.assertEquals(EMastercardState.UNAVAILABLE, access.getState());
        Assert.assertTrue(access.getMessage(), access.getMessage().startsWith("Not available: "));
        Assert.assertTrue(access.getMessage(), access.getMessage().endsWith(" diagnosis (PDC Developmental Delay eMastercard)"));
    }

    @Test
    public void flowsheetPathForArt() {
        createForm("ART eMastercard", "ART_INITIAL");
        Patient p = artPatient(true);
        EMastercardAccess access = emastercardService.evaluate(p, EMastercardRegistry.get("art"));
        Assert.assertEquals("htmlformentryui/htmlform/flowsheet.page?headerForm=file:configuration/htmlforms/art-emastercard.xml"
                + "&flowsheets=file:configuration/htmlforms/viral-load-tests.xml"
                + "&flowsheets=file:configuration/htmlforms/art-follow-up-testing.xml"
                + "&flowsheets=file:configuration/htmlforms/art-visit.xml"
                + "&dashboardUrl=legacyui&customizationProvider=pihmalawi&customizationFragment=mastercard"
                + "&patientId=" + p.getPatientId(), access.getFlowsheetPath());
    }

    @Test
    public void kaposisSarcomaFlowsheetLoadsTheMastercardCustomization() {
        Patient p = basePatient().save();
        EMastercardAccess access = emastercardService.evaluate(p, EMastercardRegistry.get("ks"));
        Assert.assertEquals("htmlformentryui/htmlform/flowsheet.page?headerForm=file:configuration/htmlforms/kaposis-sarcoma-emastercard.xml"
                + "&flowsheets=file:configuration/htmlforms/ks-evaluation-form.xml"
                + "&flowsheets=file:configuration/htmlforms/ks-chemotherapy-form.xml"
                + "&dashboardUrl=legacyui&customizationProvider=pihmalawi&customizationFragment=mastercard"
                + "&patientId=" + p.getPatientId() + "&requireEncounter=false", access.getFlowsheetPath());
    }

    private void assertUnavailable(Patient p, String key, String message) {
        EMastercardAccess access = emastercardService.evaluate(p, EMastercardRegistry.get(key));
        Assert.assertEquals(EMastercardState.UNAVAILABLE, access.getState());
        Assert.assertEquals(message, access.getMessage());
    }

    /**
     * A patient whose only identifier is a Dummy ID, unlike {@link #createPatient()}, which adds one of a random type
     * (here, ARV Number) at a random location
     */
    private org.openmrs.contrib.testdata.builder.PatientBuilder basePatient() {
        PatientIdentifierType dummyId = Context.getPatientService().getPatientIdentifierTypeByName("Dummy ID");
        return tdm.patient().name("Emc", "Test").gender("F").birthdate(DateUtil.getDateTime(1990, 1, 1))
                .identifier(dummyId, "D" + System.nanoTime(), location);
    }

    private Patient artPatient(boolean onArvs) {
        Patient p = patientWithArvNumber(true);
        enroll(p, "HIV PROGRAM", onArvs ? ON_ARVS_STATE : PRE_ART_CONTINUE_STATE);
        return p;
    }

    private Patient patientWithArvNumber(boolean withIdentifier) {
        PatientIdentifierType arv = Context.getPatientService().getPatientIdentifierTypeByName("ARV Number");
        return withIdentifier ? basePatient().identifier(arv, "NNO 1", location).save() : basePatient().save();
    }

    private PatientProgram enroll(Patient p, String programName, String stateUuid) {
        Program program = Context.getProgramWorkflowService().getProgramByName(programName);
        Assert.assertNotNull(programName, program);
        Date enrolled = DateUtil.getDateTime(2025, 1, 1);
        PatientProgram pp = createPatientProgram(p, program, enrolled, null).get();
        pp.setLocation(location);
        ProgramWorkflowState state = Context.getProgramWorkflowService().getStateByUuid(stateUuid);
        createState(pp, state, enrolled);
        return pp;
    }

    /**
     * The Mental Health Care Program's workflows as in the distro: the chronic care treatment status both cards list
     * (its On treatment state comes with the test metadata), and the mental health and epilepsy treatment workflows,
     * each listed by its own card
     *
     * @return the program's name
     */
    private String createMentalHealthProgram() {
        ProgramWorkflowState chronicCare = Context.getProgramWorkflowService().getStateByUuid(CHRONIC_CARE_ON_TREATMENT_STATE);
        Assert.assertNotNull(chronicCare);
        chronicCare.setRetired(false);
        Program program = chronicCare.getProgramWorkflow().getProgram();
        List<Concept> concepts = Context.getConceptService().getAllConcepts();
        int c = 10;
        for (String uuid : new String[] { MENTAL_HEALTH_ON_TREATMENT_STATE, EPILEPSY_ADVANCED_CARE_STATE }) {
            ProgramWorkflowState existing = Context.getProgramWorkflowService().getStateByUuid(uuid);
            if (existing != null) {
                existing.setRetired(false);
                existing.getProgramWorkflow().setRetired(false);
                Assert.assertEquals(program, existing.getProgramWorkflow().getProgram());
                continue;
            }
            ProgramWorkflow workflow = new ProgramWorkflow();
            workflow.setConcept(concepts.get(c++));
            program.addWorkflow(workflow);
            ProgramWorkflowState state = new ProgramWorkflowState();
            state.setUuid(uuid);
            state.setConcept(concepts.get(c++));
            state.setInitial(true);
            state.setTerminal(false);
            workflow.addState(state);
        }
        Context.getProgramWorkflowService().saveProgram(program);
        return program.getName();
    }


    /** Adds a state to the enrolment, keeping its others (createState replaces them) */
    private void addState(PatientProgram pp, String stateUuid, Date startDate) {
        PatientState ps = new PatientState();
        ps.setPatientProgram(pp);
        ps.setState(Context.getProgramWorkflowService().getStateByUuid(stateUuid));
        ps.setStartDate(startDate);
        pp.getStates().add(ps);
        Context.getProgramWorkflowService().savePatientProgram(pp);
    }

    private Form createForm(String name, String encounterTypeName) {
        Form f = new Form();
        f.setName(name);
        f.setVersion("1.0");
        f.setEncounterType(encounterType(encounterTypeName));
        return Context.getFormService().saveForm(f);
    }

    private EncounterType encounterType(String name) {
        EncounterType et = Context.getEncounterService().getEncounterType(name);
        Assert.assertNotNull(name, et);
        return et;
    }

    private Concept concept(String uuid) {
        return Context.getConceptService().getConceptByUuid(uuid);
    }

    private void becomeUserWithPrivileges(String... privilegeNames) {
        Role role = new Role("EMastercard test role " + System.nanoTime());
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
        user.setUsername("emc" + System.nanoTime());
        user.addRole(role);
        Context.getUserService().createUser(user, "Test1234");
        Context.flushSession();
        Context.logout();
        Context.authenticate(user.getUsername(), "Test1234");
    }
}
