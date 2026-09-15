const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const SavedView = require('../models/SavedView');

const createSavedView = asyncHandler(async (req, res) => {
  const view = await SavedView.create({ ...req.body, projectId: req.project._id, userId: req.user._id });
  return new ApiResponse(201, { view }, 'View saved').send(res);
});

const listSavedViews = asyncHandler(async (req, res) => {
  const views = await SavedView.find({ projectId: req.project._id, userId: req.user._id }).sort({ createdAt: -1 }).lean();
  return new ApiResponse(200, { views }).send(res);
});

const deleteSavedView = asyncHandler(async (req, res) => {
  const view = await SavedView.findOne({ _id: req.params.viewId, projectId: req.project._id, userId: req.user._id });
  if (!view) throw ApiError.notFound('Saved view not found');
  await view.deleteOne();
  return new ApiResponse(200, null, 'View deleted').send(res);
});

module.exports = { createSavedView, listSavedViews, deleteSavedView };
