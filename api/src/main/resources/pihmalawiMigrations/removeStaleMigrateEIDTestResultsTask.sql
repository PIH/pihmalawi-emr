--  A previous version of this module registered a "Migrate EID Test Results" scheduled task
--  (org.openmrs.module.pihmalawi.task.MigrateViralLoadAndEIDTestResultsTask), whose setup method
--  was never actually wired into the module activator - so on any install where it was scheduled
--  some other way (e.g. manually via the admin Scheduler UI, or by an earlier version of the code
--  that did call it), the row would be stuck referencing a class that no longer exists once that
--  class is deleted (MLW-1846). Remove it if present; a no-op everywhere else.

delete from scheduler_task_config_property where task_config_id in (
    select task_config_id from scheduler_task_config where name = 'Migrate EID Test Results'
);

delete from scheduler_task_config where name = 'Migrate EID Test Results';
