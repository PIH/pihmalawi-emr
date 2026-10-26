/*USE openmrs_warehouse;

SET @location = "Neno district hospital";
SET @startDate = "2026-01-01";
SET @endDate   = "2026-03-31";*/

SET @birthDateDivider = 30;
SET @defaultCutOff = 60;

CALL create_hiv_cohort(@startDate, @endDate, @location, @birthDateDivider);
CALL create_last_eid_outcome_at_facility(@endDate, @location);

SELECT
    @location AS location,
    CONCAT('Q', QUARTER(@startDate)) as quarter_label,
    YEAR(@startDate) AS year_label,
    eid.*,
    art.*
FROM (
    #HCC
    SELECT
    SUM(mei.visit_date BETWEEN @startDate AND @endDate) AS eid_newly_total_registered_in_quarter,
    SUM(mei.visit_date <= @endDate) AS eid_cummulative_ever_total_registered,
    SUM(IF(sub.eid_transfer_in_date IS NULL AND mei.previous_registrations = 0 AND mei.visit_date BETWEEN @startDate AND @endDate, 1, 0)) AS eid_newly_ft,
    SUM(IF(sub.eid_transfer_in_date IS NULL AND mei.previous_registrations = 0 AND mei.visit_date <= @endDate, 1, 0)) AS eid_cummulative_ft,
    -- Re-initiated (RE): not transferred in, with an earlier EID registration
    SUM(IF(sub.eid_transfer_in_date IS NULL AND mei.previous_registrations > 0 AND mei.visit_date BETWEEN @startDate AND @endDate, 1, 0)) AS eid_newly_reinitiated,
    SUM(IF(sub.eid_transfer_in_date IS NULL AND mei.previous_registrations > 0 AND mei.visit_date <= @endDate, 1, 0)) AS eid_cummulative_reinitiated,
    SUM(IF(sub.eid_transfer_in_date IS NOT NULL AND mei.visit_date BETWEEN @startDate AND @endDate, 1, 0)) AS eid_initial_transfer_In,
    SUM(IF(sub.eid_transfer_in_date IS NOT NULL AND mei.visit_date <= @endDate, 1, 0)) AS eid_cummulative_transfer_In,
    SUM(IF(mei.visit_date BETWEEN @startDate AND @endDate AND lef.gender = 'M', 1, 0)) AS eid_initial_males_all_ages,
    SUM(IF(mei.visit_date BETWEEN @startDate AND @endDate AND lef.gender = 'F', 1, 0)) AS eid_initial_females_all_ages,
    SUM(IF(mei.visit_date <= @endDate AND lef.gender = 'M', 1, 0)) AS eid_cumulative_males_all_ages,
    SUM(IF(mei.visit_date <= @endDate AND lef.gender = 'F', 1, 0)) AS eid_cumulative_females_all_ages,
    SUM(IF(DATEDIFF(mei.visit_date, lef.birthdate) < 60 AND mei.visit_date BETWEEN @startDate AND @endDate, 1, 0)) AS eid_age_at_initiation_less_2months,
    SUM(IF(DATEDIFF(mei.visit_date, lef.birthdate) BETWEEN 60 AND 729 AND mei.visit_date BETWEEN @startDate AND @endDate, 1, 0)) AS eid_age_at_initiation_2_24months,
    SUM(IF(DATEDIFF(mei.visit_date, lef.birthdate) < 60 AND mei.visit_date <= @endDate, 1, 0)) AS cumulative_eid_age_at_initiation_less_2months,
    SUM(IF(DATEDIFF(mei.visit_date, lef.birthdate) BETWEEN 60 AND 729 AND mei.visit_date <= @endDate, 1, 0)) AS cumulative_eid_age_at_initiation_2_24months,
    SUM(IF(lef.state = 'Exposed Child (Continue)' AND FLOOR(DATEDIFF(@endDate, ev.eid_last_appt_date)) <= @defaultCutOff AND mei.visit_date BETWEEN @startDate AND @endDate, 1, 0)) AS quarterly_eid_tx_curr,
    SUM(IF(lef.state = 'Exposed Child (Continue)' AND FLOOR(DATEDIFF(@endDate, ev.eid_last_appt_date)) <= @defaultCutOff, 1, 0)) AS cumulative_eid_tx_curr,
    -- Confirmed infected (Pre-ART): clients ever in the Pre-ART (Continue) state at the facility
    (SELECT COUNT(DISTINCT ops.patient_id) FROM omrs_program_state ops
    WHERE ops.state = 'Pre-ART (Continue)' AND ops.location = @location AND ops.start_date <= @endDate) AS cumulative_eid_confirmed_infected_pre_art
    FROM last_eid_facility_outcome lef
    -- latest EID registration per child at the facility, with the number of earlier EID registrations (any facility)
    JOIN (
    SELECT e.patient_id, e.location, e.visit_date,
    (SELECT COUNT(*) FROM mw_eid_initial p WHERE p.patient_id = e.patient_id AND p.visit_date < e.visit_date) AS previous_registrations
    FROM (
    SELECT patient_id, location, MAX(visit_date) AS visit_date
    FROM mw_eid_initial WHERE visit_date <= @endDate GROUP BY patient_id, location
    ) e
    ) mei ON mei.patient_id = lef.pat AND mei.location = lef.location
    LEFT JOIN (
    SELECT patient_id, MAX(next_appointment_date) AS eid_last_appt_date
    FROM mw_eid_followup WHERE visit_date <= @endDate GROUP BY patient_id
    ) ev ON ev.patient_id = lef.pat
    -- one transfer-in date per child
    LEFT JOIN (
    SELECT patient_id, MIN(value_date) AS eid_transfer_in_date
    FROM omrs_obs WHERE concept = 'Transfer in date' AND value_date <= @endDate GROUP BY patient_id
    ) sub ON sub.patient_id = lef.pat
    ) eid
    CROSS JOIN (
    SELECT
    #ART Clinic
    -- ART Clinic Registrations
    SUM(hv.initial_visit_date BETWEEN @startDate AND @endDate) AS newly_total_registered_in_quarter,
    SUM(hv.initial_visit_date <= @endDate) AS cummulative_ever_total_registered,

    -- First Time (FT) Starts
    SUM(IF(hv.gender='M' AND hv.transfer_in_date IS NULL AND COALESCE(piv.reinitiated, 0) = 0 AND hv.initial_visit_date BETWEEN @startDate AND @endDate, 1, 0)) AS newly_ft_male,
    SUM(IF(hv.gender='M' AND hv.transfer_in_date IS NULL AND COALESCE(piv.reinitiated, 0) = 0 AND hv.initial_visit_date <= @endDate, 1, 0)) AS cummulative_ft_male,
    SUM(IF(hv.gender='F' AND hv.transfer_in_date IS NULL AND COALESCE(piv.reinitiated, 0) = 0 AND (hv.initial_pregnant_or_lactating != 'Patient pregnant' OR hv.initial_pregnant_or_lactating IS NULL) AND hv.initial_visit_date BETWEEN @startDate AND @endDate, 1, 0)) AS newly_ft_female_nonpreg,
    SUM(IF(hv.gender='F' AND hv.transfer_in_date IS NULL AND COALESCE(piv.reinitiated, 0) = 0 AND (hv.initial_pregnant_or_lactating != 'Patient pregnant' OR hv.initial_pregnant_or_lactating IS NULL) AND hv.initial_visit_date <= @endDate, 1, 0)) AS cummulative_ft_female_nonpreg,
    SUM(IF(hv.gender='F' AND hv.transfer_in_date IS NULL AND COALESCE(piv.reinitiated, 0) = 0 AND hv.initial_pregnant_or_lactating = 'Patient pregnant' AND hv.initial_visit_date BETWEEN @startDate AND @endDate, 1, 0)) AS newly_ft_female_preg,
    SUM(IF(hv.gender='F' AND hv.transfer_in_date IS NULL AND COALESCE(piv.reinitiated, 0) = 0 AND hv.initial_pregnant_or_lactating = 'Patient pregnant' AND hv.initial_visit_date <= @endDate, 1, 0)) AS cummulative_ft_female_preg,
    SUM(IF((hv.gender NOT IN ('M', 'F') OR hv.gender IS NULL) AND hv.transfer_in_date IS NULL AND COALESCE(piv.reinitiated, 0) = 0 AND hv.initial_visit_date BETWEEN @startDate AND @endDate, 1, 0)) AS quarterly_non_disaggregated,
    SUM(IF((hv.gender NOT IN ('M', 'F') OR hv.gender IS NULL) AND hv.transfer_in_date IS NULL AND COALESCE(piv.reinitiated, 0) = 0 AND hv.initial_visit_date <= @endDate, 1, 0)) AS cumulative_non_disaggregated,
    SUM(CASE WHEN hv.transfer_in_date IS NULL AND COALESCE(piv.reinitiated, 0) = 0 AND hv.initial_visit_date BETWEEN @startDate AND @endDate THEN 1 ELSE 0 END) AS total_ft,
    SUM(CASE WHEN hv.transfer_in_date IS NULL AND COALESCE(piv.reinitiated, 0) = 0 AND hv.initial_visit_date <= @endDate THEN 1 ELSE 0 END) AS cummulative_ft,

    -- Re-initiated (RE): not transferred in, previously taken ARVs (FT + RE + TI = total registered)
    SUM(IF(hv.transfer_in_date IS NULL AND piv.reinitiated = 1 AND hv.initial_visit_date BETWEEN @startDate AND @endDate, 1, 0)) AS newly_reinitiated,
    SUM(IF(hv.transfer_in_date IS NULL AND piv.reinitiated = 1 AND hv.initial_visit_date <= @endDate, 1, 0)) AS cummulative_reinitiated,

    -- Transfer-In (TI): registered in the period with a transfer-in date
    SUM(IF(hv.transfer_in_date IS NOT NULL AND hv.initial_visit_date BETWEEN @startDate AND @endDate, 1, 0)) AS initial_transfer_In,
    SUM(IF(hv.transfer_in_date IS NOT NULL AND hv.initial_visit_date <= @endDate, 1, 0)) AS cummulative_transfer_In,

    -- Age at Initiation (age in months at ART registration)
    SUM(IF(hv.initial_visit_date BETWEEN @startDate AND @endDate AND hv.gender = 'M', 1, 0)) AS initial_males_all_ages,
    SUM(IF(hv.initial_visit_date BETWEEN @startDate AND @endDate AND hv.gender = 'F' AND (hv.initial_pregnant_or_lactating != 'Patient pregnant' OR hv.initial_pregnant_or_lactating IS NULL), 1, 0)) AS initial_fnp_all_ages,
    SUM(IF(hv.initial_visit_date BETWEEN @startDate AND @endDate AND hv.gender = 'F' AND hv.initial_pregnant_or_lactating = 'Patient pregnant', 1, 0)) AS initial_fp_all_ages,
    SUM(IF(FLOOR(DATEDIFF(hv.initial_visit_date, mp.birthdate) / @birthDateDivider) < 24 AND hv.initial_visit_date BETWEEN @startDate AND @endDate, 1, 0)) AS age_at_initiation_less_24m,
    SUM(IF(FLOOR(DATEDIFF(hv.initial_visit_date, mp.birthdate) / @birthDateDivider) BETWEEN 24 AND 179 AND hv.initial_visit_date BETWEEN @startDate AND @endDate, 1, 0)) AS age_at_initiation__24m_14yrs,
    SUM(IF(FLOOR(DATEDIFF(hv.initial_visit_date, mp.birthdate) / @birthDateDivider) >= 180 AND hv.initial_visit_date BETWEEN @startDate AND @endDate, 1, 0)) AS age_at_initiation_15plus,

    SUM(IF(hv.initial_visit_date <= @endDate AND hv.gender = 'M', 1, 0)) AS cummulative_males_all_ages,
    SUM(IF(hv.initial_visit_date <= @endDate AND hv.gender = 'F' AND (hv.initial_pregnant_or_lactating != 'Patient pregnant' OR hv.initial_pregnant_or_lactating IS NULL), 1, 0)) AS cummulative_fnp_all_ages,
    SUM(IF(hv.initial_visit_date <= @endDate AND hv.gender = 'F' AND hv.initial_pregnant_or_lactating = 'Patient pregnant', 1, 0)) AS cummulative_fp_all_ages,
    SUM(IF(FLOOR(DATEDIFF(hv.initial_visit_date, mp.birthdate) / @birthDateDivider) < 24 AND hv.initial_visit_date <= @endDate, 1, 0)) AS age_at_initiation_less_24m_cummulative,
    SUM(IF(FLOOR(DATEDIFF(hv.initial_visit_date, mp.birthdate) / @birthDateDivider) BETWEEN 24 AND 179 AND hv.initial_visit_date <= @endDate, 1, 0)) AS age_at_initiation__24m_14yrs_cummulative,
    SUM(IF(FLOOR(DATEDIFF(hv.initial_visit_date, mp.birthdate) / @birthDateDivider) >= 180 AND hv.initial_visit_date <= @endDate, 1, 0)) AS age_at_initiation_15plus_cummulative,

    -- Reasons for Starting (mutually exclusive, see initiation_reason in piv)
    SUM(IF(hv.initial_visit_date BETWEEN @startDate AND @endDate AND piv.initiation_reason = 'SEVERE', 1, 0)) AS initial_pres_sev_hiv,
    SUM(IF(hv.initial_visit_date BETWEEN @startDate AND @endDate AND piv.initiation_reason = 'INFANT', 1, 0)) AS initial_infants_less_12_mths,
    SUM(IF(hv.initial_visit_date BETWEEN @startDate AND @endDate AND piv.initiation_reason = 'CHILD', 1, 0)) AS initial_children_12_59_mths,
    SUM(IF(hv.initial_visit_date BETWEEN @startDate AND @endDate AND piv.initiation_reason = 'PREG', 1, 0)) AS intial_preg,
    SUM(IF(hv.initial_visit_date BETWEEN @startDate AND @endDate AND piv.initiation_reason = 'BF', 1, 0)) AS initial_bf,
    SUM(IF(hv.initial_visit_date BETWEEN @startDate AND @endDate AND piv.initiation_reason = 'CD4', 1, 0)) AS initial_cd4_below_threshold,
    SUM(IF(hv.initial_visit_date BETWEEN @startDate AND @endDate AND piv.initiation_reason = 'STAGE3', 1, 0)) AS initial_who_stage_3,
    SUM(IF(hv.initial_visit_date BETWEEN @startDate AND @endDate AND piv.initiation_reason = 'STAGE4', 1, 0)) AS initial_who_stage_4,
    SUM(IF(hv.initial_visit_date BETWEEN @startDate AND @endDate AND piv.initiation_reason = 'ASYMPTOMATIC', 1, 0)) AS initial_asymptomatic_mild,
    SUM(IF(hv.initial_visit_date BETWEEN @startDate AND @endDate AND COALESCE(piv.initiation_reason, 'UNKNOWN') = 'UNKNOWN', 1, 0)) AS initial_unknown_reason,

    SUM(IF(hv.initial_visit_date <= @endDate AND piv.initiation_reason = 'SEVERE', 1, 0)) AS cummulative_pres_sev_hiv,
    SUM(IF(hv.initial_visit_date <= @endDate AND piv.initiation_reason = 'INFANT', 1, 0)) AS cummulative_infants_less_12_mths,
    SUM(IF(hv.initial_visit_date <= @endDate AND piv.initiation_reason = 'CHILD', 1, 0)) AS cummulative_children_12_59_mths,
    SUM(IF(hv.initial_visit_date <= @endDate AND piv.initiation_reason = 'PREG', 1, 0)) AS cummulative_preg,
    SUM(IF(hv.initial_visit_date <= @endDate AND piv.initiation_reason = 'BF', 1, 0)) AS cummulative_bf,
    SUM(IF(hv.initial_visit_date <= @endDate AND piv.initiation_reason = 'CD4', 1, 0)) AS cummulative_cd4_below_threshold,
    SUM(IF(hv.initial_visit_date <= @endDate AND piv.initiation_reason = 'STAGE3', 1, 0)) AS cummulative_who_stage_3,
    SUM(IF(hv.initial_visit_date <= @endDate AND piv.initiation_reason = 'STAGE4', 1, 0)) AS cummulativel_who_stage_4,
    SUM(IF(hv.initial_visit_date <= @endDate AND piv.initiation_reason = 'ASYMPTOMATIC', 1, 0)) AS cummulative_asymptomatic_mild,
    SUM(IF(hv.initial_visit_date <= @endDate AND COALESCE(piv.initiation_reason, 'UNKNOWN') = 'UNKNOWN', 1, 0)) AS cummulative_unknown_reason,


    #Tb conditions at initiation
    SUM(IF(hv.initial_visit_date BETWEEN @startDate AND @endDate AND
    (piv.tb_treatment_start_date IS NULL OR DATEDIFF(hv.initial_visit_date, piv.tb_treatment_start_date) > 730), 1, 0)
    ) AS initial_never_tb_or_over_2yrs_ago,
    SUM(IF(hv.initial_visit_date <= @endDate AND
    (piv.tb_treatment_start_date IS NULL OR DATEDIFF(hv.initial_visit_date, piv.tb_treatment_start_date) > 730), 1, 0)
    ) AS cummulative_never_tb_or_over_2yrs_ago,
    SUM(IF(hv.initial_visit_date BETWEEN @startDate AND @endDate AND
    (piv.tb_treatment_start_date IS NOT NULL AND DATEDIFF(hv.initial_visit_date, piv.tb_treatment_start_date) <= 730), 1, 0)
    ) AS initial_tb_within_last_2yrs,
    SUM(IF(hv.initial_visit_date <= @endDate AND
    (piv.tb_treatment_start_date IS NOT NULL AND DATEDIFF(hv.initial_visit_date, piv.tb_treatment_start_date) <= 730), 1, 0)
    ) AS cummulative_tb_within_last_2yrs,
    SUM(IF(piv.tb_status_initial = 'Currently in treatment' AND hv.initial_visit_date BETWEEN @startDate AND @endDate, 1, 0)) AS initial_current_episode_tb,
    SUM(IF(piv.tb_status_initial = 'Currently in treatment' AND hv.initial_visit_date <= @endDate, 1, 0)) AS cummulative_current_episode_tb,


    #ks
    SUM(IF(piv.ks_side_effects_worsening_on_arvs = 'True' AND hv.initial_visit_date BETWEEN @startDate AND @endDate, 1, 0)) AS ks_initiation,
    SUM(IF(piv.ks_side_effects_worsening_on_arvs = 'True' AND hv.initial_visit_date <= @endDate, 1, 0)) AS ks_cummulative,

    -- Outcomes (tx_curr + stopped + defaulted + transfer_out + died_total = cummulative_ever_total_registered)
    SUM(IF(state = 'On antiretrovirals' AND FLOOR(DATEDIFF(@endDate, last_appt_date)) <= @defaultCutOff, 1, 0)) AS tx_curr,
    SUM(state = 'treatment Stopped') AS stopped,
    SUM(state = 'Patient defaulted'
    OR (state = 'On antiretrovirals' AND (last_appt_date IS NULL OR FLOOR(DATEDIFF(@endDate, last_appt_date)) > @defaultCutOff))) AS defaulted,
    SUM(state = 'patient transferred out') AS transfer_out,
    SUM(state = 'patient died') AS died_total,
    SUM(IF(state = 'patient died' AND DATEDIFF(start_date, hv.initial_visit_date) <= 30, 1, 0)) AS died_month_1,
    SUM(IF(state = 'patient died' AND DATEDIFF(start_date, hv.initial_visit_date) BETWEEN 31 AND 60, 1, 0)) AS died_month_2,
    SUM(IF(state = 'patient died' AND DATEDIFF(start_date, hv.initial_visit_date) BETWEEN 61 AND 90, 1, 0)) AS died_month_3,
    SUM(IF(state = 'patient died' AND DATEDIFF(start_date, hv.initial_visit_date) > 90, 1, 0)) AS died_after_month_3,
    SUM(IF(state IN ('treatment Stopped', 'patient died', 'patient transferred out', 'Patient defaulted')
    OR (state = 'On antiretrovirals' AND (last_appt_date IS NULL OR FLOOR(DATEDIFF(@endDate, last_appt_date)) > @defaultCutOff)), 1, 0)) AS total_adv_outcomes,

    #ART regimens
/* ADULT (A) REGIMENS */
    SUM(IF(state='On antiretrovirals' AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='0A: ABC/3TC + NVP', 1, 0)) AS '0A',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='2A: AZT / 3TC / NVP (previous AZT)', 1, 0)) AS '2A',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='4A: AZT / 3TC + EFV (previous AZTEFV)', 1, 0)) AS '4A',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='5A: TDF / 3TC / EFV', 1, 0)) AS '5A',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='6A: TDF / 3TC + NVP', 1, 0)) AS '6A',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='7A: TDF / 3TC + ATV/r', 1, 0)) AS '7A',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='8A: AZT / 3TC + ATV/r', 1, 0)) AS '8A',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='9A: ABC / 3TC + LPV/r', 1, 0)) AS '9A',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='10A: TDF / 3TC + LPV/r', 1, 0)) AS '10A',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='11A: AZT / 3TC + LPV', 1, 0)) AS '11A',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='12A: DRV + r + DTG', 1, 0)) AS '12A',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='13A: TDF / 3TC / DTG', 1, 0)) AS '13A',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='14A: AZT / 3TC + DTG', 1, 0)) AS '14A',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='15A: ABC / 3TC + DTG', 1, 0)) AS '15A',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='16A: ABC / 3TC + RAL', 1, 0)) AS '16A',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='17A: ABC / 3TC + EFV', 1, 0)) AS '17A',

    /* PAEDIATRIC (P) REGIMENS */

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='0P: ABC/3TC + NVP', 1, 0)) AS '0P',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='2P: AZT / 3TC / NVP', 1, 0)) AS '2P',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen="4PP: AZT 60 / 3TC 30 + EFV 200", 1, 0)) AS '4PP',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen="4PA: AZT 300 / 3TC 150 + EFV 200", 1, 0)) AS '4PA',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='9PP: ABC 120 / 3TC 60 + LPV/r 100/25', 1, 0)) AS '9PP',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='9PA: ABC 600 / 3TC 300 + LPV/r 100/25', 1, 0)) AS '9PA',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen="11PP: AZT 60 / 3TC 30 + LPV/r 100/25", 1, 0)) AS '11PP',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen="11PA: AZT 300 / 3TC 150 + LPV/r 100/25", 1, 0)) AS '11PA',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen="12PP: DRV 150 + r 50 + DTG 10 (± NRTIs)", 1, 0)) AS '12PP',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen="12PA: DRV 150 + r 50 + DTG 50", 1, 0)) AS '12PA',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen="14PP: AZT 60 / 3TC 30 + DTG 10", 1, 0)) AS '14PP',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen="14PA: AZT 60 / 3TC 30 + DTG 50", 1, 0)) AS '14PA',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='15P: ABC / 3TC + DTG', 1, 0)) AS '15P',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen='15PP: ABC / 3TC + DTG', 1, 0)) AS '15PP',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen="15PA: ABC 120 / 3TC 60 + DTG 50", 1, 0)) AS '15PA',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen="16P: ABC / 3TC + RAL", 1, 0)) AS '16P',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen="17PP: ABC 120 / 3TC 60 + EFV 200", 1, 0)) AS '17PP',

    SUM(IF(state='On antiretrovirals'
    AND FLOOR(DATEDIFF(@endDate,last_appt_date)) <= @defaultCutOff
    AND current_regimen="17PA: ABC 600 / 3TC 300 + EFV 200", 1, 0)) AS '17PA',


    -- Any regimen not listed above (including 'Non standard' and blank), so the regimen columns add up to tx_curr
    SUM(IF(state = 'On antiretrovirals' AND FLOOR(DATEDIFF(@endDate, last_appt_date)) <= @defaultCutOff
    AND (current_regimen IS NULL OR current_regimen NOT IN (
    "0A: ABC/3TC + NVP",
    "2A: AZT / 3TC / NVP (previous AZT)",
    "4A: AZT / 3TC + EFV (previous AZTEFV)",
    "5A: TDF / 3TC / EFV",
    "6A: TDF / 3TC + NVP",
    "7A: TDF / 3TC + ATV/r",
    "8A: AZT / 3TC + ATV/r",
    "9A: ABC / 3TC + LPV/r",
    "10A: TDF / 3TC + LPV/r",
    "11A: AZT / 3TC + LPV",
    "12A: DRV + r + DTG",
    "13A: TDF / 3TC / DTG",
    "14A: AZT / 3TC + DTG",
    "15A: ABC / 3TC + DTG",
    "16A: ABC / 3TC + RAL",
    "17A: ABC / 3TC + EFV",
    "0P: ABC/3TC + NVP",
    "2P: AZT / 3TC / NVP",
    "4PP: AZT 60 / 3TC 30 + EFV 200",
    "4PA: AZT 300 / 3TC 150 + EFV 200",
    "9PP: ABC 120 / 3TC 60 + LPV/r 100/25",
    "9PA: ABC 600 / 3TC 300 + LPV/r 100/25",
    "11PP: AZT 60 / 3TC 30 + LPV/r 100/25",
    "11PA: AZT 300 / 3TC 150 + LPV/r 100/25",
    "12PP: DRV 150 + r 50 + DTG 10 (± NRTIs)",
    "12PA: DRV 150 + r 50 + DTG 50",
    "14PP: AZT 60 / 3TC 30 + DTG 10",
    "14PA: AZT 60 / 3TC 30 + DTG 50",
    "15P: ABC / 3TC + DTG",
    "15PP: ABC / 3TC + DTG",
    "15PA: ABC 120 / 3TC 60 + DTG 50",
    "16P: ABC / 3TC + RAL",
    "17PP: ABC 120 / 3TC 60 + EFV 200",
    "17PA: ABC 600 / 3TC 300 + EFV 200")), 1, 0)) AS non_Standard,

    #pregnant/ breastfeeding
    SUM(IF((state = 'On antiretrovirals' AND FLOOR(DATEDIFF(@endDate, last_appt_date)) <= @defaultCutOff) AND hv.pregnant_or_lactating = 'Patient pregnant', 1, 0)) AS pregnant_Current,
    SUM(IF((state = 'On antiretrovirals' AND FLOOR(DATEDIFF(@endDate, last_appt_date)) <= @defaultCutOff) AND hv.pregnant_or_lactating = 'Currently breastfeeding child', 1, 0)) AS breastfeeding_Current,
    SUM(IF((state = 'On antiretrovirals' AND FLOOR(DATEDIFF(@endDate, last_appt_date)) <= @defaultCutOff) AND (hv.pregnant_or_lactating NOT IN ('Patient pregnant', 'Currently breastfeeding child') OR hv.pregnant_or_lactating IS NULL), 1, 0)) AS all_other_Current,


    #current tb_status
    SUM(IF(state = 'On antiretrovirals' AND FLOOR(DATEDIFF(@endDate, last_appt_date)) <= @defaultCutOff AND hv.tb_status = 'TB NOT suspected', 1, 0)) AS tb_not_suspected,
    SUM(IF(state = 'On antiretrovirals' AND FLOOR(DATEDIFF(@endDate, last_appt_date)) <= @defaultCutOff AND hv.tb_status = 'TB suspected', 1, 0)) AS tb_suspected,
    SUM(IF(state = 'On antiretrovirals' AND FLOOR(DATEDIFF(@endDate, last_appt_date)) <= @defaultCutOff AND hv.tb_status = 'Confirmed TB NOT on treatment', 1, 0)) AS tb_confirmed_not_rx,
    SUM(IF(state = 'On antiretrovirals' AND FLOOR(DATEDIFF(@endDate, last_appt_date)) <= @defaultCutOff AND hv.tb_status = 'Confirmed TB on treatment', 1, 0)) AS tb_confirmed_rx,
    SUM(IF(state = 'On antiretrovirals' AND FLOOR(DATEDIFF(@endDate, last_appt_date)) <= @defaultCutOff AND (hv.tb_status NOT IN ('TB NOT suspected', 'TB suspected', 'Confirmed TB NOT on treatment', 'Confirmed TB on treatment') OR hv.tb_status IS NULL), 1, 0)) AS tb_unknown,

    #side effects
    SUM(CASE WHEN (state = 'On antiretrovirals' AND FLOOR(DATEDIFF(@endDate, last_appt_date)) <= @defaultCutOff) AND pv.no_side_effect = 'No' THEN 1 ELSE 0 END) AS none_side_effect,
    SUM(CASE WHEN (state = 'On antiretrovirals' AND FLOOR(DATEDIFF(@endDate, last_appt_date)) <= @defaultCutOff) AND (pv.no_side_effect IS NULL OR pv.no_side_effect != 'No') AND (pv.peripheral_neuropathy_side_effect IS NOT NULL OR
    pv.hepatitis_side_effect IS NOT NULL OR pv.skin_rash_side_effect IS NOT NULL OR pv.lipodystrophy_side_effect IS NOT NULL OR pv.other_side_effect IS NOT NULL) THEN 1 ELSE 0 END) AS any_side_effect,
    SUM(CASE WHEN (state = 'On antiretrovirals' AND FLOOR(DATEDIFF(@endDate, last_appt_date)) <= @defaultCutOff) AND (pv.no_side_effect IS NULL OR pv.no_side_effect != 'No')
    AND pv.peripheral_neuropathy_side_effect IS NULL AND pv.hepatitis_side_effect IS NULL AND pv.skin_rash_side_effect IS NULL AND pv.lipodystrophy_side_effect IS NULL AND pv.other_side_effect IS NULL THEN 1 ELSE 0 END) AS unknown_side_effect,

    #adherence
    SUM(CASE WHEN state = 'On antiretrovirals' AND FLOOR(DATEDIFF(@endDate, last_appt_date)) <= @defaultCutOff AND pv.doses_missed >= 0 AND pv.doses_missed < 4 THEN 1 ELSE 0 END) AS 0_3_missed_dose,
    SUM(CASE WHEN state = 'On antiretrovirals' AND FLOOR(DATEDIFF(@endDate, last_appt_date)) <= @defaultCutOff AND pv.doses_missed >= 4 THEN 1 ELSE 0 END) AS 4_plus_missed_dose,
    SUM(CASE WHEN state = 'On antiretrovirals' AND FLOOR(DATEDIFF(@endDate, last_appt_date)) <= @defaultCutOff AND (pv.doses_missed IS NULL OR pv.doses_missed < 0) THEN 1 ELSE 0 END) AS unknown_missed_dose,

/* New Starts on 3HP: first TPT in the quarter with no TPT before the quarter */
    SUM(IF(hv.previous_ipt_date IS NULL
    AND ((hv.first_inh_300 IS NOT NULL AND hv.first_rfp_150 IS NOT NULL) OR hv.first_rfp_inh IS NOT NULL), 1, 0)) AS new_start_three_hp,

/* New Starts on 6H: first TPT in the quarter with no TPT before the quarter */
    SUM(IF(hv.previous_ipt_date IS NULL
    AND hv.first_inh_300 IS NOT NULL AND hv.first_rfp_150 IS NULL AND hv.first_rfp_inh IS NULL, 1, 0)) AS new_start_six_h,

    #cpt/ipt
    #pifp currently not available

/*bp screen */
    SUM(IF(hv.followup_visit_date BETWEEN @startDate AND @endDate AND hv.systolic_bp > 0 AND hv.diastolic_bp > 0, 1, 0)) AS screened_for_htn

    FROM hiv_cohort hv
    LEFT JOIN mw_patient mp ON mp.patient_id = hv.patient_id
    -- last ART followup visit (one row per patient)
    LEFT JOIN (
    SELECT map.patient_id, map.doses_missed, map.peripheral_neuropathy_side_effect, map.hepatitis_side_effect,
    map.skin_rash_side_effect, map.lipodystrophy_side_effect, map.other_side_effect, map.no_side_effect
    FROM mw_art_followup map
    JOIN (
    SELECT f.patient_id, MAX(f.art_followup_visit_id) AS art_followup_visit_id
    FROM mw_art_followup f
    JOIN (
    SELECT patient_id, MAX(visit_date) AS visit_date FROM mw_art_followup WHERE visit_date <= @endDate GROUP BY patient_id
    ) l ON l.patient_id = f.patient_id AND l.visit_date = f.visit_date
    GROUP BY f.patient_id
    ) map1 ON map1.art_followup_visit_id = map.art_followup_visit_id
    ) pv ON pv.patient_id = hv.patient_id
    -- last ART initial visit (one row per patient) with mutually exclusive reason for starting
    LEFT JOIN (
    SELECT mar.patient_id, mar.ks_side_effects_worsening_on_arvs, mar.tb_status AS tb_status_initial, mar.tb_treatment_start_date,
    IF(mar.ever_taken_arvs = 'Yes' OR (mar.ever_taken_arvs IS NULL AND mar.last_arvs_taken IS NOT NULL), 1, 0) AS reinitiated,
    CASE
    WHEN mar.age_at_initiation < 1 AND mar.presumed_hiv_severe_present = 'yes' THEN 'SEVERE'
    WHEN mar.age_at_initiation < 1 THEN 'INFANT'
    WHEN mar.age_at_initiation >= 1 AND mar.age_at_initiation < 5 THEN 'CHILD'
    WHEN mar.pregnant_or_lactating = 'Patient pregnant' THEN 'PREG'
    WHEN mar.pregnant_or_lactating = 'Currently breastfeeding child' THEN 'BF'
    WHEN mar.cd4_count < 200 THEN 'CD4'
    WHEN mar.clinical_stage LIKE '%stage III%' THEN 'STAGE3'
    WHEN mar.clinical_stage LIKE '%stage IV%' THEN 'STAGE4'
    WHEN mar.who_clinical_conditions LIKE 'As%'
    OR mar.clinical_stage IN ('Stage I','Stage II') THEN 'ASYMPTOMATIC'
    ELSE 'UNKNOWN'
    END AS initiation_reason
    FROM mw_art_initial mar
    JOIN (
    SELECT i.patient_id, MAX(i.art_initial_visit_id) AS art_initial_visit_id
    FROM mw_art_initial i
    JOIN (
    SELECT patient_id, MAX(visit_date) AS visit_date FROM mw_art_initial WHERE visit_date <= @endDate GROUP BY patient_id
    ) l ON l.patient_id = i.patient_id AND l.visit_date = i.visit_date
    GROUP BY i.patient_id
    ) mar1 ON mar1.art_initial_visit_id = mar.art_initial_visit_id
    ) piv ON piv.patient_id = hv.patient_id
    ) art;