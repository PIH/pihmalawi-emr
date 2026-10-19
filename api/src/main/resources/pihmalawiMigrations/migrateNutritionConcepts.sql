# MLW-1859 changed two concepts used by the Nutrition forms, because the original concepts did not
# match what the form fields actually capture. Obs recorded before that change are still stored
# against the old concepts. Move the historical data that can be identified onto the new concepts.
#
# The old concepts are shared with other forms, so every update is restricted to obs on encounters
# created by the Nutrition forms that used them.

# Ration (Warehouse signature): "Given name" -> "Name of data collector"
# Nutrition Adult, Infant, PDC and Pregnant Teens Visit forms. Voided obs are migrated too, so that
# edit history stays consistent with the current concept.
update obs o
inner join encounter e on e.encounter_id = o.encounter_id
inner join form f on f.form_id = e.form_id
set o.concept_id = (select concept_id from concept where uuid = '655ff60e-977f-11e1-8993-905e29aff6c1')
where f.uuid in (
    'ce5144b6-c636-4e4f-baa0-d87c9b2e6efd',
    'a506f7ad-15c8-49a0-9ceb-eaa8b75fbcf0',
    'a5d1f0a6-0519-4e9d-b5fd-5b363ab8ac52',
    '0c5a3897-70b7-4476-9e13-72b5188a41d3'
)
and o.concept_id = (select concept_id from concept where uuid = '6570f9ea-977f-11e1-8993-905e29aff6c1');

# Reason enrolled in food program, "Needs Social Support (POSER)": "Enrolled in PDC" -> "Poser Support"
# Nutrition eMastercard (form 1E010A94-5E60-4218-AA71-7FAA53DFDD4E).
#
# Before MLW-1859 the POSER and Malnutrition checkboxes both saved the answer "Enrolled in PDC", and
# neither has a controlId, so no form path was saved on the obs to tell them apart. Malnutrition
# still saves "Enrolled in PDC". Only an encounter where both boxes were ticked can be identified:
# it has two such (non-voided) obs, and one of them is changed to POSER (the two are identical, so it
# does not matter which). An encounter with a single such obs could be either box and is left as
# Malnutrition. Those need to be checked against the paper mastercard and corrected in the form.
# Once migrated an encounter has only one "Enrolled in PDC" obs, so re-running this is a no-op.
update obs o
inner join (
    select min(r.obs_id) as obs_id
    from obs r
    inner join encounter e on e.encounter_id = r.encounter_id
    inner join form f on f.form_id = e.form_id
    where f.uuid = '1E010A94-5E60-4218-AA71-7FAA53DFDD4E'
    and r.voided = 0
    and r.concept_id = (select concept_id from concept where uuid = '6567efa8-977f-11e1-8993-905e29aff6c1')
    and r.value_coded = (select concept_id from concept where uuid = '92148ae3-642c-47f5-ae7c-2c4efa9796e8')
    group by r.encounter_id
    having count(*) = 2
) both_ticked on both_ticked.obs_id = o.obs_id
set o.value_coded = (select concept_id from concept where uuid = '5b49fbf4-2645-4ab2-974e-4e6c961162b1'),
    o.value_coded_name_id = null;
