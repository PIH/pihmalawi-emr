package org.openmrs.module.pihmalawi.emastercard;

import org.apache.commons.io.FileUtils;
import org.junit.Assert;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

import java.io.File;
import java.nio.charset.StandardCharsets;

public class EMastercardFormIndexTest {

	@Rule
	public TemporaryFolder folder = new TemporaryFolder();

	@Test
	public void readsFormUuidNotHtmlformUuid() throws Exception {
		EMastercardFormIndex index = new EMastercardFormIndex(htmlformsDir());
		Assert.assertEquals("64db7fd5-c28d-4b85-87c4-d01e92ae004a", index.formUuidFor("art-visit"));
	}

	@Test
	public void readsFormEncounterType() throws Exception {
		EMastercardFormIndex index = new EMastercardFormIndex(htmlformsDir());
		Assert.assertEquals("664b8650-977f-11e1-8993-905e29aff6c1", index.formEncounterTypeFor("art-visit"));
	}

	@Test
	public void returnsNullForMissingForm() throws Exception {
		EMastercardFormIndex index = new EMastercardFormIndex(htmlformsDir());
		Assert.assertNull(index.formUuidFor("no-such-form"));
	}

	private File htmlformsDir() throws Exception {
		File dir = folder.newFolder("htmlforms");
		FileUtils.writeStringToFile(new File(dir, "art-visit.xml"), "<htmlform\n"
		        + "        htmlformUuid=\"76d9aec0-e78f-11e0-baeb-445f1136dfb9\"\n"
		        + "        formUuid=\"64db7fd5-c28d-4b85-87c4-d01e92ae004a\"\n"
		        + "        formName=\"ART Visit\"\n"
		        + "        formEncounterType=\"664b8650-977f-11e1-8993-905e29aff6c1\"\n"
		        + ">\n<macros>formUuid=ignored</macros>\n</htmlform>", StandardCharsets.UTF_8);
		return dir;
	}
}
