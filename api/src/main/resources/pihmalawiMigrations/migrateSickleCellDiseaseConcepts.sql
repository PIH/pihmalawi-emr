# MLW-1858 changed several concepts used by the Sickle Cell Disease Visit and eMastercard forms,
# because the original concepts did not match what the form fields actually capture. Obs recorded
# before that change are still stored against the old concepts, so the forms show them as blank and
# reports looking for the new concepts miss them. Move that historical data onto the new concepts.
#
# The old concepts are shared with other forms (e.g. "Complications since last visit" is used by
# the PDC forms), so every update is restricted to obs on encounters created by the SCD forms.
# Voided obs are migrated too, so that edit history stays consistent with the current concept.

# Sickle Cell Disease Visit (form E68275D4-C300-46B0-8754-4C2CF2598B78)

# Absence from School: "Attended school ever" -> "Absence from School"
update obs o
inner join encounter e on e.encounter_id = o.encounter_id
inner join form f on f.form_id = e.form_id
set o.concept_id = (select concept_id from concept where uuid = '839054d3-4faf-4e66-88e0-cfbafaf48131')
where f.uuid = 'E68275D4-C300-46B0-8754-4C2CF2598B78'
and o.concept_id = (select concept_id from concept where uuid = '656cb22c-977f-11e1-8993-905e29aff6c1');

# Enlarged Spleen: "Complications since last visit" -> "Enlarged Spleen"
# Also covers "No presence of splenomegaly", which the form briefly used between #311 and #312
update obs o
inner join encounter e on e.encounter_id = o.encounter_id
inner join form f on f.form_id = e.form_id
set o.concept_id = (select concept_id from concept where uuid = '96c94222-94fa-4514-b952-adf429643c2e')
where f.uuid = 'E68275D4-C300-46B0-8754-4C2CF2598B78'
and o.concept_id in (
    select concept_id from concept where uuid in (
        'e384a58c-4a73-11ec-81d3-0242ac130003',
        '65639a20-977f-11e1-8993-905e29aff6c1'
    )
);

# Jaundice: "Extremity exam findings" -> "Jaundice"
update obs o
inner join encounter e on e.encounter_id = o.encounter_id
inner join form f on f.form_id = e.form_id
set o.concept_id = (select concept_id from concept where uuid = '6546d462-977f-11e1-8993-905e29aff6c1')
where f.uuid = 'E68275D4-C300-46B0-8754-4C2CF2598B78'
and o.concept_id = (select concept_id from concept where uuid = '6557aea4-977f-11e1-8993-905e29aff6c1');

# Irregular Conjunctiva: "Diagnosis resolved" -> "Irregular Conjunctiva"
update obs o
inner join encounter e on e.encounter_id = o.encounter_id
inner join form f on f.form_id = e.form_id
set o.concept_id = (select concept_id from concept where uuid = '1ecf325d-a9ce-4a68-9f00-393ba47fa2e9')
where f.uuid = 'E68275D4-C300-46B0-8754-4C2CF2598B78'
and o.concept_id = (select concept_id from concept where uuid = '6570e5b8-977f-11e1-8993-905e29aff6c1');

# Sickle Cell Disease eMastercard (form 7AFEC71B-15D3-4E2D-8C42-D8CB2B75BC54)

# Reason for referral answer: "Patient transfer in" -> "Patient is an inpatient at time of visit"
update obs o
inner join encounter e on e.encounter_id = o.encounter_id
inner join form f on f.form_id = e.form_id
set o.value_coded = (select concept_id from concept where uuid = '656fc048-977f-11e1-8993-905e29aff6c1'),
    o.value_coded_name_id = null
where f.uuid = '7AFEC71B-15D3-4E2D-8C42-D8CB2B75BC54'
and o.concept_id = (select concept_id from concept where uuid = '98b17e13-659f-41e7-8459-b370fdbffe0f')
and o.value_coded = (select concept_id from concept where uuid = '7602D441-4A44-41A9-AA49-A59853AEDC65');
