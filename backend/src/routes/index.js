const express = require('express');

const authRoutes = require('./auth.routes');
const projectRoutes = require('./project.routes');
const memberRoutes = require('./member.routes');
const projectInvitationRoutes = require('./projectInvitation.routes');
const invitationRoutes = require('./invitation.routes');
const taskRoutes = require('./task.routes');
const milestoneRoutes = require('./milestone.routes');
const commentRoutes = require('./comment.routes');
const activityRoutes = require('./activity.routes');
const notificationRoutes = require('./notification.routes');
const myTasksRoutes = require('./myTasks.routes');
const { searchRouter, dashboardRouter } = require('./misc.routes');
const projectNoteRoutes = require('./projectNote.routes');
const noteRoutes = require('./note.routes');
const fileRoutes = require('./file.routes');
const savedViewRoutes = require('./savedView.routes');
const analyticsRoutes = require('./analytics.routes');
const reportRoutes = require('./report.routes');
const sprintRoutes = require('./sprint.routes');
const epicRoutes = require('./epic.routes');
const recurringTaskRoutes = require('./recurringTask.routes');
const assistantRoutes = require('./assistant.routes');

const router = express.Router();

router.use('/auth', authRoutes);

// Nested, project-scoped resources. Each nested router re-validates
// :projectId and re-runs RBAC middleware independently (defense in
// depth — never trust that a parent router already authorized this).
router.use('/projects', projectRoutes);
router.use('/projects/:projectId/members', memberRoutes);
router.use('/projects/:projectId/invitations', projectInvitationRoutes);
router.use('/projects/:projectId/tasks', taskRoutes);
router.use('/projects/:projectId/tasks/:taskId/comments', commentRoutes);
router.use('/projects/:projectId/milestones', milestoneRoutes);
router.use('/projects/:projectId/activity', activityRoutes);
router.use('/projects/:projectId/notes', projectNoteRoutes);
router.use('/projects/:projectId/files', fileRoutes);
router.use('/projects/:projectId/saved-views', savedViewRoutes);
router.use('/projects/:projectId/analytics', analyticsRoutes);
router.use('/projects/:projectId/reports', reportRoutes);
router.use('/projects/:projectId/sprints', sprintRoutes);
router.use('/projects/:projectId/epics', epicRoutes);
router.use('/projects/:projectId/recurring-tasks', recurringTaskRoutes);
router.use('/projects/:projectId/assistant', assistantRoutes);

router.use('/invitations', invitationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/my-tasks', myTasksRoutes);
router.use('/notes', noteRoutes);
router.use('/search', searchRouter);
router.use('/dashboard', dashboardRouter);

module.exports = router;
