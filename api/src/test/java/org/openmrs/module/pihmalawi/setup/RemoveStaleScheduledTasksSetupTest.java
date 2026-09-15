package org.openmrs.module.pihmalawi.setup;

import org.junit.Assert;
import org.junit.Test;
import org.openmrs.api.context.Context;
import org.openmrs.module.emrapi.adt.CloseStaleVisitsTask;
import org.openmrs.scheduler.TaskDefinition;
import org.openmrs.test.BaseModuleContextSensitiveTest;

public class RemoveStaleScheduledTasksSetupTest extends BaseModuleContextSensitiveTest {

    private static final String STALE_TASK_NAME = "Migrate EID Test Results";

    @Test
    public void shouldDeleteStaleTaskIfPresent() {
        // Any real, existing Task class works here - saveTaskDefinition validates the class exists,
        // and we only care about the task's name being registered and then removed.
        TaskDefinition task = new TaskDefinition();
        task.setName(STALE_TASK_NAME);
        task.setTaskClass(CloseStaleVisitsTask.class.getName());
        task.setStartOnStartup(false);
        task.setRepeatInterval(999999999L);
        Context.getSchedulerService().saveTaskDefinition(task);
        Assert.assertNotNull(Context.getSchedulerService().getTaskByName(STALE_TASK_NAME));

        RemoveStaleScheduledTasksSetup.removeStaleTasks();

        Assert.assertNull(Context.getSchedulerService().getTaskByName(STALE_TASK_NAME));
    }

    @Test
    public void shouldNotFailWhenStaleTaskIsAlreadyAbsent() {
        Assert.assertNull(Context.getSchedulerService().getTaskByName(STALE_TASK_NAME));
        RemoveStaleScheduledTasksSetup.removeStaleTasks();
    }
}
