package org.openmrs.module.pihmalawi;


public class PihMalawiConstants {

    public static final String MODULE_ID = "pihmalawi";
    public static final String OPENMRS_WAREHOUSE_CONNECTION_PROPERTIES_FILE_NAME = "warehouse-connection.properties";
    public static final String PATIENT_LAB_TESTS_SQL_DATA_SET = "org/openmrs/module/pihmalawi/reporting/datasets/sql/get-patient-tests.sql";
    public static final String PRIV_CHW_MANAGEMENT_APP = "CHW Management App";
    public static final String HEALTH_FACILITY_GP_NAME = "providermanagement.locationTag";
    public static final String HEALTH_FACILITY_GP_VALUE = "Health Facility";
    public static final String PATIENT_IDENTIFIER_IMPORTANT_TYPES_GP_NAME = "patient_identifier.importantTypes";

    public static final String SYNC_ALLOW_MAC_ADDRESSES_GP_NAME = "pihmalawi.syncAllowMacAddresses";

    public static final String PATIENT_IDENTIFIER_IMPORTANT_TYPES_GP_VALUE = "ARV Number,HCC Number,Chronic Care Number,Palliative Care Number,PDC Identifier,Nutrition Program Number,TB program identifier";
    public static final String TASK_CLOSE_STALE_VISITS_NAME = "PIH Malawi module - Close Stale Visits";
    public static final String TASK_CLOSE_STALE_VISITS_DESCRIPTION = "Closes any open visits that are no longer active";
    public static final long TASK_CLOSE_STALE_VISITS_REPEAT_INTERVAL = 300L;

    public static final String TASK_MIGRATE_EID_TEST_RESULTS = "Migrate EID Test Results";
    public static final String TASK_MIGRATE_EID_TEST_RESULTS_DESCRIPTION = "Migrates EID Test Results on the Exposed Child Initial Form to the EID Screening Form";
    public static final String MEDIC_MOBILE_FACILITY = "Yendanafe Catchment";

    public static final String TRANSFERRED_OUT_PROGRAM_ATTRIBUTE_TYPE = "D576AAE9-6537-4549-88A5-49A761AA93E0";
    public static final String REQUEST_PARAMETER_NAME_REDIRECT_URL = "redirectUrl";
    public static final String COOKIE_NAME_LAST_SESSION_LOCATION = "pihmalawi.lastSessionLocation";
    public static final String SESSION_ATTRIBUTE_REDIRECT_URL = "_REFERENCE_APPLICATION_REDIRECT_URL_";
    public static final String SESSION_ATTRIBUTE_ERROR_MESSAGE = "_REFERENCE_APPLICATION_ERROR_MESSAGE_";
    public static final String SESSION_ATTRIBUTE_INFO_MESSAGE = "_REFERENCE_APPLICATION_INFO_MESSAGE_";
    public static final String SESSION_LOCATION_ID = "emrContext.sessionLocationId";
    public static final String PATIENT_DASHBOARD_URL = "patientDashboard.form";
}
