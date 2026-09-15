# Contributing to BuildFlow

## Getting set up

```bash
git clone <your-fork-url>
cd buildflow

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# edit backend/.env with real local values (see README.md Quick Start)

docker compose up --build
```

Or run each half natively without Docker — see the "Frontend local
development" and standard `npm install && npm run dev` for the
backend in `README.md`.

## Before you open a PR

1. `cd backend && npm test` — must pass. Tests use
   `mongodb-memory-server`, so you don't need a running database.
2. `cd frontend && npm run build` — must succeed.
3. If you touched anything under `backend/src/middleware/rbac.js`,
   `services/membershipService.js`, or any controller's permission
   checks: read `docs/ARCHITECTURE.md`'s RBAC section first. This is
   the part of the codebase where a subtle bug becomes a security
   hole, not just a broken feature. Add a test in
   `backend/tests/rbac.e2e.test.js` or `security.test.js` covering the
   new behavior.
4. Run the app locally end-to-end (`docker compose up --build`) and
   click through the change — passing tests don't guarantee a working
   UI.

## Code conventions

- **Backend**: one controller file per resource, one route file per
  resource, Zod validation on every route that accepts input. Never
  duplicate authorization logic inline in a controller — extend
  `middleware/rbac.js` or `services/membershipService.js` instead.
- **Frontend**: components in `src/components/`, routed pages in
  `src/pages/`, all API calls go through `src/lib/resources.js` (don't
  call `axios`/`fetch` directly from a component). Follow the palette
  and type conventions in `docs/DESIGN_SYSTEM.md` rather than picking
  new colors ad hoc.
- **Commits**: reasonably descriptive, present tense (`Add sprint
  burndown chart` not `Added` / `Adds`). Doesn't need to be
  Conventional-Commits-strict, just readable in `git log --oneline`.

## Branching

- `main` is always deployable — Render/Vercel should be configured to
  auto-deploy from it (see `docs/DEPLOYMENT.md`).
- Work in a feature branch (`feature/sprint-burndown`,
  `fix/invitation-expiry`) and open a PR into `main`. CI
  (`.github/workflows/ci.yml`) runs the backend test suite and
  frontend build on every PR — don't merge a red run.

## Reporting bugs / requesting features

Use the issue templates under `.github/ISSUE_TEMPLATE/` — they ask for
the specific context (your role in the project, reproduction steps)
that's usually needed to actually debug an RBAC-shaped bug in this app.

## Full project context

If you're new to the codebase, `docs/PROJECT_OVERVIEW.md` is the
single document that ties together what's implemented, how it's
architected, and what's honestly still missing — read that before
`docs/ARCHITECTURE.md` if you want the map before the territory.
