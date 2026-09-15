const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Epic = require('../models/Epic');

const MANAGE_ROLES = ['OWNER', 'ADMIN'];

const createEpic = asyncHandler(async (req, res) => {
  if (!MANAGE_ROLES.includes(req.membership.role)) throw ApiError.forbidden('Only owners/admins can create epics');
  const epic = await Epic.create({ ...req.body, projectId: req.project._id, createdBy: req.user._id });
  return new ApiResponse(201, { epic }, 'Epic created').send(res);
});

const listEpics = asyncHandler(async (req, res) => {
  const epics = await Epic.find({ projectId: req.project._id }).sort({ createdAt: 1 }).lean();
  return new ApiResponse(200, { epics }).send(res);
});

const deleteEpic = asyncHandler(async (req, res) => {
  if (!MANAGE_ROLES.includes(req.membership.role)) throw ApiError.forbidden('Only owners/admins can delete epics');
  const epic = await Epic.findOneAndDelete({ _id: req.params.epicId, projectId: req.project._id });
  if (!epic) throw ApiError.notFound('Epic not found');
  return new ApiResponse(200, null, 'Epic deleted').send(res);
});

module.exports = { createEpic, listEpics, deleteEpic };
