const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Project = require('../models/Project');
const { ROLE_RANK } = require('../models/ProjectMember');
const membershipService = require('../services/membershipService');

/**
 * Loads the :projectId route param, verifies it exists, and attaches
 * req.project. Must run before requireProjectRole.
 */
const loadProject = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  if (!projectId) throw ApiError.badRequest('projectId is required');

  const project = await Project.findById(projectId).lean();
  if (!project) {
    // Deliberately identical error to "no permission" elsewhere in the
    // app would leak existence; 404 here is correct because the route
    // itself is project-scoped and the resource genuinely doesn't exist.
    throw ApiError.notFound('Project not found');
  }
  req.project = project;
  next();
});

/**
 * Requires the authenticated user to hold ACTIVE membership in
 * req.project with one of the given roles. Must run after requireAuth
 * and loadProject. Attaches req.membership for downstream handlers.
 *
 * This is THE enforcement point — every protected project route uses
 * this instead of re-deriving permissions inline.
 */
function requireProjectRole(...allowedRoles) {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) throw ApiError.unauthorized();
    if (!req.project) throw ApiError.internal('requireProjectRole used without loadProject');

    const membership = await membershipService.getMembership(req.user._id.toString(), req.project._id.toString());

    if (!membership) {
      // A non-member requesting a project-scoped resource gets 404, not
      // 403 — this avoids confirming to unauthorized users that a
      // specific project ID exists and they're merely "not allowed in".
      throw ApiError.notFound('Project not found');
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
      throw ApiError.forbidden(`This action requires one of: ${allowedRoles.join(', ')}`);
    }

    req.membership = membership;
    next();
  });
}

/** Convenience: any active membership at all (VIEWER and above). */
const requireProjectMember = () => requireProjectRole('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

/**
 * Authorizes an action against a *target* member's role using rank
 * comparison, e.g. "an ADMIN cannot change the role of another ADMIN
 * or an OWNER, only MEMBER/VIEWER". Used inside member-management
 * controllers after requireProjectRole has already run.
 */
function canManageTargetRole(actingRole, targetRole) {
  if (actingRole === 'OWNER') return true;
  if (actingRole === 'ADMIN') return ROLE_RANK[targetRole] < ROLE_RANK.ADMIN;
  return false;
}

module.exports = {
  loadProject,
  requireProjectRole,
  requireProjectMember,
  canManageTargetRole,
};
