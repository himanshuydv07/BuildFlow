const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const Task = require('../models/Task');
const Milestone = require('../models/Milestone');
const ProjectMember = require('../models/ProjectMember');

function toCsvValue(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(rows, columns) {
  const header = columns.map((c) => toCsvValue(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => toCsvValue(c.value(row))).join(','));
  return [header, ...lines].join('\n');
}

// GET /projects/:projectId/reports/summary — JSON summary report
const getSummaryReport = asyncHandler(async (req, res) => {
  const projectId = req.project._id;
  const [tasks, milestones, members] = await Promise.all([
    Task.find({ projectId, isDeleted: false }).populate('assignee', 'name').lean(),
    Milestone.find({ projectId }).lean(),
    ProjectMember.find({ projectId, status: 'ACTIVE' }).populate('userId', 'name').lean(),
  ]);

  const now = new Date();
  const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE');
  const done = tasks.filter((t) => t.status === 'DONE');

  return new ApiResponse(200, {
    project: { name: req.project.name, status: req.project.status, generatedAt: now },
    totals: { tasks: tasks.length, done: done.length, overdue: overdue.length, members: members.length, milestones: milestones.length },
    completionRate: tasks.length ? Math.round((done.length / tasks.length) * 100) : 0,
    overdueTasks: overdue.map((t) => ({ title: t.title, assignee: t.assignee?.name, dueDate: t.dueDate })),
    milestones: milestones.map((m) => ({ name: m.name, status: m.status, progress: m.progress })),
  }).send(res);
});

// GET /projects/:projectId/reports/export.csv — task list export
//
// Honest limitation: PDF and Excel export are not implemented in this
// pass (would require pdfkit/exceljs, extra dependencies not verified
// in this sandbox). CSV covers the same underlying data and opens
// cleanly in Excel/Sheets, which is why it comes first.
const exportTasksCsv = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ projectId: req.project._id, isDeleted: false })
    .populate('assignee', 'name')
    .populate('milestone', 'name')
    .lean();

  const csv = toCsv(tasks, [
    { label: 'Title', value: (t) => t.title },
    { label: 'Status', value: (t) => t.status },
    { label: 'Priority', value: (t) => t.priority },
    { label: 'Assignee', value: (t) => t.assignee?.name || '' },
    { label: 'Milestone', value: (t) => t.milestone?.name || '' },
    { label: 'Progress', value: (t) => t.progress },
    { label: 'Due Date', value: (t) => (t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : '') },
    { label: 'Estimated Hours', value: (t) => t.estimatedHours },
    { label: 'Logged Hours', value: (t) => t.loggedHours },
  ]);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${req.project.name.replace(/[^a-z0-9]/gi, '_')}_tasks.csv"`);
  res.send(csv);
});

module.exports = { getSummaryReport, exportTasksCsv };
