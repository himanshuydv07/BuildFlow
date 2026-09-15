/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const Task = require('../models/Task');
const Milestone = require('../models/Milestone');

/**
 * Safe, idempotent development seed.
 *
 * Rules (per spec section 57):
 *   - Never overwrite existing users' passwords or data.
 *   - If a seed user/project already exists, report that it was
 *     skipped rather than silently claiming it was (re)created.
 */

const SEED_USERS = [
  { name: 'Rahul Sharma', email: 'rahul@buildflow.dev', password: 'Password123!' },
  { name: 'Alice Johnson', email: 'alice@buildflow.dev', password: 'Password123!' },
  { name: 'Priya Patel', email: 'priya@buildflow.dev', password: 'Password123!' },
];

async function upsertSeedUser(spec) {
  const existing = await User.findOne({ email: spec.email });
  if (existing) {
    console.log(`[seed] User already exists, skipping: ${spec.email}`);
    return existing;
  }
  const user = await User.create({ ...spec, isEmailVerified: true });
  console.log(`[seed] Created user: ${spec.email} / ${spec.password}`);
  return user;
}

async function run() {
  await mongoose.connect(env.mongoUri);
  console.log(`[seed] Connected to ${env.mongoUri}`);

  const [rahul, alice, priya] = await Promise.all(SEED_USERS.map(upsertSeedUser));

  const existingProject = await Project.findOne({ name: 'Demo: Website Redesign', ownerId: rahul._id });
  if (existingProject) {
    console.log('[seed] Demo project already exists, skipping project/task/member seed.');
  } else {
    const project = await Project.create({
      name: 'Demo: Website Redesign',
      description: 'Sample project demonstrating project-scoped RBAC — seeded for local development.',
      ownerId: rahul._id,
      status: 'ACTIVE',
      priority: 'HIGH',
      startDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      tags: ['demo', 'web'],
      icon: '🚀',
    });

    await ProjectMember.create([
      { projectId: project._id, userId: rahul._id, role: 'OWNER' },
      { projectId: project._id, userId: alice._id, role: 'ADMIN' },
      { projectId: project._id, userId: priya._id, role: 'MEMBER' },
    ]);

    const milestone = await Milestone.create({
      projectId: project._id,
      name: 'MVP Launch',
      description: 'First public version of the redesigned site',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'IN_PROGRESS',
      createdBy: rahul._id,
    });

    await Task.create([
      {
        projectId: project._id,
        title: 'Set up authentication API',
        description: 'Register/login/JWT flow',
        status: 'DONE',
        priority: 'HIGH',
        assignee: alice._id,
        createdBy: rahul._id,
        milestone: milestone._id,
        progress: 100,
      },
      {
        projectId: project._id,
        title: 'Design Kanban board UI',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        assignee: priya._id,
        createdBy: rahul._id,
        milestone: milestone._id,
        progress: 40,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        projectId: project._id,
        title: 'Write API documentation',
        status: 'TODO',
        priority: 'LOW',
        createdBy: rahul._id,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // intentionally overdue, for dashboard demo
      },
    ]);

    console.log(`[seed] Created demo project "${project.name}" with 1 milestone and 3 tasks.`);
  }

  console.log('\n[seed] Done. Demo login credentials:');
  SEED_USERS.forEach((u) => console.log(`  ${u.email} / ${u.password}`));

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
