package org.openmrs.module.pihmalawi.reporting.definition.data.converter;

import org.junit.Assert;
import org.junit.Test;
import org.openmrs.Concept;
import org.openmrs.Obs;

public class TbStatusConverterTest {

    @Test
    public void shouldConvertNeverConceptToNever() {
        Concept neverConcept = new Concept();
        neverConcept.setUuid(TbStatusConverter.NEVER_CONCEPT_UUID);
        Obs o = new Obs();
        o.setValueCoded(neverConcept);

        Assert.assertEquals("Never", new TbStatusConverter().convert(o));
    }

    @Test
    public void shouldConvertLastConceptToLast() {
        Concept lastConcept = new Concept();
        lastConcept.setUuid(TbStatusConverter.LAST_CONCEPT_UUID);
        Obs o = new Obs();
        o.setValueCoded(lastConcept);

        Assert.assertEquals("Last", new TbStatusConverter().convert(o));
    }

    @Test
    public void shouldConvertCurrConceptToCurr() {
        Concept currConcept = new Concept();
        currConcept.setUuid(TbStatusConverter.CURR_CONCEPT_UUID);
        Obs o = new Obs();
        o.setValueCoded(currConcept);

        Assert.assertEquals("Curr", new TbStatusConverter().convert(o));
    }

    @Test
    public void shouldReturnNullForNullObs() {
        Assert.assertNull(new TbStatusConverter().convert(null));
    }
}
