package org.openmrs.module.pihmalawi.htmlforms;

import org.junit.Assert;
import org.junit.Test;
import org.openmrs.module.pihmalawi.activator.UnknownProviderInitializer;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Every htmlform's encounterProvider default attribute must reference a provider by uuid, not by
 * an install-specific raw primary key (see MLW-1846). Forms that previously hardcoded a raw id
 * here all meant the same placeholder "Unknown Provider" (see UnknownProviderInitializer), so
 * they must all now point at that same uuid.
 */
public class HtmlFormEncounterProviderReferencesTest {

    private static final Pattern ENCOUNTER_PROVIDER_DEFAULT =
            Pattern.compile("<encounterProvider\\b[^>]*\\bdefault\\s*=\\s*\"([^\"]*)\"");

    private File htmlformsDir() throws IOException {
        String basedir = System.getProperty("basedir", System.getProperty("user.dir"));
        return new File(basedir, "../content/configuration/backend_configuration/htmlforms").getCanonicalFile();
    }

    @Test
    public void everyEncounterProviderDefaultShouldBeTheUnknownProviderUuid() throws IOException {
        File dir = htmlformsDir();
        Assert.assertTrue("Expected htmlforms directory to exist: " + dir, dir.isDirectory());

        List<String> violations = new ArrayList<String>();
        File[] files = dir.listFiles((d, name) -> name.endsWith(".xml"));
        Assert.assertNotNull(files);
        for (File file : files) {
            String content = new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
            Matcher matcher = ENCOUNTER_PROVIDER_DEFAULT.matcher(content);
            while (matcher.find()) {
                String value = matcher.group(1);
                if (!UnknownProviderInitializer.UUID.equals(value)) {
                    violations.add(file.getName() + ": default=\"" + value + "\"");
                }
            }
        }

        Assert.assertTrue(
                "Found encounterProvider default values that are not the Unknown Provider uuid:\n"
                        + String.join("\n", violations),
                violations.isEmpty());
    }
}
