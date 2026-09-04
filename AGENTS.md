# monitoring-scholarship-app

This file provides context and guardrails for AI coding agents.

## Source of truth

- [docs/architecture.md](./docs/architecture.md) — primary architecture and
  code-placement reference.
- [docs/api-guidelines.md](./docs/api-guidelines.md) — guide for new or
  changed APIs.
- [docs/deployment.md](./docs/deployment.md) — Docker, environment, and
  production deployment guide.
- `bts.jsonc` — Better Fullstack stack graph authority.
- Package manifests and `pnpm-lock.yaml` — installed dependency versions.

## Project overview

- Ecosystem: TypeScript
- Workspace: pnpm + Turborepo monorepo
- Domain: Scholarship Monitoring System

### Stack

- Frontend: Next.js, Tailwind CSS, shadcn/ui, Radix, Zustand, TanStack Form,
  TanStack Table, TanStack Virtual
- Backend: NestJS on Node.js, oRPC, Better Auth, Zod
- Data: PostgreSQL, Prisma, Neon
- Realtime and storage: PartyKit and Cloudflare R2
- Testing and delivery: Vitest, Docker, GitHub Actions

MCP and AI skills are developer tooling, not production runtime services.

## Architecture boundary

```text
packages/api = contract
apps/server  = implementation
apps/web     = consumer
```

- `packages/api` contains only oRPC contracts, API-safe Zod schemas, and
  shared API types.
- `apps/server` owns executable oRPC handlers, NestJS modules/providers/
  services, authorization, business logic, Prisma access, webhooks, R2, and
  PartyKit publishing.
- `apps/web` owns pages, components, browser state, forms/tables, and oRPC
  client consumption.
- Both applications may import `packages/api`; `packages/api` must never
  depend on either application.
- Browser code must never import Prisma, `packages/db`, server source files,
  server secrets, or Better Auth's server configuration.

For non-trivial behavior, use:

```text
oRPC handler/controller → service → repository → Prisma → Neon/PostgreSQL
```

Keep handlers thin. Business rules, transaction orchestration, authorization,
and persistence decisions stay on the server.

## Repository structure

```text
apps/
  web/       Next.js frontend and API consumer
  server/    NestJS backend and executable oRPC implementation
packages/
  api/       contract-only API layer
  auth/      server-only Better Auth configuration
  db/        server-only Prisma schema/client and Neon adapter
  env/       validated `/server` and `/web` environment modules
  config/    shared TypeScript configuration
docs/        architecture, API, and deployment references
```

The current API contract is `packages/api/src/index.ts`; its server
implementation is under `apps/server/src/orpc/` and mounted at `/rpc`. Better
Auth is hosted by the server at `/api/auth/*path`.

Global Better Auth roles are `student`, `provider`, and `admin`. Their policy
is in `packages/auth/src/rbac.ts`, including the shared `hasAnyRole` matching
policy. `createRoleMiddleware` in `orpc.router.ts` is the oRPC enforcement
adapter; future Nest controllers should use a Nest guard that calls the same
policy. Roles do not replace resource-ownership checks in the service layer.
Keep policy transport-neutral: do not expose oRPC errors from `packages/auth`
or use oRPC middleware in Nest controllers. Add a new transport adapter only
when that transport is actually introduced; do not create speculative guards.

## Commands

Use pnpm. Prefer the narrowest relevant package command while iterating.

```bash
pnpm install
pnpm dev:web
pnpm dev:server
pnpm run check-types
pnpm run build
pnpm run test
pnpm db:generate
pnpm db:push
pnpm db:migrate
pnpm db:studio
```

Do not start a development server unless explicitly requested. Use `db:migrate`
for versioned schema changes; do not run development-only Prisma migration
commands as a production container startup action.

## API workflow

For every new API:

1. Define API-safe input/output contracts in `packages/api`.
2. Implement the contract in `apps/server`.
3. Delegate non-trivial behavior to a NestJS service.
4. Use server-only Prisma/repositories for persistence.
5. Authenticate and authorize on the server.
6. Consume it from `apps/web` without importing implementation code.
7. Add focused Vitest coverage and run type checks.

Place server feature tests in `apps/server/src/<feature>/tests/`; create the
directory when that feature receives its first test. Do not commit empty test
directories.

Use ordinary NestJS controllers in `apps/server` for webhooks, callbacks,
health/readiness endpoints, and external REST or infrastructure endpoints.

## Deployment guardrails

- Build both Docker images from the repository root, never an app subdirectory.
- Keep `DATABASE_URL` and `BETTER_AUTH_SECRET` server-only and in a secret
  manager. Never expose them as `NEXT_PUBLIC_*` variables.
- `NEXT_PUBLIC_SERVER_URL` is public and build-time; rebuild the web image when
  it changes.
- Production uses Neon plus explicit HTTPS `BETTER_AUTH_URL` and `CORS_ORIGIN`,
  with web and server deployed independently.
- Consult `docs/deployment.md` before changing Dockerfiles or release workflows.

## Better Fullstack lifecycle

`bts.jsonc` owns selected stack parts and `ownerPartId` bindings. Its top-level
option fields are compatibility projections, not a second mutation path.

Before repairing Better Fullstack graph drift, run:

```bash
pnpm dlx create-better-fullstack context --json
pnpm dlx create-better-fullstack doctor --json
```

Before editing recipe-owned paths or managed regions, run:

```bash
pnpm dlx create-better-fullstack recipes check --dir . --json
```

User code outside explicit Better Fullstack managed regions is not
generator-owned. Use recipe history and project recovery guidance to undo a
reviewed generator operation.

## Maintenance

Update this file and `CLAUDE.md` when changing dependencies, repository
structure, runtime services, API conventions, or build/deployment workflows.
