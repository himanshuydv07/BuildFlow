const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
      type: String,
      enum: ['REQUIREMENTS', 'DESIGN', 'DEVELOPMENT', 'REPORTS', 'OTHER'],
      default: 'OTHER',
    },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true }, // filename on disk, uuid-based
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { timestamps: true }
);

attachmentSchema.index({ projectId: 1, category: 1 });

module.exports = mongoose.model('Attachment', attachmentSchema);
