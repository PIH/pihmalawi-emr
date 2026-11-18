package org.openmrs.module.pihmalawi.patient;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.openmrs.Location;
import org.openmrs.Patient;
import org.openmrs.PatientIdentifierType;
import org.openmrs.api.context.Context;
import org.openmrs.module.pihmalawi.BaseMalawiTest;
import org.openmrs.module.reporting.common.DateUtil;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class MalawiPatientSearchTest extends BaseMalawiTest {

    @Autowired
    private MalawiPatientSearch patientSearch;

    private Location location;

    private PatientIdentifierType arv;

    @Before
    public void setUp() {
        location = Context.getLocationService().getLocation("Neno District Hospital");
        arv = Context.getPatientService().getPatientIdentifierTypeByName("ARV Number");
    }

    @Test
    public void anExactIdentifierFindsOnlyThatPatient() {
        Patient ten = patient("Zuze", "Banda", "NNO 9810");
        patient("Zuze", "Banda", "NNO 98101");
        patient("Zuze", "Banda", "NNO 98102");
        Assert.assertEquals(uuids(ten), uuids(patientSearch.search("NNO 9810", true)));
    }

    @Test
    public void withoutAnExactIdentifierPatientsWhoseIdentifierStartsWithItAreFound() {
        Patient first = patient("Zuze", "Banda", "NNO 98201");
        Patient second = patient("Zuze", "Banda", "NNO 98202");
        patient("Zuze", "Banda", "NNO 98301");
        Assert.assertEquals(uuids(first, second), uuids(patientSearch.search("NNO 982", true)));
    }

    @Test
    public void anIdentifierIsFoundWithExtraSpaces() {
        Patient p = patient("Zuze", "Banda", "NNO 98401");
        Assert.assertEquals(uuids(p), uuids(patientSearch.search("  NNO  98401 ", true)));
    }

    @Test
    public void namesAreFoundAnywhereInTheGivenOrFamilyName() {
        Patient p = patient("Zwelithini", "Qandile", "NNO 98501");
        patient("Zuze", "Banda", "NNO 98502");
        Assert.assertEquals(uuids(p), uuids(patientSearch.search("welith andil", true)));
    }

    @Test
    public void everyWordOfTheNameMustMatch() {
        patient("Zwelithini", "Qandile", "NNO 98601");
        Assert.assertTrue(patientSearch.search("Zwelithini Mbewe", true).isEmpty());
    }

    @Test
    public void aPatientIsFoundByUuid() {
        Patient p = patient("Zuze", "Banda", "NNO 98701");
        Assert.assertEquals(uuids(p), uuids(patientSearch.search(p.getUuid(), true)));
    }

    @Test
    public void deadPatientsAreLeftOutUnlessIncluded() {
        Patient alive = patient("Zakeyo", "Mvula", "NNO 98801");
        Patient dead = patient("Zakeyo", "Mvula", "NNO 98802");
        dead.setDead(true);
        dead.setDeathDate(new Date());
        dead.setCauseOfDeath(Context.getConceptService().getConceptByUuid("656292d8-977f-11e1-8993-905e29aff6c1"));
        Context.getPatientService().savePatient(dead);
        Assert.assertEquals(uuids(alive, dead), uuids(patientSearch.search("Zakeyo", true)));
        Assert.assertEquals(uuids(alive), uuids(patientSearch.search("Zakeyo", false)));
    }

    @Test
    public void voidedPatientsAreLeftOut() {
        Patient p = patient("Zindaba", "Mvula", "NNO 98901");
        Context.getPatientService().voidPatient(p, "test");
        Assert.assertTrue(patientSearch.search("Zindaba", true).isEmpty());
        Assert.assertTrue(patientSearch.search("NNO 98901", true).isEmpty());
    }

    @Test
    public void aBlankPhraseFindsNobody() {
        Assert.assertTrue(patientSearch.search("  ", true).isEmpty());
        Assert.assertTrue(patientSearch.search(null, true).isEmpty());
    }

    @Test
    public void soundexMarkersAreNotSearchedForAsText() {
        Assert.assertTrue(MalawiPatientSearch.isSoundex("s:Chisomo"));
        Assert.assertTrue(MalawiPatientSearch.isSoundex("Chisomo:s"));
        Assert.assertFalse(MalawiPatientSearch.isSoundex("Chisomo"));
        Assert.assertEquals("Chisomo", MalawiPatientSearch.withoutSoundexMarker(" s:Chisomo "));
        Assert.assertEquals("Chisomo", MalawiPatientSearch.withoutSoundexMarker("Chisomo:S"));
    }

    private Patient patient(String given, String family, String arvNumber) {
        return tdm.patient().name(given, family).gender("F").birthdate(DateUtil.getDateTime(1990, 1, 1))
                .identifier(arv, arvNumber, location).save();
    }

    private static Set<String> uuids(Patient... patients) {
        return uuids(Arrays.asList(patients));
    }

    private static Set<String> uuids(List<Patient> patients) {
        Set<String> ret = new HashSet<String>();
        for (Patient p : new ArrayList<Patient>(patients)) {
            ret.add(p.getUuid());
        }
        return ret;
    }
}
