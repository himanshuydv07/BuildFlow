const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: '', maxlength: 2000 },
    startDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    status: { type: String, enum: ['UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'], default: 'UPCOMING' },
    // progress is computed from associated tasks (see milestone.controller)
    // and cached here for fast dashboard reads.
    progress: { type: Number, min: 0, max: 100, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

milestoneSchema.index({ projectId: 1, dueDate: 1 });

module.exports = mongoose.model('Milestone', milestoneSchema);
