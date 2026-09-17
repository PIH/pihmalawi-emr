package org.openmrs.module.pihmalawi.htmlforms;

import org.junit.Assert;
import org.junit.Test;
import org.openmrs.module.pihmalawi.activator.UnknownProviderInitializer;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Every htmlform's encounterProvider default attribute, when present, must reference a provider
 * by uuid from a known-valid set, not by an install-specific raw primary key (see MLW-1846). The
 * attribute is optional; forms with no default at all are fine.
 */
public class HtmlFormEncounterProviderReferencesTest {

    /**
     * uuids it's legitimate for an encounterProvider default to reference. Currently just the
     * placeholder "Unknown Provider" (see UnknownProviderInitializer), which is what every
     * raw-id default in this repo actually meant - but this isn't the only value that could ever
     * be valid here, so it's a set to extend rather than a single hardcoded expectation.
     */
    private static final Set<String> KNOWN_VALID_PROVIDER_UUIDS =
            new HashSet<String>(Arrays.asList(UnknownProviderInitializer.UUID));

    private static final Pattern ENCOUNTER_PROVIDER_DEFAULT =
            Pattern.compile("<encounterProvider\\b[^>]*\\bdefault\\s*=\\s*\"([^\"]*)\"");

    private File htmlformsDir() throws IOException {
        String basedir = System.getProperty("basedir", System.getProperty("user.dir"));
        return new File(basedir, "../content/configuration/backend_configuration/htmlforms").getCanonicalFile();
    }

    @Test
    public void everyEncounterProviderDefaultThatIsPresentShouldBeAKnownValidUuid() throws IOException {
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
                if (!KNOWN_VALID_PROVIDER_UUIDS.contains(value)) {
                    violations.add(file.getName() + ": default=\"" + value + "\"");
                }
            }
        }

        Assert.assertTrue(
                "Found encounterProvider default values that are not a known-valid provider uuid:\n"
                        + String.join("\n", violations),
                violations.isEmpty());
    }
}
