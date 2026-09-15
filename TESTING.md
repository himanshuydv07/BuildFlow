# Testing

## Honesty statement

This code was written in a sandboxed environment **with no outbound
network access** — `npm install` could not be run, so the test suite
below has **not been executed**. Everything in this document describes
what the tests are designed to check, not confirmed passing results.
Run them yourself:

```bash
cd backend
npm install
npm test
```

## What's covered

`tests/rbac.e2e.test.js` — the critical multi-user workflow from the
original spec (section 53):
1. User A registers, creates Project A, becomes OWNER.
2. User B registers, is invited, accepts as MEMBER.
3. User A creates and assigns a task to User B.
4. User B sees it in `/my-tasks` and updates its status.
5. User B creates Project B and becomes OWNER there.
6. User B is confirmed to remain MEMBER in Project A while being
   OWNER in Project B.
7. **User A is confirmed to have zero access to Project B** (404).
8. A MEMBER is confirmed unable to invite others or change their own role.

`tests/security.test.js`:
- Unauthenticated / garbage-token requests rejected with 401.
- Accessing a nonexistent project returns 404 without leaking a stack
  trace.
- A user with no membership in a project cannot list its tasks (404).
- Weak passwords and duplicate registration emails are rejected.

## What's NOT yet covered (write these next)

- File upload validation (type/size/malicious filename) — endpoints
  exist now (`file.controller.js`) but have no automated tests yet.
- Notes, saved views, analytics, reports, time tracking, recurring
  tasks, templates, Scrum (sprints/epics/burndown), and the assistant
  endpoint are all new in this pass and have no automated tests yet —
  they were verified by syntax-check, import-resolution check, and
  manual code review only, not by running requests against them.
- Concurrent role-change race conditions.
- Redis-unavailable degradation path (would need to actually stop the
  Redis container mid-test or mock `ioredis`).
- Frontend tests — none exist; the frontend was verified by brace/
  paren balance checks and import-resolution checks only, since this
  sandbox has no network access to install a bundler/test runner.
- Load/performance testing of pagination and aggregation queries at
  scale.
- Full Docker Compose clean-start validation (`docker compose down -v
  && docker compose up --build`) — this requires an environment with
  Docker and internet access to pull images, which this sandbox does
  not have. **You should run this yourself before considering the
  system verified**, per the project's own Rule 3 ("Do not claim
  Docker works unless you test the complete stack").
