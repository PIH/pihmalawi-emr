-- This file represents a set of procedures used in the IC3 Register Report. 
--
-- Procedures Include: 
--			createIc3RegisterTable
--			createIc3RegisterCohort
--			warehouseProgramEnrollment
--			updateIc3EnrollmentInfo
--			updateRecentRegimen
--			updateProgramsEnrollmentDate
--			updateFirstViralLoad
--			updateLastViralLoad
--			getLastOutcomeForProgram
--			getBloodGlucoseBeforeDate
--			getBloodPressureBeforeDate
-- 			everDefaultedByProgram


-- createIc3RegisterTable()
--
-- Procedure creates an empty table for IC3 register with columns and correct datatypes

DROP PROCEDURE IF EXISTS createIc3RegisterTable;

#

CREATE PROCEDURE createIc3RegisterTable()
BEGIN
	-- Refresh temp table
	drop table if exists warehouseCohortTable;

	-- Create Table in which to store cohort
	create table warehouseCohortTable (
	  id INT not null auto_increment primary key,
	  PID INT(11) not NULL,
	  firstName VARCHAR(255) default NULL,
	  lastName VARCHAR(255) default NULL,
	  village VARCHAR(255) default NULL,
	  ta VARCHAR(255) default NULL,
	  district VARCHAR(255) default NULL,
	  identifier VARCHAR(255) default NULL,
	  allPreArtIds VARCHAR(100) default NULL,
	  allArtIds VARCHAR(100) default NULL,
	  allCccIds VARCHAR(100) default NULL,
	  activeHivId VARCHAR(100) default NULL,
	  activeCCCId VARCHAR(100) default NULL,
	  ic3EnrollmentDate DATE,
	  ic3FirstProgramEnrolled VARCHAR(255),
	  lastNcdVisitDate DATE default NULL,
	  lastNcdVisitLocation VARCHAR(255) default NULL,
	  lastVisitDate DATE default NULL,
	  lastVisitLocation VARCHAR(255) default NULL,
	  lastHtnDmVisitDate DATE default NULL,
	  lastEpilepsyVisitDate DATE default NULL,
	  lastChronicLungVisitDate DATE default NULL,
	  lastMentalHealthVisitDate DATE default NULL,
	  birthdate DATE not NULL,
	  gender VARCHAR(255) not NULL,
	  ageAtFirstEnrollment NUMERIC,
	  age NUMERIC not NULL,
	  hivAtLeastOneNcd VARCHAR(100) default NULL,
	  atLeastTwoNcds VARCHAR(100) default NULL,
	  htnAndDm VARCHAR(100) default NULL,
	  hivAndDm VARCHAR(100) default NULL,
	  hivEnrollmentDate DATE,
	  lastHivOutcome VARCHAR(255),
	  lastHivOutcomeDate DATE, 
	  firstHivVisitDate DATE default NULL,
	  artInitialDate DATE default NULL,
	  lastHivVisitDate DATE default NULL,
	  lastHivVisitLocation VARCHAR(255) default NULL,
	  lastTbValueInHiv VARCHAR(255) default NULL,
	  lastTbDateInHiv DATE default NULL,
	  firstViralLoadDate Date,
	  firstViralLoadResult NUMERIC,
	  lastViralLoadDate Date,
	  lastViralLoadResult NUMERIC,
	  lastViralLoadWeight NUMERIC,
	  lastArtRegimenStart DATE default NULL,
	  lastArtRegimen VARCHAR(255) default NULL, 
	  ncdEnrollmentDate DATE default NULL,
	  lastNcdOutcome VARCHAR(255),
	  lastNcdOutcomeDate DATE, 
	  htnDx VARCHAR(255) default NULL,
	  firstHtnDxDate DATE default NULL,
	  firstHtnMedsDate DATE default NULL,
	  lastHtnMedsDate DATE default NULL,
	  lastHtnMedsLocation VARCHAR(255) default NULL,
	  firstBp VARCHAR(255) default NULL,
	  firstBpDate DATE default NULL,
	  lastBp VARCHAR(255) default NULL,  
	  lastBpDate DATE default NULL,
	  diuretic VARCHAR(255) default NULL,  
	  calciumChannelBlocker VARCHAR(255) default NULL,  
	  aceIInhibitor VARCHAR(255) default NULL,  
	  betaBlocker VARCHAR(255) default NULL,  
	  statin VARCHAR(255) default NULL,  
	  otherHtnMeds VARCHAR(255) default NULL,
	  firstDmDxDate DATE default NULL,
	  diabetesType VARCHAR(255) default NULL,
	  firstDmMedsDate DATE default NULL,
	  lastDmMedsDate DATE default NULL,
	  lastDmMedsLocation VARCHAR(255) default NULL,
	  firstGlucoseMonitoringDate DATE default NULL,
	  firstVisitHba1c DOUBLE default NULL,
	  firstVisitRandomBloodSugar DOUBLE default NULL, 
	  firstVisitFastingBloodSugar DOUBLE default NULL,
	  lastGlucoseMonitoringDate DATE default NULL,
	  lastVisitHba1c DOUBLE default NULL,
	  lastVisitRandomBloodSugar DOUBLE default NULL, 
	  lastVisitFastingBloodSugar DOUBLE default NULL,
	  shortActingRegularInsulin VARCHAR(255) default NULL,
	  longActingInsulin VARCHAR(255) default NULL,
	  metformin VARCHAR(255) default NULL,
	  glibenclamide VARCHAR(255) default NULL,
	  firstEpilepsyDxDate DATE default NULL,
	  epilepsyOnsetDate DATE default NULL,
	  firstEpilepsyMedsDate DATE default NULL,
	  lastEpilepsyMedsDate DATE default NULL,
	  lastEpilepsyMedsLocation VARCHAR(255) default NULL,
	  firstSeizuresDate DATE default NULL,
	  firstSeizures DOUBLE default NULL,
	  lastSeizuresDate DATE default NULL,
	  lastSeizures DOUBLE default NULL,
	  seizureTriggers VARCHAR(255) default NULL,
	  firstAsthmaDxDate DATE default NULL,
	  firstChronicLungMedsDate DATE default NULL,
	  lastChronicLungMedsDate DATE default NULL,
	  lastChronicLungMedsLocation VARCHAR(255) default NULL,
	  firstAsthmaSeverity VARCHAR(255) default NULL,
	  firstAsthmaSeverityDate DATE default NULL,
	  lastAsthmaSeverityDate DATE default NULL,
	  lastAsthmaSeverity VARCHAR(255) default NULL,
	  inhaledBAgonist VARCHAR(255) default NULL,
	  inhaledSteroid VARCHAR(255) default NULL,
	  oralSteroid VARCHAR(255) default NULL,
	  otherAsthmaMeds VARCHAR(255) default NULL,	  
	  copdDiagnosisDate DATE default NULL,
	  firstMentalHealthDxDate DATE default NULL,
	  firstMentalHealthMedsDate DATE default NULL,
	  lastMentalHealthMedsDate DATE default NULL,
	  lastMentalHealthMedsLocation VARCHAR(255) default NULL,
	  lastWeightDate DATE default NULL,
	  lastHeight DOUBLE default NULL,
	  lastWeight DOUBLE default NULL,
	  BMI DOUBLE default NULL,
	  dmDx VARCHAR(255) default NULL,
	  epilepsyDx VARCHAR(255) default NULL,
	  asthmaDx VARCHAR(255) default NULL,
	  copdDx VARCHAR(255) default NULL,
	  mentalDx VARCHAR(255) default NULL, 
	  mentalDxList VARCHAR(255) default NULL,
	  artAptDate DATE default NULL,
	  htnDmAptDate DATE default NULL,
	  epilepsyAptDate DATE default NULL,
	  mentalHealthAptDate DATE default NULL,
	  chronicLungAptDate DATE default NULL,
	  everDefaultedNcd VARCHAR(10) default NULL,
	  everDefaultedHiv VARCHAR(10) default NULL
	);
	CREATE INDEX PID_ic3_index ON warehouseCohortTable(PID);
	

END

#

-- createIc3RegisterCohort()
--
-- Procedure defines cohort and adds cohort (plus demographic data) to IC3 register table

DROP PROCEDURE IF EXISTS createIc3RegisterCohort;

#

CREATE PROCEDURE createIc3RegisterCohort(IN reportEndDate DATE)
BEGIN

	select coalesce((select program_workflow_state_id from program_workflow_state where uuid = '6687fa7c-977f-11e1-8993-905e29aff6c1'), -1) into @artOnTreatmentStateId; -- ART: On treatment
	select coalesce((select program_workflow_state_id from program_workflow_state where uuid = '6687f284-977f-11e1-8993-905e29aff6c1'), -1) into @preArtContinueStateId; -- ART: Pre-ART (Continue)
	select coalesce((select program_workflow_state_id from program_workflow_state where uuid = '66882650-977f-11e1-8993-905e29aff6c1'), -1) into @ccOnTreatmentStateId; -- Chronic Care: On treatment
	select coalesce((select program_id from program where uuid = '66850b0a-977f-11e1-8993-905e29aff6c1'), -1) into @hivProgramId; -- HIV program
	select coalesce((select program_id from program where uuid = '6685164a-977f-11e1-8993-905e29aff6c1'), -1) into @chronicCareProgramId; -- Chronic Care program
	select coalesce((select patient_identifier_type_id from patient_identifier_type where uuid = '66784d84-977f-11e1-8993-905e29aff6c1'), -1) into @arvNumberTypeId; -- ARV Number
	select coalesce((select patient_identifier_type_id from patient_identifier_type where uuid = '66786256-977f-11e1-8993-905e29aff6c1'), -1) into @hccNumberTypeId; -- HCC Number
	select coalesce((select patient_identifier_type_id from patient_identifier_type where uuid = '11a76c3e-1db8-4d16-9252-9a18b5ed1843'), -1) into @chronicCareNumberTypeId; -- Chronic Care Number

	-- Create Initial Cohort With Basic Demographic Data

	insert into warehouseCohortTable
				(PID, identifier, birthdate, gender, age, firstName, lastName, village, ta, district)
	select		pp.patient_id, 
				pi.identifier, 
				p.birthdate, 
				p.gender, 
				CASE WHEN p.dead = 1 AND reportEndDate > death_date
					THEN 
						TIMESTAMPDIFF(YEAR, birthdate, death_date)
					ELSE
						TIMESTAMPDIFF(YEAR, birthdate, reportEndDate)
				END AS age,
				given_name, family_name, 
				city_village as village, 
				county_district as ta, 
				state_province as district
	from	 	(select * from 
					(select patient_id, xps.patient_program_id 
						from patient_program ppi
						join (select *
							from patient_state where state in (@artOnTreatmentStateId,@preArtContinueStateId,@ccOnTreatmentStateId)
							and start_date < reportEndDate
							and voided = 0) xps on xps.patient_program_id = ppi.patient_program_id
						where ppi.voided = 0
						and program_id in (@hivProgramId,@chronicCareProgramId)
						and (date_enrolled <= reportEndDate or date_enrolled is NULL)
						order by date_enrolled DESC) 
					ppi group by patient_id) pp -- Most recent Program Enrollment - sub query ensures have been On ARVs, Pre-ART (continue), and CC continue
	join 		(select * from person where voided = 0) p on p.person_id = pp.patient_id -- remove voided persons
	join 		(select patient_id, identifier from 
					(select * 
					from patient_identifier
					where voided = 0
					and identifier_type in (@arvNumberTypeId,@hccNumberTypeId,@chronicCareNumberTypeId)
					order by date_created desc) pii
				group by patient_id) pi 
				on pi.patient_id = pp.patient_id -- Ensure HCC/ARV/NCD identifier
	join 		(select * from 
					(select person_id,
							given_name,
							family_name,
							CASE WHEN NOT ISNULL(date_changed) 
								THEN 
									CASE WHEN date_changed > date_created THEN date_changed ELSE date_created END
								ELSE
									date_created
							END AS lastMod
					from person_name
					where voided = 0
					order by preferred desc, lastMod desc, date_created desc) pni 
				group by person_id) pn on pn.person_id = pp.patient_id
	left join 		(select * from 
					(select person_id,
							city_village,
							county_district,
							state_province,
							CASE WHEN NOT ISNULL(date_changed) 
								THEN 
									CASE WHEN date_changed > date_created THEN date_changed ELSE date_created END
								ELSE
									date_created
							END AS lastMod
					from person_address
					where voided = 0
					order by preferred desc, lastMod desc, date_created desc) pai 
				group by person_id) pa on pa.person_id = pp.patient_id				
	order by 	pp.patient_id asc;
	

END

#

-- warehouseProgramEnrollment()
-- Creates a warehouse of program enrollment data

DROP PROCEDURE IF EXISTS warehouseProgramEnrollment;

#

CREATE PROCEDURE `warehouseProgramEnrollment`()
BEGIN

	select coalesce((select program_id from program where uuid = '66850b0a-977f-11e1-8993-905e29aff6c1'), -1) into @hivProgramId; -- HIV program
	select coalesce((select program_id from program where uuid = '6685164a-977f-11e1-8993-905e29aff6c1'), -1) into @chronicCareProgramId; -- Chronic Care program

	-- Refresh warehouse_program_enrollment
	drop table if exists warehouse_program_enrollment;

	-- Create Table in which to store patient program enrollment data
	create table warehouse_program_enrollment (
		id INT not null auto_increment primary key,
		PID INT(11) not NULL,
		programId INT(11),
		programName VARCHAR(50) default NULL,
		dateEnrolled DATETIME,
		birthdate DATE,
		ageYearsAtEnrollment TINYINT,
		locationId TINYINT,
		locationName VARCHAR(255),
		completionDate datetime,
		ageYearsAtCompletion TINYINT,
		patientState  VARCHAR(255),
		stateStartDate DATE,
		stateEndDate	DATE,
		stateDateChanged DATETIME
	);

	insert into warehouse_program_enrollment(
	PID, programId, programName,
	dateEnrolled, birthdate, ageYearsAtEnrollment, locationId, locationName,
	completionDate, ageYearsAtCompletion, patientState, stateStartDate,
	stateEndDate, stateDateChanged)
	select
				p.person_id as PID,
	            pg.program_id as programId,
				pg.name as programName,
	            pp.date_enrolled as dateEnrolled,
	            p.birthdate as birthdate,
				if (p.birthdate is null or pp.date_enrolled is null, null, TIMESTAMPDIFF(YEAR, p.birthdate, pp.date_enrolled)) as ageYearsAtEnrollment,
				pp.location_id, l.name as locationName,
				pp.date_completed as completionDate,
				if (p.birthdate is null or pp.date_enrolled is null, null, TIMESTAMPDIFF(YEAR, p.birthdate, pp.date_completed)) as ageYearsAtCompletion,
				getConceptName(pws.concept_id) as patientState,
				ps.start_date as stateStartDate,
				ps.end_date as stateEndDate,
				ps.date_changed stateDateChanged
	from        person p
	inner join  patient_program pp on p.person_id = pp.patient_id
	inner join  program pg on pp.program_id = pg.program_id
	inner  join patient_state ps on pp.patient_program_id = ps.patient_program_id
	inner  join program_workflow_state pws on ps.state=pws.program_workflow_state_id
	left outer join location l on pp.location_id = l.location_id
	where       pp.voided = 0 and p.voided = 0 and pg.program_id in (@hivProgramId, @chronicCareProgramId) -- only HIV and CC programs
				and ps.voided =0
	and			pp.date_enrolled is not null
	order by patient_id, ps.start_date ;

END

#


-- updateIc3EnrollmentInfo()
-- Procedure that calculates the first enrollment date across the IC3 programs

DROP PROCEDURE IF EXISTS updateIc3EnrollmentInfo;

#

CREATE PROCEDURE `updateIc3EnrollmentInfo`(IN endDate DATE)
BEGIN

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
		programName VARCHAR(50),
  		dateEnrolled DATE default NULL
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	insert into temp_obs_vector
		(PID, programName, dateEnrolled)
	select 	wpe.PID,
		CASE WHEN ISNULL(wpe_ncd.dateEnrolled) AND ISNULL(wpe_hiv.dateEnrolled) 
				THEN NULL
			WHEN ISNULL(wpe_ncd.dateEnrolled) 
				THEN "HIV"
			WHEN ISNULL(wpe_hiv.dateEnrolled)
				THEN "NCD"
			WHEN wpe_hiv.dateEnrolled = wpe_ncd.dateEnrolled 
				THEN "Dual" 
			WHEN wpe_hiv.dateEnrolled < wpe_ncd.dateEnrolled 
				THEN "HIV"
			WHEN wpe_hiv.dateEnrolled > wpe_ncd.dateEnrolled 
				THEN "NCD"				
		END AS programName, 
		CASE WHEN ISNULL(wpe_ncd.dateEnrolled) AND ISNULL(wpe_hiv.dateEnrolled) 
						THEN NULL
					WHEN ISNULL(wpe_ncd.dateEnrolled) 
						THEN wpe_hiv.dateEnrolled
					WHEN ISNULL(wpe_hiv.dateEnrolled)
						THEN wpe_ncd.dateEnrolled
					WHEN wpe_hiv.dateEnrolled = wpe_ncd.dateEnrolled 
						THEN wpe_ncd.dateEnrolled 
					WHEN wpe_hiv.dateEnrolled < wpe_ncd.dateEnrolled 
						THEN wpe_hiv.dateEnrolled
					WHEN wpe_hiv.dateEnrolled > wpe_ncd.dateEnrolled 
						THEN wpe_ncd.dateEnrolled				
				END AS dateEnrolled 		
		FROM warehouse_program_enrollment wpe
		LEFT JOIN (select * from (select PID, dateEnrolled
				from warehouse_program_enrollment
				where dateEnrolled < endDate
				and programName = "HIV Program"
				order by dateEnrolled asc) wpe_hivi 
				group by PID) wpe_hiv on wpe_hiv.PID = wpe.PID
		LEFT JOIN (select * from (select PID, dateEnrolled
				from warehouse_program_enrollment
				where dateEnrolled < endDate
				and programName = "CHRONIC CARE PROGRAM"
				order by dateEnrolled asc) wpe_ncdi 
				group by PID) wpe_ncd on wpe_ncd.PID = wpe.PID;

	-- update ic3 enrollment info
	UPDATE warehouseCohortTable tc, temp_obs_vector tt
	SET tc.ic3EnrollmentDate = tt.dateEnrolled, 
		tc.ic3FirstProgramEnrolled = tt.programName,
		tc.ageAtFirstEnrollment=TIMESTAMPDIFF(YEAR, tc.birthdate, tt.dateEnrolled)
	WHERE tc.PID = tt.PID ;

END

#

-- updateRecentRegimen()
-- Updates most recent regimen and regimen start date on cohort table

DROP PROCEDURE IF EXISTS updateRecentRegimen;

#

CREATE PROCEDURE updateRecentRegimen(IN endDate DATE)
BEGIN

	select coalesce((select concept_id from concept where uuid = '657ac57e-977f-11e1-8993-905e29aff6c1'), -1) into @arvReceivedConceptId; -- Malawi Antiretroviral drugs received

	DROP TEMPORARY TABLE IF EXISTS recentRegimenObs;
	create temporary table recentRegimenObs (
  		id INT not null auto_increment primary key,
  		pid INT(11) not NULL,
  		cid INT(11) not NULL,
  		recentRegimen INT(11)
	);
	CREATE INDEX PID_index ON recentRegimenObs (PID);
	
	insert into recentRegimenObs
		(pid, cid, recentRegimen)
	select pid, cid, recentRegimen
	from (select * from 
			(select person_id as pid, concept_id as cid, value_coded as recentRegimen
			from obs
			where concept_id = @arvReceivedConceptId
			and obs_datetime < endDate
			and voided = 0 
			order by obs_datetime desc) oi 
			group by oi.pid) o
	where pid in (select PID from warehouseCohortTable);

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		pid INT(11) not NULL,
  		recentRegimen VARCHAR(255) default NULL,
  		recentRegimenStart DATE default NULL
	);
	
	CREATE INDEX PID_index ON temp_obs_vector (PID);
	
	insert into temp_obs_vector 
		(pid, recentRegimen, recentRegimenStart)
	select pid, getConceptName(recentRegimen) as recentRegimen, obs_datetime as recentRegimenStart
		from (select * 
				from obs o
				join recentRegimenObs rro 
				on rro.pid = o.person_id 
				and rro.recentRegimen = o.value_coded
				where concept_id = @arvReceivedConceptId
				order by obs_datetime asc) oi
				group by oi.person_id;
	
	UPDATE warehouseCohortTable tc, temp_obs_vector tt 
	SET tc.lastArtRegimenStart = tt.recentRegimenStart
	WHERE tc.PID = tt.PID;
	
	UPDATE warehouseCohortTable tc, temp_obs_vector tt 	
	SET tc.lastArtRegimen = tt.recentRegimen 
	WHERE tc.PID = tt.PID;

END

#

-- updateProgramsEnrollmentDate()
-- Procedure that retrieves ART and NCD enrollment dates from the warehouse_program_enrollment table

DROP PROCEDURE IF EXISTS updateProgramsEnrollmentDate;

#

CREATE PROCEDURE `updateProgramsEnrollmentDate`()
BEGIN

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
		programId INT(11),
  		dateEnrolled DATE default NULL
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	select coalesce((select program_id from program where uuid = '66850b0a-977f-11e1-8993-905e29aff6c1'), -1) into @hivProgramId; -- HIV program
	select coalesce((select program_id from program where uuid = '6685164a-977f-11e1-8993-905e29aff6c1'), -1) into @chronicCareProgramId; -- Chronic Care program

	insert into temp_obs_vector(PID, programId, dateEnrolled)
		select PID, programId, Min(dateEnrolled)
		from `warehouse_program_enrollment`
		group by PID, programId;

	-- update ART enrollment date
	UPDATE warehouseCohortTable tc, temp_obs_vector tt
	SET tc.hivEnrollmentDate = tt.dateEnrolled WHERE tc.PID = tt.PID and tt.programId=@hivProgramId;

	-- update NCD enrollment date
	UPDATE warehouseCohortTable tc, temp_obs_vector tt
	SET tc.ncdEnrollmentDate = tt.dateEnrolled WHERE tc.PID = tt.PID and tt.programId=@chronicCareProgramId;

END

#

-- updateFirstViralLoad()
-- Procedure that retrieves First Viral Load for patients

DROP PROCEDURE IF EXISTS updateFirstViralLoad;

#

CREATE PROCEDURE updateFirstViralLoad(IN endDate DATE)
BEGIN

	select coalesce((select concept_id from concept where uuid = '83931c6d-0e5a-4302-b8ce-a31175b6475e'), -1) into @vlTestSetConceptId; -- Viral Load test set
	select coalesce((select concept_id from concept where uuid = '654a7694-977f-11e1-8993-905e29aff6c1'), -1) into @vlConceptId; -- HIV viral load
	select coalesce((select concept_id from concept where uuid = 'e97b36a2-16f5-11e6-b6ba-3e1d05defe78'), -1) into @vlLdlConceptId; -- Lower than Detection Limit
	select coalesce((select concept_id from concept where uuid = 'f792f2f9-9c24-4d6e-98fd-caffa8f2383f'), -1) into @vlSampleTakenConceptId; -- Sample taken for Viral Load
	select coalesce((select concept_id from concept where uuid = '655e2f90-977f-11e1-8993-905e29aff6c1'), -1) into @trueConceptId; -- True

	DROP TABLE IF EXISTS firstVL;

	CREATE TEMPORARY TABLE firstVL as
	select 		og.person_id as PID, 
				og.obs_id,
				og.obs_datetime as insert_visitDate,
			    bled.value_coded as "Bled",
			    vl.value_numeric as "Value Numeric",
			    ldl.value_coded	as "LDL",		    
			    CASE WHEN ISNULL(vl.value_numeric) THEN
			    	CASE WHEN ISNULL(ldl.value_coded) THEN
			    		NULL
			    	ELSE
			   			0
			   		END
				ELSE 
					vl.value_numeric
				END AS insert_numeric	    
	from 		(select *
		 		from (select *
		  	  		 from obs
			   	     where concept_id = @vlTestSetConceptId
			         and voided = 0
			  		 order by obs_datetime asc) ogi
		 	    group by person_id) og
	left join	(select obs_group_id, value_numeric
				from obs
				where concept_id = @vlConceptId
				and voided = 0) vl
				on vl.obs_group_id = og.obs_id
	left join	(select obs_group_id, value_coded
				from obs
				where concept_id = @vlLdlConceptId
				and value_coded = @trueConceptId
				and voided = 0) ldl
				on ldl.obs_group_id = og.obs_id
	left join	(select obs_group_id, value_coded
				from obs
				where concept_id = @vlSampleTakenConceptId
				and value_coded = @trueConceptId
				and voided = 0) bled
				on bled.obs_group_id = og.obs_id
	;


	UPDATE warehouseCohortTable tc, firstVL fvl
		set tc.firstViralLoadDate=fvl.insert_visitDate, tc.firstViralLoadResult = fvl.insert_numeric
	where tc.PID = fvl.PID;

END

#

-- updateLastViralLoad()
-- Procedure that retrieves last Viral Load results for patients

DROP PROCEDURE IF EXISTS updateLastViralLoad;

#

CREATE PROCEDURE updateLastViralLoad(IN endDate DATE)
BEGIN

	select coalesce((select concept_id from concept where uuid = '83931c6d-0e5a-4302-b8ce-a31175b6475e'), -1) into @vlTestSetConceptId; -- Viral Load test set
	select coalesce((select concept_id from concept where uuid = '6569c44a-977f-11e1-8993-905e29aff6c1'), -1) into @weightConceptId; -- Weight (kg)
	select coalesce((select concept_id from concept where uuid = '654a7694-977f-11e1-8993-905e29aff6c1'), -1) into @vlConceptId; -- HIV viral load
	select coalesce((select concept_id from concept where uuid = 'e97b36a2-16f5-11e6-b6ba-3e1d05defe78'), -1) into @vlLdlConceptId; -- Lower than Detection Limit
	select coalesce((select concept_id from concept where uuid = 'f792f2f9-9c24-4d6e-98fd-caffa8f2383f'), -1) into @vlSampleTakenConceptId; -- Sample taken for Viral Load
	select coalesce((select concept_id from concept where uuid = '655e2f90-977f-11e1-8993-905e29aff6c1'), -1) into @trueConceptId; -- True

	DROP TABLE IF EXISTS lastVL;

	CREATE TEMPORARY TABLE lastVL as
	select 		og.person_id as PID,
				og.encounter_id,
				og.obs_id,
				og.obs_datetime as insert_visitDate,
                w.value_numeric as weight,
			    bled.value_coded as "Bled",
			    vl.value_numeric as "Value Numeric",
			    ldl.value_coded	as "LDL",
			    CASE WHEN ISNULL(vl.value_numeric) THEN
			    	CASE WHEN ISNULL(ldl.value_coded) THEN
			    		NULL
			    	ELSE
			   			0
			   		END
				ELSE
					vl.value_numeric
				END AS insert_numeric
	from 		(select *
		 		from (select *
		  	  		 from obs
			   	     where concept_id = @vlTestSetConceptId
			         and voided = 0
			  		 order by obs_datetime desc) ogi
		 	    group by person_id) og
   left join	(select encounter_id, obs_id, value_numeric
				from obs
				where concept_id = @weightConceptId
				and voided = 0) w
				on w.encounter_id = og.encounter_id
	left join	(select obs_group_id, value_numeric
				from obs
				where concept_id = @vlConceptId
				and voided = 0) vl
				on vl.obs_group_id = og.obs_id
	left join	(select obs_group_id, value_coded
				from obs
				where concept_id = @vlLdlConceptId
				and value_coded = @trueConceptId
				and voided = 0) ldl
				on ldl.obs_group_id = og.obs_id
	left join	(select obs_group_id, value_coded
				from obs
				where concept_id = @vlSampleTakenConceptId
				and value_coded = @trueConceptId
				and voided = 0) bled
				on bled.obs_group_id = og.obs_id
	;


	UPDATE warehouseCohortTable tc, lastVL lvl
		set tc.lastViralLoadDate=lvl.insert_visitDate, tc.lastViralLoadResult = lvl.insert_numeric,
		tc.lastViralLoadWeight = lvl.weight
	where tc.PID = lvl.PID;

END

#

-- getLastOutcomeForProgram(programId, endDate, colOutcomeName, colOutcomeDateName)
-- INPUTS: 		programId - program ID, ART=1, NCD=10
--				endDate - end Date of report
-- 				colOutcomeName - column name in the cohort table where to store last outcome value
--				colOutcomeNameDate - column name in the cohort table where to store the date of the last outcome
-- Procedure gets last program outcome before (or on) end date and writes outcome and outcome date to 
-- report table for cohort (one per patient).

DROP PROCEDURE IF EXISTS getLastOutcomeForProgram

#

CREATE PROCEDURE `getLastOutcomeForProgram`(IN programId INT, IN endDate DATE, IN colOutcomeName VARCHAR(100), IN colOutcomeDateName VARCHAR(100))
BEGIN
	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		lastOutcomeDate DATE default NULL,
		lastOutcome VARCHAR(255)
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	SET @s=CONCAT('insert into temp_obs_vector
					(PID, lastOutcomeDate, lastOutcome)
					select tc.PID, stateStartDate, patientState
					from warehouseCohortTable tc
					left join (
						select * from 
								(select pid, stateStartDate, patientState
								from warehouse_program_enrollment w
								where programId=', programId, ' and stateStartDate <= \'', endDate, 
								'\' and (stateEndDate > \'', endDate, '\' OR stateEndDate IS NULL)'
								' order by stateStartDate desc, dateEnrolled desc, completionDate desc) ei
						group by pid) w 
					on tc.PID = w.PID ; ');

				
	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;
	SET @s = NULL;

	SET @u=CONCAT('UPDATE warehouseCohortTable tc, temp_obs_vector tt SET tc.',colOutcomeDateName,' = tt.lastOutcomeDate, tc.',colOutcomeName,' = tt.lastOutcome WHERE tc.PID = tt.PID;');
	PREPARE stmt2 FROM @u;
	EXECUTE stmt2;
	DEALLOCATE PREPARE stmt2;
	SET @u = NULL;

END

#

-- getBloodGlucoseBeforeDate(endDate, first/last, colName1, colName2, colName3, colName4)
-- INPUTS:		endDate - end Date of report
-- 				colObsDate - column to write obs date to
-- 				colHba1c - column to write hba1c obs to
-- 				colRandom - column to write random glucose obs to
-- 				colFast - column to write fasting glucose obs to
--				firstLast - either 'first' or 'last' to specify first/last test
-- Procedure gets first/last blood glucose measurements for a cohort of patients. Needed to write this
-- specialized function, because of some changes in the way blood glucose is recorded - this reports
-- the observations back in a consistent way. 

DROP PROCEDURE IF EXISTS getBloodGlucoseBeforeDate;

#

CREATE PROCEDURE getBloodGlucoseBeforeDate(IN endDate DATE, IN firstLast VARCHAR(50), IN colObsDate VARCHAR(100), IN colHba1c VARCHAR(100), IN colRandom VARCHAR(100), IN colFast VARCHAR(100))
BEGIN

	select coalesce((select concept_id from concept where uuid = '654a98b8-977f-11e1-8993-905e29aff6c1'), -1) into @serumGlucoseConceptId; -- Serum glucose
	select coalesce((select concept_id from concept where uuid = '160914AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'), -1) into @postPrandialGlucoseConceptId; -- Post-prandial blood glucose measurement (mg/dL)
	select coalesce((select concept_id from concept where uuid = '160912AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'), -1) into @fastingGlucoseConceptId; -- Fasting blood glucose measurement (mg/dL)
	select coalesce((select concept_id from concept where uuid = '65714f76-977f-11e1-8993-905e29aff6c1'), -1) into @hba1cConceptId; -- Glycated hemoglobin
	select coalesce((select concept_id from concept where uuid = '65711e3e-977f-11e1-8993-905e29aff6c1'), -1) into @bloodSugarTestTypeConceptId; -- Blood sugar test type
	select coalesce((select concept_id from concept where uuid = '65711c2c-977f-11e1-8993-905e29aff6c1'), -1) into @fastingConceptId; -- Fasting

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		obsDate DATE default NULL,
  		hba1c DOUBLE default NULL,
  		fasting DOUBLE default NULL,
  		random DOUBLE default NULL
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	IF firstLast = 'first' THEN
		       set @upDown = 'asc';
	ELSEIF firstLast = 'last' THEN
	       set @upDown = 'desc';
	ELSE select 'Must specify first/last encounter in getBloodGlucoseBeforeDate!';
	END IF;

	set @s=CONCAT('insert into temp_obs_vector
						(PID, obsDate, hba1c, fasting, random)
	select oAll.person_id as PID,
		oAll.obs_datetime as obsDate,
		oHba1c.value_numeric as hba1c,
		CASE WHEN value_coded = @fastingConceptId
			THEN oGen.value_numeric
		WHEN oFast.value_numeric is NOT NULL
			THEN oFast.value_numeric
		ELSE NULL
		END AS fasting,
		CASE WHEN value_coded IS NULL AND oGen.value_numeric IS NOT NULL
			THEN oGen.value_numeric
		WHEN oRandom.value_numeric is NOT NULL
			THEN oRandom.value_numeric
		ELSE NULL
		END AS random
	from (select * from
			(select person_id, encounter_id, obs_datetime, value_numeric
			from obs
			where concept_id in (@serumGlucoseConceptId,@postPrandialGlucoseConceptId,@fastingGlucoseConceptId,@hba1cConceptId)
			and obs_datetime <= \'', endDate, '\'
			and voided = 0 order by obs_datetime ', @upDown,
			') aAlli
			group by person_id) oAll
	left join (select person_id, encounter_id, value_coded
				from obs
				where concept_id = @bloodSugarTestTypeConceptId
				and value_coded = @fastingConceptId
				and voided = 0) oCheck
				on oCheck.encounter_id = oAll.encounter_id
	left join (select person_id, encounter_id, value_numeric
				from obs
				where concept_id = @serumGlucoseConceptId
				and voided = 0) oGen on oGen.encounter_id = oAll.encounter_id
	left join (select person_id, encounter_id, value_numeric
				from obs
				where concept_id = @postPrandialGlucoseConceptId
				and voided = 0) oRandom
				on oRandom.encounter_id = oAll.encounter_id
	left join (select person_id, encounter_id, value_numeric
				from obs
				where concept_id = @fastingGlucoseConceptId
				and voided = 0) oFast
				on oFast.encounter_id = oAll.encounter_id
	left join (select person_id, encounter_id, value_numeric
				from obs
				where concept_id = @hba1cConceptId
				and voided = 0) oHba1c
				on oHba1c.encounter_id = oAll.encounter_id;');
	
	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

	set @s=CONCAT('UPDATE warehouseCohortTable tc, temp_obs_vector tt 
					SET tc.', colObsDate,' = tt.obsDate
					WHERE tc.PID = tt.PID;');

	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

	set @s=CONCAT('UPDATE warehouseCohortTable tc, temp_obs_vector tt 
					SET tc.', colHba1c,' = tt.hba1c
					WHERE tc.PID = tt.PID;');

	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;	

	set @s=CONCAT('UPDATE warehouseCohortTable tc, temp_obs_vector tt 
					SET tc.', colRandom,' = tt.random
					WHERE tc.PID = tt.PID;');

	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;				

	set @s=CONCAT('UPDATE warehouseCohortTable tc, temp_obs_vector tt 
					SET tc.', colFast,' = tt.fasting
					WHERE tc.PID = tt.PID;');	

	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;	
	SET @s = NULL;					

END

#

-- getBloodPressureBeforeDate(endDate, first/last, colName1, colName2)
-- INPUTS: 		cid - observation concept id
--				endDate - end Date of report
-- 				colName - temporary table to write to
--				firstLast - either 'first' or 'last' to specify first/last encounter
-- Procedure gets last systolic and diastolic values (from same encounter) and puts them together
-- in a string and writes out to the reporting table. 

DROP PROCEDURE IF EXISTS getBloodPressureBeforeDate;

#

CREATE PROCEDURE getBloodPressureBeforeDate(IN endDate DATE, IN firstLast VARCHAR(50), IN bpDateCol VARCHAR(100), IN bpCol VARCHAR(100))
BEGIN

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		obs_datetime DATE default NULL,
  		obs VARCHAR(100)
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	select coalesce((select encounter_type_id from encounter_type where uuid = 'ebaa2ad8-baaa-11e6-91a8-5622a9e78e10'), -1) into @AAS;
	select coalesce((select encounter_type_id from encounter_type where uuid = '664bb896-977f-11e1-8993-905e29aff6c1'), -1) into @CCF;
	select coalesce((select encounter_type_id from encounter_type where uuid = '66079de4-a8df-11e5-bf7f-feff819cdc9f'), -1) into @DHF;
	select coalesce((select concept_id from concept where uuid = '6569bffe-977f-11e1-8993-905e29aff6c1'), -1) into @systolicBpConceptId; -- Systolic blood pressure
	select coalesce((select concept_id from concept where uuid = '6569c116-977f-11e1-8993-905e29aff6c1'), -1) into @diastolicBpConceptId; -- Diastolic blood pressure

	IF firstLast = 'first' THEN
		       set @upDown = 'asc';
	ELSEIF firstLast = 'last' THEN
	       set @upDown = 'desc';
	ELSE select 'Must specify first/last encounter in getBloodPressureBeforeDate!';
	END IF;

	SET @s=CONCAT('insert into temp_obs_vector
							(PID, obs_datetime, obs)
					select o.person_id, e.encounter_datetime as obs_datetime, concat_ws(\'/\',o1.value_numeric, o2.value_numeric) as obs
					from (select *
							from (select person_id, encounter_id
									from obs
									where concept_id in (@systolicBpConceptId,@diastolicBpConceptId)
									and obs_datetime <= (\'', CONCAT(endDate),'\')
									and voided = 0
									order by obs_datetime ', @upDown, ')
							oi group by person_id) o
					join (select encounter_id, encounter_datetime
							from encounter
							where encounter_datetime <= (\'', CONCAT(endDate),'\')
							and encounter_type in (@AAS,@CCF,@DHF)
							and voided = 0) e
							on e.encounter_id = o.encounter_id
					left join (select encounter_id, value_numeric
								from obs
								where concept_id = @systolicBpConceptId) o1
								on o1.encounter_id = e.encounter_id
					left join (select encounter_id, value_numeric
								from obs
								where concept_id = @diastolicBpConceptId) o2
								on o2.encounter_id = e.encounter_id;');
	
	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

	set @s=CONCAT('UPDATE warehouseCohortTable tc, temp_obs_vector tt 
					SET tc.', bpDateCol,' = tt.obs_datetime
					WHERE tc.PID = tt.PID;');

	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

	set @s=CONCAT('UPDATE warehouseCohortTable tc, temp_obs_vector tt 
					SET tc.', bpCol,' = tt.obs
					WHERE tc.PID = tt.PID;');

	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;					

END

#


-- diagnosesLogic()
-- 

DROP PROCEDURE IF EXISTS diagnosesLogic;

#

CREATE PROCEDURE diagnosesLogic()
BEGIN
	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;

	create temporary table temp_obs_vector as 
	select PID, 
			HIV, 
			HTN, 
			DM, 
			EPILEPSY, 
			ASTHMA, 
			MENTAL, 
			(HTN + DM + EPILEPSY + ASTHMA + COPD + MENTAL) AS totalNCDs,
			CASE WHEN HIV=1 AND NCD_ENROLLED=1 
				THEN "yes" 
				ELSE "no" 
			END AS hivAtLeastOneNcd,
			CASE WHEN (HTN + DM + EPILEPSY + ASTHMA + COPD + MENTAL) > 1 
				THEN "yes" 
				ELSE "no" 
			END AS atLeastTwoNcds,
			CASE WHEN (HTN + DM) = 2 
				THEN "yes" 
				ELSE "no" 
			END AS htnAndDm,
			CASE WHEN (HIV + DM) = 2 
				THEN "yes" 
				ELSE "no" 
			END AS hivAndDm
	from (select PID,
			CASE WHEN hivEnrollmentDate IS NOT NULL 
				THEN 1 
				ELSE 0 
			END AS HIV,
			CASE WHEN ncdEnrollmentDate IS NOT NULL
				THEN 1
				ELSE 0
			END AS NCD_ENROLLED,
			CASE WHEN htnDx IS NOT NULL 
				THEN 1 
				ELSE 0 
			END as HTN,
			CASE WHEN dmDx IS NOT NULL 
				THEN 1 
				ELSE 0 
			END as DM,
			CASE WHEN epilepsyDx IS NOT NULL 
				THEN 1 
				ELSE 0 
			END as EPILEPSY,
			CASE WHEN asthmaDx IS NOT NULL 
				THEN 1 
				ELSE 0 
			END as ASTHMA,
			CASE WHEN copdDx IS NOT NULL 
				THEN 1 
				ELSE 0 
			END as COPD,			
			CASE WHEN mentalDx IS NOT NULL 
				THEN 1 
				ELSE 0 
			END as MENTAL						
			from warehouseCohortTable) it;

	UPDATE warehouseCohortTable tc, temp_obs_vector tt 
	SET tc.hivAtLeastOneNcd = tt.hivAtLeastOneNcd
	WHERE tc.PID = tt.PID;

	UPDATE warehouseCohortTable tc, temp_obs_vector tt 
	SET tc.atLeastTwoNcds = tt.atLeastTwoNcds
	WHERE tc.PID = tt.PID;	

	UPDATE warehouseCohortTable tc, temp_obs_vector tt 
	SET tc.htnAndDm = tt.htnAndDm
	WHERE tc.PID = tt.PID;	

	UPDATE warehouseCohortTable tc, temp_obs_vector tt 
	SET tc.hivAndDm = tt.hivAndDm
	WHERE tc.PID = tt.PID;	


END

#

-- getEpilepsyOnsetDate(endDate, firstLast, onsetDateCol)
-- INPUTS:
--				endDate - end Date of report
--				firstLast - either 'first' or 'last' to specify first/last encounter
-- 				onsetDateCol - temporary date column with year and month values
-- Procedure gets onset date (yyyy/mm) (from same encounter) and puts them together
-- in a string and writes out to the reporting table.

DROP PROCEDURE IF EXISTS getEpilepsyOnsetDate;

#

CREATE PROCEDURE getEpilepsyOnsetDate(IN endDate DATE, IN firstLast VARCHAR(50), IN onsetDateCol VARCHAR(100))
BEGIN

	DROP TEMPORARY TABLE IF EXISTS temp_obs_vector;
	create temporary table temp_obs_vector (
  		id INT not null auto_increment primary key,
  		PID INT(11) not NULL,
  		onsetDate DATE default NULL
	);
	CREATE INDEX PID_index ON temp_obs_vector (PID);

	select coalesce((select concept_id from concept where uuid = 'b2fafb7e-ce9f-11e5-ab30-625662870761'), -1) into @monthOfOnsetConceptId; -- Month of onset
	select coalesce((select concept_id from concept where uuid = 'b2faf9a8-ce9f-11e5-ab30-625662870761'), -1) into @yearOfOnsetConceptId; -- Year of onset

	IF firstLast = 'first' THEN
		       set @upDown = 'asc';
	ELSEIF firstLast = 'last' THEN
	       set @upDown = 'desc';
	ELSE select 'Must specify first/last encounter in getEpilepsyOnsetDate!';
	END IF;

	SET @s=CONCAT('insert into temp_obs_vector
							(PID, onsetDate)
					(select year.person_id,
                            CASE WHEN month.value_numeric IS NOT NULL
				                 THEN date_format(concat_ws(\'-\', year.value_numeric, month.value_numeric, \'01\'), \'%Y-%m-%d\')
								 ELSE date_format(concat_ws(\'-\',year.value_numeric, \'01-01\'), \'%Y-%m-%d\')
			                END AS onsetD
  					  from obs year, encounter e
                      left join (select encounter_id, value_numeric
								from obs
								where concept_id = @monthOfOnsetConceptId) month
					on month.encounter_id = e.encounter_id
					 where year.concept_id = @yearOfOnsetConceptId
                       and e.encounter_id = year.encounter_id
                       and e.encounter_datetime <= (\'', CONCAT(endDate),'\')
                       and year.voided = 0
                       and e.voided = 0
					 group by year.person_id
                     order by year.obs_datetime ', @upDown, ');');

	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

	set @s=CONCAT('UPDATE warehouseCohortTable tc, temp_obs_vector tt
					SET tc.', onsetDateCol,' = tt.onsetDate
					WHERE tc.PID = tt.PID;');

	PREPARE stmt1 FROM @s;
	EXECUTE stmt1;
	DEALLOCATE PREPARE stmt1;

END

#

-- everDefaultedByProgram()
-- Procedure that puts a check mark in colName if the patient ever defaulted
-- program specified with program_name

DROP PROCEDURE IF EXISTS everDefaultedByProgram;

#

CREATE PROCEDURE everDefaultedByProgram(IN program_name VARCHAR(255), IN colName VARCHAR(100))
BEGIN

	DROP TABLE IF EXISTS everDefaulted;

	CREATE TEMPORARY TABLE everDefaulted as
	SELECT PID, '✔' as yes_no
	FROM warehouse_program_enrollment
	WHERE patientState = 'Patient Defaulted'
	AND programName = program_name
	GROUP BY PID
	;

	SET @u=CONCAT('UPDATE warehouseCohortTable tc, everDefaulted ed SET tc.',colName,' = ed.yes_no WHERE tc.PID = ed.PID;');
	PREPARE stmt2 FROM @u;
	EXECUTE stmt2;
	DEALLOCATE PREPARE stmt2;
	SET @u = NULL;

END

