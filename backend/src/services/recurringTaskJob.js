const cron = require('node-cron');
const RecurringTask = require('../models/RecurringTask');
const Task = require('../models/Task');
const logger = require('../config/logger');

function computeNextRun(template, from = new Date()) {
  const next = new Date(from);
  if (template.frequency === 'DAILY') {
    next.setDate(next.getDate() + 1);
  } else if (template.frequency === 'WEEKLY') {
    next.setDate(next.getDate() + 7);
  } else {
    next.setMonth(next.getMonth() + 1);
    if (template.dayOfMonth) next.setDate(template.dayOfMonth);
  }
  return next;
}

async function runDueRecurringTasks() {
  const due = await RecurringTask.find({ isActive: true, nextRunAt: { $lte: new Date() } });
  for (const template of due) {
    try {
      await Task.create({
        projectId: template.projectId,
        title: template.title,
        description: template.description,
        assignee: template.assignee,
        priority: template.priority,
        createdBy: template.createdBy,
        dueDate: template.nextRunAt,
      });
      template.nextRunAt = computeNextRun(template, template.nextRunAt);
      await template.save();
      logger.info(`[RecurringTask] Created instance of "${template.title}" for project ${template.projectId}`);
    } catch (err) {
      logger.error(`[RecurringTask] Failed to create instance of "${template.title}": ${err.message}`);
    }
  }
}

/** Runs once a day at 00:05. Also exported for manual/test invocation. */
function startRecurringTaskJob() {
  cron.schedule('5 0 * * *', () => {
    runDueRecurringTasks().catch((err) => logger.error(`[RecurringTask] Job failed: ${err.message}`));
  });
  logger.info('[RecurringTask] Daily job scheduled (00:05)');
}

module.exports = { startRecurringTaskJob, runDueRecurringTasks, computeNextRun };
