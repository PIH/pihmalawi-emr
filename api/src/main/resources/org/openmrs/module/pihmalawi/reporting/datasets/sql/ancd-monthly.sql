/*USE openmrs_warehouse;

SET @location = 'Neno district hospital';
SET @endDate = '2026-06-30';*/
SET @defaultCutOff = 60;
SET @startDate = DATE_ADD(DATE_SUB(@endDate, INTERVAL 1 MONTH), INTERVAL 1 DAY);

CALL create_chronic_care_outcome_at_facility(@endDate, @location);
CALL create_last_mental_health_outcome_at_facility(@endDate, @location);

-- Staging base active populations
DROP TABLE IF EXISTS active_patients_staging;
CREATE TABLE active_patients_staging AS
SELECT pat FROM chronic_care_last_facility_outcome WHERE state = 'in advanced care';
ALTER TABLE active_patients_staging ADD PRIMARY KEY (pat);

DROP TABLE IF EXISTS active_mental_health_staging;
CREATE TABLE active_mental_health_staging AS
SELECT pat FROM last_mental_facility_outcome WHERE state = 'in advanced care';
ALTER TABLE active_mental_health_staging ADD PRIMARY KEY (pat);

-- Program states ranked per patient and program (1 = most recent as of @endDate)
DROP TABLE IF EXISTS ncd_program_state_ranked;
CREATE TABLE ncd_program_state_ranked AS
SELECT
    @r_state := IF(@k_state = CONCAT(ops.patient_id, '|', ops.program), @r_state + 1, 1) AS index_desc,
    ops.patient_id,
    ops.program,
    ops.state,
    ops.location,
    ops.start_date,
    @k_state := CONCAT(ops.patient_id, '|', ops.program) AS rank_key
FROM omrs_program_state ops
         JOIN (SELECT @r_state := 1) AS r_init
         JOIN (SELECT @k_state := '') AS k_init
WHERE ops.program IN ('Chronic Care Program', 'Mental Health Care Program')
  AND ops.start_date <= @endDate
ORDER BY ops.patient_id DESC, ops.program, ops.start_date DESC, ops.program_state_id DESC;
ALTER TABLE ncd_program_state_ranked ADD INDEX (patient_id, program, index_desc);

-- Patients whose current state (defaulted/died) started in the period and whose previous state was 'in advanced care'
DROP TABLE IF EXISTS ncd_outcome_transition_staging;
CREATE TABLE ncd_outcome_transition_staging AS
SELECT DISTINCT current_state.patient_id, current_state.program, current_state.state
FROM ncd_program_state_ranked current_state
         INNER JOIN ncd_program_state_ranked previous_state
                    ON previous_state.patient_id = current_state.patient_id
                        AND previous_state.program = current_state.program
                        AND previous_state.index_desc = 2
WHERE current_state.index_desc = 1
  AND current_state.state IN ('patient defaulted', 'patient died')
  AND current_state.start_date BETWEEN @startDate AND @endDate
  AND current_state.location = @location
  AND previous_state.state = 'in advanced care';
ALTER TABLE ncd_outcome_transition_staging ADD INDEX (patient_id, program, state);

/* =========================================================
   STAGE 1: HTN, ASTHMA, COPD FLAGS
   ========================================================= */
DROP TABLE IF EXISTS tmp_cohort_stage1;
CREATE TEMPORARY TABLE tmp_cohort_stage1 AS
SELECT
    p.patient_id,
    aps.pat AS aps_pat,

    -- HTN
    htn_init.patient_id AS htn_init_id,
    htn_new.patient_id  AS htn_new_id,
    htn_def.patient_id  AS htn_def_id,
    htn_died.patient_id AS htn_died_id,
    htn_visit.patient_id AS htn_visit_id,
    htn_comp.patient_id AS htn_comp_id,
    htn_ctrl.patient_id AS htn_ctrl_id,

    -- ASTHMA
    ast_init.patient_id AS ast_init_id,
    ast_new.patient_id  AS ast_new_id,
    ast_def.patient_id  AS ast_def_id,
    ast_died.patient_id AS ast_died_id,
    ast_visit.patient_id AS ast_visit_id,
    ast_sev.patient_id   AS ast_sev_id,
    ast_ctrl.patient_id  AS ast_ctrl_id,
    ast_hosp.patient_id  AS ast_hosp_id,
    ast_inter.patient_id AS ast_inter_id,
    ast_mild.patient_id  AS ast_mild_id,
    ast_mod.patient_id   AS ast_mod_id,
    ast_sev_p.patient_id AS ast_sev_p_id,
    ast_unctrl.patient_id AS ast_unctrl_id,

    -- COPD
    copd_init.patient_id AS copd_init_id,
    copd_new.patient_id  AS copd_new_id,
    copd_def.patient_id  AS copd_def_id,
    copd_died.patient_id AS copd_died_id,
    copd_visit.patient_id AS copd_visit_id

FROM mw_patient p
         LEFT JOIN active_patients_staging aps ON p.patient_id = aps.pat

/* HTN Subqueries */
         LEFT JOIN (SELECT DISTINCT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_hypertension IS NOT NULL) htn_init ON p.patient_id = htn_init.patient_id
         LEFT JOIN (
    SELECT DISTINCT dhi.patient_id FROM mw_diabetes_hypertension_initial dhi
                                            INNER JOIN active_patients_staging aps ON aps.pat = dhi.patient_id
    WHERE dhi.visit_date BETWEEN @startDate AND @endDate AND dhi.diagnosis_hypertension IS NOT NULL AND dhi.location = @location
) htn_new ON p.patient_id = htn_new.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient defaulted' AND ots.program = 'Chronic Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_hypertension IS NOT NULL)
) htn_def ON p.patient_id = htn_def.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient died' AND ots.program = 'Chronic Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_hypertension IS NOT NULL)
) htn_died ON p.patient_id = htn_died.patient_id
         LEFT JOIN (
    SELECT DISTINCT mdhf.patient_id FROM mw_diabetes_hypertension_followup mdhf
                                             INNER JOIN active_patients_staging aps ON aps.pat = mdhf.patient_id
    WHERE mdhf.visit_date BETWEEN @startDate AND @endDate AND mdhf.location = @location
      AND mdhf.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_hypertension IS NOT NULL)
) htn_visit ON p.patient_id = htn_visit.patient_id
         LEFT JOIN (
    -- Currently in advanced care with an HTN diagnosis and any complication ever recorded
    SELECT DISTINCT dhi.patient_id FROM mw_diabetes_hypertension_initial dhi
                                            INNER JOIN active_patients_staging aps ON aps.pat = dhi.patient_id
    WHERE (dhi.cardiovascular_disease IS NOT NULL OR dhi.retinopathy IS NOT NULL OR dhi.renal_disease IS NOT NULL
        OR dhi.stroke_and_tia IS NOT NULL OR dhi.peripheral_vascular_disease IS NOT NULL
        OR dhi.neuropathy IS NOT NULL OR dhi.sexual_disorder IS NOT NULL)
      AND dhi.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_hypertension IS NOT NULL)
) htn_comp ON p.patient_id = htn_comp.patient_id
         LEFT JOIN (
    SELECT DISTINCT dhf.patient_id FROM mw_diabetes_hypertension_followup dhf
                                            INNER JOIN (
        SELECT patient_id, MAX(visit_date) AS max_v FROM mw_diabetes_hypertension_followup
        WHERE visit_date BETWEEN @startDate AND @endDate GROUP BY patient_id
    ) dhf_l ON dhf.patient_id = dhf_l.patient_id AND dhf.visit_date = dhf_l.max_v
                                            INNER JOIN active_patients_staging aps ON aps.pat = dhf.patient_id
    WHERE dhf.bp_stystolic < 140 AND dhf.bp_diastolic < 90 AND dhf.location = @location
      AND dhf.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE visit_date < @startDate)
) htn_ctrl ON p.patient_id = htn_ctrl.patient_id

/* ASTHMA Subqueries */
         LEFT JOIN (SELECT DISTINCT patient_id FROM mw_asthma_initial WHERE diagnosis_asthma IS NOT NULL) ast_init ON p.patient_id = ast_init.patient_id
         LEFT JOIN (
    SELECT DISTINCT ai.patient_id FROM mw_asthma_initial ai
                                           INNER JOIN active_patients_staging aps ON aps.pat = ai.patient_id
    WHERE ai.visit_date BETWEEN @startDate AND @endDate AND ai.diagnosis_asthma IS NOT NULL AND ai.location = @location
) ast_new ON p.patient_id = ast_new.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient defaulted' AND ots.program = 'Chronic Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_asthma_initial WHERE diagnosis_asthma IS NOT NULL)
) ast_def ON p.patient_id = ast_def.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient died' AND ots.program = 'Chronic Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_asthma_initial WHERE diagnosis_asthma IS NOT NULL)
) ast_died ON p.patient_id = ast_died.patient_id
         LEFT JOIN (
    SELECT DISTINCT af.patient_id FROM mw_asthma_followup af
                                           INNER JOIN active_patients_staging aps ON aps.pat = af.patient_id
    WHERE af.visit_date BETWEEN @startDate AND @endDate AND af.location = @location
      AND af.patient_id IN (SELECT patient_id FROM mw_asthma_initial WHERE diagnosis_asthma IS NOT NULL)
) ast_visit ON p.patient_id = ast_visit.patient_id
         LEFT JOIN (
    SELECT DISTINCT asf.patient_id FROM mw_asthma_followup asf
                                            INNER JOIN (
        SELECT patient_id, MAX(visit_date) AS max_v FROM mw_asthma_followup
        WHERE visit_date BETWEEN @startDate AND @endDate GROUP BY patient_id
    ) asf1 ON asf.patient_id = asf1.patient_id AND asf.visit_date = asf1.max_v
                                            INNER JOIN active_patients_staging aps ON aps.pat = asf.patient_id
    WHERE asf.asthma_severity IS NOT NULL AND asf.location = @location
) ast_sev ON p.patient_id = ast_sev.patient_id
         LEFT JOIN (
    SELECT DISTINCT asf.patient_id FROM mw_asthma_followup asf
                                            INNER JOIN (
        SELECT patient_id, MAX(visit_date) AS max_v FROM mw_asthma_followup
        WHERE visit_date BETWEEN @startDate AND @endDate GROUP BY patient_id
    ) asf1 ON asf.patient_id = asf1.patient_id AND asf.visit_date = asf1.max_v
                                            INNER JOIN active_patients_staging aps ON aps.pat = asf.patient_id
    WHERE asf.asthma_severity IN ('Mild persistent', 'Intermittent') AND asf.location = @location
) ast_ctrl ON p.patient_id = ast_ctrl.patient_id
         LEFT JOIN (
    SELECT DISTINCT obs.patient_id FROM omrs_obs obs
                                            INNER JOIN active_patients_staging aps ON aps.pat = obs.patient_id
    WHERE obs.obs_date BETWEEN @startDate AND @endDate
      AND obs.encounter_type = 'ASTHMA HOSPITALIZATION' AND obs.location = @location
) ast_hosp ON p.patient_id = ast_hosp.patient_id

-- Added Asthma Severity Subqueries
         LEFT JOIN (
    SELECT DISTINCT asf.patient_id FROM mw_asthma_followup asf
                                            INNER JOIN (
        SELECT patient_id, MAX(visit_date) AS max_v FROM mw_asthma_followup
        WHERE visit_date BETWEEN @startDate AND @endDate GROUP BY patient_id
    ) asf1 ON asf.patient_id = asf1.patient_id AND asf.visit_date = asf1.max_v
                                            INNER JOIN active_patients_staging aps ON aps.pat = asf.patient_id
    WHERE asf.asthma_severity = 'Intermittent' AND asf.location = @location
      AND asf.patient_id IN (SELECT patient_id FROM mw_asthma_initial WHERE diagnosis_asthma IS NOT NULL)
) ast_inter ON p.patient_id = ast_inter.patient_id
         LEFT JOIN (
    SELECT DISTINCT asf.patient_id FROM mw_asthma_followup asf
                                            INNER JOIN (
        SELECT patient_id, MAX(visit_date) AS max_v FROM mw_asthma_followup
        WHERE visit_date BETWEEN @startDate AND @endDate GROUP BY patient_id
    ) asf1 ON asf.patient_id = asf1.patient_id AND asf.visit_date = asf1.max_v
                                            INNER JOIN active_patients_staging aps ON aps.pat = asf.patient_id
    WHERE asf.asthma_severity = 'Mild persistent' AND asf.location = @location
      AND asf.patient_id IN (SELECT patient_id FROM mw_asthma_initial WHERE diagnosis_asthma IS NOT NULL)
) ast_mild ON p.patient_id = ast_mild.patient_id
         LEFT JOIN (
    SELECT DISTINCT asf.patient_id FROM mw_asthma_followup asf
                                            INNER JOIN (
        SELECT patient_id, MAX(visit_date) AS max_v FROM mw_asthma_followup
        WHERE visit_date BETWEEN @startDate AND @endDate GROUP BY patient_id
    ) asf1 ON asf.patient_id = asf1.patient_id AND asf.visit_date = asf1.max_v
                                            INNER JOIN active_patients_staging aps ON aps.pat = asf.patient_id
    WHERE asf.asthma_severity = 'Moderate persistent' AND asf.location = @location
      AND asf.patient_id IN (SELECT patient_id FROM mw_asthma_initial WHERE diagnosis_asthma IS NOT NULL)
) ast_mod ON p.patient_id = ast_mod.patient_id
         LEFT JOIN (
    SELECT DISTINCT asf.patient_id FROM mw_asthma_followup asf
                                            INNER JOIN (
        SELECT patient_id, MAX(visit_date) AS max_v FROM mw_asthma_followup
        WHERE visit_date BETWEEN @startDate AND @endDate GROUP BY patient_id
    ) asf1 ON asf.patient_id = asf1.patient_id AND asf.visit_date = asf1.max_v
                                            INNER JOIN active_patients_staging aps ON aps.pat = asf.patient_id
    WHERE asf.asthma_severity = 'Severe persistent' AND asf.location = @location
      AND asf.patient_id IN (SELECT patient_id FROM mw_asthma_initial WHERE diagnosis_asthma IS NOT NULL)
) ast_sev_p ON p.patient_id = ast_sev_p.patient_id
         LEFT JOIN (
    SELECT DISTINCT asf.patient_id FROM mw_asthma_followup asf
                                            INNER JOIN (
        SELECT patient_id, MAX(visit_date) AS max_v FROM mw_asthma_followup
        WHERE visit_date BETWEEN @startDate AND @endDate GROUP BY patient_id
    ) asf1 ON asf.patient_id = asf1.patient_id AND asf.visit_date = asf1.max_v
                                            INNER JOIN active_patients_staging aps ON aps.pat = asf.patient_id
    WHERE asf.asthma_severity = 'Severe uncontrolled' AND asf.location = @location
      AND asf.patient_id IN (SELECT patient_id FROM mw_asthma_initial WHERE diagnosis_asthma IS NOT NULL)
) ast_unctrl ON p.patient_id = ast_unctrl.patient_id

/* COPD Subqueries */
         LEFT JOIN (SELECT DISTINCT patient_id FROM mw_asthma_initial WHERE diagnosis_copd IS NOT NULL) copd_init ON p.patient_id = copd_init.patient_id
         LEFT JOIN (
    SELECT DISTINCT ai.patient_id FROM mw_asthma_initial ai
                                           INNER JOIN active_patients_staging aps ON aps.pat = ai.patient_id
    WHERE ai.visit_date BETWEEN @startDate AND @endDate AND ai.diagnosis_copd IS NOT NULL AND ai.location = @location
) copd_new ON p.patient_id = copd_new.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient defaulted' AND ots.program = 'Chronic Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_asthma_initial WHERE diagnosis_copd IS NOT NULL)
) copd_def ON p.patient_id = copd_def.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient died' AND ots.program = 'Chronic Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_asthma_initial WHERE diagnosis_copd IS NOT NULL)
) copd_died ON p.patient_id = copd_died.patient_id
         LEFT JOIN (
    SELECT DISTINCT af.patient_id FROM mw_asthma_followup af
                                           INNER JOIN active_patients_staging aps ON aps.pat = af.patient_id
    WHERE af.visit_date BETWEEN @startDate AND @endDate AND af.location = @location
      AND af.patient_id IN (SELECT patient_id FROM mw_asthma_initial WHERE diagnosis_copd IS NOT NULL)
) copd_visit ON p.patient_id = copd_visit.patient_id;

ALTER TABLE tmp_cohort_stage1 ADD PRIMARY KEY (patient_id);


/* =========================================================
   STAGE 2: DIABETES TYPE 1 & TYPE 2 FLAGS
   ========================================================= */
DROP TABLE IF EXISTS tmp_cohort_stage2;
CREATE TEMPORARY TABLE tmp_cohort_stage2 AS
SELECT
    p.patient_id,

    -- DM Type 1
    dm1_init.patient_id  AS dm1_init_id,
    dm1_new.patient_id   AS dm1_new_id,
    dm1_def.patient_id   AS dm1_def_id,
    dm1_died.patient_id  AS dm1_died_id,
    dm1_visit.patient_id AS dm1_visit_id,
    dm1_ctrl.patient_id  AS dm1_ctrl_id,
    dm1_comp.patient_id  AS dm1_comp_id,

    -- DM Type 2
    dm2_init.patient_id  AS dm2_init_id,
    dm2_new.patient_id   AS dm2_new_id,
    dm2_def.patient_id   AS dm2_def_id,
    dm2_died.patient_id  AS dm2_died_id,
    dm2_visit.patient_id AS dm2_visit_id,
    dm2_ctrl.patient_id  AS dm2_ctrl_id,
    dm2_ins.patient_id   AS dm2_ins_id,
    dm_comp.patient_id   AS dm_comp_id

FROM mw_patient p

/* DIABETES TYPE 1 Subqueries */
         LEFT JOIN (SELECT DISTINCT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_1_diabetes IS NOT NULL) dm1_init ON p.patient_id = dm1_init.patient_id
         LEFT JOIN (
    SELECT DISTINCT dhi.patient_id FROM mw_diabetes_hypertension_initial dhi
                                            INNER JOIN active_patients_staging aps ON aps.pat = dhi.patient_id
    WHERE dhi.visit_date BETWEEN @startDate AND @endDate AND dhi.diagnosis_type_1_diabetes IS NOT NULL AND dhi.location = @location
) dm1_new ON p.patient_id = dm1_new.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient defaulted' AND ots.program = 'Chronic Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_1_diabetes IS NOT NULL)
) dm1_def ON p.patient_id = dm1_def.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient died' AND ots.program = 'Chronic Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_1_diabetes IS NOT NULL)
) dm1_died ON p.patient_id = dm1_died.patient_id
         LEFT JOIN (
    SELECT DISTINCT dhf.patient_id FROM mw_diabetes_hypertension_followup dhf
                                            INNER JOIN active_patients_staging aps ON aps.pat = dhf.patient_id
    WHERE dhf.visit_date BETWEEN @startDate AND @endDate AND dhf.location = @location
      AND dhf.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_1_diabetes IS NOT NULL)
) dm1_visit ON p.patient_id = dm1_visit.patient_id
         LEFT JOIN (
    SELECT DISTINCT dhf.patient_id FROM mw_diabetes_hypertension_followup dhf
                                            INNER JOIN active_patients_staging aps ON aps.pat = dhf.patient_id
    WHERE dhf.visit_date BETWEEN @startDate AND @endDate AND dhf.location = @location AND dhf.fasting_blood_sugar <= 120
      AND dhf.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_1_diabetes IS NOT NULL)
) dm1_ctrl ON p.patient_id = dm1_ctrl.patient_id
         LEFT JOIN (
    SELECT DISTINCT dhi.patient_id
    FROM mw_diabetes_hypertension_initial dhi
             INNER JOIN active_patients_staging aps ON aps.pat = dhi.patient_id
             INNER JOIN (
        SELECT patient_id, MAX(next_appointment_date) AS last_appt_date
        FROM mw_diabetes_hypertension_followup
        WHERE visit_date <= @endDate GROUP BY patient_id
    ) patient_visit ON patient_visit.patient_id = dhi.patient_id
    WHERE dhi.diagnosis_type_1_diabetes IS NOT NULL
      AND (dhi.cardiovascular_disease IS NOT NULL OR dhi.retinopathy IS NOT NULL OR dhi.renal_disease IS NOT NULL
        OR dhi.stroke_and_tia IS NOT NULL OR dhi.peripheral_vascular_disease IS NOT NULL
        OR dhi.neuropathy IS NOT NULL OR dhi.sexual_disorder IS NOT NULL)
      AND FLOOR(DATEDIFF(@endDate, patient_visit.last_appt_date)) <= @defaultCutOff
) dm1_comp ON p.patient_id = dm1_comp.patient_id

/* DIABETES TYPE 2 Subqueries */
         LEFT JOIN (SELECT DISTINCT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_2_diabetes IS NOT NULL) dm2_init ON p.patient_id = dm2_init.patient_id
         LEFT JOIN (
    SELECT DISTINCT dhi.patient_id FROM mw_diabetes_hypertension_initial dhi
                                            INNER JOIN active_patients_staging aps ON aps.pat = dhi.patient_id
    WHERE dhi.visit_date BETWEEN @startDate AND @endDate AND dhi.diagnosis_type_2_diabetes IS NOT NULL AND dhi.location = @location
) dm2_new ON p.patient_id = dm2_new.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient defaulted' AND ots.program = 'Chronic Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_2_diabetes IS NOT NULL)
) dm2_def ON p.patient_id = dm2_def.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient died' AND ots.program = 'Chronic Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_2_diabetes IS NOT NULL)
) dm2_died ON p.patient_id = dm2_died.patient_id
         LEFT JOIN (
    SELECT DISTINCT dhf.patient_id FROM mw_diabetes_hypertension_followup dhf
                                            INNER JOIN active_patients_staging aps ON aps.pat = dhf.patient_id
    WHERE dhf.visit_date BETWEEN @startDate AND @endDate AND dhf.location = @location
      AND dhf.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_2_diabetes IS NOT NULL)
) dm2_visit ON p.patient_id = dm2_visit.patient_id
         LEFT JOIN (
    SELECT DISTINCT dhf.patient_id FROM mw_diabetes_hypertension_followup dhf
                                            INNER JOIN active_patients_staging aps ON aps.pat = dhf.patient_id
    WHERE dhf.visit_date BETWEEN @startDate AND @endDate AND dhf.location = @location AND dhf.fasting_blood_sugar <= 120
      AND dhf.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_2_diabetes IS NOT NULL)
) dm2_ctrl ON p.patient_id = dm2_ctrl.patient_id
         LEFT JOIN (
    SELECT DISTINCT dhf.patient_id FROM mw_diabetes_hypertension_followup dhf
                                            INNER JOIN (
        SELECT patient_id, MAX(visit_date) AS max_v FROM mw_diabetes_hypertension_followup
        WHERE visit_date <= @endDate GROUP BY patient_id
    ) dhf1 ON dhf.patient_id = dhf1.patient_id AND dhf.visit_date = dhf1.max_v
                                            INNER JOIN active_patients_staging aps ON aps.pat = dhf.patient_id
    WHERE (dhf.diabetes_med_long_acting IS NOT NULL OR dhf.diabetes_med_short_acting IS NOT NULL)
      AND dhf.location = @location
      AND dhf.patient_id IN (SELECT patient_id FROM mw_diabetes_hypertension_initial WHERE diagnosis_type_2_diabetes IS NOT NULL)
) dm2_ins ON p.patient_id = dm2_ins.patient_id
         LEFT JOIN (
    SELECT DISTINCT dhi.patient_id FROM mw_diabetes_hypertension_initial dhi
                                            INNER JOIN active_patients_staging aps ON dhi.patient_id = aps.pat
    WHERE (dhi.diagnosis_type_1_diabetes IS NOT NULL OR dhi.diagnosis_type_2_diabetes IS NOT NULL)
      AND (cardiovascular_disease IS NOT NULL OR retinopathy IS NOT NULL OR renal_disease IS NOT NULL
        OR stroke_and_tia IS NOT NULL OR peripheral_vascular_disease IS NOT NULL
        OR neuropathy IS NOT NULL OR sexual_disorder IS NOT NULL)
      AND dhi.location = @location
) dm_comp ON p.patient_id = dm_comp.patient_id;

ALTER TABLE tmp_cohort_stage2 ADD PRIMARY KEY (patient_id);


/* =========================================================
   STAGE 3: MENTAL HEALTH & EPILEPSY FLAGS
   ========================================================= */
DROP TABLE IF EXISTS tmp_cohort_stage3;
CREATE TEMPORARY TABLE tmp_cohort_stage3 AS
SELECT
    p.patient_id,
    amhs.pat AS amhs_pat,

    -- Mental Health
    mh_init.patient_id  AS mh_init_id,
    mh_new.patient_id   AS mh_new_id,
    mh_def.patient_id   AS mh_def_id,
    mh_died.patient_id  AS mh_died_id,
    mh_visit.patient_id AS mh_visit_id,
    mh_side.patient_id  AS mh_side_id,
    mh_stb.patient_id   AS mh_stb_id,
    mh_hosp.patient_id  AS mh_hosp_id,

    -- Epilepsy
    ep_init.patient_id     AS ep_init_id,
    ep_new.patient_id      AS ep_new_id,
    ep_def.patient_id      AS ep_def_id,
    ep_died.patient_id     AS ep_died_id,
    ep_visit.patient_id    AS ep_visit_id,
    ep_noseiz.patient_id   AS ep_noseiz_id,
    ep_hosp.patient_id     AS ep_hosp_id,
    ep_ctrl_6m.patient_id  AS ep_ctrl_6m_id

FROM mw_patient p
         LEFT JOIN active_mental_health_staging amhs ON p.patient_id = amhs.pat

/* MENTAL HEALTH Subqueries */
         LEFT JOIN (SELECT DISTINCT patient_id FROM mw_mental_health_initial) mh_init ON p.patient_id = mh_init.patient_id
         LEFT JOIN (
    SELECT DISTINCT mhi.patient_id FROM mw_mental_health_initial mhi
                                            INNER JOIN active_mental_health_staging amhs ON amhs.pat = mhi.patient_id
    WHERE mhi.visit_date BETWEEN @startDate AND @endDate AND mhi.location = @location
) mh_new ON p.patient_id = mh_new.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient defaulted' AND ots.program = 'Mental Health Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_mental_health_initial)
) mh_def ON p.patient_id = mh_def.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient died' AND ots.program = 'Mental Health Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_mental_health_initial)
) mh_died ON p.patient_id = mh_died.patient_id
         LEFT JOIN (
    SELECT DISTINCT mhf.patient_id FROM mw_mental_health_followup mhf
                                            INNER JOIN active_mental_health_staging amhs ON amhs.pat = mhf.patient_id
    WHERE mhf.visit_date BETWEEN @startDate AND @endDate AND mhf.location = @location
) mh_visit ON p.patient_id = mh_visit.patient_id
         LEFT JOIN (
    SELECT DISTINCT mhf.patient_id FROM mw_mental_health_followup mhf
                                            INNER JOIN (
        SELECT patient_id, MAX(visit_date) AS max_v FROM mw_mental_health_followup
        WHERE visit_date BETWEEN @startDate AND @endDate GROUP BY patient_id
    ) mhf1 ON mhf.patient_id = mhf1.patient_id AND mhf.visit_date = mhf1.max_v
                                            INNER JOIN active_mental_health_staging amhs ON amhs.pat = mhf.patient_id
    WHERE mhf.medications_side_effects = 'TRUE' AND mhf.location = @location
) mh_side ON p.patient_id = mh_side.patient_id
         LEFT JOIN (
    SELECT DISTINCT mhf.patient_id FROM mw_mental_health_followup mhf
                                            INNER JOIN (
        SELECT patient_id, MAX(visit_date) AS max_v FROM mw_mental_health_followup
        WHERE visit_date BETWEEN @startDate AND @endDate GROUP BY patient_id
    ) mhf1 ON mhf.patient_id = mhf1.patient_id AND mhf.visit_date = mhf1.max_v
                                            INNER JOIN active_mental_health_staging amhs ON amhs.pat = mhf.patient_id
    WHERE mhf.patient_stable = 'yes' AND mhf.location = @location
) mh_stb ON p.patient_id = mh_stb.patient_id
         LEFT JOIN (
    SELECT DISTINCT mhf.patient_id
    FROM mw_mental_health_followup mhf
             INNER JOIN active_mental_health_staging amhs ON amhs.pat = mhf.patient_id
    WHERE mhf.visit_date BETWEEN @startDate AND @endDate
      AND mhf.hospitalized_since_last_visit = 'Yes'
      AND mhf.location = @location
) mh_hosp ON p.patient_id = mh_hosp.patient_id

/* EPILEPSY Subqueries */
         LEFT JOIN (SELECT DISTINCT patient_id FROM mw_epilepsy_initial) ep_init ON p.patient_id = ep_init.patient_id
         LEFT JOIN (
    SELECT DISTINCT epi.patient_id FROM mw_epilepsy_initial epi
                                            INNER JOIN active_mental_health_staging amhs ON amhs.pat = epi.patient_id
    WHERE epi.visit_date BETWEEN @startDate AND @endDate AND epi.location = @location
) ep_new ON p.patient_id = ep_new.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient defaulted' AND ots.program = 'Mental Health Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_epilepsy_initial)
) ep_def ON p.patient_id = ep_def.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient died' AND ots.program = 'Mental Health Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_epilepsy_initial)
) ep_died ON p.patient_id = ep_died.patient_id
         LEFT JOIN (
    SELECT DISTINCT epf.patient_id FROM mw_epilepsy_followup epf
                                            INNER JOIN active_mental_health_staging amhs ON amhs.pat = epf.patient_id
    WHERE epf.visit_date BETWEEN @startDate AND @endDate AND epf.location = @location
) ep_visit ON p.patient_id = ep_visit.patient_id
         LEFT JOIN (
    SELECT DISTINCT epf.patient_id FROM mw_epilepsy_followup epf
                                            INNER JOIN (
        SELECT patient_id, MAX(visit_date) AS max_v FROM mw_epilepsy_followup
        WHERE visit_date BETWEEN @startDate AND @endDate GROUP BY patient_id
    ) epf1 ON epf.patient_id = epf1.patient_id AND epf.visit_date = epf1.max_v
                                            INNER JOIN active_mental_health_staging amhs ON amhs.pat = epf.patient_id
    WHERE (epf.seizure_since_last_visit IS NULL OR epf.seizure_since_last_visit = 'NO') AND epf.location = @location
) ep_noseiz ON p.patient_id = ep_noseiz.patient_id
         LEFT JOIN (
    SELECT DISTINCT epf.patient_id FROM mw_epilepsy_followup epf
                                            INNER JOIN active_mental_health_staging amhs ON amhs.pat = epf.patient_id
    WHERE epf.hospitalized_since_last_visit = 'Yes'
      AND epf.visit_date BETWEEN @startDate AND @endDate AND epf.location = @location
) ep_hosp ON p.patient_id = ep_hosp.patient_id
         LEFT JOIN (
    SELECT mepf.patient_id
    FROM mw_epilepsy_followup mepf
             INNER JOIN (
        SELECT patient_id, MAX(visit_date) AS max_visit_date
        FROM mw_epilepsy_followup
        WHERE visit_date BETWEEN @startDate AND @endDate
        GROUP BY patient_id
    ) latest_visit ON latest_visit.patient_id = mepf.patient_id AND mepf.visit_date = latest_visit.max_visit_date
             INNER JOIN active_mental_health_staging amhs ON amhs.pat = mepf.patient_id
             INNER JOIN mw_epilepsy_followup mepf_6m ON mepf_6m.patient_id = mepf.patient_id
        AND mepf_6m.visit_date BETWEEN DATE_SUB(mepf.visit_date, INTERVAL 6 MONTH) AND mepf.visit_date
    WHERE mepf.location = @location
    GROUP BY mepf.patient_id
    HAVING SUM(COALESCE(mepf_6m.number_of_seizures, 0)) <= 1
) ep_ctrl_6m ON p.patient_id = ep_ctrl_6m.patient_id;

ALTER TABLE tmp_cohort_stage3 ADD PRIMARY KEY (patient_id);


/* =========================================================
   STAGE 4: SCD, CHF, CKD FLAGS
   ========================================================= */
DROP TABLE IF EXISTS tmp_cohort_stage4;
CREATE TEMPORARY TABLE tmp_cohort_stage4 AS
SELECT
    p.patient_id,

    -- SICKLE CELL DISEASE
    scd_init.patient_id  AS scd_init_id,
    scd_new.patient_id   AS scd_new_id,
    scd_def.patient_id   AS scd_def_id,
    scd_died.patient_id  AS scd_died_id,
    scd_visit.patient_id AS scd_visit_id,
    scd_hosp.patient_id  AS scd_hosp_id,

    -- CHRONIC HEART FAILURE
    chf_init.patient_id     AS chf_init_id,
    chf_new.patient_id      AS chf_new_id,
    chf_def.patient_id      AS chf_def_id,
    chf_died.patient_id     AS chf_died_id,
    chf_visit.patient_id    AS chf_visit_id,
    chf_rhd.patient_id      AS chf_rhd_id,
    chf_chd.patient_id      AS chf_chd_id,
    chf_nyha_any.patient_id AS chf_nyha_any_id,
    chf_nyha1.patient_id    AS chf_nyha1_id,
    chf_nyha2.patient_id    AS chf_nyha2_id,
    chf_nyha3.patient_id    AS chf_nyha3_id,
    chf_nyha4.patient_id    AS chf_nyha4_id,
    chf_hosp.patient_id     AS chf_hosp_id,

    -- CHRONIC KIDNEY DISEASE
    ckd_init.patient_id  AS ckd_init_id,
    ckd_new.patient_id   AS ckd_new_id,
    ckd_def.patient_id   AS ckd_def_id,
    ckd_died.patient_id  AS ckd_died_id,
    ckd_visit.patient_id AS ckd_visit_id,
    ckd_creat.patient_id AS ckd_creat_id,
    ckd_urine.patient_id AS ckd_urine_id

FROM mw_patient p

/* SCD Subqueries */
         LEFT JOIN (SELECT DISTINCT patient_id FROM mw_sickle_cell_disease_initial) scd_init ON p.patient_id = scd_init.patient_id
         LEFT JOIN (
    SELECT DISTINCT ai.patient_id FROM mw_sickle_cell_disease_initial ai
                                           INNER JOIN active_patients_staging aps ON aps.pat = ai.patient_id
    WHERE ai.visit_date BETWEEN @startDate AND @endDate AND ai.location = @location
) scd_new ON p.patient_id = scd_new.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient defaulted' AND ots.program = 'Chronic Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_sickle_cell_disease_initial WHERE sickle_cell_disease__initial_visit_id IS NOT NULL)
) scd_def ON p.patient_id = scd_def.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient died' AND ots.program = 'Chronic Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_sickle_cell_disease_initial WHERE sickle_cell_disease__initial_visit_id IS NOT NULL)
) scd_died ON p.patient_id = scd_died.patient_id
         LEFT JOIN (
    SELECT DISTINCT af.patient_id FROM mw_sickle_cell_disease_followup af
                                           INNER JOIN active_patients_staging aps ON aps.pat = af.patient_id
    WHERE af.visit_date BETWEEN @startDate AND @endDate AND af.location = @location
) scd_visit ON p.patient_id = scd_visit.patient_id
         LEFT JOIN (
    SELECT DISTINCT af.patient_id FROM mw_sickle_cell_disease_followup af
                                           INNER JOIN active_patients_staging aps ON aps.pat = af.patient_id
    WHERE af.visit_date BETWEEN @startDate AND @endDate AND af.location = @location
      AND af.hospitalized_since_last_visit = 'Yes'
) scd_hosp ON p.patient_id = scd_hosp.patient_id

/* CHF Subqueries */
         LEFT JOIN (SELECT DISTINCT patient_id FROM mw_chf_initial) chf_init ON p.patient_id = chf_init.patient_id
         LEFT JOIN (
    SELECT DISTINCT ci.patient_id FROM mw_chf_initial ci
                                           INNER JOIN active_patients_staging aps ON aps.pat = ci.patient_id
    WHERE ci.visit_date BETWEEN @startDate AND @endDate AND ci.location = @location
) chf_new ON p.patient_id = chf_new.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient defaulted' AND ots.program = 'Chronic Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_chf_initial WHERE chf_initial_visit_id IS NOT NULL)
) chf_def ON p.patient_id = chf_def.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient died' AND ots.program = 'Chronic Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_chf_initial WHERE chf_initial_visit_id IS NOT NULL)
) chf_died ON p.patient_id = chf_died.patient_id
         LEFT JOIN (
    SELECT DISTINCT cf.patient_id FROM mw_chf_followup cf
                                           INNER JOIN active_patients_staging aps ON aps.pat = cf.patient_id
    WHERE cf.visit_date BETWEEN @startDate AND @endDate AND cf.location = @location
) chf_visit ON p.patient_id = chf_visit.patient_id
         LEFT JOIN (
    SELECT DISTINCT mci.patient_id FROM mw_chf_initial mci
                                            INNER JOIN mw_chf_followup hf ON mci.patient_id = hf.patient_id
                                            INNER JOIN active_patients_staging aps ON aps.pat = mci.patient_id
    WHERE hf.visit_date <= @endDate AND mci.diagnosis_rheumatic IS NOT NULL
      AND FLOOR(DATEDIFF(@endDate, hf.next_appointment_date)) <= @defaultCutOff
) chf_rhd ON p.patient_id = chf_rhd.patient_id
         LEFT JOIN (
    SELECT DISTINCT mci.patient_id FROM mw_chf_initial mci
                                            INNER JOIN mw_chf_followup hf ON mci.patient_id = hf.patient_id
                                            INNER JOIN active_patients_staging aps ON aps.pat = mci.patient_id
    WHERE hf.visit_date <= @endDate AND mci.diagnosis_congenital IS NOT NULL
      AND FLOOR(DATEDIFF(@endDate, hf.next_appointment_date)) <= @defaultCutOff
) chf_chd ON p.patient_id = chf_chd.patient_id
         LEFT JOIN (
    SELECT DISTINCT mcf.patient_id FROM mw_chf_followup mcf
                                            INNER JOIN (
        SELECT patient_id, MAX(visit_date) AS max_v FROM mw_chf_followup WHERE visit_date <= @endDate GROUP BY patient_id
    ) mcf1 ON mcf.patient_id = mcf1.patient_id AND mcf.visit_date = mcf1.max_v
                                            INNER JOIN active_patients_staging aps ON aps.pat = mcf.patient_id
    WHERE mcf.nyha_stage IN ('Nyha class 1', 'Nyha class 2', 'Nyha class 3', 'Nyha class 4')
      AND FLOOR(DATEDIFF(@endDate, mcf.next_appointment_date)) <= @defaultCutOff
) chf_nyha_any ON p.patient_id = chf_nyha_any.patient_id
         LEFT JOIN (
    SELECT DISTINCT mcf.patient_id FROM mw_chf_followup mcf
                                            INNER JOIN (
        SELECT patient_id, MAX(visit_date) AS max_v FROM mw_chf_followup WHERE visit_date <= @endDate GROUP BY patient_id
    ) mcf1 ON mcf.patient_id = mcf1.patient_id AND mcf.visit_date = mcf1.max_v
                                            INNER JOIN active_patients_staging aps ON aps.pat = mcf.patient_id
    WHERE mcf.nyha_stage = 'Nyha class 1'
      AND FLOOR(DATEDIFF(@endDate, mcf.next_appointment_date)) <= @defaultCutOff
) chf_nyha1 ON p.patient_id = chf_nyha1.patient_id
         LEFT JOIN (
    SELECT DISTINCT mcf.patient_id FROM mw_chf_followup mcf
                                            INNER JOIN (
        SELECT patient_id, MAX(visit_date) AS max_v FROM mw_chf_followup WHERE visit_date <= @endDate GROUP BY patient_id
    ) mcf1 ON mcf.patient_id = mcf1.patient_id AND mcf.visit_date = mcf1.max_v
                                            INNER JOIN active_patients_staging aps ON aps.pat = mcf.patient_id
    WHERE mcf.nyha_stage = 'Nyha class 2'
      AND FLOOR(DATEDIFF(@endDate, mcf.next_appointment_date)) <= @defaultCutOff
) chf_nyha2 ON p.patient_id = chf_nyha2.patient_id
         LEFT JOIN (
    SELECT DISTINCT mcf.patient_id FROM mw_chf_followup mcf
                                            INNER JOIN (
        SELECT patient_id, MAX(visit_date) AS max_v FROM mw_chf_followup WHERE visit_date <= @endDate GROUP BY patient_id
    ) mcf1 ON mcf.patient_id = mcf1.patient_id AND mcf.visit_date = mcf1.max_v
                                            INNER JOIN active_patients_staging aps ON aps.pat = mcf.patient_id
    WHERE mcf.nyha_stage = 'Nyha class 3'
      AND FLOOR(DATEDIFF(@endDate, mcf.next_appointment_date)) <= @defaultCutOff
) chf_nyha3 ON p.patient_id = chf_nyha3.patient_id
         LEFT JOIN (
    SELECT DISTINCT mcf.patient_id FROM mw_chf_followup mcf
                                            INNER JOIN (
        SELECT patient_id, MAX(visit_date) AS max_v FROM mw_chf_followup WHERE visit_date <= @endDate GROUP BY patient_id
    ) mcf1 ON mcf.patient_id = mcf1.patient_id AND mcf.visit_date = mcf1.max_v
                                            INNER JOIN active_patients_staging aps ON aps.pat = mcf.patient_id
    WHERE mcf.nyha_stage = 'Nyha class 4'
      AND FLOOR(DATEDIFF(@endDate, mcf.next_appointment_date)) <= @defaultCutOff
) chf_nyha4 ON p.patient_id = chf_nyha4.patient_id
         LEFT JOIN (
    SELECT DISTINCT cf.patient_id FROM mw_chf_followup cf
                                           INNER JOIN active_patients_staging aps ON aps.pat = cf.patient_id
    WHERE cf.visit_date BETWEEN @startDate AND @endDate AND cf.location = @location
      AND cf.hospitalized_since_last_visit_for_ncd = 'Yes'
) chf_hosp ON p.patient_id = chf_hosp.patient_id

/* CKD Subqueries */
         LEFT JOIN (SELECT DISTINCT patient_id FROM mw_ckd_initial) ckd_init ON p.patient_id = ckd_init.patient_id
         LEFT JOIN (
    SELECT DISTINCT ci.patient_id FROM mw_ckd_initial ci
                                           INNER JOIN active_patients_staging aps ON aps.pat = ci.patient_id
    WHERE ci.visit_date BETWEEN @startDate AND @endDate AND ci.location = @location
) ckd_new ON p.patient_id = ckd_new.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient defaulted' AND ots.program = 'Chronic Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_ckd_initial WHERE ckd_initial_visit_id IS NOT NULL)
) ckd_def ON p.patient_id = ckd_def.patient_id
         LEFT JOIN (
    SELECT DISTINCT ots.patient_id FROM ncd_outcome_transition_staging ots
    WHERE ots.state = 'patient died' AND ots.program = 'Chronic Care Program'
      AND ots.patient_id IN (SELECT patient_id FROM mw_ckd_initial WHERE ckd_initial_visit_id IS NOT NULL)
) ckd_died ON p.patient_id = ckd_died.patient_id
         LEFT JOIN (
    SELECT DISTINCT kf.patient_id FROM mw_ckd_followup kf
                                           INNER JOIN active_patients_staging aps ON aps.pat = kf.patient_id
    WHERE kf.visit_date BETWEEN @startDate AND @endDate AND kf.location = @location
) ckd_visit ON p.patient_id = ckd_visit.patient_id
         LEFT JOIN (
    SELECT DISTINCT kf.patient_id FROM mw_ckd_followup kf
                                           INNER JOIN active_patients_staging aps ON aps.pat = kf.patient_id
    WHERE kf.visit_date BETWEEN @startDate AND @endDate AND kf.location = @location
      AND kf.creatinine IS NOT NULL
) ckd_creat ON p.patient_id = ckd_creat.patient_id
         LEFT JOIN (
    SELECT DISTINCT kf.patient_id FROM mw_ckd_followup kf
                                           INNER JOIN active_patients_staging aps ON aps.pat = kf.patient_id
    WHERE kf.visit_date BETWEEN @startDate AND @endDate AND kf.location = @location
      AND kf.urine_protein IS NOT NULL
) ckd_urine ON p.patient_id = ckd_urine.patient_id;

ALTER TABLE tmp_cohort_stage4 ADD PRIMARY KEY (patient_id);


/* =========================================================
   FINAL REPORT SELECT
   ========================================================= */
SELECT
    /*@location as location,*/
    DATE_FORMAT(@endDate, '%M-%Y') AS month_year_label,
    /* =========================================================
       HYPERTENSION
       ========================================================= */
    COUNT(CASE WHEN p.gender = 'M' AND s1.aps_pat IS NOT NULL AND s1.htn_init_id IS NOT NULL THEN 1 END) AS htn_active_in_care_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.aps_pat IS NOT NULL AND s1.htn_init_id IS NOT NULL THEN 1 END) AS htn_active_in_care_female,
    COUNT(CASE WHEN s1.aps_pat IS NOT NULL AND s1.htn_init_id IS NOT NULL THEN 1 END) AS htn_active_in_care_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.htn_new_id IS NOT NULL THEN 1 END) AS htn_newly_registered_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.htn_new_id IS NOT NULL THEN 1 END) AS htn_newly_registered_female,
    COUNT(CASE WHEN s1.htn_new_id IS NOT NULL THEN 1 END) AS htn_newly_registered_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.htn_def_id IS NOT NULL THEN 1 END) AS htn_defaulted_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.htn_def_id IS NOT NULL THEN 1 END) AS htn_defaulted_female,
    COUNT(CASE WHEN s1.htn_def_id IS NOT NULL THEN 1 END) AS htn_defaulted_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.htn_died_id IS NOT NULL THEN 1 END) AS htn_died_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.htn_died_id IS NOT NULL THEN 1 END) AS htn_died_female,
    COUNT(CASE WHEN s1.htn_died_id IS NOT NULL THEN 1 END) AS htn_died_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.htn_visit_id IS NOT NULL THEN 1 END) AS htn_visit_last_3_months_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.htn_visit_id IS NOT NULL THEN 1 END) AS htn_visit_last_3_months_female,
    COUNT(CASE WHEN s1.htn_visit_id IS NOT NULL THEN 1 END) AS htn_visit_last_3_months_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.htn_comp_id IS NOT NULL THEN 1 END) AS htn_with_complications_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.htn_comp_id IS NOT NULL THEN 1 END) AS htn_with_complications_female,
    COUNT(CASE WHEN s1.htn_comp_id IS NOT NULL THEN 1 END) AS htn_with_complications_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.htn_ctrl_id IS NOT NULL THEN 1 END) AS htn_controlled_bp_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.htn_ctrl_id IS NOT NULL THEN 1 END) AS htn_controlled_bp_female,
    COUNT(CASE WHEN s1.htn_ctrl_id IS NOT NULL THEN 1 END) AS htn_controlled_bp_total,

    /* =========================================================
       ASTHMA
       ========================================================= */
    COUNT(CASE WHEN p.gender = 'M' AND s1.aps_pat IS NOT NULL AND s1.ast_init_id IS NOT NULL THEN 1 END) AS asthma_active_in_care_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.aps_pat IS NOT NULL AND s1.ast_init_id IS NOT NULL THEN 1 END) AS asthma_active_in_care_female,
    COUNT(CASE WHEN s1.aps_pat IS NOT NULL AND s1.ast_init_id IS NOT NULL THEN 1 END) AS asthma_active_in_care_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.ast_new_id IS NOT NULL THEN 1 END) AS asthma_newly_registered_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.ast_new_id IS NOT NULL THEN 1 END) AS asthma_newly_registered_female,
    COUNT(CASE WHEN s1.ast_new_id IS NOT NULL THEN 1 END) AS asthma_newly_registered_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.ast_def_id IS NOT NULL THEN 1 END) AS asthma_defaulted_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.ast_def_id IS NOT NULL THEN 1 END) AS asthma_defaulted_female,
    COUNT(CASE WHEN s1.ast_def_id IS NOT NULL THEN 1 END) AS asthma_defaulted_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.ast_died_id IS NOT NULL THEN 1 END) AS asthma_died_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.ast_died_id IS NOT NULL THEN 1 END) AS asthma_died_female,
    COUNT(CASE WHEN s1.ast_died_id IS NOT NULL THEN 1 END) AS asthma_died_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.ast_visit_id IS NOT NULL THEN 1 END) AS asthma_visit_last_3_months_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.ast_visit_id IS NOT NULL THEN 1 END) AS asthma_visit_last_3_months_female,
    COUNT(CASE WHEN s1.ast_visit_id IS NOT NULL THEN 1 END) AS asthma_visit_last_3_months_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.ast_sev_id IS NOT NULL THEN 1 END) AS asthma_severity_recorded_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.ast_sev_id IS NOT NULL THEN 1 END) AS asthma_severity_recorded_female,
    COUNT(CASE WHEN s1.ast_sev_id IS NOT NULL THEN 1 END) AS asthma_severity_recorded_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.ast_ctrl_id IS NOT NULL THEN 1 END) AS asthma_controlled_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.ast_ctrl_id IS NOT NULL THEN 1 END) AS asthma_controlled_female,
    COUNT(CASE WHEN s1.ast_ctrl_id IS NOT NULL THEN 1 END) AS asthma_controlled_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.ast_inter_id IS NOT NULL THEN 1 END) AS asthma_intermittent_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.ast_inter_id IS NOT NULL THEN 1 END) AS asthma_intermittent_female,
    COUNT(CASE WHEN s1.ast_inter_id IS NOT NULL THEN 1 END) AS asthma_intermittent_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.ast_mild_id IS NOT NULL THEN 1 END) AS asthma_mild_persistent_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.ast_mild_id IS NOT NULL THEN 1 END) AS asthma_mild_persistent_female,
    COUNT(CASE WHEN s1.ast_mild_id IS NOT NULL THEN 1 END) AS asthma_mild_persistent_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.ast_mod_id IS NOT NULL THEN 1 END) AS asthma_moderate_persistent_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.ast_mod_id IS NOT NULL THEN 1 END) AS asthma_moderate_persistent_female,
    COUNT(CASE WHEN s1.ast_mod_id IS NOT NULL THEN 1 END) AS asthma_moderate_persistent_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.ast_sev_p_id IS NOT NULL THEN 1 END) AS asthma_severe_persistent_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.ast_sev_p_id IS NOT NULL THEN 1 END) AS asthma_severe_persistent_female,
    COUNT(CASE WHEN s1.ast_sev_p_id IS NOT NULL THEN 1 END) AS asthma_severe_persistent_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.ast_unctrl_id IS NOT NULL THEN 1 END) AS asthma_severe_uncontrolled_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.ast_unctrl_id IS NOT NULL THEN 1 END) AS asthma_severe_uncontrolled_female,
    COUNT(CASE WHEN s1.ast_unctrl_id IS NOT NULL THEN 1 END) AS asthma_severe_uncontrolled_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.ast_hosp_id IS NOT NULL THEN 1 END) AS asthma_hospitalized_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.ast_hosp_id IS NOT NULL THEN 1 END) AS asthma_hospitalized_female,
    COUNT(CASE WHEN s1.ast_hosp_id IS NOT NULL THEN 1 END) AS asthma_hospitalized_total,

    /* =========================================================
       COPD
       ========================================================= */
    COUNT(CASE WHEN p.gender = 'M' AND s1.aps_pat IS NOT NULL AND s1.copd_init_id IS NOT NULL THEN 1 END) AS copd_active_in_care_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.aps_pat IS NOT NULL AND s1.copd_init_id IS NOT NULL THEN 1 END) AS copd_active_in_care_female,
    COUNT(CASE WHEN s1.aps_pat IS NOT NULL AND s1.copd_init_id IS NOT NULL THEN 1 END) AS copd_active_in_care_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.copd_new_id IS NOT NULL THEN 1 END) AS copd_new_registered_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.copd_new_id IS NOT NULL THEN 1 END) AS copd_new_registered_female,
    COUNT(CASE WHEN s1.copd_new_id IS NOT NULL THEN 1 END) AS copd_new_registered_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.copd_def_id IS NOT NULL THEN 1 END) AS copd_defaulted_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.copd_def_id IS NOT NULL THEN 1 END) AS copd_defaulted_female,
    COUNT(CASE WHEN s1.copd_def_id IS NOT NULL THEN 1 END) AS copd_defaulted_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.copd_died_id IS NOT NULL THEN 1 END) AS copd_died_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.copd_died_id IS NOT NULL THEN 1 END) AS copd_died_female,
    COUNT(CASE WHEN s1.copd_died_id IS NOT NULL THEN 1 END) AS copd_died_total,

    COUNT(CASE WHEN p.gender = 'M' AND s1.copd_visit_id IS NOT NULL THEN 1 END) AS copd_visit_last_3_months_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.copd_visit_id IS NOT NULL THEN 1 END) AS copd_visit_last_3_months_female,
    COUNT(CASE WHEN s1.copd_visit_id IS NOT NULL THEN 1 END) AS copd_visit_last_3_months_total,

    /* =========================================================
       SICKLE CELL DISEASE (SCD)
       ========================================================= */
    COUNT(CASE WHEN p.gender = 'M' AND s1.aps_pat IS NOT NULL AND s4.scd_init_id IS NOT NULL THEN 1 END) AS scd_active_in_care_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.aps_pat IS NOT NULL AND s4.scd_init_id IS NOT NULL THEN 1 END) AS scd_active_in_care_female,
    COUNT(CASE WHEN s1.aps_pat IS NOT NULL AND s4.scd_init_id IS NOT NULL THEN 1 END) AS scd_active_in_care_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.scd_new_id IS NOT NULL THEN 1 END) AS scd_newly_registered_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.scd_new_id IS NOT NULL THEN 1 END) AS scd_newly_registered_female,
    COUNT(CASE WHEN s4.scd_new_id IS NOT NULL THEN 1 END) AS scd_newly_registered_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.scd_def_id IS NOT NULL THEN 1 END) AS scd_defaulted_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.scd_def_id IS NOT NULL THEN 1 END) AS scd_defaulted_female,
    COUNT(CASE WHEN s4.scd_def_id IS NOT NULL THEN 1 END) AS scd_defaulted_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.scd_died_id IS NOT NULL THEN 1 END) AS scd_died_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.scd_died_id IS NOT NULL THEN 1 END) AS scd_died_female,
    COUNT(CASE WHEN s4.scd_died_id IS NOT NULL THEN 1 END) AS scd_died_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.scd_visit_id IS NOT NULL THEN 1 END) AS scd_visit_reporting_period_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.scd_visit_id IS NOT NULL THEN 1 END) AS scd_visit_reporting_period_female,
    COUNT(CASE WHEN s4.scd_visit_id IS NOT NULL THEN 1 END) AS scd_visit_reporting_period_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.scd_hosp_id IS NOT NULL THEN 1 END) AS scd_hospitalized_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.scd_hosp_id IS NOT NULL THEN 1 END) AS scd_hospitalized_female,
    COUNT(CASE WHEN s4.scd_hosp_id IS NOT NULL THEN 1 END) AS scd_hospitalized_total,

    /* =========================================================
       CHRONIC HEART FAILURE (CHF)
       ========================================================= */
    COUNT(CASE WHEN p.gender = 'M' AND s1.aps_pat IS NOT NULL AND s4.chf_init_id IS NOT NULL THEN 1 END) AS chf_active_in_care_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.aps_pat IS NOT NULL AND s4.chf_init_id IS NOT NULL THEN 1 END) AS chf_active_in_care_female,
    COUNT(CASE WHEN s1.aps_pat IS NOT NULL AND s4.chf_init_id IS NOT NULL THEN 1 END) AS chf_active_in_care_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.chf_new_id IS NOT NULL THEN 1 END) AS chf_newly_registered_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.chf_new_id IS NOT NULL THEN 1 END) AS chf_newly_registered_female,
    COUNT(CASE WHEN s4.chf_new_id IS NOT NULL THEN 1 END) AS chf_newly_registered_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.chf_def_id IS NOT NULL THEN 1 END) AS chf_defaulted_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.chf_def_id IS NOT NULL THEN 1 END) AS chf_defaulted_female,
    COUNT(CASE WHEN s4.chf_def_id IS NOT NULL THEN 1 END) AS chf_defaulted_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.chf_died_id IS NOT NULL THEN 1 END) AS chf_died_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.chf_died_id IS NOT NULL THEN 1 END) AS chf_died_female,
    COUNT(CASE WHEN s4.chf_died_id IS NOT NULL THEN 1 END) AS chf_died_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.chf_visit_id IS NOT NULL THEN 1 END) AS chf_visit_reporting_period_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.chf_visit_id IS NOT NULL THEN 1 END) AS chf_visit_reporting_period_female,
    COUNT(CASE WHEN s4.chf_visit_id IS NOT NULL THEN 1 END) AS chf_visit_reporting_period_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.chf_rhd_id IS NOT NULL THEN 1 END) AS chf_rheumatic_heart_disease_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.chf_rhd_id IS NOT NULL THEN 1 END) AS chf_rheumatic_heart_disease_female,
    COUNT(CASE WHEN s4.chf_rhd_id IS NOT NULL THEN 1 END) AS chf_rheumatic_heart_disease_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.chf_chd_id IS NOT NULL THEN 1 END) AS chf_congenital_heart_disease_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.chf_chd_id IS NOT NULL THEN 1 END) AS chf_congenital_heart_disease_female,
    COUNT(CASE WHEN s4.chf_chd_id IS NOT NULL THEN 1 END) AS chf_congenital_heart_disease_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.chf_nyha_any_id IS NOT NULL THEN 1 END) AS chf_nyha_recorded_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.chf_nyha_any_id IS NOT NULL THEN 1 END) AS chf_nyha_recorded_female,
    COUNT(CASE WHEN s4.chf_nyha_any_id IS NOT NULL THEN 1 END) AS chf_nyha_recorded_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.chf_nyha1_id IS NOT NULL THEN 1 END) AS chf_nyha_class_1_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.chf_nyha1_id IS NOT NULL THEN 1 END) AS chf_nyha_class_1_female,
    COUNT(CASE WHEN s4.chf_nyha1_id IS NOT NULL THEN 1 END) AS chf_nyha_class_1_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.chf_nyha2_id IS NOT NULL THEN 1 END) AS chf_nyha_class_2_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.chf_nyha2_id IS NOT NULL THEN 1 END) AS chf_nyha_class_2_female,
    COUNT(CASE WHEN s4.chf_nyha2_id IS NOT NULL THEN 1 END) AS chf_nyha_class_2_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.chf_nyha3_id IS NOT NULL THEN 1 END) AS chf_nyha_class_3_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.chf_nyha3_id IS NOT NULL THEN 1 END) AS chf_nyha_class_3_female,
    COUNT(CASE WHEN s4.chf_nyha3_id IS NOT NULL THEN 1 END) AS chf_nyha_class_3_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.chf_nyha4_id IS NOT NULL THEN 1 END) AS chf_nyha_class_4_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.chf_nyha4_id IS NOT NULL THEN 1 END) AS chf_nyha_class_4_female,
    COUNT(CASE WHEN s4.chf_nyha4_id IS NOT NULL THEN 1 END) AS chf_nyha_class_4_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.chf_hosp_id IS NOT NULL THEN 1 END) AS chf_hospitalized_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.chf_hosp_id IS NOT NULL THEN 1 END) AS chf_hospitalized_female,
    COUNT(CASE WHEN s4.chf_hosp_id IS NOT NULL THEN 1 END) AS chf_hospitalized_total,

    /* =========================================================
       CHRONIC KIDNEY DISEASE (CKD)
       ========================================================= */
    COUNT(CASE WHEN p.gender = 'M' AND s1.aps_pat IS NOT NULL AND s4.ckd_init_id IS NOT NULL THEN 1 END) AS ckd_active_in_care_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.aps_pat IS NOT NULL AND s4.ckd_init_id IS NOT NULL THEN 1 END) AS ckd_active_in_care_female,
    COUNT(CASE WHEN s1.aps_pat IS NOT NULL AND s4.ckd_init_id IS NOT NULL THEN 1 END) AS ckd_active_in_care_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.ckd_new_id IS NOT NULL THEN 1 END) AS ckd_newly_registered_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.ckd_new_id IS NOT NULL THEN 1 END) AS ckd_newly_registered_female,
    COUNT(CASE WHEN s4.ckd_new_id IS NOT NULL THEN 1 END) AS ckd_newly_registered_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.ckd_def_id IS NOT NULL THEN 1 END) AS ckd_defaulted_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.ckd_def_id IS NOT NULL THEN 1 END) AS ckd_defaulted_female,
    COUNT(CASE WHEN s4.ckd_def_id IS NOT NULL THEN 1 END) AS ckd_defaulted_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.ckd_died_id IS NOT NULL THEN 1 END) AS ckd_died_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.ckd_died_id IS NOT NULL THEN 1 END) AS ckd_died_female,
    COUNT(CASE WHEN s4.ckd_died_id IS NOT NULL THEN 1 END) AS ckd_died_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.ckd_visit_id IS NOT NULL THEN 1 END) AS ckd_visit_reporting_period_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.ckd_visit_id IS NOT NULL THEN 1 END) AS ckd_visit_reporting_period_female,
    COUNT(CASE WHEN s4.ckd_visit_id IS NOT NULL THEN 1 END) AS ckd_visit_reporting_period_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.ckd_creat_id IS NOT NULL THEN 1 END) AS ckd_creatinine_recorded_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.ckd_creat_id IS NOT NULL THEN 1 END) AS ckd_creatinine_recorded_female,
    COUNT(CASE WHEN s4.ckd_creat_id IS NOT NULL THEN 1 END) AS ckd_creatinine_recorded_total,

    COUNT(CASE WHEN p.gender = 'M' AND s4.ckd_urine_id IS NOT NULL THEN 1 END) AS ckd_urinalysis_recorded_male,
    COUNT(CASE WHEN p.gender = 'F' AND s4.ckd_urine_id IS NOT NULL THEN 1 END) AS ckd_urinalysis_recorded_female,
    COUNT(CASE WHEN s4.ckd_urine_id IS NOT NULL THEN 1 END) AS ckd_urinalysis_recorded_total,

    /* =========================================================
       DIABETES TYPE 1
       ========================================================= */
    COUNT(CASE WHEN p.gender = 'M' AND s1.aps_pat IS NOT NULL AND s2.dm1_init_id IS NOT NULL THEN 1 END) AS dm_type1_active_in_care_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.aps_pat IS NOT NULL AND s2.dm1_init_id IS NOT NULL THEN 1 END) AS dm_type1_active_in_care_female,
    COUNT(CASE WHEN s1.aps_pat IS NOT NULL AND s2.dm1_init_id IS NOT NULL THEN 1 END) AS dm_type1_active_in_care_total,

    COUNT(CASE WHEN p.gender = 'M' AND s2.dm1_new_id IS NOT NULL THEN 1 END) AS dm_type1_newly_registered_male,
    COUNT(CASE WHEN p.gender = 'F' AND s2.dm1_new_id IS NOT NULL THEN 1 END) AS dm_type1_newly_registered_female,
    COUNT(CASE WHEN s2.dm1_new_id IS NOT NULL THEN 1 END) AS dm_type1_newly_registered_total,

    COUNT(CASE WHEN p.gender = 'M' AND s2.dm1_def_id IS NOT NULL THEN 1 END) AS dm_type1_defaulted_male,
    COUNT(CASE WHEN p.gender = 'F' AND s2.dm1_def_id IS NOT NULL THEN 1 END) AS dm_type1_defaulted_female,
    COUNT(CASE WHEN s2.dm1_def_id IS NOT NULL THEN 1 END) AS dm_type1_defaulted_total,

    COUNT(CASE WHEN p.gender = 'M' AND s2.dm1_died_id IS NOT NULL THEN 1 END) AS dm_type1_died_male,
    COUNT(CASE WHEN p.gender = 'F' AND s2.dm1_died_id IS NOT NULL THEN 1 END) AS dm_type1_died_female,
    COUNT(CASE WHEN s2.dm1_died_id IS NOT NULL THEN 1 END) AS dm_type1_died_total,

    COUNT(CASE WHEN p.gender = 'M' AND s2.dm1_visit_id IS NOT NULL THEN 1 END) AS dm_type1_quarterly_visits_male,
    COUNT(CASE WHEN p.gender = 'F' AND s2.dm1_visit_id IS NOT NULL THEN 1 END) AS dm_type1_quarterly_visits_female,
    COUNT(CASE WHEN s2.dm1_visit_id IS NOT NULL THEN 1 END) AS dm_type1_quarterly_visits_total,

    COUNT(CASE WHEN p.gender = 'M' AND s2.dm1_ctrl_id IS NOT NULL THEN 1 END) AS dm_type1_controlled_fbs_male,
    COUNT(CASE WHEN p.gender = 'F' AND s2.dm1_ctrl_id IS NOT NULL THEN 1 END) AS dm_type1_controlled_fbs_female,
    COUNT(CASE WHEN s2.dm1_ctrl_id IS NOT NULL THEN 1 END) AS dm_type1_controlled_fbs_total,

    COUNT(CASE WHEN p.gender = 'M' AND s2.dm1_comp_id IS NOT NULL THEN 1 END) AS dm_type1_ever_complications_male,
    COUNT(CASE WHEN p.gender = 'F' AND s2.dm1_comp_id IS NOT NULL THEN 1 END) AS dm_type1_ever_complications_female,
    COUNT(CASE WHEN s2.dm1_comp_id IS NOT NULL THEN 1 END) AS dm_type1_ever_complications_total,

    /* =========================================================
       DIABETES TYPE 2
       ========================================================= */
    COUNT(CASE WHEN p.gender = 'M' AND s1.aps_pat IS NOT NULL AND s2.dm2_init_id IS NOT NULL THEN 1 END) AS dm_type2_active_in_care_male,
    COUNT(CASE WHEN p.gender = 'F' AND s1.aps_pat IS NOT NULL AND s2.dm2_init_id IS NOT NULL THEN 1 END) AS dm_type2_active_in_care_female,
    COUNT(CASE WHEN s1.aps_pat IS NOT NULL AND s2.dm2_init_id IS NOT NULL THEN 1 END) AS dm_type2_active_in_care_total,

    COUNT(CASE WHEN p.gender = 'M' AND s2.dm2_new_id IS NOT NULL THEN 1 END) AS dm_type2_newly_registered_male,
    COUNT(CASE WHEN p.gender = 'F' AND s2.dm2_new_id IS NOT NULL THEN 1 END) AS dm_type2_newly_registered_female,
    COUNT(CASE WHEN s2.dm2_new_id IS NOT NULL THEN 1 END) AS dm_type2_newly_registered_total,

    COUNT(CASE WHEN p.gender = 'M' AND s2.dm2_def_id IS NOT NULL THEN 1 END) AS dm_type2_defaulted_male,
    COUNT(CASE WHEN p.gender = 'F' AND s2.dm2_def_id IS NOT NULL THEN 1 END) AS dm_type2_defaulted_female,
    COUNT(CASE WHEN s2.dm2_def_id IS NOT NULL THEN 1 END) AS dm_type2_defaulted_total,

    COUNT(CASE WHEN p.gender = 'M' AND s2.dm2_died_id IS NOT NULL THEN 1 END) AS dm_type2_died_male,
    COUNT(CASE WHEN p.gender = 'F' AND s2.dm2_died_id IS NOT NULL THEN 1 END) AS dm_type2_died_female,
    COUNT(CASE WHEN s2.dm2_died_id IS NOT NULL THEN 1 END) AS dm_type2_died_total,

    COUNT(CASE WHEN p.gender = 'M' AND s2.dm2_visit_id IS NOT NULL THEN 1 END) AS dm_type2_quarterly_visits_male,
    COUNT(CASE WHEN p.gender = 'F' AND s2.dm2_visit_id IS NOT NULL THEN 1 END) AS dm_type2_quarterly_visits_female,
    COUNT(CASE WHEN s2.dm2_visit_id IS NOT NULL THEN 1 END) AS dm_type2_quarterly_visits_total,

    COUNT(CASE WHEN p.gender = 'M' AND s2.dm2_ctrl_id IS NOT NULL THEN 1 END) AS dm_type2_controlled_fbs_male,
    COUNT(CASE WHEN p.gender = 'F' AND s2.dm2_ctrl_id IS NOT NULL THEN 1 END) AS dm_type2_controlled_fbs_female,
    COUNT(CASE WHEN s2.dm2_ctrl_id IS NOT NULL THEN 1 END) AS dm_type2_controlled_fbs_total,

    COUNT(CASE WHEN p.gender = 'M' AND s2.dm2_ins_id IS NOT NULL THEN 1 END) AS dm_type2_on_insulin_male,
    COUNT(CASE WHEN p.gender = 'F' AND s2.dm2_ins_id IS NOT NULL THEN 1 END) AS dm_type2_on_insulin_female,
    COUNT(CASE WHEN s2.dm2_ins_id IS NOT NULL THEN 1 END) AS dm_type2_on_insulin_total,

    COUNT(CASE WHEN p.gender = 'M' AND s2.dm_comp_id IS NOT NULL THEN 1 END) AS dm_total_with_complications_male,
    COUNT(CASE WHEN p.gender = 'F' AND s2.dm_comp_id IS NOT NULL THEN 1 END) AS dm_total_with_complications_female,
    COUNT(CASE WHEN s2.dm_comp_id IS NOT NULL THEN 1 END) AS dm_total_with_complications_total,

    /* =========================================================
       MENTAL HEALTH
       ========================================================= */
    COUNT(CASE WHEN p.gender = 'M' AND s3.amhs_pat IS NOT NULL AND s3.mh_init_id IS NOT NULL THEN 1 END) AS mental_health_active_in_care_male,
    COUNT(CASE WHEN p.gender = 'F' AND s3.amhs_pat IS NOT NULL AND s3.mh_init_id IS NOT NULL THEN 1 END) AS mental_health_active_in_care_female,
    COUNT(CASE WHEN s3.amhs_pat IS NOT NULL AND s3.mh_init_id IS NOT NULL THEN 1 END) AS mental_health_active_in_care_total,

    COUNT(CASE WHEN p.gender = 'M' AND s3.mh_new_id IS NOT NULL THEN 1 END) AS mental_health_newly_registered_male,
    COUNT(CASE WHEN p.gender = 'F' AND s3.mh_new_id IS NOT NULL THEN 1 END) AS mental_health_newly_registered_female,
    COUNT(CASE WHEN s3.mh_new_id IS NOT NULL THEN 1 END) AS mental_health_newly_registered_total,

    COUNT(CASE WHEN p.gender = 'M' AND s3.mh_def_id IS NOT NULL THEN 1 END) AS mental_health_defaulted_male,
    COUNT(CASE WHEN p.gender = 'F' AND s3.mh_def_id IS NOT NULL THEN 1 END) AS mental_health_defaulted_female,
    COUNT(CASE WHEN s3.mh_def_id IS NOT NULL THEN 1 END) AS mental_health_defaulted_total,

    COUNT(CASE WHEN p.gender = 'M' AND s3.mh_died_id IS NOT NULL THEN 1 END) AS mh_died_male,
    COUNT(CASE WHEN p.gender = 'F' AND s3.mh_died_id IS NOT NULL THEN 1 END) AS mh_died_female,
    COUNT(CASE WHEN s3.mh_died_id IS NOT NULL THEN 1 END) AS mh_died_total,

    COUNT(CASE WHEN p.gender = 'M' AND s3.mh_visit_id IS NOT NULL THEN 1 END) AS mental_health_quarterly_visits_male,
    COUNT(CASE WHEN p.gender = 'F' AND s3.mh_visit_id IS NOT NULL THEN 1 END) AS mental_health_quarterly_visits_female,
    COUNT(CASE WHEN s3.mh_visit_id IS NOT NULL THEN 1 END) AS mental_health_quarterly_visits_total,

    COUNT(CASE WHEN p.gender = 'M' AND s3.mh_side_id IS NOT NULL THEN 1 END) AS mental_health_side_effects_male,
    COUNT(CASE WHEN p.gender = 'F' AND s3.mh_side_id IS NOT NULL THEN 1 END) AS mental_health_side_effects_female,
    COUNT(CASE WHEN s3.mh_side_id IS NOT NULL THEN 1 END) AS mental_health_side_effects_total,

    COUNT(CASE WHEN p.gender = 'M' AND s3.mh_stb_id IS NOT NULL THEN 1 END) AS mental_health_stable_male,
    COUNT(CASE WHEN p.gender = 'F' AND s3.mh_stb_id IS NOT NULL THEN 1 END) AS mental_health_stable_female,
    COUNT(CASE WHEN s3.mh_stb_id IS NOT NULL THEN 1 END) AS mental_health_stable_total,

    COUNT(CASE WHEN p.gender = 'M' AND s3.mh_hosp_id IS NOT NULL THEN 1 END) AS mental_health_hospitalized_male,
    COUNT(CASE WHEN p.gender = 'F' AND s3.mh_hosp_id IS NOT NULL THEN 1 END) AS mental_health_hospitalized_female,
    COUNT(CASE WHEN s3.mh_hosp_id IS NOT NULL THEN 1 END) AS mental_health_hospitalized_total,

    /* =========================================================
       EPILEPSY
       ========================================================= */
    COUNT(CASE WHEN p.gender = 'M' AND s3.amhs_pat IS NOT NULL AND s3.ep_init_id IS NOT NULL THEN 1 END) AS epilepsy_active_in_care_male,
    COUNT(CASE WHEN p.gender = 'F' AND s3.amhs_pat IS NOT NULL AND s3.ep_init_id IS NOT NULL THEN 1 END) AS epilepsy_active_in_care_female,
    COUNT(CASE WHEN s3.amhs_pat IS NOT NULL AND s3.ep_init_id IS NOT NULL THEN 1 END) AS epilepsy_active_in_care_total,

    COUNT(CASE WHEN p.gender = 'M' AND s3.ep_new_id IS NOT NULL THEN 1 END) AS epilepsy_newly_registered_male,
    COUNT(CASE WHEN p.gender = 'F' AND s3.ep_new_id IS NOT NULL THEN 1 END) AS epilepsy_newly_registered_female,
    COUNT(CASE WHEN s3.ep_new_id IS NOT NULL THEN 1 END) AS epilepsy_newly_registered_total,

    COUNT(CASE WHEN p.gender = 'M' AND s3.ep_def_id IS NOT NULL THEN 1 END) AS epilepsy_defaulted_male,
    COUNT(CASE WHEN p.gender = 'F' AND s3.ep_def_id IS NOT NULL THEN 1 END) AS epilepsy_defaulted_female,
    COUNT(CASE WHEN s3.ep_def_id IS NOT NULL THEN 1 END) AS epilepsy_defaulted_total,

    COUNT(CASE WHEN p.gender = 'M' AND s3.ep_died_id IS NOT NULL THEN 1 END) AS ep_died_male,
    COUNT(CASE WHEN p.gender = 'F' AND s3.ep_died_id IS NOT NULL THEN 1 END) AS ep_died_female,
    COUNT(CASE WHEN s3.ep_died_id IS NOT NULL THEN 1 END) AS ep_died_total,

    COUNT(CASE WHEN p.gender = 'M' AND s3.ep_visit_id IS NOT NULL THEN 1 END) AS epilepsy_visit_last_3_months_male,
    COUNT(CASE WHEN p.gender = 'F' AND s3.ep_visit_id IS NOT NULL THEN 1 END) AS epilepsy_visit_last_3_months_female,
    COUNT(CASE WHEN s3.ep_visit_id IS NOT NULL THEN 1 END) AS epilepsy_visit_last_3_months_total,

    COUNT(CASE WHEN p.gender = 'M' AND s3.ep_noseiz_id IS NOT NULL THEN 1 END) AS epilepsy_no_seizure_male,
    COUNT(CASE WHEN p.gender = 'F' AND s3.ep_noseiz_id IS NOT NULL THEN 1 END) AS epilepsy_no_seizure_female,
    COUNT(CASE WHEN s3.ep_noseiz_id IS NOT NULL THEN 1 END) AS epilepsy_no_seizure_total,

    COUNT(CASE WHEN p.gender = 'M' AND s3.ep_ctrl_6m_id IS NOT NULL THEN 1 END) AS epilepsy_controlled_seizure_6m_male,
    COUNT(CASE WHEN p.gender = 'F' AND s3.ep_ctrl_6m_id IS NOT NULL THEN 1 END) AS epilepsy_controlled_seizure_6m_female,
    COUNT(CASE WHEN s3.ep_ctrl_6m_id IS NOT NULL THEN 1 END) AS epilepsy_controlled_seizure_6m_total,

    COUNT(CASE WHEN p.gender = 'M' AND s3.ep_hosp_id IS NOT NULL THEN 1 END) AS epilepsy_hospitalized_male,
    COUNT(CASE WHEN p.gender = 'F' AND s3.ep_hosp_id IS NOT NULL THEN 1 END) AS epilepsy_hospitalized_female,
    COUNT(CASE WHEN s3.ep_hosp_id IS NOT NULL THEN 1 END) AS epilepsy_hospitalized_total

FROM mw_patient p
         INNER JOIN tmp_cohort_stage1 s1 ON p.patient_id = s1.patient_id
         INNER JOIN tmp_cohort_stage2 s2 ON p.patient_id = s2.patient_id
         INNER JOIN tmp_cohort_stage3 s3 ON p.patient_id = s3.patient_id
         INNER JOIN tmp_cohort_stage4 s4 ON p.patient_id = s4.patient_id;