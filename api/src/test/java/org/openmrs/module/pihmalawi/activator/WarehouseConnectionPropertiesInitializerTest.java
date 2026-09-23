package org.openmrs.module.pihmalawi.activator;

import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.openmrs.module.pihmalawi.PihMalawiConstants;
import org.openmrs.test.BaseModuleContextSensitiveTest;
import org.openmrs.util.OpenmrsUtil;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.util.List;
import java.util.Properties;

public class WarehouseConnectionPropertiesInitializerTest extends BaseModuleContextSensitiveTest {

    private File propertiesFile;

    @Before
    public void setUp() {
        propertiesFile = new File(OpenmrsUtil.getApplicationDataDirectory(),
                PihMalawiConstants.OPENMRS_WAREHOUSE_CONNECTION_PROPERTIES_FILE_NAME);
        propertiesFile.delete();
        clearFallbackSystemProperties();
    }

    @After
    public void tearDown() {
        propertiesFile.delete();
        clearFallbackSystemProperties();
    }

    private void clearFallbackSystemProperties() {
        System.clearProperty(PihMalawiConstants.WAREHOUSE_CONNECTION_URL_PROPERTY_NAME);
        System.clearProperty(PihMalawiConstants.WAREHOUSE_CONNECTION_USERNAME_PROPERTY_NAME);
        System.clearProperty(PihMalawiConstants.WAREHOUSE_CONNECTION_PASSWORD_PROPERTY_NAME);
    }

    private Properties loadWrittenProperties() throws Exception {
        Properties properties = new Properties();
        try (FileInputStream in = new FileInputStream(propertiesFile)) {
            properties.load(in);
        }
        return properties;
    }

    @Test
    public void shouldNotOverwriteAnExistingPropertiesFile() throws Exception {
        Properties existing = new Properties();
        existing.setProperty("connection.url", "jdbc:mysql://existing-host/existing_db");
        try (FileOutputStream out = new FileOutputStream(propertiesFile)) {
            existing.store(out, null);
        }
        System.setProperty(PihMalawiConstants.WAREHOUSE_CONNECTION_URL_PROPERTY_NAME, "jdbc:mysql://fallback-host/fallback_db");

        new WarehouseConnectionPropertiesInitializer().started();

        Properties actual = loadWrittenProperties();
        Assert.assertEquals("jdbc:mysql://existing-host/existing_db", actual.getProperty("connection.url"));
    }

    @Test
    public void shouldWriteFallbackPropertiesWhenFileMissingAndConfigured() throws Exception {
        System.setProperty(PihMalawiConstants.WAREHOUSE_CONNECTION_URL_PROPERTY_NAME,
                "jdbc:mysql://openmrs-db:3306/openmrs_warehouse");
        System.setProperty(PihMalawiConstants.WAREHOUSE_CONNECTION_USERNAME_PROPERTY_NAME, "openmrs");
        System.setProperty(PihMalawiConstants.WAREHOUSE_CONNECTION_PASSWORD_PROPERTY_NAME, "openmrs");

        new WarehouseConnectionPropertiesInitializer().started();

        Assert.assertTrue(propertiesFile.exists());
        Properties actual = loadWrittenProperties();
        Assert.assertEquals("jdbc:mysql://openmrs-db:3306/openmrs_warehouse", actual.getProperty("connection.url"));
        Assert.assertEquals("openmrs", actual.getProperty("connection.username"));
        Assert.assertEquals("openmrs", actual.getProperty("connection.password"));
    }

    @Test
    public void shouldDefaultUsernameAndPasswordToEmptyWhenOnlyUrlIsConfigured() throws Exception {
        System.setProperty(PihMalawiConstants.WAREHOUSE_CONNECTION_URL_PROPERTY_NAME,
                "jdbc:mysql://openmrs-db:3306/openmrs_warehouse");

        new WarehouseConnectionPropertiesInitializer().started();

        Properties actual = loadWrittenProperties();
        Assert.assertEquals("", actual.getProperty("connection.username"));
        Assert.assertEquals("", actual.getProperty("connection.password"));
    }

    @Test
    public void shouldDoNothingWhenNeitherFileNorFallbackConfigurationExists() {
        new WarehouseConnectionPropertiesInitializer().started();

        Assert.assertFalse(propertiesFile.exists());
    }

    @Test
    public void shouldBeRegisteredInActivator() {
        List<Initializer> initializers = new PihMalawiModuleActivator().getInitializers();
        boolean found = false;
        for (Initializer initializer : initializers) {
            if (initializer instanceof WarehouseConnectionPropertiesInitializer) {
                found = true;
            }
        }
        Assert.assertTrue("WarehouseConnectionPropertiesInitializer should be registered", found);
    }
}
