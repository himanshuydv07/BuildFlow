const ProjectMember = require('../models/ProjectMember');
const env = require('../config/env');
const { safeGet, safeSet, safeDel } = require('../config/redis');

/**
 * THIS FILE IS THE SINGLE SOURCE OF TRUTH FOR "WHAT CAN THIS USER DO
 * IN THIS PROJECT". Every controller and every RBAC middleware call
 * goes through here rather than querying ProjectMember directly, so
 * authorization logic is never duplicated or reimplemented slightly
 * differently in different places.
 */

const cacheKey = (userId, projectId) => `membership:${userId}:${projectId}`;

/**
 * Returns the active ProjectMember doc (plain object) for a user in a
 * project, or null if the user has no active membership. Cached in
 * Redis for CACHE_MEMBERSHIP_TTL seconds; falls back to Mongo directly
 * if Redis is unavailable.
 */
async function getMembership(userId, projectId) {
  const key = cacheKey(userId, projectId);
  const cached = await safeGet(key);
  if (cached !== null) {
    try {
      return JSON.parse(cached);
    } catch {
      // fall through to DB on corrupt cache entry
    }
  }

  const membership = await ProjectMember.findOne({
    userId,
    projectId,
    status: 'ACTIVE',
  }).lean();

  // Cache both hits and misses (as a sentinel) to avoid hammering Mongo
  // with repeated lookups for users who aren't members of a project.
  await safeSet(key, JSON.stringify(membership || null), env.cache.membershipTtl);

  return membership;
}

async function getRole(userId, projectId) {
  const membership = await getMembership(userId, projectId);
  return membership ? membership.role : null;
}

async function isOwner(userId, projectId) {
  return (await getRole(userId, projectId)) === 'OWNER';
}

async function hasAnyRole(userId, projectId, roles) {
  const role = await getRole(userId, projectId);
  return role !== null && roles.includes(role);
}

/**
 * Must be called any time a ProjectMember document is created, updated,
 * or removed (role change, invite acceptance, removal, ownership
 * transfer) so stale permissions are never served from cache.
 *
 * We track known per-project cache keys is unnecessary complexity for
 * this scale of app — instead we invalidate the single user+project
 * key directly, which covers every mutation path in this codebase
 * (they all know both userId and projectId at the point of mutation).
 */
async function invalidateMembership(userId, projectId) {
  await safeDel(cacheKey(userId, projectId));
}

module.exports = {
  getMembership,
  getRole,
  isOwner,
  hasAnyRole,
  invalidateMembership,
};
