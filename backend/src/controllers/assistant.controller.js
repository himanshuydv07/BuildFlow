const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const Task = require('../models/Task');
const Milestone = require('../models/Milestone');
const ActivityLog = require('../models/ActivityLog');

/**
 * Project-aware assistant (spec section 45).
 *
 * HONEST IMPLEMENTATION NOTE: this environment has no outbound network
 * access, so this cannot call a real LLM API. What's here is a
 * deterministic, rule-based intent matcher over the project's own
 * data — it recognizes a handful of the example questions from the
 * spec and answers them from real Mongo queries, nothing invented.
 *
 * It is written so a real LLM call is a drop-in replacement: swap
 * `answerDeterministically()` for a call to whatever provider you use
 * (e.g. the Anthropic Messages API), passing it the SAME
 * already-authorized `context` object built below as grounding data.
 * The critical security property to preserve either way: only ever
 * pass data the requesting user's project membership already permits
 * them to see (enforced by requireProjectMember before this runs) —
 * never let the model's own knowledge or a crafted prompt substitute
 * for that check.
 */

async function buildContext(projectId) {
  const now = new Date();
  const [tasks, milestones, recentActivity] = await Promise.all([
    Task.find({ projectId, isDeleted: false }).populate('assignee', 'name').lean(),
    Milestone.find({ projectId }).lean(),
    ActivityLog.find({ projectId }).populate('actor', 'name').sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  return { now, tasks, milestones, recentActivity };
}

function answerDeterministically(query, ctx) {
  const q = query.toLowerCase();
  const { tasks, milestones, now } = ctx;

  const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE');
  const blocked = tasks.filter((t) => t.status === 'BLOCKED');
  const critical = tasks.filter((t) => t.priority === 'CRITICAL' && t.status !== 'DONE');
  const delayedMilestones = milestones.filter((m) => m.dueDate && new Date(m.dueDate) < now && m.status !== 'COMPLETED');

  if (/at risk|risk/.test(q)) {
    const atRisk = [...new Set([...overdue, ...critical])];
    if (atRisk.length === 0) return "Nothing looks at risk right now — no overdue or critical open tasks.";
    return `${atRisk.length} task(s) look at risk: ${atRisk.slice(0, 8).map((t) => t.title).join(', ')}${atRisk.length > 8 ? '…' : ''}.`;
  }

  if (/block/.test(q)) {
    if (blocked.length === 0) return 'No tasks are currently marked BLOCKED.';
    return `${blocked.length} task(s) are blocking progress: ${blocked.map((t) => t.title).join(', ')}.`;
  }

  if (/milestone/.test(q) && /(behind|delay|late)/.test(q)) {
    if (delayedMilestones.length === 0) return 'No milestones are behind schedule.';
    return `${delayedMilestones.length} milestone(s) are behind schedule: ${delayedMilestones.map((m) => m.name).join(', ')}.`;
  }

  if (/summar/.test(q) && /(activity|recent)/.test(q)) {
    if (ctx.recentActivity.length === 0) return 'No recent activity recorded.';
    const lines = ctx.recentActivity.slice(0, 5).map((a) => `${a.actor?.name || 'Someone'} ${a.action.replace(/_/g, ' ').toLowerCase()}`);
    return `Recent activity: ${lines.join('; ')}.`;
  }

  if (/summar/.test(q) && /project/.test(q)) {
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const rate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    return `${tasks.length} tasks total, ${rate}% complete. ${overdue.length} overdue, ${blocked.length} blocked, ${milestones.length} milestone(s) tracked.`;
  }

  return (
    "I can answer questions like: \"what tasks are at risk?\", \"what is blocking the release?\", " +
    "\"which milestones are behind schedule?\", or \"summarize this project.\" " +
    "Try rephrasing your question along those lines."
  );
}

// POST /projects/:projectId/assistant/query  { query }
const askAssistant = asyncHandler(async (req, res) => {
  const ctx = await buildContext(req.project._id);
  const answer = answerDeterministically(req.body.query, ctx);
  return new ApiResponse(200, { answer }).send(res);
});

module.exports = { askAssistant };
