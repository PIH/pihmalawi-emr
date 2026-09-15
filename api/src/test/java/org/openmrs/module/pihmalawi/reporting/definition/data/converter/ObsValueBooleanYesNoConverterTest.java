package org.openmrs.module.pihmalawi.reporting.definition.data.converter;

import org.junit.Assert;
import org.junit.Test;
import org.openmrs.Concept;
import org.openmrs.ConceptName;
import org.openmrs.Obs;
import org.openmrs.module.pihmalawi.metadata.concept.CommonConcepts;
import org.openmrs.module.reporting.common.ObjectUtil;

import java.util.Locale;

public class ObsValueBooleanYesNoConverterTest {

    @Test
    public void shouldConvertTrueConceptToYes() {
        Concept trueConcept = new Concept();
        trueConcept.setUuid(CommonConcepts.Concepts.TRUE);
        Obs o = new Obs();
        o.setValueCoded(trueConcept);

        Assert.assertEquals("Yes", new ObsValueBooleanYesNoConverter().convert(o));
    }

    @Test
    public void shouldConvertFalseConceptToNo() {
        Concept falseConcept = new Concept();
        falseConcept.setUuid(CommonConcepts.Concepts.FALSE);
        Obs o = new Obs();
        o.setValueCoded(falseConcept);

        Assert.assertEquals("No", new ObsValueBooleanYesNoConverter().convert(o));
    }

    @Test
    public void shouldReturnNullForNullObs() {
        Assert.assertNull(new ObsValueBooleanYesNoConverter().convert(null));
    }

    @Test
    public void shouldFormatUnmappedConceptUsingFallback() {
        Concept otherConcept = new Concept();
        otherConcept.setUuid("11111111-1111-1111-1111-111111111111");
        otherConcept.addName(new ConceptName("Some Other Concept", Locale.ENGLISH));
        Obs o = new Obs();
        o.setValueCoded(otherConcept);

        Object result = new ObsValueBooleanYesNoConverter().convert(o);
        Assert.assertEquals(ObjectUtil.format(otherConcept), result);
        Assert.assertNotEquals("Yes", result);
        Assert.assertNotEquals("No", result);
    }
}
