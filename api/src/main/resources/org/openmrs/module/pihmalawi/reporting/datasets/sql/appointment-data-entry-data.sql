/************************************************************************

  IC3 DATA ENTRY REPORT
  Requires OpenMRS database Tables
  Expected parameters, which will be passed in via the Evaluation Context, are:

  -- set @endDate = now();
  -- set @location = 'Matandani Rural Health Center';

  Report is group in 3 parts:
  1. Get all patients who came to the facility but did not have an appointment on that day
  2. Get all patients who came to the facility and it was their appointment day
  3. Get all patients who did not come to the facility but it was their appointment day
g
*************************************************************************/

select concept_id into @appointment_concept_id from concept where uuid = '6569cbd4-977f-11e1-8993-905e29aff6c1'; -- Appointment date
SET @arv_number_name = 'ARV Number';
SET @chronic_number_name = 'Chronic Care Number';
SET @hcc_number = "HCC Number";
SET @pdc_number = "PDC Identifier";
SET @yes = 'YES';
SET @_no = 'NO';

SELECT
    *
FROM
    (SELECT DISTINCT
        (en.patient_id),
            GROUP_CONCAT(DISTINCT (pi.identifier)) AS identifiers,
            pn.given_name,
            pn.family_name,
            CASE
                WHEN TRUE THEN @yes
            END AS came_to_facility,
            CASE
                WHEN TRUE THEN @_no
            END AS was_this_appointment_day
    FROM
        encounter en
    JOIN location l ON l.location_id = en.location_id
    JOIN encounter_type ent ON ent.encounter_type_id = en.encounter_type
    JOIN patient_identifier pi ON pi.patient_id = en.patient_id
    JOIN patient_identifier_type pit ON pi.identifier_type = pit.patient_identifier_type_id
    JOIN person_name pn ON pn.person_id = en.patient_id
    JOIN users u ON en.creator = u.user_id
    JOIN person_name pn1 ON pn1.person_id = u.person_id
    WHERE
        DATE(en.encounter_datetime) = @endDate
            AND en.location_id = @location
            AND en.voided = 0
            AND pi.location_id = @location
            AND pit.name IN (@arv_number_name, @chronic_number_name, @hcc_number,@pdc_number)
            AND en.patient_id NOT IN (SELECT
                o.person_id
            FROM
                obs o
            JOIN encounter en ON en.encounter_id = o.encounter_id
            WHERE
                o.concept_id = @appointment_concept_id
                    AND o.location_id = @location
                    AND DATE(o.value_datetime) = @endDate
                    AND o.voided = 0)
    GROUP BY en.patient_id UNION ALL SELECT DISTINCT
        (en.patient_id),
            GROUP_CONCAT(DISTINCT (pi.identifier)) AS identifiers,
            pn.given_name,
            pn.family_name,
            CASE
                WHEN TRUE THEN @yes
            END AS came_to_facility,
            CASE
                WHEN TRUE THEN @yes
            END AS was_this_appointment_day
    FROM
        encounter en
    JOIN location l ON l.location_id = en.location_id
    JOIN encounter_type ent ON ent.encounter_type_id = en.encounter_type
    JOIN patient_identifier pi ON pi.patient_id = en.patient_id
    JOIN patient_identifier_type pit ON pi.identifier_type = pit.patient_identifier_type_id
    JOIN person_name pn ON pn.person_id = en.patient_id
    JOIN users u ON en.creator = u.user_id
    JOIN person_name pn1 ON pn1.person_id = u.person_id
    WHERE
        DATE(en.encounter_datetime) = @endDate
            AND en.location_id = @location
            AND en.voided = 0
            AND pi.location_id = @location
            AND pit.name IN (@arv_number_name, @chronic_number_name, @hcc_number,@pdc_number)
            AND en.patient_id IN (SELECT
                o.person_id
            FROM
                obs o
            JOIN encounter en ON en.encounter_id = o.encounter_id
            WHERE
                o.concept_id = @appointment_concept_id
                    AND o.location_id = @location
                    AND DATE(o.value_datetime) = @endDate
                    AND o.voided = 0)
    GROUP BY en.patient_id UNION ALL SELECT DISTINCT
        (o.person_id) AS patient_id,
            GROUP_CONCAT(DISTINCT (pi.identifier)) AS identifiers,
            pn.given_name,
            pn.family_name,
            CASE
                WHEN TRUE THEN @_no
            END AS came_to_facility,
            CASE
                WHEN TRUE THEN @yes
            END AS was_this_appointment_day
    FROM
        obs o
    JOIN encounter en ON en.encounter_id = o.encounter_id
    JOIN location l ON l.location_id = o.location_id
    JOIN encounter_type ent ON ent.encounter_type_id = en.encounter_type
    JOIN patient_identifier pi ON pi.patient_id = en.patient_id
    JOIN person_name pn ON pn.person_id = en.patient_id
    JOIN patient_identifier_type pit ON pi.identifier_type = pit.patient_identifier_type_id
    WHERE
        o.concept_id = @appointment_concept_id
            AND o.location_id = @location
            AND DATE(o.value_datetime) = @endDate
            AND o.voided = 0
            AND pi.location_id = @location
            AND pit.name IN (@arv_number_name, @chronic_number_name, @hcc_number,@pdc_number)
            AND o.person_id NOT IN (SELECT
                patient_id
            FROM
                encounter
            WHERE
                DATE(encounter_datetime) = @endDate
                    AND location_id = @location
                    AND voided = 0)
    GROUP BY patient_id) sub;