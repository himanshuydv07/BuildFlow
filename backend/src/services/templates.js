/**
 * Static project templates (spec section 41). Applying a template only
 * pre-populates tasks/milestones at creation time — it does not change
 * ongoing behavior, and BLANK (no template) is always a valid choice.
 */
const TEMPLATES = {
  BLANK: { label: 'Blank Project', milestones: [], tasks: [] },

  SOFTWARE_DEVELOPMENT: {
    label: 'Software Development',
    milestones: [{ name: 'MVP Release', offsetDays: 30 }],
    tasks: [
      { title: 'Set up repository and CI', priority: 'HIGH' },
      { title: 'Design database schema', priority: 'HIGH' },
      { title: 'Build authentication', priority: 'HIGH' },
      { title: 'Implement core feature set', priority: 'MEDIUM' },
      { title: 'Write tests', priority: 'MEDIUM' },
      { title: 'Deploy to staging', priority: 'MEDIUM' },
    ],
  },

  COLLEGE_PROJECT: {
    label: 'College Project',
    milestones: [{ name: 'Submission Deadline', offsetDays: 21 }],
    tasks: [
      { title: 'Literature review', priority: 'MEDIUM' },
      { title: 'Draft proposal', priority: 'HIGH' },
      { title: 'Collect data / build prototype', priority: 'HIGH' },
      { title: 'Write report', priority: 'MEDIUM' },
      { title: 'Prepare presentation', priority: 'LOW' },
    ],
  },

  MARKETING_CAMPAIGN: {
    label: 'Marketing Campaign',
    milestones: [{ name: 'Campaign Launch', offsetDays: 14 }],
    tasks: [
      { title: 'Define target audience', priority: 'HIGH' },
      { title: 'Draft creative brief', priority: 'HIGH' },
      { title: 'Produce assets', priority: 'MEDIUM' },
      { title: 'Schedule channels', priority: 'MEDIUM' },
      { title: 'Launch and monitor', priority: 'HIGH' },
    ],
  },

  PRODUCT_LAUNCH: {
    label: 'Product Launch',
    milestones: [{ name: 'Launch Day', offsetDays: 45 }],
    tasks: [
      { title: 'Finalize positioning', priority: 'HIGH' },
      { title: 'Prepare launch materials', priority: 'MEDIUM' },
      { title: 'Brief sales/support teams', priority: 'MEDIUM' },
      { title: 'Coordinate launch day', priority: 'CRITICAL' },
      { title: 'Post-launch retrospective', priority: 'LOW' },
    ],
  },

  AGILE_SCRUM: {
    label: 'Agile / Scrum',
    workflow: 'SCRUM',
    milestones: [],
    tasks: [
      { title: 'Groom initial backlog', priority: 'HIGH', isBacklog: true },
      { title: 'Plan Sprint 1', priority: 'HIGH', isBacklog: true },
    ],
  },
};

function listTemplates() {
  return Object.entries(TEMPLATES).map(([key, t]) => ({ key, label: t.label }));
}

function getTemplate(key) {
  return TEMPLATES[key] || null;
}

module.exports = { listTemplates, getTemplate };
