const express = require('express');
const controller = require('../controllers/file.controller');
const { requireAuth } = require('../middleware/auth');
const { loadProject, requireProjectMember } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { projectIdParams } = require('../validators/project.validators');
const { upload } = require('../config/upload');
const ApiError = require('../utils/ApiError');

const router = express.Router({ mergeParams: true });
router.use(requireAuth, validate({ params: projectIdParams }), loadProject, requireProjectMember());

function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) return next(ApiError.badRequest(err.message));
    next();
  });
}

router.post('/', handleUpload, controller.uploadFile);
router.get('/', controller.listFiles);
router.get('/:fileId/download', controller.downloadFile);
router.delete('/:fileId', controller.deleteFile);

module.exports = router;
