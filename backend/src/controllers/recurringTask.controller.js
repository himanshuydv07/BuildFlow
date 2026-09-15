const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const RecurringTask = require('../models/RecurringTask');
const { computeNextRun } = require('../services/recurringTaskJob');

const MANAGE_ROLES = ['OWNER', 'ADMIN'];

function firstRunAt(body) {
  const now = new Date();
  if (body.frequency === 'WEEKLY' && body.dayOfWeek !== undefined && body.dayOfWeek !== null) {
    const next = new Date(now);
    const diff = (body.dayOfWeek - now.getDay() + 7) % 7 || 7;
    next.setDate(now.getDate() + diff);
    return next;
  }
  if (body.frequency === 'MONTHLY' && body.dayOfMonth) {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, body.dayOfMonth);
    return next;
  }
  return computeNextRun(body, now);
}

const createRecurringTask = asyncHandler(async (req, res) => {
  if (!MANAGE_ROLES.includes(req.membership.role)) throw ApiError.forbidden('Only owners/admins can schedule recurring tasks');

  const recurringTask = await RecurringTask.create({
    ...req.body,
    projectId: req.project._id,
    createdBy: req.user._id,
    nextRunAt: firstRunAt(req.body),
  });
  return new ApiResponse(201, { recurringTask }, 'Recurring task scheduled').send(res);
});

const listRecurringTasks = asyncHandler(async (req, res) => {
  const recurringTasks = await RecurringTask.find({ projectId: req.project._id }).sort({ createdAt: -1 }).lean();
  return new ApiResponse(200, { recurringTasks }).send(res);
});

const deleteRecurringTask = asyncHandler(async (req, res) => {
  if (!MANAGE_ROLES.includes(req.membership.role)) throw ApiError.forbidden('Only owners/admins can remove recurring tasks');
  const rt = await RecurringTask.findOneAndDelete({ _id: req.params.recurringTaskId, projectId: req.project._id });
  if (!rt) throw ApiError.notFound('Recurring task not found');
  return new ApiResponse(200, null, 'Recurring task removed').send(res);
});

module.exports = { createRecurringTask, listRecurringTasks, deleteRecurringTask };
