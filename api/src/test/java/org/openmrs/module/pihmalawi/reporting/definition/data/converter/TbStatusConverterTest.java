package org.openmrs.module.pihmalawi.reporting.definition.data.converter;

import org.junit.Assert;
import org.junit.Test;
import org.openmrs.Concept;
import org.openmrs.ConceptName;
import org.openmrs.Obs;
import org.openmrs.module.pihmalawi.metadata.concept.CommonConcepts;
import org.openmrs.module.reporting.common.ObjectUtil;

import java.util.Locale;

public class TbStatusConverterTest {

    @Test
    public void shouldConvertNeverConceptToNever() {
        Concept neverConcept = new Concept();
        neverConcept.setUuid(CommonConcepts.Concepts.UNKNOWN);
        Obs o = new Obs();
        o.setValueCoded(neverConcept);

        Assert.assertEquals("Never", new TbStatusConverter().convert(o));
    }

    @Test
    public void shouldConvertLastConceptToLast() {
        Concept lastConcept = new Concept();
        lastConcept.setUuid(CommonConcepts.Concepts.TREATMENT_COMPLETE);
        Obs o = new Obs();
        o.setValueCoded(lastConcept);

        Assert.assertEquals("Last", new TbStatusConverter().convert(o));
    }

    @Test
    public void shouldConvertCurrConceptToCurr() {
        Concept currConcept = new Concept();
        currConcept.setUuid(CommonConcepts.Concepts.CURRENTLY_IN_TREATMENT);
        Obs o = new Obs();
        o.setValueCoded(currConcept);

        Assert.assertEquals("Curr", new TbStatusConverter().convert(o));
    }

    @Test
    public void shouldReturnNullForNullObs() {
        Assert.assertNull(new TbStatusConverter().convert(null));
    }

    @Test
    public void shouldFormatUnmappedConceptUsingFallback() {
        Concept otherConcept = new Concept();
        otherConcept.setUuid("11111111-1111-1111-1111-111111111111");
        otherConcept.addName(new ConceptName("Some Other Concept", Locale.ENGLISH));
        Obs o = new Obs();
        o.setValueCoded(otherConcept);

        Assert.assertEquals(ObjectUtil.format(otherConcept), new TbStatusConverter().convert(o));
        Assert.assertNotEquals("Never", new TbStatusConverter().convert(o));
        Assert.assertNotEquals("Last", new TbStatusConverter().convert(o));
        Assert.assertNotEquals("Curr", new TbStatusConverter().convert(o));
    }
}
