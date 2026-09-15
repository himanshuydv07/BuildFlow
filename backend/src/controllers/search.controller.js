const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const ProjectMember = require('../models/ProjectMember');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const Milestone = require('../models/Milestone');
const User = require('../models/User');

// GET /search?q=...
//
// SECURITY: every collection queried here is first scoped to
// projectIds the requesting user is an ACTIVE member of. A user must
// never see a search result for a project/task/comment they cannot
// otherwise access — there is no "public" search across all data.
const search = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) throw ApiError.badRequest('Search query must be at least 2 characters');

  const memberships = await ProjectMember.find({ userId: req.user._id, status: 'ACTIVE' }).lean();
  const projectIds = memberships.map((m) => m.projectId);

  if (projectIds.length === 0) {
    return new ApiResponse(200, { projects: [], tasks: [], milestones: [], comments: [], members: [] }).send(res);
  }

  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const [projects, tasks, milestones, comments, memberUserIds] = await Promise.all([
    Project.find({ _id: { $in: projectIds }, isArchived: false, name: regex }).limit(10).lean(),
    Task.find({ projectId: { $in: projectIds }, isDeleted: false, title: regex }).limit(15).populate('projectId', 'name').lean(),
    Milestone.find({ projectId: { $in: projectIds }, name: regex }).limit(10).populate('projectId', 'name').lean(),
    Comment.find({ projectId: { $in: projectIds }, isDeleted: false, content: regex }).limit(10).populate('author', 'name').lean(),
    ProjectMember.find({ projectId: { $in: projectIds }, status: 'ACTIVE' }).distinct('userId'),
  ]);

  const members = await User.find({ _id: { $in: memberUserIds }, name: regex }).select('name email avatarUrl').limit(10).lean();

  return new ApiResponse(200, { projects, tasks, milestones, comments, members }).send(res);
});

module.exports = { search };
