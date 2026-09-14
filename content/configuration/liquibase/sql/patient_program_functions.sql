-- noinspection SqlDialectInspectionForFile

-- You should uncomment this line to check syntax in IDE.  Liquibase handles this internally.
-- DELIMITER #

#
DROP FUNCTION IF EXISTS latest_state_in_workflow;
#
CREATE FUNCTION latest_state_in_workflow(_patient_program_id int, _program_workflow_id int, _location_id int, _onOrBefore date)
    RETURNS int
    DETERMINISTIC
BEGIN
    DECLARE ret int;

    select ps.patient_state_id into ret
    from patient_state ps
    inner join program_workflow_state pws on ps.state = pws.program_workflow_state_id and program_workflow_id =_program_workflow_id
    inner join patient_program pp on pp.voided = 0 and pp.patient_program_id = ps.patient_program_id
    where ps.patient_program_id = _patient_program_id
      and (ps.end_date is null or ps.end_date = pp.date_completed )
      and (_onOrBefore is null or ps.start_date <= _onOrBefore)
      and (_location_id is null or pp.location_id = _location_id)
      and ps.voided = 0
    order by ps.start_date desc limit 1;

    RETURN ret;
END
#

#
DROP FUNCTION IF EXISTS program_name;
#
CREATE FUNCTION program_name(_program_id int)
    RETURNS varchar(255)
    DETERMINISTIC
BEGIN
    DECLARE ret varchar(255);

    select name into ret from program where program_id = _program_id;

    RETURN ret;
END
#

#
DROP FUNCTION IF EXISTS patient_program_name;
#
CREATE FUNCTION patient_program_name(_patient_program_id int)
    RETURNS varchar(255)
    DETERMINISTIC
BEGIN
    DECLARE ret varchar(255);

    select program_name(program_id) into ret from patient_program where patient_program_id = _patient_program_id;

    RETURN ret;
END
#

#
DROP FUNCTION IF EXISTS workflow_name;
#
CREATE FUNCTION workflow_name(_program_workflow_id int)
    RETURNS varchar(255)
    DETERMINISTIC
BEGIN
    DECLARE ret varchar(255);

    select concept_name(concept_id) into ret from program_workflow where program_workflow_id = _program_workflow_id;

    RETURN ret;
END
#

#
DROP FUNCTION IF EXISTS state_name;
#
CREATE FUNCTION state_name(_program_workflow_state_id int)
    RETURNS varchar(255)
    DETERMINISTIC
BEGIN
    DECLARE ret varchar(255);

    select concept_name(concept_id) into ret from program_workflow_state where program_workflow_state_id = _program_workflow_state_id;

    RETURN ret;
END
#

#
DROP FUNCTION IF EXISTS patient_state_name;
#
CREATE FUNCTION patient_state_name(_patient_state_id int)
    RETURNS varchar(255)
    DETERMINISTIC
BEGIN
    DECLARE ret varchar(255);

    select state_name(state) into ret from patient_state ps where ps.patient_state_id = _patient_state_id;

    RETURN ret;
END
#
