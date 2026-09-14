-- noinspection SqlDialectInspectionForFile

-- You should uncomment this line to check syntax in IDE.  Liquibase handles this internally.
-- DELIMITER #

#
DROP FUNCTION IF EXISTS format_identifier;
#
CREATE FUNCTION format_identifier(
    _identifier varchar(255)
)
    RETURNS varchar(255)
    DETERMINISTIC

BEGIN
    DECLARE first_dash int;
    DECLARE second_dash int;
    DECLARE second_length int;

    SET _identifier = replace(upper(trim(_identifier)), ' ', '-');

    if _identifier is null or _identifier = '' then
        return null;
    else
        SET first_dash = locate('-', _identifier);
        SET second_dash = locate('-', _identifier, first_dash + 1);
        SET second_length = if(second_dash > 0, second_dash - 1, length(_identifier)) - first_dash;
        RETURN concat(
            substr(_identifier, 1, first_dash),
            lpad(substr(_identifier, first_dash+1, second_length), 4, '0'),
            if(second_length > 0, substr(_identifier, second_dash), '')
        );
    end if;
END
#

#
/*
    return the best patient identifier of the given type.
    This will not restrict by location, but will prefer identifiers at the given location
*/
#
DROP FUNCTION IF EXISTS patient_identifier;
#
CREATE FUNCTION patient_identifier(
    _patient_id int,
    _identifier_type int,
    _location_id int
)
    RETURNS varchar(50)
    DETERMINISTIC

BEGIN
    DECLARE ret varchar(50);

    SELECT      format_identifier(i.identifier) INTO ret
    FROM        patient_identifier i
    WHERE       i.identifier_type = _identifier_type
      AND       i.voided = 0
      AND       i.patient_id = _patient_id
      AND       i.identifier != ''
    ORDER BY    if(_location_id is null or i.location_id = _location_id, 0, 1), preferred desc, i.date_created desc limit 1;

    RETURN ret;
END
#

#
/*
    all patient identifiers of a given type
*/
#
DROP FUNCTION IF EXISTS patient_identifiers_of_type;
#
CREATE FUNCTION patient_identifiers_of_type(
    _patient_id int,
    _identifier_type int
)
    RETURNS text
    DETERMINISTIC

BEGIN
    DECLARE ret text;

    SELECT      group_concat(format_identifier(i.identifier) separator ', ') INTO ret
    FROM        patient_identifier i
    WHERE       i.identifier_type = _identifier_type
      AND       i.voided = 0
      AND       i.patient_id = _patient_id
      AND       i.identifier != ''
    ORDER BY    preferred desc, i.date_created desc;

    RETURN ret;
END
#
