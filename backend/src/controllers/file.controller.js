const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Attachment = require('../models/Attachment');
const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const { getDownloadUrl, deleteStoredFile, storedNameFrom } = require('../config/storage');
const { logActivity } = require('../services/activityService');

// POST /projects/:projectId/files  (multipart, field name "file")
const uploadFile = asyncHandler(async (req, res) => {
  if (req.membership.role === 'VIEWER') throw ApiError.forbidden('Viewers cannot upload files');
  if (!req.file) throw ApiError.badRequest('No file uploaded');

  const attachment = await Attachment.create({
    projectId: req.project._id,
    taskId: req.body.taskId || null,
    uploadedBy: req.user._id,
    category: req.body.category || 'OTHER',
    originalName: req.file.originalname,
    storedName: storedNameFrom(req.file),
    mimeType: req.file.mimetype,
    size: req.file.size,
  });

  await logActivity({
    projectId: req.project._id,
    actor: req.user._id,
    action: 'FILE_UPLOADED',
    entityType: 'FILE',
    entityId: attachment._id,
    newValue: { name: attachment.originalName },
  });

  return new ApiResponse(201, { file: attachment }, 'File uploaded').send(res);
});

// GET /projects/:projectId/files?category=&taskId=
const listFiles = asyncHandler(async (req, res) => {
  const filter = { projectId: req.project._id };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.taskId) filter.taskId = req.query.taskId;

  const files = await Attachment.find(filter).populate('uploadedBy', 'name').sort({ createdAt: -1 }).lean();
  return new ApiResponse(200, { files }).send(res);
});

// GET /projects/:projectId/files/:fileId/download
const downloadFile = asyncHandler(async (req, res) => {
  const file = await Attachment.findOne({ _id: req.params.fileId, projectId: req.project._id });
  if (!file) throw ApiError.notFound('File not found');

  const redirectUrl = await getDownloadUrl(file.storedName);
  if (redirectUrl) {
    // S3-compatible storage: short-lived presigned URL, browser/axios
    // follows the redirect and downloads directly from the bucket.
    return res.redirect(302, redirectUrl);
  }

  // Local disk storage.
  const filePath = path.join(env.uploads.dir, file.storedName);
  if (!fs.existsSync(filePath)) throw ApiError.notFound('File is missing from storage');
  res.download(filePath, file.originalName);
});

// DELETE /projects/:projectId/files/:fileId  (uploader, or OWNER/ADMIN)
const deleteFile = asyncHandler(async (req, res) => {
  const file = await Attachment.findOne({ _id: req.params.fileId, projectId: req.project._id });
  if (!file) throw ApiError.notFound('File not found');

  const canManage = ['OWNER', 'ADMIN'].includes(req.membership.role);
  if (file.uploadedBy.toString() !== req.user._id.toString() && !canManage) {
    throw ApiError.forbidden('You do not have permission to delete this file');
  }

  await deleteStoredFile(file.storedName);
  await file.deleteOne();

  return new ApiResponse(200, null, 'File deleted').send(res);
});

module.exports = { uploadFile, listFiles, downloadFile, deleteFile };
