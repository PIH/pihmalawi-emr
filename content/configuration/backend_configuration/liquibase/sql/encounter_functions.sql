-- noinspection SqlDialectInspectionForFile

-- You should uncomment this line to check syntax in IDE.  Liquibase handles this internally.
-- DELIMITER #

#
DROP FUNCTION IF EXISTS first_encounter_of_type;
#
CREATE FUNCTION first_encounter_of_type(_patient_id INT, _encounter_type_id INT, _onOrBefore DATE)
    RETURNS INT
    DETERMINISTIC

BEGIN
    DECLARE ret INT;

    SELECT e.encounter_id into ret
    FROM encounter e
    WHERE e.patient_id = _patient_id
      AND e.encounter_type = _encounter_type_id
      and (_onOrBefore is null or _onOrBefore >= date(e.encounter_datetime))
      AND e.voided = 0
    ORDER BY e.encounter_datetime, e.date_created, e.encounter_id
    LIMIT 1;

    RETURN ret;

END
#