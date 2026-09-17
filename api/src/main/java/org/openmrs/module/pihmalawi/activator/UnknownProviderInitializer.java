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

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.openmrs.Person;
import org.openmrs.PersonName;
import org.openmrs.Provider;
import org.openmrs.api.context.Context;

/**
 * Ensures a placeholder "Unknown Provider" exists with a fixed, portable uuid, matching the
 * record that already exists in production. Several htmlforms hardcode a raw provider primary
 * key as the default value of their provider field; since that id is install-specific and can't
 * be resolved from any metadata-only source, this creates a matching-uuid Provider on every
 * install instead, so htmlforms can reference it by uuid (see MLW-1846).
 */
public class UnknownProviderInitializer implements Initializer {

    protected static final Log log = LogFactory.getLog(UnknownProviderInitializer.class);

    public static final String UUID = "provfc3c-2695-102d-b4c2-001d929acb54";
    public static final String GIVEN_NAME = "Unknown";
    public static final String FAMILY_NAME = "Provider";
    public static final String GENDER = "M";

    @Override
    public void started() {
        if (Context.getProviderService().getProviderByUuid(UUID) == null) {
            Person person = new Person();
            person.setGender(GENDER);
            person.addName(new PersonName(GIVEN_NAME, null, FAMILY_NAME));
            person = Context.getPersonService().savePerson(person);

            Provider provider = new Provider();
            provider.setUuid(UUID);
            provider.setPerson(person);
            Context.getProviderService().saveProvider(provider);

            log.info("Created Unknown Provider with uuid " + UUID);
        }
    }

    @Override
    public void stopped() {
    }
}
