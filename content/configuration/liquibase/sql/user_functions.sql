-- noinspection SqlDialectInspectionForFile

-- You should uncomment this line to check syntax in IDE.  Liquibase handles this internally.
-- DELIMITER #

/*
 get user property value
*/
#
DROP FUNCTION IF EXISTS user_property_value;
#
CREATE FUNCTION user_property_value(
    _userId int,
    _property varchar(1000),
    _defaultValue text
)
    RETURNS text
    DETERMINISTIC
BEGIN
    DECLARE val text;
    SELECT property_value into val FROM user_property where user_id = _userId and property = _property;
    SELECT if(val is null || val = '', _defaultValue, val) into val;
    return val;
END
#

-- The following function accepts user_id and returns the username or system_id if username is null
#
DROP FUNCTION IF EXISTS username;
#
CREATE FUNCTION username(
    _user_id INT
)
    RETURNS VARCHAR(50)
    DETERMINISTIC

BEGIN
    DECLARE ret VARCHAR(50);
    SELECT IFNULL(username, system_id) into ret from users where user_id = _user_id;
    RETURN ret;
END
#

-- This function accepts a user_id and returns the most recent login date
DROP FUNCTION IF EXISTS user_latest_login;
#
CREATE FUNCTION user_latest_login(_user_id int(11))
    RETURNS datetime
    DETERMINISTIC
BEGIN
    DECLARE ret datetime;
    SELECT  max(event_datetime) into ret
    FROM    authentication_event_log
    WHERE   user_id = _user_id AND event_type = 'LOGIN_SUCCEEDED';
    RETURN ret;
END
#

-- This function accepts a user_id and returns the total number of logins recorded
DROP FUNCTION IF EXISTS user_num_logins;
#
CREATE FUNCTION user_num_logins(_user_id int(11))
    RETURNS int
    DETERMINISTIC
BEGIN
    DECLARE ret int;
    SELECT  count(*) into ret
    FROM    authentication_event_log
    WHERE   user_id = _user_id AND event_type = 'LOGIN_SUCCEEDED';
    RETURN ret;
END
#
