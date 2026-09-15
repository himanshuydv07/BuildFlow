const mongoose = require('mongoose');

// A template that the recurringTaskJob uses to stamp out real Task
// documents on a schedule. Not a Task itself.
const recurringTaskSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    frequency: { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY'], required: true },
    dayOfWeek: { type: Number, min: 0, max: 6, default: null }, // WEEKLY: 0=Sunday
    dayOfMonth: { type: Number, min: 1, max: 28, default: null }, // MONTHLY
    isActive: { type: Boolean, default: true },
    nextRunAt: { type: Date, required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RecurringTask', recurringTaskSchema);
