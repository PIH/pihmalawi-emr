package org.openmrs.module.pihmalawi.reporting.definition.data.converter;

import org.junit.Assert;
import org.junit.Test;
import org.openmrs.Concept;
import org.openmrs.ConceptName;
import org.openmrs.Obs;
import org.openmrs.module.pihmalawi.metadata.concept.CommonConcepts;
import org.openmrs.module.reporting.common.ObjectUtil;

import java.util.Locale;

public class PregnantLactatingConverterTest {

    @Test
    public void shouldConvertNoConceptToNo() {
        Concept noConcept = new Concept();
        noConcept.setUuid(CommonConcepts.Concepts.NO);
        Obs o = new Obs();
        o.setValueCoded(noConcept);

        Assert.assertEquals("No", new PregnantLactatingConverter().convert(o));
    }

    @Test
    public void shouldConvertPregnantConceptToPregnant() {
        Concept pregnantConcept = new Concept();
        pregnantConcept.setUuid(CommonConcepts.Concepts.PREGNANT);
        Obs o = new Obs();
        o.setValueCoded(pregnantConcept);

        Assert.assertEquals("Pregnant", new PregnantLactatingConverter().convert(o));
    }

    @Test
    public void shouldConvertLactatingConceptToLactating() {
        Concept lactatingConcept = new Concept();
        lactatingConcept.setUuid(CommonConcepts.Concepts.LACTATING);
        Obs o = new Obs();
        o.setValueCoded(lactatingConcept);

        Assert.assertEquals("Lactating", new PregnantLactatingConverter().convert(o));
    }

    @Test
    public void shouldReturnNullForNullObs() {
        Assert.assertNull(new PregnantLactatingConverter().convert(null));
    }

    @Test
    public void shouldFormatUnmappedConceptUsingFallback() {
        Concept otherConcept = new Concept();
        otherConcept.setUuid("11111111-1111-1111-1111-111111111111");
        otherConcept.addName(new ConceptName("Some Other Concept", Locale.ENGLISH));
        Obs o = new Obs();
        o.setValueCoded(otherConcept);

        Object result = new PregnantLactatingConverter().convert(o);
        Assert.assertEquals(ObjectUtil.format(otherConcept), result);
        Assert.assertNotEquals("No", result);
        Assert.assertNotEquals("Pregnant", result);
        Assert.assertNotEquals("Lactating", result);
    }
}
