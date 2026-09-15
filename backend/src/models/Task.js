const mongoose = require('mongoose');

const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'DONE'];
const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const checklistItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, maxlength: 200 },
    done: { type: Boolean, default: false },
  },
  { _id: true, timestamps: false }
);

const taskSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 5000 },

    status: { type: String, enum: TASK_STATUSES, default: 'TODO', index: true },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'MEDIUM' },

    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    milestone: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone', default: null },

    startDate: { type: Date, default: null },
    dueDate: { type: Date, default: null, index: true },

    progress: { type: Number, min: 0, max: 100, default: 0 },

    tags: [{ type: String, trim: true, maxlength: 30 }],

    estimatedHours: { type: Number, default: 0, min: 0 },
    loggedHours: { type: Number, default: 0, min: 0 },

    checklist: [checklistItemSchema],

    // Tasks this task depends on (must typically complete first).
    dependsOn: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],

    // Scrum-mode fields — unused/ignored when project.workflow is KANBAN.
    storyPoints: { type: Number, min: 0, max: 100, default: null },
    epic: { type: mongoose.Schema.Types.ObjectId, ref: 'Epic', default: null },
    sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint', default: null },
    isBacklog: { type: Boolean, default: false },

    // Time tracking: set while a timer is running, cleared (and folded
    // into loggedHours) on stop.
    timerStartedAt: { type: Date, default: null },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ projectId: 1, assignee: 1 });
taskSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Auto-progress from checklist when the checklist is non-empty and the
// caller hasn't explicitly set progress in the same update.
taskSchema.methods.recalcProgressFromChecklist = function recalcProgressFromChecklist() {
  if (!this.checklist || this.checklist.length === 0) return;
  const done = this.checklist.filter((i) => i.done).length;
  this.progress = Math.round((done / this.checklist.length) * 100);
};

module.exports = mongoose.model('Task', taskSchema);
module.exports.TASK_STATUSES = TASK_STATUSES;
module.exports.TASK_PRIORITIES = TASK_PRIORITIES;
