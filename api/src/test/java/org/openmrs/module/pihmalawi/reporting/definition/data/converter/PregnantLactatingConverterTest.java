package org.openmrs.module.pihmalawi.reporting.definition.data.converter;

import org.junit.Assert;
import org.junit.Test;
import org.openmrs.Concept;
import org.openmrs.Obs;

public class PregnantLactatingConverterTest {

    @Test
    public void shouldConvertNoConceptToNo() {
        Concept noConcept = new Concept();
        noConcept.setUuid(PregnantLactatingConverter.NO_CONCEPT_UUID);
        Obs o = new Obs();
        o.setValueCoded(noConcept);

        Assert.assertEquals("No", new PregnantLactatingConverter().convert(o));
    }

    @Test
    public void shouldConvertPregnantConceptToPregnant() {
        Concept pregnantConcept = new Concept();
        pregnantConcept.setUuid(PregnantLactatingConverter.PREGNANT_CONCEPT_UUID);
        Obs o = new Obs();
        o.setValueCoded(pregnantConcept);

        Assert.assertEquals("Pregnant", new PregnantLactatingConverter().convert(o));
    }

    @Test
    public void shouldConvertLactatingConceptToLactating() {
        Concept lactatingConcept = new Concept();
        lactatingConcept.setUuid(PregnantLactatingConverter.LACTATING_CONCEPT_UUID);
        Obs o = new Obs();
        o.setValueCoded(lactatingConcept);

        Assert.assertEquals("Lactating", new PregnantLactatingConverter().convert(o));
    }

    @Test
    public void shouldReturnNullForNullObs() {
        Assert.assertNull(new PregnantLactatingConverter().convert(null));
    }
}
