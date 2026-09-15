package org.openmrs.module.pihmalawi.reporting.definition.data.converter;

import org.junit.Assert;
import org.junit.Test;
import org.openmrs.Concept;
import org.openmrs.Obs;

public class ObsValueBooleanYesNoConverterTest {

    @Test
    public void shouldConvertTrueConceptToYes() {
        Concept trueConcept = new Concept();
        trueConcept.setUuid(ObsValueBooleanYesNoConverter.TRUE_CONCEPT_UUID);
        Obs o = new Obs();
        o.setValueCoded(trueConcept);

        Assert.assertEquals("Yes", new ObsValueBooleanYesNoConverter().convert(o));
    }

    @Test
    public void shouldConvertFalseConceptToNo() {
        Concept falseConcept = new Concept();
        falseConcept.setUuid(ObsValueBooleanYesNoConverter.FALSE_CONCEPT_UUID);
        Obs o = new Obs();
        o.setValueCoded(falseConcept);

        Assert.assertEquals("No", new ObsValueBooleanYesNoConverter().convert(o));
    }

    @Test
    public void shouldReturnNullForNullObs() {
        Assert.assertNull(new ObsValueBooleanYesNoConverter().convert(null));
    }
}
