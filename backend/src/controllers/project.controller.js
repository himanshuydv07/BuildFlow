const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const Task = require('../models/Task');
const { logActivity } = require('../services/activityService');
const { invalidateMembership } = require('../services/membershipService');
const { notify } = require('../services/notificationService');
const { getTemplate, listTemplates } = require('../services/templates');
const Milestone = require('../models/Milestone');

// POST /projects
//
// NOTE ON TRANSACTIONS: MongoDB multi-document transactions require a
// replica set (even a single-node one), which the default docker-compose
// "mongo" service here is not configured as, to keep local setup simple.
// So this creates the Project first, then the OWNER membership; if the
// process crashes between the two writes, a project would exist with no
// membership record. This is mitigated by (a) doing the second write
// immediately with no work in between, and (b) the health/consistency
// check job could reconcile orphaned projects. For a production
// deployment, enable a single-node replica set and wrap this in a real
// session.withTransaction() — see docs/ARCHITECTURE.md.
const createProject = asyncHandler(async (req, res) => {
  const { templateKey, ...projectFields } = req.body;
  const template = templateKey ? getTemplate(templateKey) : null;

  const project = await Project.create({
    ...projectFields,
    ownerId: req.user._id,
    templateKey: templateKey || null,
    workflow: template?.workflow || 'KANBAN',
  });
  await ProjectMember.create({ projectId: project._id, userId: req.user._id, role: 'OWNER', status: 'ACTIVE' });

  if (template) {
    const now = Date.now();
    const milestoneDocs = await Promise.all(
      (template.milestones || []).map((m) =>
        Milestone.create({
          projectId: project._id,
          name: m.name,
          dueDate: new Date(now + m.offsetDays * 24 * 60 * 60 * 1000),
          createdBy: req.user._id,
        })
      )
    );
    await Task.insertMany(
      (template.tasks || []).map((t) => ({
        projectId: project._id,
        title: t.title,
        priority: t.priority || 'MEDIUM',
        isBacklog: !!t.isBacklog,
        createdBy: req.user._id,
        milestone: milestoneDocs[0]?._id || null,
      }))
    );
  }

  await logActivity({
    projectId: project._id,
    actor: req.user._id,
    action: 'PROJECT_CREATED',
    entityType: 'PROJECT',
    entityId: project._id,
    newValue: { name: project.name },
  });

  return new ApiResponse(201, { project }, 'Project created').send(res);
});

// GET /projects  -> "My Projects" (owned) + optional ?scope=shared
const listMyProjects = asyncHandler(async (req, res) => {
  const memberships = await ProjectMember.find({ userId: req.user._id, status: 'ACTIVE' }).lean();
  const projectIds = memberships.map((m) => m.projectId);

  const projects = await Project.find({ _id: { $in: projectIds }, isArchived: false })
    .sort({ updatedAt: -1 })
    .lean();

  const roleByProject = Object.fromEntries(memberships.map((m) => [m.projectId.toString(), m.role]));

  const owned = [];
  const shared = [];
  for (const p of projects) {
    const withRole = { ...p, myRole: roleByProject[p._id.toString()] };
    if (withRole.myRole === 'OWNER') owned.push(withRole);
    else shared.push(withRole);
  }

  return new ApiResponse(200, { owned, shared }).send(res);
});

// GET /projects/:projectId
const getProject = asyncHandler(async (req, res) => {
  // req.project / req.membership already loaded+authorized by rbac middleware
  return new ApiResponse(200, { project: req.project, myRole: req.membership.role }).send(res);
});

// PATCH /projects/:projectId  (OWNER, ADMIN)
const updateProject = asyncHandler(async (req, res) => {
  const previous = { ...req.project };
  const updated = await Project.findByIdAndUpdate(req.project._id, req.body, {
    new: true,
    runValidators: true,
  });

  await logActivity({
    projectId: req.project._id,
    actor: req.user._id,
    action: 'PROJECT_UPDATED',
    entityType: 'PROJECT',
    entityId: req.project._id,
    previousValue: previous,
    newValue: req.body,
  });

  return new ApiResponse(200, { project: updated }, 'Project updated').send(res);
});

// DELETE /projects/:projectId  (OWNER only) — soft delete via archive
const archiveProject = asyncHandler(async (req, res) => {
  if (req.membership.role !== 'OWNER') {
    throw ApiError.forbidden('Only the project owner can archive this project');
  }

  const updated = await Project.findByIdAndUpdate(
    req.project._id,
    { isArchived: true, status: 'ARCHIVED' },
    { new: true }
  );

  await logActivity({
    projectId: req.project._id,
    actor: req.user._id,
    action: 'PROJECT_ARCHIVED',
    entityType: 'PROJECT',
    entityId: req.project._id,
  });

  return new ApiResponse(200, { project: updated }, 'Project archived').send(res);
});

// POST /projects/:projectId/transfer-ownership  (OWNER only)
const transferOwnership = asyncHandler(async (req, res) => {
  if (req.membership.role !== 'OWNER') {
    throw ApiError.forbidden('Only the current owner can transfer ownership');
  }

  const { newOwnerId } = req.body;
  if (newOwnerId === req.user._id.toString()) {
    throw ApiError.badRequest('User is already the owner');
  }

  const targetMembership = await ProjectMember.findOne({
    projectId: req.project._id,
    userId: newOwnerId,
    status: 'ACTIVE',
  });
  if (!targetMembership) {
    throw ApiError.badRequest('The new owner must already be an active member of this project');
  }

  // See NOTE ON TRANSACTIONS above createProject — sequential writes,
  // no async work between them, on a standalone Mongo instance.
  await ProjectMember.updateOne({ projectId: req.project._id, userId: req.user._id }, { role: 'ADMIN' });
  targetMembership.role = 'OWNER';
  await targetMembership.save();
  await Project.updateOne({ _id: req.project._id }, { ownerId: newOwnerId });

  await Promise.all([
    invalidateMembership(req.user._id.toString(), req.project._id.toString()),
    invalidateMembership(newOwnerId, req.project._id.toString()),
  ]);

  await logActivity({
    projectId: req.project._id,
    actor: req.user._id,
    action: 'OWNERSHIP_TRANSFERRED',
    entityType: 'PROJECT',
    entityId: req.project._id,
    previousValue: { ownerId: req.user._id },
    newValue: { ownerId: newOwnerId },
  });

  await notify({
    user: newOwnerId,
    type: 'ROLE_CHANGED',
    message: `You are now the owner of "${req.project.name}"`,
    entityType: 'PROJECT',
    entityId: req.project._id,
    projectId: req.project._id,
  });

  return new ApiResponse(200, null, 'Ownership transferred').send(res);
});

// GET /projects/:projectId/dashboard
const getProjectDashboard = asyncHandler(async (req, res) => {
  const projectId = req.project._id;
  const now = new Date();

  const [statusCounts, overdueCount, memberCount] = await Promise.all([
    Task.aggregate([
      { $match: { projectId, isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Task.countDocuments({ projectId, isDeleted: false, dueDate: { $lt: now }, status: { $ne: 'DONE' } }),
    ProjectMember.countDocuments({ projectId, status: 'ACTIVE' }),
  ]);

  const counts = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, BLOCKED: 0, DONE: 0 };
  statusCounts.forEach((s) => {
    counts[s._id] = s.count;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const completionRate = total > 0 ? Math.round((counts.DONE / total) * 100) : 0;

  // Simple, explainable health heuristic (not a black-box score):
  // CRITICAL if >25% of tasks are overdue, AT_RISK if >10%, else HEALTHY.
  const overdueRatio = total > 0 ? overdueCount / total : 0;
  let health = 'HEALTHY';
  if (overdueRatio > 0.25) health = 'CRITICAL';
  else if (overdueRatio > 0.1) health = 'AT_RISK';

  return new ApiResponse(200, {
    taskCounts: counts,
    totalTasks: total,
    overdueCount,
    completionRate,
    memberCount,
    health,
  }).send(res);
});

// GET /projects/templates — available project templates (static)
const getTemplateList = asyncHandler(async (req, res) => {
  return new ApiResponse(200, { templates: listTemplates() }).send(res);
});

module.exports = {
  createProject,
  listMyProjects,
  getProject,
  updateProject,
  archiveProject,
  transferOwnership,
  getProjectDashboard,
  getTemplateList,
};
