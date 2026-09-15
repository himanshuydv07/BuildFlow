const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Task = require('../models/Task');
const ProjectMember = require('../models/ProjectMember');
const { logActivity } = require('../services/activityService');
const { notify, emitToProject } = require('../services/notificationService');

const MANAGE_ROLES = ['OWNER', 'ADMIN'];

function isAssignee(task, userId) {
  return task.assignee && task.assignee.toString() === userId.toString();
}

/** OWNER/ADMIN can act on any task; MEMBER only on tasks assigned to them; VIEWER never. */
function assertCanMutate(req, task, { assigneeAllowed = false } = {}) {
  if (MANAGE_ROLES.includes(req.membership.role)) return;
  if (assigneeAllowed && req.membership.role === 'MEMBER' && isAssignee(task, req.user._id)) return;
  throw ApiError.forbidden('You do not have permission to modify this task');
}

async function loadTaskOrThrow(projectId, taskId) {
  const task = await Task.findOne({ _id: taskId, projectId, isDeleted: false });
  if (!task) throw ApiError.notFound('Task not found');
  return task;
}

/**
 * Prevents circular task dependencies (A depends on B, B depends on A,
 * or longer chains) by walking the dependency graph of the proposed
 * dependencies and checking whether taskId is reachable from them.
 */
async function wouldCreateCycle(taskId, proposedDependsOn) {
  if (!proposedDependsOn || proposedDependsOn.length === 0) return false;
  const targetId = taskId.toString();
  const visited = new Set();
  let frontier = proposedDependsOn.map((id) => id.toString());

  while (frontier.length > 0) {
    if (frontier.includes(targetId)) return true;
    const unvisited = frontier.filter((id) => !visited.has(id));
    unvisited.forEach((id) => visited.add(id));
    if (unvisited.length === 0) break;

    const next = await Task.find({ _id: { $in: unvisited } }).select('dependsOn').lean();
    frontier = next.flatMap((t) => (t.dependsOn || []).map((id) => id.toString()));
  }
  return false;
}

// POST /projects/:projectId/tasks  (OWNER, ADMIN)
const createTask = asyncHandler(async (req, res) => {
  if (!MANAGE_ROLES.includes(req.membership.role)) {
    throw ApiError.forbidden('Only project owners/admins can create tasks');
  }

  if (req.body.assignee) {
    const assigneeMembership = await ProjectMember.findOne({
      projectId: req.project._id,
      userId: req.body.assignee,
      status: 'ACTIVE',
    });
    if (!assigneeMembership) throw ApiError.badRequest('Assignee must be an active project member');
  }

  const task = await Task.create({ ...req.body, projectId: req.project._id, createdBy: req.user._id });

  emitToProject(req.project._id, 'task:created', { taskId: task._id, title: task.title, status: task.status });

  if (task.assignee) {
    await notify({
      user: task.assignee,
      type: 'TASK_ASSIGNED',
      message: `You were assigned to "${task.title}"`,
      entityType: 'TASK',
      entityId: task._id,
      projectId: req.project._id,
    });
  }

  await logActivity({
    projectId: req.project._id,
    actor: req.user._id,
    action: 'TASK_CREATED',
    entityType: 'TASK',
    entityId: task._id,
    newValue: { title: task.title },
  });

  return new ApiResponse(201, { task }, 'Task created').send(res);
});

// GET /projects/:projectId/tasks  (any active member)
const listTasks = asyncHandler(async (req, res) => {
  const { status, priority, assignee, milestone, tag, sprint, epic, isBacklog, page, limit } = req.query;

  const filter = { projectId: req.project._id, isDeleted: false };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignee) filter.assignee = assignee;
  if (milestone) filter.milestone = milestone;
  if (tag) filter.tags = tag;
  if (sprint) filter.sprint = sprint;
  if (epic) filter.epic = epic;
  if (isBacklog !== undefined) filter.isBacklog = isBacklog;

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('assignee', 'name email avatarUrl')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Task.countDocuments(filter),
  ]);

  return new ApiResponse(200, { tasks }, undefined, { page, limit, total, pages: Math.ceil(total / limit) }).send(res);
});

// GET /projects/:projectId/tasks/:taskId
const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.taskId, projectId: req.project._id, isDeleted: false })
    .populate('assignee', 'name email avatarUrl')
    .populate('createdBy', 'name email')
    .populate('dependsOn', 'title status')
    .populate('milestone', 'name dueDate');

  if (!task) throw ApiError.notFound('Task not found');
  return new ApiResponse(200, { task }).send(res);
});

// PATCH /projects/:projectId/tasks/:taskId  (OWNER, ADMIN — full edit)
const updateTask = asyncHandler(async (req, res) => {
  const task = await loadTaskOrThrow(req.project._id, req.params.taskId);
  assertCanMutate(req, task);

  if (req.body.assignee) {
    const assigneeMembership = await ProjectMember.findOne({
      projectId: req.project._id,
      userId: req.body.assignee,
      status: 'ACTIVE',
    });
    if (!assigneeMembership) throw ApiError.badRequest('Assignee must be an active project member');
  }

  const previousAssignee = task.assignee ? task.assignee.toString() : null;

  if (req.body.dependsOn) {
    if (req.body.dependsOn.includes(task._id.toString())) {
      throw ApiError.badRequest('A task cannot depend on itself');
    }
    if (await wouldCreateCycle(task._id, req.body.dependsOn)) {
      throw ApiError.badRequest('This would create a circular dependency between tasks');
    }
  }

  Object.assign(task, req.body);
  await task.save();

  emitToProject(req.project._id, 'task:updated', { taskId: task._id });

  if (task.assignee && task.assignee.toString() !== previousAssignee) {
    await notify({
      user: task.assignee,
      type: 'TASK_ASSIGNED',
      message: `You were assigned to "${task.title}"`,
      entityType: 'TASK',
      entityId: task._id,
      projectId: req.project._id,
    });
  }

  await logActivity({
    projectId: req.project._id,
    actor: req.user._id,
    action: 'TASK_UPDATED',
    entityType: 'TASK',
    entityId: task._id,
    newValue: req.body,
  });

  return new ApiResponse(200, { task }, 'Task updated').send(res);
});

// PATCH /projects/:projectId/tasks/:taskId/status  (OWNER, ADMIN, or assignee)
const updateTaskStatus = asyncHandler(async (req, res) => {
  const task = await loadTaskOrThrow(req.project._id, req.params.taskId);
  assertCanMutate(req, task, { assigneeAllowed: true });

  const previousStatus = task.status;
  task.status = req.body.status;
  if (task.status === 'DONE') task.progress = 100;
  await task.save();

  emitToProject(req.project._id, 'task:statusChanged', {
    taskId: task._id,
    status: task.status,
    updatedBy: req.user._id,
  });

  await logActivity({
    entityType: 'TASK',
    entityId: task._id,
    previousValue: { status: previousStatus },
    newValue: { status: task.status },
  });

  if (task.createdBy.toString() !== req.user._id.toString()) {
    await notify({
      user: task.createdBy,
      type: 'TASK_STATUS_CHANGED',
      message: `"${task.title}" moved to ${task.status}`,
      entityType: 'TASK',
      entityId: task._id,
      projectId: req.project._id,
    });
  }

  return new ApiResponse(200, { task }, 'Status updated').send(res);
});

// PATCH /projects/:projectId/tasks/:taskId/progress  (OWNER, ADMIN, or assignee)
const updateTaskProgress = asyncHandler(async (req, res) => {
  const task = await loadTaskOrThrow(req.project._id, req.params.taskId);
  assertCanMutate(req, task, { assigneeAllowed: true });

  task.progress = req.body.progress;
  if (task.progress === 100) task.status = 'DONE';
  await task.save();

  return new ApiResponse(200, { task }, 'Progress updated').send(res);
});

// POST /projects/:projectId/tasks/:taskId/checklist  (OWNER, ADMIN, or assignee)
const addChecklistItem = asyncHandler(async (req, res) => {
  const task = await loadTaskOrThrow(req.project._id, req.params.taskId);
  assertCanMutate(req, task, { assigneeAllowed: true });

  task.checklist.push({ text: req.body.text, done: false });
  task.recalcProgressFromChecklist();
  await task.save();

  return new ApiResponse(201, { task }, 'Checklist item added').send(res);
});

// PATCH /projects/:projectId/tasks/:taskId/checklist/:itemId  (OWNER, ADMIN, or assignee)
const toggleChecklistItem = asyncHandler(async (req, res) => {
  const task = await loadTaskOrThrow(req.project._id, req.params.taskId);
  assertCanMutate(req, task, { assigneeAllowed: true });

  const item = task.checklist.id(req.params.itemId);
  if (!item) throw ApiError.notFound('Checklist item not found');

  item.done = req.body.done;
  task.recalcProgressFromChecklist();
  await task.save();

  return new ApiResponse(200, { task }, 'Checklist updated').send(res);
});

// DELETE /projects/:projectId/tasks/:taskId  (OWNER, ADMIN)
const deleteTask = asyncHandler(async (req, res) => {
  const task = await loadTaskOrThrow(req.project._id, req.params.taskId);
  assertCanMutate(req, task);

  task.isDeleted = true;
  await task.save();

  await logActivity({
    projectId: req.project._id,
    actor: req.user._id,
    action: 'TASK_DELETED',
    entityType: 'TASK',
    entityId: task._id,
  });

  return new ApiResponse(200, null, 'Task deleted').send(res);
});

// POST /projects/:projectId/tasks/:taskId/log-time  (OWNER, ADMIN, or assignee)
const logTime = asyncHandler(async (req, res) => {
  const task = await loadTaskOrThrow(req.project._id, req.params.taskId);
  assertCanMutate(req, task, { assigneeAllowed: true });

  task.loggedHours = (task.loggedHours || 0) + req.body.hours;
  await task.save();

  return new ApiResponse(200, { task }, 'Time logged').send(res);
});

// GET /my-tasks — tasks assigned to the current user across ALL their projects
const listMyTasks = asyncHandler(async (req, res) => {
  const memberships = await ProjectMember.find({ userId: req.user._id, status: 'ACTIVE' }).lean();
  const projectIds = memberships.map((m) => m.projectId);

  const { status, priority, projectId, page = 1, limit = 25 } = req.query;
  const filter = { projectId: { $in: projectIds }, assignee: req.user._id, isDeleted: false };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (projectId) filter.projectId = projectId;

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('projectId', 'name icon color')
      .sort({ dueDate: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Task.countDocuments(filter),
  ]);

  return new ApiResponse(200, { tasks }, undefined, { page: Number(page), limit: Number(limit), total }).send(res);
});

// POST /projects/:projectId/tasks/:taskId/timer/start  (OWNER, ADMIN, or assignee)
const startTimer = asyncHandler(async (req, res) => {
  const task = await loadTaskOrThrow(req.project._id, req.params.taskId);
  assertCanMutate(req, task, { assigneeAllowed: true });
  if (task.timerStartedAt) throw ApiError.badRequest('A timer is already running for this task');

  task.timerStartedAt = new Date();
  await task.save();
  return new ApiResponse(200, { task }, 'Timer started').send(res);
});

// POST /projects/:projectId/tasks/:taskId/timer/stop  (OWNER, ADMIN, or assignee)
const stopTimer = asyncHandler(async (req, res) => {
  const task = await loadTaskOrThrow(req.project._id, req.params.taskId);
  assertCanMutate(req, task, { assigneeAllowed: true });
  if (!task.timerStartedAt) throw ApiError.badRequest('No timer is running for this task');

  const elapsedHours = (Date.now() - task.timerStartedAt.getTime()) / (1000 * 60 * 60);
  task.loggedHours = Math.round(((task.loggedHours || 0) + elapsedHours) * 100) / 100;
  task.timerStartedAt = null;
  await task.save();

  return new ApiResponse(200, { task }, 'Timer stopped').send(res);
});

module.exports = {
  createTask,
  listTasks,
  getTask,
  updateTask,
  updateTaskStatus,
  updateTaskProgress,
  addChecklistItem,
  toggleChecklistItem,
  deleteTask,
  logTime,
  listMyTasks,
  startTimer,
  stopTimer,
};
