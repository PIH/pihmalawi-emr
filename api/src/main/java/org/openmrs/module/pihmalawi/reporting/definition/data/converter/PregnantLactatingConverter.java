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
package org.openmrs.module.pihmalawi.reporting.definition.data.converter;

import org.openmrs.Concept;
import org.openmrs.Obs;
import org.openmrs.module.reporting.common.ObjectUtil;
import org.openmrs.module.reporting.data.converter.DataConverter;

/**
 * Who Stage data converter
 */
public class PregnantLactatingConverter implements DataConverter  {

	public static final String NO_CONCEPT_UUID = "6557646c-977f-11e1-8993-905e29aff6c1";
	public static final String PREGNANT_CONCEPT_UUID = "655b6bac-977f-11e1-8993-905e29aff6c1";
	public static final String LACTATING_CONCEPT_UUID = "656cdab8-977f-11e1-8993-905e29aff6c1";

	//***** CONSTRUCTORS *****

	/**
	 * Default constructor
	 */
	public PregnantLactatingConverter() { }

	//***** INSTANCE METHODS *****

	/**
	 * @see DataConverter#convert(Object)
	 */
	public Object convert(Object original) {
        Obs o = (Obs)original;
        if (o != null) {
            String conceptUuid = o.getValueCoded().getUuid();
            if (NO_CONCEPT_UUID.equals(conceptUuid)) { return "No"; }
            if (PREGNANT_CONCEPT_UUID.equals(conceptUuid)) { return "Pregnant"; }
            if (LACTATING_CONCEPT_UUID.equals(conceptUuid)) { return "Lactating"; }
            return ObjectUtil.format(o.getValueCoded());
        }
        return null;
	}

	/**
	 * @see DataConverter#getDataType()
	 */
	public Class<?> getDataType() {
		return String.class;
	}

	/**
	 * @see DataConverter#getInputDataType()
	 */
	public Class<?> getInputDataType() {
		return Concept.class;
	}
}
