# BuildFlow

A multi-user project management platform built around **project-scoped
RBAC**: a user's permissions (Owner / Admin / Member / Viewer) are
determined per-project, not by a single global role. The same person
can own one project, be a Member in another, and an Admin in a third.

## Status of this build

This is the **backend API**, built phase-by-phase and functionally
complete for the core feature set below. The frontend (React/Vite/
Tailwind) has not been built yet — see "Next steps."

**Implemented:**
- Auth: register, login, logout, rotating refresh tokens, change
  password, forgot/reset password, email verification (dev-mode logs
  links to the console since no SMTP is required to run locally).
- Project-scoped RBAC: `ProjectMember` is the single source of truth
  for permissions, enforced by backend middleware on every route —
  never inferred on the frontend.
- Projects: create, list ("My Projects" / "Shared With Me"), update,
  archive, ownership transfer, per-project dashboard with a
  transparent (non-black-box) health heuristic.
- Members: list, role change (rank-limited — an Admin can't touch
  another Admin or the Owner), remove, leave.
- Invitations: invite by email, accept/reject/cancel, expiry, no
  duplicate pending invites.
- Tasks: full CRUD, status/progress updates (Owner/Admin or the
  assignee only), checklist subtasks, dependency graph with cycle
  detection, cross-project "My Tasks" view, time logging.
- Milestones: CRUD, progress auto-derived from linked tasks.
- Comments: threaded, @mentions restricted to actual project members,
  edit/delete with author-or-manager permission.
- Notifications: created on assignment, status change, mentions,
  invitations, role changes, milestone completion; pushed in real time
  over Socket.IO in addition to being queryable via REST.
- Activity log: immutable audit trail per project.
- Global search: strictly scoped to the requesting user's own
  project memberships — never returns another project's data.
- Redis: caches project-membership lookups (the authorization hot
  path) and dashboard aggregates, backs rate limiting and revocable
  refresh-token sessions — and the app **degrades gracefully** (falls
  back to MongoDB) if Redis is unreachable rather than crashing.
- Docker Compose: MongoDB + Redis + backend, health-checked, using
  Docker service names internally (never `localhost`).

**Also implemented (phases 8–19 of the original spec):** Calendar and
Gantt views, dependency management with cycle detection, saved
filter views, file uploads (category-organized, type/size validated),
personal and project notes, analytics (completion trend, priority/status
distribution, workload) with CSV task export, start/stop time tracking,
recurring task templates (daily/weekly/monthly, via a scheduled job),
project templates applied at creation (Software Development, College
Project, Marketing Campaign, Product Launch, Agile/Scrum), an optional
Scrum workflow (backlog, sprints, burndown chart) alongside the default
Kanban workflow, and a project-scoped assistant.

**Honesty note on the AI assistant:** this sandbox has no outbound
network access, so `assistant.controller.js` is a deterministic,
rule-based intent matcher over the project's own data — not a real LLM
call. It's structured so swapping in a real model call (e.g. the
Anthropic API) is a one-function change; the important property to
preserve either way is documented in that file: only ever pass data the
requester's project membership already permits them to see.

**Not implemented:** PDF and Excel report export (CSV is implemented
and covers the same data — see `docs/API_DOCUMENTATION.md`), and the
document says why in `report.controller.js`.

## Frontend

React + Vite + Tailwind, with its own design system (see
`docs/DESIGN_SYSTEM.md`): auth pages, personal workspace dashboard,
per-project Overview/Tasks/Kanban/Milestones/Team/Activity/Settings
tabs, a real drag-and-drop Kanban board persisted through the status
API, a task detail drawer (checklist, comments, assignment), live
notifications over Socket.IO, cross-project My Tasks, and
authorization-scoped global search. Every permission check the UI
reflects is enforced server-side too — hiding a control here is a
courtesy, never the security boundary.

## Tech stack

- **Backend:** Node.js, Express, MongoDB (Mongoose), Redis (ioredis),
  JWT auth, Socket.IO, Zod validation, Winston logging.
- **Frontend:** React, Vite, Tailwind CSS, TanStack Query, React Router,
  Socket.IO client.
- **Infra:** Docker, Docker Compose.

## Quick start (Docker Desktop)

```bash
cp backend/.env.example backend/.env
# edit backend/.env — at minimum set real JWT secrets:
#   openssl rand -hex 64   (run twice, once per secret)

docker compose up --build
```

This starts MongoDB, Redis, the backend API on `http://localhost:5000`,
and the frontend on `http://localhost:5173` — all as Docker containers,
no manual MongoDB/Redis install needed. For the full walkthrough
(Docker Desktop install, verifying it worked, hot reload during
development, troubleshooting), see **[`docs/LOCAL_SETUP.md`](docs/LOCAL_SETUP.md)**.

Check it came up correctly:

```bash
curl http://localhost:5000/api/v1/healthcheck
```

Seed demo data (3 users, 1 project, tasks, a milestone):

```bash
docker compose exec backend npm run seed
```

Demo logins (see `backend/src/seed/seed.js`):
`rahul@buildflow.dev` / `alice@buildflow.dev` /
`priya@buildflow.dev`, all with password `Password123!`.

## Running tests

```bash
cd backend
npm install
npm test
```

Tests use `mongodb-memory-server`, so no live database is needed to
run them. **Honesty note:** these tests were written but could not be
executed in the sandbox used to build this project (no outbound
network access to `npm install` dependencies). Run them yourself
before relying on this as "tested" — see `TESTING.md`.

## Frontend local development (without Docker)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```


Runs on `http://localhost:5173` and expects the backend at
`http://localhost:5000/api/v1` (see `.env`).

## Project-scoped RBAC, in one example

```
Rahul creates Project A → Rahul = OWNER
Rahul invites Alice as ADMIN, Priya as MEMBER

Alice creates Project B → Alice = OWNER
Alice invites Rahul as MEMBER

Result:
  Rahul  → Project A: OWNER,  Project B: MEMBER
  Alice  → Project A: ADMIN,  Project B: OWNER
  Priya  → Project A: MEMBER
```

No global `role` field on `User` drives this — it's entirely resolved
per-request from `ProjectMember` via `membershipService.js`.
