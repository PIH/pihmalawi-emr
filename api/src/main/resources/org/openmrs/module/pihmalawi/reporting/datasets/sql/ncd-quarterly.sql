/*USE openmrs_warehouse;

SET @location = 'Neno district hospital';
SET @endDate = '2026-06-30';*/
SET @defaultCutOff = 60;
SET @startDate = DATE_ADD(DATE_SUB(@endDate, INTERVAL 3 MONTH), INTERVAL 1 DAY);

-- per-workflow outcome: each condition is judged by its own workflow state, not the patient's latest state in any workflow
CALL create_chronic_care_outcome_by_workflow_at_facility(@endDate, @location);
call create_last_mental_health_outcome_by_workflow_at_facility(@endDate, @location);

DROP TABLE IF EXISTS active_patients_staging;
CREATE TABLE active_patients_staging AS
SELECT pat, workflow FROM chronic_care_last_workflow_outcome WHERE state in ('on treatment','in advanced care');

DROP TABLE IF EXISTS active_mental_health_staging;
CREATE TABLE active_mental_health_staging AS
SELECT pat, workflow FROM last_mental_health_workflow_outcome WHERE state in ('on treatment','in advanced care');

SELECT
    @location as location,
    CONCAT('Q', QUARTER(@endDate)) as quarter_label,
    YEAR(@endDate) AS year_label,
    ---------------------------------------------------------
    -- HYPERTENSION
    ---------------------------------------------------------
    (SELECT COUNT(aps.pat) FROM active_patients_staging aps
     WHERE aps.pat IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_hypertension IS NOT NULL)
     AND aps.workflow = 'Diabetes Hypertension treatment'
    ) AS htn_active_in_care,

    (SELECT COUNT(*) FROM mw_diabetes_hypertension_initial
     WHERE visit_date BETWEEN @startDate AND @endDate AND diagnosis_hypertension IS NOT NULL and location=@location
    ) AS htn_newly_registered,

    (SELECT COUNT(DISTINCT ops.patient_id) FROM omrs_program_state ops
     WHERE ops.location = @location AND ops.start_date BETWEEN @startDate AND @endDate
     AND ops.state = 'patient defaulted' AND ops.program = 'Chronic Care Program' AND ops.workflow = 'Diabetes Hypertension treatment'
     AND ops.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_hypertension IS NOT NULL)
    ) AS htn_defaulted,

	/*(SELECT COUNT(DISTINCT ops.patient_id) FROM omrs_program_state ops
     WHERE ops.location = @location AND ops.start_date BETWEEN @startDate AND @endDate
     AND ops.state = 'patient died' AND ops.program = 'Chronic Care Program'
     AND ops.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_hypertension IS NOT NULL)
    ) AS htn_died,*/

    (SELECT COUNT(DISTINCT mdhf.patient_id) FROM mw_diabetes_hypertension_followup mdhf
     INNER JOIN active_patients_staging aps ON aps.pat = mdhf.patient_id AND aps.workflow = 'Diabetes Hypertension treatment'
     WHERE mdhf.visit_date BETWEEN @startDate AND @endDate and mdhf.location=@location
     AND mdhf.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_hypertension IS NOT NULL)
    ) AS htn_visit_last_3_months,

    (SELECT COUNT(DISTINCT dhi.patient_id) FROM mw_diabetes_hypertension_initial dhi
     INNER JOIN active_patients_staging aps ON aps.pat = dhi.patient_id AND aps.workflow = 'Diabetes Hypertension treatment'
     WHERE dhi.diagnosis_hypertension IS NOT NULL and dhi.location=@location
     AND (cardiovascular_disease IS NOT NULL OR retinopathy IS NOT NULL OR renal_disease IS NOT NULL OR stroke_and_tia IS NOT NULL)
    ) AS htn_with_complications,

    (SELECT COUNT(*) FROM mw_diabetes_hypertension_followup dhf
     INNER JOIN (SELECT patient_id, MAX(visit_date) AS max_v FROM mw_diabetes_hypertension_followup WHERE visit_date BETWEEN @startDate AND @endDate GROUP BY patient_id) dhf_l
     ON dhf.patient_id = dhf_l.patient_id AND dhf.visit_date = dhf_l.max_v
     INNER JOIN active_patients_staging aps ON aps.pat = dhf.patient_id AND aps.workflow = 'Diabetes Hypertension treatment'
     WHERE dhf.bp_stystolic < 140 AND dhf.bp_diastolic < 90 and dhf.location=@location
     AND dhf.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE visit_date < @startDate)
    ) AS htn_controlled_bp,

    ---------------------------------------------------------
    -- ASTHMA
    ---------------------------------------------------------
    (SELECT COUNT(aps.pat) FROM active_patients_staging aps
     WHERE aps.pat IN (SELECT patient_id FROM mw_asthma_initial WHERE diagnosis_asthma IS NOT NULL)
     AND aps.workflow = 'Asthma treatment'
    ) AS asthma_active_in_care,

    (SELECT COUNT(DISTINCT patient_id) FROM mw_asthma_initial
     WHERE visit_date BETWEEN @startDate AND @endDate AND diagnosis_asthma IS NOT NULL and location=@location
    ) AS asthma_newly_registered,

    (SELECT COUNT(DISTINCT ops.patient_id) FROM omrs_program_state ops
     WHERE ops.location = @location AND ops.start_date BETWEEN @startDate AND @endDate
     AND ops.state = 'patient defaulted' AND ops.program = 'Chronic Care Program' AND ops.workflow = 'Asthma treatment'
     AND ops.patient_id IN (SELECT patient_id FROM mw_asthma_initial WHERE diagnosis_asthma IS NOT NULL)
    ) AS asthma_defaulted,

	/*(SELECT COUNT(DISTINCT ops.patient_id) FROM omrs_program_state ops
     WHERE ops.location = @location AND ops.start_date BETWEEN @startDate AND @endDate
     AND ops.state = 'patient died' AND ops.program = 'Chronic Care Program'
     AND ops.patient_id IN (SELECT patient_id FROM mw_asthma_initial WHERE diagnosis_asthma IS NOT NULL)
    ) AS asthma_died,*/

    (SELECT COUNT(DISTINCT patient_id) FROM mw_asthma_followup
     WHERE visit_date BETWEEN @startDate AND @endDate and location=@location
     AND patient_id IN (SELECT patient_id FROM mw_asthma_initial WHERE diagnosis_asthma IS NOT NULL)
    ) AS asthma_visit_last_3_months,

    (SELECT COUNT(DISTINCT asf.patient_id) FROM mw_asthma_followup asf
     INNER JOIN (SELECT patient_id, MAX(visit_date) as max_v FROM mw_asthma_followup WHERE visit_date BETWEEN @startDate AND @endDate GROUP BY patient_id) asf1
     ON asf.patient_id = asf1.patient_id AND asf.visit_date = asf1.max_v
     WHERE asf.asthma_severity IS NOT NULL and asf.location=@location
    ) AS asthma_severity_recorded,

    (SELECT COUNT(DISTINCT asf.patient_id) FROM mw_asthma_followup asf
     INNER JOIN (SELECT patient_id, MAX(visit_date) as max_v FROM mw_asthma_followup WHERE visit_date BETWEEN @startDate AND @endDate GROUP BY patient_id) asf1
     ON asf.patient_id = asf1.patient_id AND asf.visit_date = asf1.max_v
     WHERE asf.asthma_severity IN ('Mild persistent', 'Intermittent') and asf.location=@location
    ) AS asthma_controlled,

    (select count(distinct(patient_id)) from omrs_obs
	where obs_date between @startDate and @endDate and encounter_type='ASTHMA HOSPITALIZATION' and location=@location
    ) AS asthma_hospitalized,

    ---------------------------------------------------------
    -- COPD
    ---------------------------------------------------------
    (SELECT COUNT(aps.pat) FROM active_patients_staging aps
     WHERE aps.pat IN (SELECT patient_id FROM mw_asthma_initial WHERE diagnosis_copd IS NOT NULL)
     AND aps.workflow = 'Asthma treatment'
    ) AS copd_active_in_care,

    (SELECT COUNT(DISTINCT patient_id) FROM mw_asthma_initial
     WHERE visit_date BETWEEN @startDate AND @endDate AND diagnosis_copd IS NOT NULL and location=@location
    ) AS copd_new_registered,

    (SELECT COUNT(DISTINCT ops.patient_id) FROM omrs_program_state ops
     WHERE ops.location = @location AND ops.start_date BETWEEN @startDate AND @endDate
     AND ops.state = 'patient defaulted' AND ops.program = 'Chronic Care Program' AND ops.workflow = 'Asthma treatment'
     AND ops.patient_id IN (SELECT patient_id FROM mw_asthma_initial WHERE diagnosis_copd IS NOT NULL)
    ) AS copd_defaulted,

    /*(SELECT COUNT(DISTINCT ops.patient_id) FROM omrs_program_state ops
     WHERE ops.location = @location AND ops.start_date BETWEEN @startDate AND @endDate
     AND ops.state = 'patient died' AND ops.program = 'Chronic Care Program'
     AND ops.patient_id IN (SELECT patient_id FROM mw_asthma_initial WHERE diagnosis_copd IS NOT NULL)
    ) AS copd_died,*/

    (SELECT COUNT(DISTINCT patient_id) FROM mw_asthma_followup
     WHERE visit_date BETWEEN @startDate AND @endDate and location=@location
     AND patient_id IN (SELECT patient_id FROM mw_asthma_initial WHERE diagnosis_copd IS NOT NULL)
    ) AS copd_visit_last_3_months,

    ---------------------------------------------------------
    -- DIABETES TYPE 1
    ---------------------------------------------------------
    (SELECT COUNT(aps.pat) FROM active_patients_staging aps
     WHERE aps.pat IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_1_diabetes IS NOT NULL)
     AND aps.workflow = 'Diabetes Hypertension treatment'
    ) AS dm_type1_active_in_care,

    (SELECT COUNT(*) FROM mw_diabetes_hypertension_initial
     WHERE visit_date BETWEEN @startDate AND @endDate AND diagnosis_type_1_diabetes IS NOT NULL and @location=location
    ) AS dm_type1_newly_registered,

    (SELECT COUNT(DISTINCT patient_id) FROM mw_diabetes_hypertension_followup
     WHERE visit_date BETWEEN @startDate AND @endDate and @location=location
     AND patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_1_diabetes IS NOT NULL)
    ) AS dm_type1_quarterly_visits,

    (SELECT COUNT(DISTINCT ops.patient_id) FROM omrs_program_state ops
    WHERE ops.location = @location AND ops.start_date BETWEEN @startDate AND @endDate
    AND ops.state = 'patient defaulted' AND ops.program = 'Chronic Care Program' AND ops.workflow = 'Diabetes Hypertension treatment'
    AND ops.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_1_diabetes IS NOT NULL)
    ) AS dm_type1_defaulted,

    (SELECT COUNT(DISTINCT patient_id) FROM mw_diabetes_hypertension_followup
    WHERE visit_date BETWEEN @startDate AND @endDate and location=@location
    AND fasting_blood_sugar <= 126
    AND patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_1_diabetes IS NOT NULL)
    ) AS dm_type1_controlled_fbs,
    ---------------------------------------------------------
    -- DIABETES TYPE 2
    ---------------------------------------------------------
    (SELECT COUNT(aps.pat) FROM active_patients_staging aps
     WHERE aps.pat IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_2_diabetes IS NOT NULL)
     AND aps.workflow = 'Diabetes Hypertension treatment'
    ) AS dm_type2_active_in_care,

    (SELECT COUNT(*) FROM mw_diabetes_hypertension_initial
     WHERE visit_date BETWEEN @startDate AND @endDate AND diagnosis_type_2_diabetes IS NOT NULL and location=@location
    ) AS dm_type2_newly_registered,

    (SELECT COUNT(DISTINCT patient_id) FROM mw_diabetes_hypertension_followup
     WHERE visit_date BETWEEN @startDate AND @endDate and location=@location
     AND patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_2_diabetes IS NOT NULL)
    ) AS dm_type2_quarterly_visits,

    (SELECT COUNT(DISTINCT ops.patient_id) FROM omrs_program_state ops
    WHERE ops.location = @location AND ops.start_date BETWEEN @startDate AND @endDate
    AND ops.state = 'patient defaulted' AND ops.program = 'Chronic Care Program' AND ops.workflow = 'Diabetes Hypertension treatment'
    AND ops.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_2_diabetes IS NOT NULL)
    ) AS dm_type2_defaulted,

    (SELECT COUNT(DISTINCT patient_id) FROM mw_diabetes_hypertension_followup
     WHERE visit_date BETWEEN @startDate AND @endDate and location=@location
     AND fasting_blood_sugar <= 126
     AND patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_2_diabetes IS NOT NULL)
    ) AS dm_type2_controlled_fbs,

    -- Type 2 on Insulin (Latest visit status)
    (SELECT COUNT(DISTINCT dhf.patient_id) FROM mw_diabetes_hypertension_followup dhf
     INNER JOIN (SELECT patient_id, MAX(visit_date) as max_v FROM mw_diabetes_hypertension_followup WHERE visit_date <= @endDate GROUP BY patient_id) dhf1
     ON dhf.patient_id = dhf1.patient_id AND dhf.visit_date = dhf1.max_v
     INNER JOIN active_patients_staging aps ON dhf.patient_id = aps.pat AND aps.workflow = 'Diabetes Hypertension treatment'
     WHERE (dhf.diabetes_med_long_acting IS NOT NULL OR dhf.diabetes_med_short_acting IS NOT NULL) and dhf.location=@location
     AND dhf.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_2_diabetes IS NOT NULL)
    ) AS dm_type2_on_insulin,

    (SELECT COUNT(DISTINCT dhi.patient_id) FROM mw_diabetes_hypertension_initial dhi
     INNER JOIN active_patients_staging aps ON dhi.patient_id = aps.pat AND aps.workflow = 'Diabetes Hypertension treatment'
     WHERE (dhi.diagnosis_type_1_diabetes IS NOT NULL OR dhi.diagnosis_type_2_diabetes IS NOT NULL)
     AND (cardiovascular_disease IS NOT NULL OR retinopathy IS NOT NULL OR renal_disease IS NOT NULL
          OR stroke_and_tia IS NOT NULL OR peripheral_vascular_disease IS NOT NULL
          OR neuropathy IS NOT NULL OR sexual_disorder IS NOT NULL) and dhi.location=@location
    ) AS dm_total_with_complications,

    ---------------------------------------------------------
    -- MENTAL HEALTH
    ---------------------------------------------------------
    (SELECT COUNT(mhs.pat) FROM active_mental_health_staging mhs
     WHERE mhs.pat IN (SELECT patient_id FROM mw_mental_health_initial)
     AND mhs.workflow = 'Mental health treatment'
    ) AS mental_health_active_in_care,

    (SELECT COUNT(*) FROM mw_mental_health_initial
     WHERE visit_date BETWEEN @startDate AND @endDate and location=@location
    ) AS mental_health_newly_registered,

    (SELECT COUNT(DISTINCT ops.patient_id) FROM omrs_program_state ops
     WHERE ops.location = @location AND ops.start_date BETWEEN @startDate AND @endDate
     AND ops.state = 'patient defaulted' AND ops.program = 'Mental Health Care Program' AND ops.workflow = 'Mental health treatment'
     AND ops.patient_id IN (SELECT patient_id FROM mw_mental_health_followup)
    ) AS mental_health_defaulted,

    (SELECT COUNT(DISTINCT patient_id) FROM mw_mental_health_followup
     WHERE visit_date BETWEEN @startDate AND @endDate and location=@location
    ) AS mental_health_quarterly_visits,

    -- Side Effects (Latest visit in quarter)
    (SELECT COUNT(DISTINCT mhf.patient_id) FROM mw_mental_health_followup mhf
     INNER JOIN (SELECT patient_id, MAX(visit_date) as max_v FROM mw_mental_health_followup WHERE visit_date BETWEEN @startDate AND @endDate GROUP BY patient_id) mhf1
     ON mhf.patient_id = mhf1.patient_id AND mhf.visit_date = mhf1.max_v
     WHERE mhf.medications_side_effects = TRUE and mhf.location=@location
    ) AS mental_health_side_effects,

        -- Hospitalized (Latest visit in quarter)
    (SELECT COUNT(DISTINCT mhf.patient_id) FROM mw_mental_health_followup mhf
    INNER JOIN (SELECT patient_id, MAX(visit_date) as max_v FROM mw_mental_health_followup WHERE visit_date BETWEEN @startDate AND @endDate GROUP BY patient_id) mhf1
    ON mhf.patient_id = mhf1.patient_id AND mhf.visit_date = mhf1.max_v
    WHERE mhf.hospitalized_since_last_visit = 'Yes' and mhf.location=@location
    ) AS mental_health_hospitalized,

    -- Patient Stability (Latest visit in quarter)
    (SELECT COUNT(DISTINCT mhf.patient_id) FROM mw_mental_health_followup mhf
     INNER JOIN (SELECT patient_id, MAX(visit_date) as max_v FROM mw_mental_health_followup WHERE visit_date BETWEEN @startDate AND @endDate GROUP BY patient_id) mhf1
     ON mhf.patient_id = mhf1.patient_id AND mhf.visit_date = mhf1.max_v
     WHERE mhf.patient_stable = 'yes' and mhf.location=@location
    ) AS mental_health_stable,

    ---------------------------------------------------------
    -- EPILEPSY
    ---------------------------------------------------------
    (SELECT COUNT(mhs.pat) FROM active_mental_health_staging mhs
     WHERE mhs.pat IN (SELECT patient_id FROM mw_epilepsy_initial)
     AND mhs.workflow = 'Epilepsy treatment'
    ) AS epilepsy_active_in_care,

    (SELECT COUNT(*) FROM mw_epilepsy_initial
     WHERE visit_date BETWEEN @startDate AND @endDate and location=@location
    ) AS epilepsy_newly_registered,

    (SELECT COUNT(DISTINCT ops.patient_id) FROM omrs_program_state ops
     WHERE ops.location = @location AND ops.start_date BETWEEN @startDate AND @endDate
     AND ops.state = 'patient defaulted' AND ops.program = 'Mental Health Care Program' AND ops.workflow = 'Epilepsy treatment'
     AND ops.patient_id IN (SELECT patient_id FROM mw_epilepsy_followup)
    ) AS epilepsy_defaulted,

    (SELECT COUNT(DISTINCT patient_id) FROM mw_epilepsy_followup
     WHERE visit_date BETWEEN @startDate AND @endDate and location=@location
    ) AS epilepsy_visit_last_3_months,

    (SELECT COUNT(DISTINCT epf.patient_id) FROM mw_epilepsy_followup epf
     INNER JOIN (
         SELECT patient_id, MAX(visit_date) as max_v
         FROM mw_epilepsy_followup WHERE visit_date BETWEEN @startDate AND @endDate GROUP BY patient_id
     ) epf1 ON epf.patient_id = epf1.patient_id AND epf.visit_date = epf1.max_v
     WHERE (epf.seizure_since_last_visit IS NULL OR epf.seizure_since_last_visit = 'NO') and epf.location=@location
    ) AS epilepsy_no_seizure,

    (SELECT COUNT(patient_id) FROM mw_epilepsy_followup
     WHERE hospitalized_since_last_visit = 'Yes'
     AND visit_date BETWEEN @startDate AND @endDate and location=@location
    ) AS epilepsy_hospitalized;