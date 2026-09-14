-- noinspection SqlDialectInspectionForFile

-- You should uncomment this line to check syntax in IDE.  Liquibase handles this internally.
-- DELIMITER #

/*
 person given name
*/
#
DROP FUNCTION IF EXISTS person_given_name;
#
CREATE FUNCTION person_given_name(
    _person_id int
)
    RETURNS TEXT
    DETERMINISTIC

BEGIN
    DECLARE ret TEXT;
    select      given_name into ret
    from        person_name
    where       voided = 0
      and         person_id = _person_id
    order by    preferred desc, date_created desc
    limit       1;
    RETURN ret;

END
#

/*
 person family name
*/
#
DROP FUNCTION IF EXISTS person_family_name;
#
CREATE FUNCTION person_family_name(
    _person_id int
)
    RETURNS TEXT
    DETERMINISTIC

BEGIN
    DECLARE ret TEXT;
    select      family_name into ret
    from        person_name
    where       voided = 0
      and         person_id = _person_id
    order by    preferred desc, date_created desc
    limit       1;
    RETURN ret;
END
#

/*
 person name
*/
#
DROP FUNCTION IF EXISTS person_name;
#
CREATE FUNCTION person_name(
    _person_id int
)
    RETURNS TEXT
    DETERMINISTIC

BEGIN
    DECLARE ret TEXT;

select      concat(given_name, ' ', family_name) into ret
from        person_name
where       voided = 0
  and       person_id = _person_id
order by    preferred desc, date_created desc
    limit       1;

RETURN ret;

END
#

/*
 person phone number
*/
#
DROP FUNCTION IF EXISTS person_phone_number;
#
CREATE FUNCTION person_phone_number(
    _person_id int)

    RETURNS VARCHAR(50)
    DETERMINISTIC

BEGIN
    DECLARE  ret VARCHAR(50);

select      a.value into ret
from        person_attribute a
                inner join  person_attribute_type t on a.person_attribute_type_id = t.person_attribute_type_id
where       t.name = 'Cell Phone Number'
  and         a.voided = 0
  and         a.person_id = _person_id
order by    a.date_created desc
    limit       1;

RETURN ret;

END
#

/*
 person district is stored in state_province
*/
#
DROP FUNCTION IF EXISTS person_address_district;
#
CREATE FUNCTION person_address_district(
    _person_id int
)
    RETURNS TEXT
    DETERMINISTIC

BEGIN
    DECLARE ret TEXT;

    select state_province into ret
    from person_address where voided = 0 and person_id = _person_id order by preferred desc, date_created desc limit 1;

    RETURN ret;

END
#

/*
 person traditional authority is stored in county_district
*/
#
DROP FUNCTION IF EXISTS person_address_traditional_authority;
#
CREATE FUNCTION person_address_traditional_authority(
    _person_id int
)
    RETURNS TEXT
    DETERMINISTIC

BEGIN
    DECLARE ret TEXT;

    select county_district into ret
    from person_address where voided = 0 and person_id =  _person_id order by preferred desc, date_created desc limit 1;

    RETURN ret;

END
#

/*
 person village is stored in city_village
*/
#
DROP FUNCTION IF EXISTS person_address_village;
#
CREATE FUNCTION person_address_village(
    _person_id int
)
    RETURNS TEXT
    DETERMINISTIC

BEGIN
    DECLARE ret TEXT;

    select city_village into ret
    from person_address where voided = 0 and person_id = _person_id order by preferred desc, date_created desc limit 1;

    RETURN ret;

END
#
