const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    // A personal note has projectId = null and is visible only to its author.
    // A project note is scoped to a project and visible to active members.
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    content: { type: String, default: '', maxlength: 20000 },
    tags: [{ type: String, trim: true, maxlength: 30 }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Note', noteSchema);
