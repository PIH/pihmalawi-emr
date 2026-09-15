-- ## DEPRECATED = true
-- ## report_uuid = a222543e-63c2-11e5-a9f6-d60697e5b5db
-- ## design_uuid = 483b5cee-2eeb-4df3-b685-befcf2658daa
-- ## report_name = Clinical - Weight Loss Report
-- ## report_description = Report indicating patient weight loss
-- ## parameter = endDate|End Date|java.util.Date
-- ## parameter = obsWithin|Last weight within (months)|java.lang.Integer
-- ## parameter = monthsBack|Compare to weight (months ago)|java.lang.Integer

-- REPORT PARAMETERS
-- @endDate defines report reference end date
-- @obsWithin requires that a patient has had an encounter/observation within this many months of @endDate
-- @monthsBack requires comparison weight be at least this many months before @endDate

-- REPORT DESCRIPTION
-- Report provides a reference identifier, two comparison weight observations, last patient encounter location,
-- and the weight change normalized as percent per year. Report is intended to look at weight change over the
-- long-term (e.g. 6-12 months) for patients with a recent visit. Report can be applied for clinical and data
-- quality checks.

select patient_identifier_type_id into @arvNumberTypeId from patient_identifier_type where uuid = '66784d84-977f-11e1-8993-905e29aff6c1'; -- ARV Number
select patient_identifier_type_id into @hccNumberTypeId from patient_identifier_type where uuid = '66786256-977f-11e1-8993-905e29aff6c1'; -- HCC Number
select patient_identifier_type_id into @chronicCareNumberTypeId from patient_identifier_type where uuid = '11a76c3e-1db8-4d16-9252-9a18b5ed1843'; -- Chronic Care Number
select encounter_type_id into @artInitialType from encounter_type where uuid = '664b8574-977f-11e1-8993-905e29aff6c1'; -- ART_INITIAL
select encounter_type_id into @artFollowupType from encounter_type where uuid = '664b8650-977f-11e1-8993-905e29aff6c1'; -- ART_FOLLOWUP
select encounter_type_id into @partInitialType from encounter_type where uuid = '664b8736-977f-11e1-8993-905e29aff6c1'; -- PART_INITIAL
select encounter_type_id into @partFollowupType from encounter_type where uuid = '664b8812-977f-11e1-8993-905e29aff6c1'; -- PART_FOLLOWUP
select encounter_type_id into @chronicCareInitialType from encounter_type where uuid = '664bb6de-977f-11e1-8993-905e29aff6c1'; -- CHRONIC_CARE_INITIAL
select encounter_type_id into @chronicCareFollowupType from encounter_type where uuid = '664bb896-977f-11e1-8993-905e29aff6c1'; -- CHRONIC_CARE_FOLLOWUP
select concept_id into @weightConceptId from concept where uuid = '6569c44a-977f-11e1-8993-905e29aff6c1'; -- Weight (kg)

select 	pi.patient_id as "Internal ID",
		pi.identifier as "Identifier", 
		date_format(wp.obs_datetime,"%Y-%m-%d") as "Last Weight Date", 
		wp.value_numeric as "Last Weight",
		date_format(wc.obs_datetime,"%Y-%m-%d") as "Current Weight Date", 
		wc.value_numeric as "Current Weight",
		round((wc.value_numeric - wp.value_numeric)/datediff(wc.obs_datetime,wp.obs_datetime)*365/wp.value_numeric*100,2) as "% per year",
		l.name as Location 

from 
	(select * from 
		(select *
			from patient_identifier 
			where identifier_type in (@arvNumberTypeId,@hccNumberTypeId,@chronicCareNumberTypeId) 
			and voided = 0 
			order by identifier_type desc) pii 
		group by patient_id) pi -- grabbing patient identifiers and requiring an old pre-art number, art number, or hcc number

join 
	(select * from 
		(select patient_id, location_id
			from encounter 
			where encounter_type in (@artInitialType,@artFollowupType,@partInitialType,@partFollowupType,@chronicCareInitialType,@chronicCareFollowupType) 
			and voided = 0 
			and datediff(@endDate,encounter_datetime) > 0
			and datediff(@endDate,encounter_datetime)/365*12 < @obsWithin
			order by encounter_datetime desc) pii 
		group by patient_id) e 
		on e.patient_id = pi.patient_id -- joining pre-art/art initial/follow-up encounters to ensure the patient had a visit

join location l on l.location_id = e.location_id		

join (select * from 
		(select person_id, obs_datetime, value_numeric
			from obs 	
			where concept_id = @weightConceptId
			and voided = 0
			and datediff(@endDate,obs_datetime)/365*12 < @obsWithin
			and value_numeric is not null
			order by obs_datetime desc) pii
		group by person_id) wc
		on wc.person_id = pi.patient_id
		
join (select * from 
		(select person_id, obs_datetime, value_numeric 
			from obs 	
			where concept_id = @weightConceptId
			and voided = 0
			and value_numeric is not null
			and obs_datetime < date_sub(@endDate,interval @monthsBack month)
			order by obs_datetime desc) pii
		group by person_id) wp
		on wp.person_id = pi.patient_id

order by round((wc.value_numeric - wp.value_numeric)/datediff(wc.obs_datetime,wp.obs_datetime)*365/wp.value_numeric*100,2) asc
