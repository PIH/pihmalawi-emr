/**
 * The contents of this file are subject to the OpenMRS Public License
 * Version 1.0 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://license.openmrs.org
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 *
 * Copyright (C) OpenMRS, LLC.  All Rights Reserved.
 */
package org.openmrs.module.pihmalawi.activator;

import org.apache.commons.lang.StringUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.openmrs.module.pihmalawi.PihMalawiConstants;
import org.openmrs.util.ConfigUtil;
import org.openmrs.util.OpenmrsUtil;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.Properties;

/**
 * Ensures a warehouse-connection.properties file exists in the OpenMRS application data
 * directory, for environments (dev/test/CI) where production's usual ops-managed file isn't
 * present. If the file already exists, this does nothing, so production (where ops manages this
 * file directly) is unaffected. Otherwise, it looks up
 * pihmalawi.warehouse.connection.{url,username,password} via ConfigUtil.getProperty (checked in
 * order: JVM system property, then OpenMRS runtime property -- which OMRS_EXTRA_* Docker env vars
 * populate -- then OpenMRS global property) and writes the file from those values. If neither the
 * file nor that fallback configuration is present, this does nothing, leaving the pre-existing
 * failure behavior unchanged for any environment that hasn't opted in.
 */
public class WarehouseConnectionPropertiesInitializer implements Initializer {

    protected static final Log log = LogFactory.getLog(WarehouseConnectionPropertiesInitializer.class);

    @Override
    public void started() {
        File propertiesFile = new File(OpenmrsUtil.getApplicationDataDirectory(),
                PihMalawiConstants.OPENMRS_WAREHOUSE_CONNECTION_PROPERTIES_FILE_NAME);
        if (propertiesFile.exists()) {
            return;
        }

        String url = ConfigUtil.getProperty(PihMalawiConstants.WAREHOUSE_CONNECTION_URL_PROPERTY_NAME);
        if (StringUtils.isBlank(url)) {
            return;
        }
        String username = ConfigUtil.getProperty(PihMalawiConstants.WAREHOUSE_CONNECTION_USERNAME_PROPERTY_NAME, "");
        String password = ConfigUtil.getProperty(PihMalawiConstants.WAREHOUSE_CONNECTION_PASSWORD_PROPERTY_NAME, "");

        Properties properties = new Properties();
        properties.setProperty("connection.url", url);
        properties.setProperty("connection.username", username);
        properties.setProperty("connection.password", password);

        try (OutputStream out = new FileOutputStream(propertiesFile)) {
            properties.store(out, null);
        }
        catch (IOException e) {
            throw new IllegalStateException("Failed to write fallback " + propertiesFile.getName(), e);
        }
        log.info("Wrote fallback " + propertiesFile.getName() + " from "
                + PihMalawiConstants.WAREHOUSE_CONNECTION_URL_PROPERTY_NAME + " configuration");
    }

    @Override
    public void stopped() {
    }
}
