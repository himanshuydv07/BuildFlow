const mongoose = require('mongoose');

const savedViewSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    filters: {
      status: { type: String, default: null },
      priority: { type: String, default: null },
      assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      tag: { type: String, default: null },
      dueWithinDays: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SavedView', savedViewSchema);
