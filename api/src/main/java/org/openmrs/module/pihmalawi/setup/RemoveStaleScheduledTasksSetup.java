package org.openmrs.module.pihmalawi.setup;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.openmrs.api.context.Context;
import org.openmrs.scheduler.SchedulerException;
import org.openmrs.scheduler.SchedulerService;
import org.openmrs.scheduler.TaskDefinition;

/**
 * Removes scheduled tasks that a previous version of this module may have registered in the
 * database, but whose backing Java class no longer exists in the module. Left running, these
 * would fail to execute (or fail to even load) after the class is removed.
 */
public class RemoveStaleScheduledTasksSetup {

    private static final Log log = LogFactory.getLog(RemoveStaleScheduledTasksSetup.class);

    // Names of tasks previously registered by this module whose task classes have since been deleted
    private static final String[] STALE_TASK_NAMES = {
            "Migrate EID Test Results"
    };

    public static void removeStaleTasks() {
        SchedulerService schedulerService = Context.getSchedulerService();
        for (String taskName : STALE_TASK_NAMES) {
            TaskDefinition task = schedulerService.getTaskByName(taskName);
            if (task != null) {
                try {
                    schedulerService.shutdownTask(task);
                } catch (SchedulerException e) {
                    log.warn("Failed to shut down stale scheduled task '" + taskName + "' before deleting it", e);
                }
                schedulerService.deleteTask(task.getId());
                log.info("Removed stale scheduled task '" + taskName + "'");
            }
        }
    }
}
