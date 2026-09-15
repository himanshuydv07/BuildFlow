const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');

const MANAGE_ROLES = ['OWNER', 'ADMIN'];

const createSprint = asyncHandler(async (req, res) => {
  if (!MANAGE_ROLES.includes(req.membership.role)) throw ApiError.forbidden('Only owners/admins can create sprints');
  const sprint = await Sprint.create({ ...req.body, projectId: req.project._id, createdBy: req.user._id });
  return new ApiResponse(201, { sprint }, 'Sprint created').send(res);
});

const listSprints = asyncHandler(async (req, res) => {
  const sprints = await Sprint.find({ projectId: req.project._id }).sort({ startDate: -1 }).lean();
  return new ApiResponse(200, { sprints }).send(res);
});

const updateSprint = asyncHandler(async (req, res) => {
  if (!MANAGE_ROLES.includes(req.membership.role)) throw ApiError.forbidden('Only owners/admins can edit sprints');
  const sprint = await Sprint.findOneAndUpdate({ _id: req.params.sprintId, projectId: req.project._id }, req.body, { new: true });
  if (!sprint) throw ApiError.notFound('Sprint not found');
  return new ApiResponse(200, { sprint }, 'Sprint updated').send(res);
});

// GET /projects/:projectId/sprints/:sprintId/board — tasks grouped by status for this sprint
const getSprintBoard = asyncHandler(async (req, res) => {
  const sprint = await Sprint.findOne({ _id: req.params.sprintId, projectId: req.project._id }).lean();
  if (!sprint) throw ApiError.notFound('Sprint not found');

  const tasks = await Task.find({ sprint: sprint._id, isDeleted: false }).populate('assignee', 'name avatarUrl').lean();
  const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const donePoints = tasks.filter((t) => t.status === 'DONE').reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  // Simple ideal-vs-actual burndown across the sprint's date range.
  const days = Math.max(1, Math.round((new Date(sprint.endDate) - new Date(sprint.startDate)) / 86400000));
  const burndown = Array.from({ length: days + 1 }, (_, i) => {
    const date = new Date(new Date(sprint.startDate).getTime() + i * 86400000);
    const idealRemaining = Math.max(0, totalPoints - (totalPoints / days) * i);
    const actualDone = tasks
      .filter((t) => t.status === 'DONE' && new Date(t.updatedAt) <= date)
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    return { date: date.toISOString().slice(0, 10), ideal: Math.round(idealRemaining), actualRemaining: totalPoints - actualDone };
  });

  return new ApiResponse(200, { sprint, tasks, totalPoints, donePoints, burndown }).send(res);
});

module.exports = { createSprint, listSprints, updateSprint, getSprintBoard };
