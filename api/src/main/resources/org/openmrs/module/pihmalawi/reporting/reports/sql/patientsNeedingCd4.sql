-- ## DEPRECATED = true
-- ## report_uuid = 56dce9c9-5d4b-11e5-a151-e82aea237783
-- ## design_uuid = e15c1a59-5d50-11e5-a151-e82aea237783
-- ## report_name = Clinical - Patients Needing CD4
-- ## report_description = Report indicating which patients need a CD4 done
-- ## parameter = endDate|End Date|java.util.Date
-- ## parameter = location|Location|org.openmrs.Location

select coalesce((select patient_identifier_type_id from patient_identifier_type where uuid = '66786256-977f-11e1-8993-905e29aff6c1'), -1) into @hccNumberTypeId; -- HCC Number
select coalesce((select patient_identifier_type_id from patient_identifier_type where uuid = '667858f6-977f-11e1-8993-905e29aff6c1'), -1) into @deprecatedPartNumberTypeId; -- z_deprecated PART Number
select coalesce((select program_id from program where uuid = '66850b0a-977f-11e1-8993-905e29aff6c1'), -1) into @hivProgramId; -- HIV program
select coalesce((select program_id from program where uuid = '6685153c-977f-11e1-8993-905e29aff6c1'), -1) into @preArtProgramId; -- PRE-ART PROGRAM
select coalesce((select program_workflow_state_id from program_workflow_state where uuid = '6687f284-977f-11e1-8993-905e29aff6c1'), -1) into @preArtContinueStateId; -- Pre-ART (Continue)
select coalesce((select encounter_type_id from encounter_type where uuid = '664b8736-977f-11e1-8993-905e29aff6c1'), -1) into @partInitialType; -- PART_INITIAL
select coalesce((select encounter_type_id from encounter_type where uuid = '664b8812-977f-11e1-8993-905e29aff6c1'), -1) into @partFollowupType; -- PART_FOLLOWUP
select coalesce((select concept_id from concept where uuid = '6565b94a-977f-11e1-8993-905e29aff6c1'), -1) into @clinicianReportedCd4ConceptId; -- Clinician reported to CD4
select coalesce((select concept_id from concept where uuid = '656c327a-977f-11e1-8993-905e29aff6c1'), -1) into @cd4ConceptId; -- CD4

drop temporary table if exists PS; -- Create a temporary table to store cohort with state Pre-ART (continue)
create temporary table PS as
select * from
(select state, end_date, patient_state.voided, patient_program.patient_id, patient_program.date_created, patient_state.patient_program_id, patient_program.location_id
from patient_state
join patient_program on patient_state.patient_program_id = patient_program.patient_program_id
join (select * from patient_identifier where voided = 0 and identifier_type = @hccNumberTypeId) pi on pi.patient_id = patient_program.patient_id
where (end_date > @endDate or end_date IS NULL)
and start_date < @endDate
and patient_program.program_id in (@hivProgramId,@preArtProgramId)
and patient_program.voided = 0
and (patient_program.date_completed > @endDate or patient_program.date_completed is NULL)
and state=@preArtContinueStateId
and patient_program.location_id = @location
and patient_state.voided = 0
order by patient_program.date_created desc) PSi
group by PSi.patient_id;

drop table if exists CD4_ALL; -- Create a temporary table to store cohort with state Pre-ART (continue)
create temporary table CD4_ALL as

select distinct PS.patient_id as IID, -- Internal ID
identifier as PID,  -- Patient Identifier
given_name as First,  -- First name
family_name as Last,  -- Given name
date_format(Last_Encounter,'%Y-%m-%d') as Last_Encounter, -- Last Encounter
OBSCD4.value_numeric as LastCD4Count, -- Last CD4 count
date_format(OBSCD4.obs_datetime,'%Y-%m-%d') as CD4_Date, -- Last CD4 date
datediff(@endDate,OBSCD4.obs_datetime) as DaysSinceLastCD4, -- Days since last CD4
-- location.name as LastEncounterLocation, -- Last Encounter location
l.name as Enrollment_location

from PS

left join (select * from (select patient_identifier.patient_id, identifier, patient_identifier.location_id from patient_identifier where identifier_type in (@deprecatedPartNumberTypeId,@hccNumberTypeId) and identifier_type = @hccNumberTypeId and voided=0 order by patient_identifier.identifier_type desc) pii) PI on PS.patient_id = PI.patient_id  and PI.location_id = PS.location_id -- Grab patient identifiers

join (select voided, person.person_id from person where person.voided=0) pii on pii.person_id = PS.patient_id -- Ensure persons are not voided

left join
(select * from (select patient_id, encounter_datetime as Last_Encounter, location_id as ENC_loc
from encounter
where encounter_type in (@partInitialType,@partFollowupType) and encounter_datetime <=@endDate and voided = 0 order by encounter_datetime desc) ENCi
group by patient_id) ENC
on PS.patient_id = ENC.patient_id -- Ensure patients had a visit in the last year (eliminates hundreds of patients with active state, but not really active)

join (select * from (select person_name.family_name, person_name.given_name, person_name.person_id from person_name where person_name.voided = 0 order by person_name.person_id) pnii group by	pnii.person_id) PN on PN.person_id = PS.patient_id -- Grab patient demographics

left join
(select * from (select concept_id, person_id, patient_id, form_id, obs_datetime, value_numeric, obs.encounter_id
from obs
left join encounter on obs.encounter_id = encounter.encounter_id
where obs_datetime <= @endDate and concept_id in (@clinicianReportedCd4ConceptId,@cd4ConceptId) and encounter.voided = 0 and obs.voided = 0 order by obs_datetime desc) OBi67
group by person_id) OBSCD4
on PS.patient_id = OBSCD4.person_id -- Grab CD4 obs. There might be a conflict here between the concepts, but it shouldn't effect Pre-ART patients (concept 5497 is also on the ART e-mastercard header)

left join location on location.location_id = ENC_loc -- Last encounter location name
left join location l on l.location_id = PS.location_id;

drop table if exists CODE5; -- Pre-ART with no CD4
create temporary table CODE5 as
select *, 'No CD4' as Code
from CD4_ALL
having isnull(LastCD4Count);

drop table if exists CODE4; -- Pre-ART with CD4 (<500) that qualifies the patient for ARTs
create temporary table CODE4 as
select *, 'CD4 < 500' as Code
from CD4_ALL
having LastCD4Count <= 500;

drop table if exists CODE3; -- Patients overdue for CD4 count (6 months)
create temporary table CODE3 as
select *, '>6 months since last CD4' as Code
from CD4_ALL
having DaysSinceLastCD4 >= 180
and LastCD4Count > 500;

drop table if exists CODE2; -- Patients overdue for CD4 count (3 months)
create temporary table CODE2 as
select *, '>3 months since last CD4' as Code
from CD4_ALL
having DaysSinceLastCD4 >= 90
and DaysSinceLastCD4 < 180
and LastCD4Count > 500;

drop table if exists CODE1; -- Patients who need a CD4 count in nex 30 days
create temporary table CODE1 as
select *, 'Needs CD4 within 30 days' as Code
from CD4_ALL
having DaysSinceLastCD4 > 60
and DaysSinceLastCD4 < 90
and LastCD4Count > 500;

-- Put all the temporaty tables together in order.
(select * from CODE5)  UNION ALL (select * from CODE4)  UNION ALL (select * from CODE3)  UNION ALL (select * from CODE2)  UNION ALL (select * from CODE1);

drop temporary table if exists PS;