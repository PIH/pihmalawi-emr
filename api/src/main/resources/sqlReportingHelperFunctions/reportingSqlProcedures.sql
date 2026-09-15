-- This file represents a set of generic procedures that can help in writing SQL reports. 
--
-- Procedures Include: 
--				Procedures: 			getAllIdentifiers
--										getEncounterDatetimeBeforeEndDate
--										getEncounterLocationBeforeEndDate
--										getDatetimeObsBeforeDate
--										getCodedObsFromEncounterBeforeDate
--										getDiagnosisBoolean
--										getDiagnosisDate
--										getEncounterDateForObs
--										getNumericObsBeforeDate
--										getCodedObsWithValuesFromEncounterBeforeDate
--										getCodedObsBeforeDate
--										getEncounterLocationForCodedObs
--										getEncounterDateForCodedObs
--										getNumericObsFromEncounterBeforeDate
--										getAppointmentDateForEncounter
--
--				Helper Procedures: 		getConceptName
--										addReportColumn

-- Procedure assumes obs_datetime is relevant last date (may not be accurate for obs groups) and
-- that internal patient identifiers are supplied by the PID in the warehouseCohortTable table.
-- SET @s=NULL; ...


-- addReportColumn(colName)
-- INPUTS: 		colName
--
-- This is a helper procedure that can be used to take the obs column from 
-- a (hardcoded) temp_obs_vector table and write it out to the report table 
-- (warehouseCohortTable) matched on warehouseCohortTable.PID = temp_obs_vector.PID. 

DROP PROCEDURE IF EXISTS addReportColumn;

#

CREATE PROCEDURE addReportColumn(IN colName VARCHAR(50))
BEGIN

	SET @s=CONCAT('UPDATE warehouseCohortTable tc, temp_obs_vector tt SET tc.',colName,' = tt.obs WHERE tc.PID = tt.PID;');
	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;
	SET @s = NULL;

END

#

-- getConceptName(concept_id)
-- INPUTS: 		colName
--
-- This is a helper function that returns the concept name for a given concept id. 

DROP FUNCTION IF EXISTS getConceptName;

#

CREATE FUNCTION `getConceptName`(concept_id INT) RETURNS varchar(255) CHARSET utf8
    DETERMINISTIC
BEGIN

	DECLARE conceptName VARCHAR(255);
	select cn.name into conceptName
        from concept c, concept_name cn
        where c.concept_id=cn.concept_id
            and c.concept_id = concept_id and cn.voided=0
            and cn.locale='en'
            and cn.concept_name_type = 'FULLY_SPECIFIED' limit 1;

RETURN conceptName;
END

#

-- getAllIdentifiers(endDate, idTypes, colName)
-- INPUTS: 		endDate - end Date of report
--				colName - column to write data to
--				idTypes - string list of id types to consider (e.g., '1,2,3')
-- Procedure gets a list of all identifiers before end date and writes this list to report
-- table (one per patient) as a string. 
-- Procedure assumes date_created is relevant last date and that internal patient identifiers 
-- are supplied by the PID in the warehouseCohortTable table. Procedure gets IDs that were created before
-- end date. 

DROP PROCEDURE IF EXISTS getAllIdentifiers;

#

CREATE PROCEDURE getAllIdentifiers(IN endDate DATE, IN idTypes VARCHAR(50), IN colName VARCHAR(100))
BEGIN

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		obs VARCHAR(100) default NULL 
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);
	
	SET @s=CONCAT('insert into temp_obs_vector
					(PID, obs)
					select  PID, 
							group_concat(pi.identifier separator \', \') as id_string
					from warehouseCohortTable tc
					left join (select patient_id, identifier 
								from patient_identifier 
								where identifier_type in (', idTypes,
								') and date_created <= \'', endDate, 
								'\' and voided = 0) pi
					on tc.PID = pi.patient_id
					group by PID;');
				
	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

	SET @s = NULL;

	CALL addReportColumn(colName);

END

#

-- getEncounterDatetimeBeforeEndDate(encounterTypes, endDate, firstLast, colName)
-- INPUTS: 		encounterTypes - string of encounter types to consider (e.g., '1,2,3')
--				endDate - end date of report
--				colName - column to write data to
--				firstLast - either 'first' or 'last' to specify first/last encounter
-- Procedure gets the last encounter for given encounter types before end date and writes this 
-- list to report table (one per patient). 

DROP PROCEDURE IF EXISTS getEncounterDatetimeBeforeEndDate;

#

CREATE PROCEDURE getEncounterDatetimeBeforeEndDate(IN encounterTypes VARCHAR(256), IN endDate DATE, IN firstLast VARCHAR(50), IN colName VARCHAR(100))
BEGIN

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		obs DATE default NULL 
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	IF firstLast = 'first' THEN
		       set @upDown = 'asc';
	ELSEIF firstLast = 'last' THEN
	       set @upDown = 'desc';
	ELSE select 'Must specify first/last encounter in getEncounterDatetimeBeforeEndDate!';
	END IF;


	SET @s=CONCAT('insert into temp_obs_vector
					(PID, obs)
					select PID, encounter_datetime 
					from warehouseCohortTable tc
					left join (select * from 
								(select patient_id, encounter_datetime 
								from encounter e
								where encounter_type in (', encounterTypes,
								') and encounter_datetime <= \'', endDate, 
								'\' and voided = 0
								order by encounter_datetime ', @upDown,') ei
					group by patient_id) e
					on tc.PID = e.patient_id;');
				
	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

	SET @s = NULL;
	SET @upDown = NULL;

	CALL addReportColumn(colName);

END

#

-- getEncounterLocationBeforeEndDate(encounterTypes, endDate, firstLast, colName)
-- INPUTS: 		encounterTypes - string of encounter types to consider (e.g., '1,2,3')
--				endDate - end date of report
--				colName - column to write data to
--				firstLast - either 'first' or 'last' to specify first/last encounter
-- Procedure gets the last encounter location for given encounter types before end date and writes this 
-- list to report table (one per patient). 
-- Procedure assumes date_created is relevant last date and that internal patient identifiers 
-- are supplied by the PID in the warehouseCohortTable table. Procedure gets IDs that were created before
-- end date. 

DROP PROCEDURE IF EXISTS getEncounterLocationBeforeEndDate;

#

CREATE PROCEDURE getEncounterLocationBeforeEndDate(IN encounterTypes VARCHAR(256), IN endDate DATE, IN firstLast VARCHAR(50), IN colName VARCHAR(100))
BEGIN

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		obs VARCHAR(50) default NULL 
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	IF firstLast = 'first' THEN
		       set @upDown = 'asc';
	ELSEIF firstLast = 'last' THEN
	       set @upDown = 'desc';
	ELSE select 'Must specify first/last encounter in getEncounterDatetimeBeforeEndDate!';
	END IF;


	SET @s=CONCAT('insert into temp_obs_vector
					(PID, obs)
					select PID, name 
					from warehouseCohortTable tc
					left join (select * from 
								(select patient_id, l.name 
								from encounter e
								join location l on l.location_id = e.location_id
								where encounter_type in (', encounterTypes,
								') and encounter_datetime <= \'', endDate, 
								'\' and voided = 0
								order by encounter_datetime ', @upDown,') ei
					group by patient_id) e
					on tc.PID = e.patient_id;');
				
	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

	SET @s = NULL;
	SET @upDown = NULL;

	CALL addReportColumn(colName);

END

#

-- getDatetimeObsBeforeDate(cid, endDate, firstLast, colName)
-- INPUTS: 		cid - observation concept id
--				endDate - end Date of report
-- 				colName - column to write to in reporting table
--				firstLast - either 'first' or 'last' to specify first/last encounter
-- Procedure gets last datetime obs for concept id before (or on) end date and writes observation to  
-- report table for cohort (one per patient).
-- Procedure assumes obs_datetime is relevant last date (may not be accurate for obs groups) and
-- that internal patient identifiers are supplied by the PID in the warehouseCohortTable table.

DROP PROCEDURE IF EXISTS getDatetimeObsBeforeDate;

#

CREATE PROCEDURE getDatetimeObsBeforeDate(IN cid INT, IN endDate DATE, IN firstLast VARCHAR(50), IN colName VARCHAR(100))
BEGIN

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		obs DATE
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	IF firstLast = 'first' THEN
		       set @upDown = 'asc';
	ELSEIF firstLast = 'last' THEN
	       set @upDown = 'desc';
	ELSE select 'Must specify first/last encounter in getDatetimeObsBeforeDate!';
	END IF;

	SET @s=CONCAT('insert into temp_obs_vector
							(PID, obs)
					select  PID, value_datetime
					from warehouseCohortTable tt
					left join (select * from 
								(select * from obs 
								where concept_id = ', CONCAT(cid),
								' and obs_datetime <= \'', endDate,
								'\' and voided = 0 
								order by obs_datetime ', @upDown, 
								') oi group by person_id) o 
					on o.person_id = tt.PID;');
	
	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

	SET @s = NULL;

	CALL addReportColumn(colName);

END

#


-- getCodedObsFromEncounterBeforeDate(cid, eids, endDate, firstLast, colName)
-- INPUTS: 		cid - observation concept id
--				eids - string list of encounter ids to consider (e.g., '1,2,3...')
--				endDate - end Date of report
-- 				colName - column to write to in reporting table
--				firstLast - either 'first' or 'last' to specify first/last encounter
-- Procedure gets coded obs value (and converts to a string name) for concept id from 
-- the last encounter from a given encounter type before (or on) the report end date and 
-- writes observation to report table for cohort (one per patient).
-- Procedure only looks in the last encounter and will return NULL if obs was not made at last 
-- encounter.

DROP PROCEDURE IF EXISTS getCodedObsFromEncounterBeforeDate;

#

CREATE PROCEDURE getCodedObsFromEncounterBeforeDate(IN cid INT, IN eids VARCHAR(50), IN endDate DATE, IN firstLast VARCHAR(50), IN colName VARCHAR(100))
BEGIN

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		obs VARCHAR(255)
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	IF firstLast = 'first' THEN
		       set @upDown = 'asc';
	ELSEIF firstLast = 'last' THEN
	       set @upDown = 'desc';
	ELSE select 'Must specify first/last encounter in getCodedObsFromEncounterBeforeDate!';
	END IF;


	set @s=CONCAT('insert into temp_obs_vector
						(PID, obs)
					select  PID, getConceptName(value_coded)
					from warehouseCohortTable tt
					left join (select * from 
								(select * from encounter 
								where encounter_type in (', eids,
								') and encounter_datetime <= \'', endDate,
								'\' and voided = 0 
								order by encounter_datetime ', @upDown, 
								') oi 
							group by patient_id) e on e.patient_id = tt.PID
					left join (select * 
								from obs 
								where concept_id = ', CONCAT(cid),
								' and voided = 0) o on o.encounter_id = e.encounter_id;');
	
	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

	SET @s = NULL;
	SET @upDown = NULL;	

	CALL addReportColumn(colName);

END

#

-- getDiagnosisDate(dxQuestion, dxConcepts, dxDateConcept, endDate, colName)
-- INPUTS: 		dxQuestion - diagnosis question concept id
--				dxConcepts - string list of diagnosis answers to consider (e.g., '1,2,3...')
--				dxDateConcept - diagnosis date concept
--				endDate - end Date of report
--				firstLast - get first or last diagnosis date
-- 				colName - column to write to in reporting table
-- Procedure is intended to get the observation date from an obs group (and so may apply more
-- generally than diagnoses). The procedure finds diagnoses (coded answers) for a given diagnosis
-- type (dxQuestion) and returns the corresponding diagnosis date from the same obs group. The 
-- diagnosis dates are written out to the report table. 
-- This report currently works for one diagnosis, though the logic would need to change if there 
-- were multiple diagnosis dates for a given set of diagnoses. 

DROP PROCEDURE IF EXISTS getDiagnosisDate;

#

CREATE PROCEDURE getDiagnosisDate(IN dxQuestion INT, IN dxConcepts VARCHAR(100), IN dxDateConcept INT, IN endDate DATE, IN firstLast VARCHAR(50), IN colName VARCHAR(255))
BEGIN

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		obs DATE default NULL
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	IF firstLast = 'first' THEN
		       set @upDown = 'asc';
	ELSEIF firstLast = 'last' THEN
	       set @upDown = 'desc';
	ELSE select 'Must specify first/last encounter in getDiagnosisDate!';
	END IF;

	SET @s = CONCAT('insert into temp_obs_vector
					(PID,obs)
				select * from (					
					select od.person_id, od.value_datetime
					from (select * from obs 
							where concept_id = ', dxQuestion, 
							' and obs_group_id is NOT NULL 
							and value_coded in (', dxConcepts, ')
							and voided = 0) o
					join (select * 
							from obs 
							where concept_id = ', dxDateConcept,
							' and obs_group_id is NOT NULL 
							and value_datetime <= \'', endDate,
							'\' and voided = 0) od 
					on od.obs_group_id = o.obs_group_id
					order by value_datetime ', @upDown, ') abc 
				group by person_id;');

	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;
	SET @s = NULL;

	SET @u=CONCAT('UPDATE warehouseCohortTable tc, temp_obs_vector tt SET tc.', colName,' = tt.obs WHERE tc.PID = tt.PID;');

	PREPARE stmt2 FROM @u;
	EXECUTE stmt2;
	DEALLOCATE PREPARE stmt2;
	SET @u = NULL;

END

#

-- getDiagnosisBoolean(dxQuestion, dxConcepts, endDate, colName)
-- INPUTS: 		dxQuestion - diagnosis question concept id
--				dxConcepts - string list of diagnosis answers to consider (e.g., '1,2,3...')
--				dxDateConcept - diagnosis date concept
--				endDate - end Date of report
-- 				colName - column to write to in reporting table
-- Procedure is intended to get the existence of a value coded from an obs group (and so may apply more
-- generally than diagnoses). The procedure finds diagnoses (coded answers) for a given diagnosis
-- type (dxQuestion) and returns a checkbox if one is found. 

DROP PROCEDURE IF EXISTS getDiagnosisBoolean;

#

CREATE PROCEDURE getDiagnosisBoolean(IN dxQuestion INT, IN dxConcepts VARCHAR(100), IN endDate DATE, IN colName VARCHAR(255))
BEGIN

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		obs VARCHAR(255) default NULL
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	SET @s = CONCAT('insert into temp_obs_vector
						(PID,obs)
					select o.person_id, 
					CASE WHEN NOT ISNULL(o.value_coded) THEN \'✔\' END AS obs
					-- group_concat(getConceptName(o.value_coded) separator \',\')					
					from (select * from obs 
							where concept_id = ', dxQuestion,
							' and value_coded in (', dxConcepts,
							') and obs_datetime <= \'', endDate, '\'
							and voided = 0) o
					group by person_id;');

	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;
	SET @s = NULL;

	SET @u=CONCAT('UPDATE warehouseCohortTable tc, temp_obs_vector tt SET tc.', colName,' = tt.obs WHERE tc.PID = tt.PID;');

	PREPARE stmt2 FROM @u;
	EXECUTE stmt2;
	DEALLOCATE PREPARE stmt2;
	SET @u = NULL;

END

#

-- getDiagnosisList(dxQuestion, dxConcepts, endDate, colName)
-- INPUTS: 		dxQuestion - diagnosis question concept id
--				dxConcepts - string list of diagnosis answers to consider (e.g., '1,2,3...')
--				dxDateConcept - diagnosis date concept
--				endDate - end Date of report
-- 				colName - column to write to in reporting table
-- Procedure is gets list of coded values from an obs group (and so may apply more
-- generally than diagnoses). The procedure finds diagnoses (coded answers) for a given diagnosis
-- type (dxQuestion) and returns a checkbox if one is found. 

DROP PROCEDURE IF EXISTS getDiagnosisList;

#

CREATE PROCEDURE getDiagnosisList(IN dxQuestion INT, IN dxConcepts VARCHAR(100), IN endDate DATE, IN colName VARCHAR(255))
BEGIN

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		obs VARCHAR(255) default NULL
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	SET @s = CONCAT('insert into temp_obs_vector
						(PID,obs)
					select o.person_id, 
					group_concat(getConceptName(o.value_coded) separator \',\')	as obs
					from (select * from obs 
							where concept_id = ', dxQuestion,
							' and value_coded in (', dxConcepts,
							') and obs_datetime <= \'', endDate, '\'
							and voided = 0) o
					group by person_id;');

	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;
	SET @s = NULL;

	SET @u=CONCAT('UPDATE warehouseCohortTable tc, temp_obs_vector tt SET tc.', colName,' = tt.obs WHERE tc.PID = tt.PID;');

	PREPARE stmt2 FROM @u;
	EXECUTE stmt2;
	DEALLOCATE PREPARE stmt2;
	SET @u = NULL;

END

#

-- getEncounterDateForObs(cid, endDate, firstLast, colName)
-- INPUTS: 		cid - observation concept id
--				endDate - end Date of report
-- 				colName - temporary table to write to
--				firstLast - either 'first' or 'last' to specify first/last encounter
-- Procedure gets the first/last encounter date for a given observation. 
-- Does not currently check if there is an answer. 

DROP PROCEDURE IF EXISTS getEncounterDateForObs;

#

CREATE PROCEDURE getEncounterDateForObs(IN cid VARCHAR(255), IN endDate DATE, IN firstLast VARCHAR(50), IN colName VARCHAR(50))
BEGIN
	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		obs DATE
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	IF firstLast = 'first' THEN
		       set @upDown = 'asc';
	ELSEIF firstLast = 'last' THEN
	       set @upDown = 'desc';
	ELSE select 'Must specify first/last encounter in getEncounterDateForObs!';
	END IF;

	SET @s=CONCAT('insert into temp_obs_vector
							(PID, obs)
					select PID, encounter_datetime
					from warehouseCohortTable wc
					left join (select * from 
								(select person_id, e.encounter_datetime 
									from obs 
									join encounter e on e.encounter_id = obs.encounter_id
									where concept_id in (', CONCAT(cid),
									') and e.voided = 0
									and obs.voided = 0	
									and obs_datetime <= \'', endDate, '\'	
									order by obs_datetime ', @upDown,') oi
								group by person_id) o 
								on o.person_id = wc.PID;');
	
	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

	SET @s = NULL;
	SET @upDown = NULL;	

	CALL addReportColumn(colName);

END

#

-- getNumericObsBeforeDate(cid, endDate, firstLast, colName)
-- INPUTS: 		cid - observation concept id
--				endDate - end Date of report
-- 				colName - temporary table to write to
--				firstLast - either 'first' or 'last' to specify first/last encounter
-- Procedure gets last obs for concept id before (or on) end date and writes observation to report 
-- table for cohort (one per patient).
-- Procedure assumes obs_datetime is relevant last date (may not be accurate for obs groups) and
-- that internal patient identifiers are supplied by the PID in the warehouseCohortTable table.

DROP PROCEDURE IF EXISTS getNumericObsBeforeDate;

#

CREATE PROCEDURE getNumericObsBeforeDate(IN cid INT, IN endDate DATE, IN firstLast VARCHAR(50), IN colName VARCHAR(100))
BEGIN

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		obs DOUBLE default NULL
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	IF firstLast = 'first' THEN
		       set @upDown = 'asc';
	ELSEIF firstLast = 'last' THEN
	       set @upDown = 'desc';
	ELSE select 'Must specify first/last encounter in getNumericObsBeforeDate!';
	END IF;

	SET @s=CONCAT('insert into temp_obs_vector
							(PID, obs)
					select  PID, value_numeric
					from warehouseCohortTable tt
					left join (select * from 
								(select * from obs 
								where concept_id = ', CONCAT(cid),
								' and obs_datetime <= \'', endDate,
								'\' and voided = 0 
								order by obs_datetime ', @upDown, 
								') oi group by person_id) o 
					on o.person_id = tt.PID;');
	
	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

	SET @s = NULL;
	SET @upDown = NULL;	

	CALL addReportColumn(colName);

END

#

-- getCodedObsWithValuesFromEncounterBeforeDate(cids, eids, vcid, endDate, firstLast, colName)
-- INPUTS: 		cids - observation concept id
--				eids - string of encounter types to consider
-- 				vcid - string of coded_answer values to accept
--				endDate - end Date of report
-- 				colName - temporary table to write to
--				firstLast - either 'first' or 'last' to specify first/last encounter
-- Procedure returns the observation for a concept with a given coded answer from the first/last 
-- encounter. If the observation was not taken at the last encounter, no result is returned. 
-- Used for obs at last encounter type queries (for coded obs and a specified value).

DROP PROCEDURE IF EXISTS getCodedObsWithValuesFromEncounterBeforeDate;

#

CREATE PROCEDURE getCodedObsWithValuesFromEncounterBeforeDate(IN cids VARCHAR(255), IN eids VARCHAR(50), IN vcid VARCHAR(50), IN endDate DATE, IN firstLast VARCHAR(50), IN colName VARCHAR(100))
BEGIN

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		obs VARCHAR(255)
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	IF firstLast = 'first' THEN
		       set @upDown = 'asc';
	ELSEIF firstLast = 'last' THEN
	       set @upDown = 'desc';
	ELSE select 'Must specify first/last encounter in getCodedObsWithValuesFromEncounterBeforeDate!';
	END IF;


	set @s=CONCAT('insert into temp_obs_vector
						(PID, obs)
					select  PID, valueList
					from warehouseCohortTable tt
					left join (select * from 
								(select * from encounter 
								where encounter_datetime <= \'', endDate,
								'\' and encounter_type in (', eids,
								') and voided = 0 
								order by encounter_datetime ', @upDown,
								') oi 
							group by patient_id) e
					left join (select encounter_id, group_concat(getConceptName(value_coded) separator \', \') as valueList
								from obs 
								where concept_id in (', cids,
								') and value_coded in (', vcid,
								') and voided = 0
								group by encounter_id) o on o.encounter_id = e.encounter_id
					on e.patient_id = tt.PID;');
	
	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

	SET @s = NULL;

	CALL addReportColumn(colName);

END

#


-- getCodedObsBeforeDate(cid, endDate, firstLast, colName)
-- INPUTS: 		cid - observation concept id
--				endDate - end Date of report
-- 				colName - temporary table to write to
--				firstLast - either 'first' or 'last' to specify first/last encounter
-- Procedure gets last obs for concept id before (or on) end date and writes observation to report 
-- table for cohort (one per patient).
-- Procedure assumes obs_datetime is relevant last date (may not be accurate for obs groups) and
-- that internal patient identifiers are supplied by the PID in the warehouseCohortTable table.

DROP PROCEDURE IF EXISTS getCodedObsBeforeDate;

#

CREATE PROCEDURE getCodedObsBeforeDate(IN cid INT, IN endDate DATE, IN firstLast VARCHAR(50), IN colName VARCHAR(100))
BEGIN

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		obs VARCHAR(255)
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	IF firstLast = 'first' THEN
		       set @upDown = 'asc';
	ELSEIF firstLast = 'last' THEN
	       set @upDown = 'desc';
	ELSE select 'Must specify first/last encounter in getCodedObsBeforeDate!';
	END IF;

	SET @s=CONCAT('insert into temp_obs_vector
							(PID, obs)
					select  PID, getConceptName(value_coded)
					from warehouseCohortTable tt
					left join (select * from 
								(select * from obs 
								where concept_id = ', CONCAT(cid),
								' and obs_datetime <= \'', endDate,
								'\' and voided = 0 
								order by obs_datetime ', @upDown, 
								') oi group by person_id) o 
					on o.person_id = tt.PID;');
	
	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

	SET @s = NULL;

	CALL addReportColumn(colName);

END

#

-- getEncounterLocationForCodedObs(cid, endDate, firstLast, colName)
-- INPUTS: 		cids - observation concept id
--				vcid - string of value of coded observation to consider (e.g., '1,2,3')
--				endDate - end Date of report
-- 				colName - temporary table to write to
--				firstLast - either 'first' or 'last' to specify first/last encounter
-- Procedure gets last obs for concept id before (or on) end date and writes observation to report 
-- table for cohort (one per patient).
-- Procedure assumes obs_datetime is relevant last date (may not be accurate for obs groups) and
-- that internal patient identifiers are supplied by the PID in the warehouseCohortTable table.

DROP PROCEDURE IF EXISTS getEncounterLocationForCodedObs;

#

CREATE PROCEDURE getEncounterLocationForCodedObs(IN cids VARCHAR(255), IN vcid VARCHAR(255), IN endDate DATE, IN firstLast VARCHAR(50), IN colName VARCHAR(50))
BEGIN
	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		obs VARCHAR(50)
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	IF firstLast = 'first' THEN
		       set @upDown = 'asc';
	ELSEIF firstLast = 'last' THEN
	       set @upDown = 'desc';
	ELSE select 'Must specify first/last encounter in getEncounterLocationForCodedObs!';
	END IF;

	SET @s=CONCAT('insert into temp_obs_vector
							(PID, obs)
					select PID, name
					from warehouseCohortTable wc
					left join (select * from 
								(select person_id, name 
									from obs 
									join encounter e on e.encounter_id = obs.encounter_id
									join location l on l.location_id = e.location_id
									where concept_id in (', cids,
									') and value_coded in (', vcid,
									') and e.voided = 0
									and obs_datetime <= \'', endDate, '\'	
									and obs.voided = 0				
									order by obs_datetime ', @upDown,') oi
								group by person_id) o 
								on o.person_id = wc.PID;');

	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

	SET @s = NULL;

	CALL addReportColumn(colName);

END

#

-- getEncounterDateForCodedObs(cid, endDate, firstLast, colName)
-- INPUTS: 		cids - list of observation concept ids (e.g., '1,2,3')
-- 				vcid - string of value of coded observation to consider (e.g., '1,2,3')
--				endDate - end Date of report
-- 				colName - temporary table to write to
--				firstLast - either 'first' or 'last' to specify first/last encounter
-- Procedure gets last encounter date for concept id(s) with specific coded values before (or on) 
-- end date and writes observation to report table for cohort (one per patient).
-- Procedure assumes obs_datetime is relevant last date (may not be accurate for obs groups) and
-- that internal patient identifiers are supplied by the PID in the warehouseCohortTable table.

DROP PROCEDURE IF EXISTS getEncounterDateForCodedObs;

#

CREATE PROCEDURE getEncounterDateForCodedObs(IN cids VARCHAR(255), IN vcid VARCHAR(255), IN endDate DATE, IN firstLast VARCHAR(50), IN colName VARCHAR(50))
BEGIN
	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		obs DATE
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	IF firstLast = 'first' THEN
		       set @upDown = 'asc';
	ELSEIF firstLast = 'last' THEN
	       set @upDown = 'desc';
	ELSE select 'Must specify first/last encounter in getEncounterDateForCodedObs!';
	END IF;

	SET @s=CONCAT('insert into temp_obs_vector
							(PID, obs)
					select PID, encounter_datetime
					from warehouseCohortTable wc
					left join (select * from 
								(select person_id, e.encounter_datetime 
									from obs 
									join encounter e on e.encounter_id = obs.encounter_id
									where concept_id in (', cids,
									') and value_coded in (', vcid,
									') and e.voided = 0
									and obs_datetime <= \'', endDate, '\'	
									and obs.voided = 0				
									order by obs_datetime ', @upDown,') oi
								group by person_id) o 
								on o.person_id = wc.PID;');
	
	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

	SET @s = NULL;

	CALL addReportColumn(colName);

END

#

-- getNumericObsFromEncounterBeforeDate(cid, eids, endDate, firstLast, colName)
-- INPUTS: 		cid - observation concept id
--				eids - string list of encounter ids to consider (e.g., '1,2,3...')
--				endDate - end Date of report
-- 				colName - column to write to in reporting table
--				firstLast - either 'first' or 'last' to specify first/last encounter
-- Procedure gets numeric obs value for concept id from the last encounter
-- from a given encounter type before (or on) the report end date and 
-- writes observation to report table for cohort (one per patient).
-- Procedure only looks in the last encounter and will return NULL if obs was not made at last 
-- encounter.

DROP PROCEDURE IF EXISTS getNumericObsFromEncounterBeforeDate;

#

CREATE PROCEDURE getNumericObsFromEncounterBeforeDate(IN cid INT, IN eids VARCHAR(50), IN endDate DATE, IN firstLast VARCHAR(50), IN colName VARCHAR(100))
BEGIN

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		obs NUMERIC
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	IF firstLast = 'first' THEN
		       set @upDown = 'asc';
	ELSEIF firstLast = 'last' THEN
	       set @upDown = 'desc';
	ELSE select 'Must specify first/last encounter in getNumericObsFromEncounterBeforeDate!';
	END IF;


	set @s=CONCAT('insert into temp_obs_vector
						(PID, obs)
					select  PID, value_numeric
					from warehouseCohortTable tt
					left join (select * from 
								(select * from encounter 
								where encounter_type in (', eids,
								') and encounter_datetime <= \'', endDate,
								'\' and voided = 0 
								order by encounter_datetime ', @upDown,
								') oi 
							group by patient_id) e
					left join (select * 
								from obs 
								where concept_id = ', CONCAT(cid),
								' and voided = 0
								group by person_id) o on o.encounter_id = e.encounter_id;');
	
	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

	SET @s = NULL;

	CALL addReportColumn(colName);

END

#

-- getAppointmentDateForEncounter(encounterTypes, endDate, colName)
-- INPUTS: 		encounterTypes - encounter types to consider
--				endDate - end Date of report
-- 				colName - column to write to in reporting table
-- Procedure gets appointment date from a given encounter date for 
-- the last encounter before the end date of the report and 
-- writes the date to report table for cohort (one per patient).
-- Procedure only looks in the last encounter and will return NULL if obs was not made at last 
-- encounter.

DROP PROCEDURE IF EXISTS getAppointmentDateForEncounter;

#

CREATE PROCEDURE getAppointmentDateForEncounter(IN encounterTypes VARCHAR(256), IN endDate DATE, IN colName VARCHAR(100))
BEGIN  

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		obs DATE default NULL 
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	select concept_id into @apptDateConceptId from concept where uuid = '6569cbd4-977f-11e1-8993-905e29aff6c1'; -- Appointment date

	SET @s=CONCAT('insert into temp_obs_vector
					(PID, obs)
					select patient_id, value_datetime 
					from (select * from 
							(select * 
							from encounter 
							where encounter_type in (', encounterTypes,
							') and encounter_datetime <= \'', endDate, 
							'\' and voided = 0
							order by encounter_datetime desc) ei
							group by patient_id) e
					join (select encounter_id, value_datetime 
							from obs 
							where concept_id = @apptDateConceptId
							and voided = 0) o
							on o.encounter_id = e.encounter_id;');
				
	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

	SET @s = NULL;

	CALL addReportColumn(colName);

END

#

-- getIdentifierForProgram(programIdentifier, idType, colName)
-- INPUTS: 		programIdentifier - program ID number
--				idTypes - identifier types (string)
-- 				colName - column to write to in reporting table
--				firstLast - either 'first' or 'last' to specify first/last encounter
-- Procedure gets most recent patient identifier for a program id and identifier type
-- and writes the identifier to report table for cohort (one per patient). Uses the
-- warehouse program enrollment table for recent enrollment information (so should be
-- called after that is updated).
-- This procedure currently returns the patient ids in ascending order of identifier_type
-- which is not generic (but gives you ART number before HCC number).

DROP PROCEDURE IF EXISTS getIdentifierForProgram;

#

CREATE PROCEDURE getIdentifierForProgram(IN programIdentifier INT, IN idTypes VARCHAR(50), IN endDate DATE, IN colName VARCHAR(100))
BEGIN  

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		obs VARCHAR(100) default NULL 
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);
	
	-- temporary table to hold enrollment location information
	DROP TEMPORARY TABLE IF EXISTS lastEnrollmentLocation;

	CREATE TEMPORARY TABLE lastEnrollmentLocation as
	select *
		from (select * from (select PID, locationId, locationName 
			from warehouse_program_enrollment
			where programId = programIdentifier
			and dateEnrolled <= endDate
			order by stateStartDate desc) wpei
			group by PID) wpe;

	SET @s=CONCAT('insert into temp_obs_vector
						(PID, obs)
					select patient_id, identifier 
					from (select * from 
							(select * from 
								patient_identifier pi
								join lastEnrollmentLocation ler on ler.locationId = pi.location_id AND ler.PID = pi.patient_id
								where identifier_type in (', idTypes, 
								')
								and voided = 0
								order by identifier_type asc) piii
								group by patient_id) pii;');	

	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

	SET @s = NULL;
	DROP TEMPORARY TABLE IF EXISTS lastEnrollmentLocation;

	CALL addReportColumn(colName);

END


#
