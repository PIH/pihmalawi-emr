package org.openmrs.module.pihmalawi.web.taglibs;

import org.junit.Assert;
import org.junit.Test;

public class HelperTest {

    @Test
    public void shouldConvertNumericMonthDayYearPatterns() {
        Assert.assertEquals("m/d/y", Helper.toJQueryDateFormat("M/d/yy"));
        Assert.assertEquals("mm/dd/y", Helper.toJQueryDateFormat("MM/dd/yy"));
        Assert.assertEquals("dd/mm/yy", Helper.toJQueryDateFormat("dd/MM/yyyy"));
        Assert.assertEquals("dd/mm/y", Helper.toJQueryDateFormat("dd/MM/yy"));
        Assert.assertEquals("yy-mm-dd", Helper.toJQueryDateFormat("yyyy-MM-dd"));
        Assert.assertEquals("dd.mm.yy", Helper.toJQueryDateFormat("dd.MM.yyyy"));
    }

    @Test
    public void shouldConvertMonthNamePatterns() {
        Assert.assertEquals("d-M-yy", Helper.toJQueryDateFormat("d-MMM-yyyy"));
        Assert.assertEquals("d-MM-yy", Helper.toJQueryDateFormat("d-MMMM-yyyy"));
    }

    @Test
    public void shouldPassThroughNonDateLetters() {
        Assert.assertEquals("dd/mm/yy 'at' HH:mm", Helper.toJQueryDateFormat("dd/MM/yyyy 'at' HH:mm"));
    }
}
