# Architecture Reference

This is the primary architecture and code-placement reference for the Scholarship Monitoring System. It describes the repository as generated, then establishes the dependency boundaries that all new work must follow.

## The model

```text
apps/web
    = presentation + client

packages/api
    = shared API contract

apps/server
    = backend implementation
```

The hard boundary is:

```text
packages/api = contract
apps/server  = implementation
apps/web     = consumer
```

`packages/api` defines **what** the API accepts and returns. `apps/server` defines **how** it works. `apps/web` knows what the API accepts and returns; it does not know how the API is implemented.

All executable application APIs belong in `apps/server`. `packages/api` is shared source code, not a backend runtime or a deployed network service.

## Stack

This is a TypeScript `pnpm` workspace managed by Turborepo. The selected scaffold stack is:

| Area | Technology |
|---|---|
| Web application | Next.js, TypeScript, Tailwind CSS |
| UI | shadcn/ui on Radix, Nova style, Lucide icons, Inter, neutral theme/base, default radius |
| Browser state and UI data | Zustand, TanStack Form, TanStack Table, TanStack Virtual, Zod |
| Backend | NestJS on Node.js, oRPC, Better Auth |
| Data | PostgreSQL, Prisma ORM, Neon adapter/hosting choice |
| Realtime | PartyKit (`partysocket` in the web app) |
| Object storage | Cloudflare R2 through the AWS S3-compatible SDK |
| Tests | Vitest |
| Monorepo | pnpm and Turborepo |
| Deployment targets | Docker images for `apps/web` and `apps/server` |
| CI | GitHub Actions |
| Developer/AI tooling | MCP, repository skills, `CLAUDE.md`, and `AGENTS.md` |

MCP and AI skills are development tooling. They are not production runtime services and must not own business logic or production request handling.

## Repository map and responsibilities

```text
apps/
  web/                 Next.js browser-facing application
  server/              NestJS executable backend
packages/
  api/                 API contract layer (required architectural role)
  auth/                Better Auth server configuration
  db/                  Prisma schema, generated client, and Neon-backed client
  env/                 separately exported server and web environment validation
  config/              shared TypeScript configuration
```

| Unit | Responsibility and status | Allowed consumers | Boundary |
|---|---|---|---|
| `apps/web` | Presentation, browser interaction, API consumption | Browser and Next.js server rendering | Frontend-safe application |
| `apps/server` | NestJS composition and all executable backend behavior | HTTP/oRPC clients and integrations | Backend-only deployable application |
| `packages/api` | API-safe contracts, schemas, and types | `apps/web`, `apps/server` | Shared, runtime-neutral contract package |
| `packages/auth` | Better Auth instance using the Prisma adapter | Server-only code, currently used by `apps/server` | Server-only; never import its authoritative config in browser code |
| `packages/db` | Prisma schema/config and a Prisma client using `@prisma/adapter-neon` | Server-only code | Server-only persistence package |
| `packages/env` | `@monitoring-scholarship-app/env/server` and `/web` validation modules | Matching server or browser consumers | Split by export; never import `/server` in browser code |
| `packages/config` | Shared TypeScript config | Workspace tooling/packages | Build-time configuration only |

The root `package.json`, `pnpm-workspace.yaml`, and `turbo.json` define the workspace and task graph. Dependencies should be declared as close as possible to their consumer: Next.js in `apps/web`, NestJS in `apps/server`, Prisma in server-only code, and contract dependencies in `packages/api`.

## Dependency direction

```text
                        ┌────────────────────┐
                        │    packages/api    │
                        │ contracts + types  │
                        └─────────▲──────────┘
                                  │
                     ┌────────────┴────────────┐
                     │ source-code imports     │
              ┌──────┴───────┐         ┌──────┴────────┐
              │   apps/web   │         │  apps/server  │
              │   Next.js    │────────▶│    NestJS     │
              └──────────────┘ runtime └──────┬────────┘
                                      request │
                                              │
                                ┌─────────────┼─────────────┐
                                │             │             │
                                ▼             ▼             ▼
                             Prisma       PartyKit          R2
                                │
                                ▼
                          Neon PostgreSQL
```

`apps/web → packages/api` and `apps/server → packages/api` are compile-time/source-code relationships. The main runtime request is `apps/web → apps/server` over HTTP/oRPC. It is never `apps/web → packages/api → apps/server` because `packages/api` is not a service.

Allowed dependencies:

```text
apps/web       → packages/api, frontend-safe packages, env/web
apps/server    → packages/api, packages/auth, packages/db, env/server
packages/api   → Zod, oRPC contract dependencies, justified runtime-neutral helpers
packages/auth  → packages/db, env/server
packages/db    → env/server and Prisma/Neon infrastructure
```

Forbidden dependencies:

```text
packages/api → apps/server, Prisma, packages/db, repositories, services,
               NestJS modules/providers, secrets, runtime-only env code
apps/web     → apps/server source files, Prisma, Neon, packages/db,
               repositories, server secrets, authoritative auth configuration
```

## `apps/web`: frontend application and API consumer

`apps/web` is the Next.js application. It currently contains App Router pages and layouts, dashboard/login pages, UI components, `src/lib/auth-client.ts`, and `src/utils/orpc.ts`. It is the only home for browser-facing behavior.

It may contain Next.js routes, React Server/Client Components, Tailwind and shadcn/Radix UI, TanStack Form state, client-side Zod shape validation, Zustand stores, TanStack Table/Virtual definitions, oRPC client use, session/login UI, PartyKit subscriptions, and upload/download UI flows.

It may import frontend-safe contracts and types from `packages/api`. It must not contain or import Prisma Client, Prisma queries, Neon credentials, repositories, NestJS modules/providers/services, backend oRPC implementations, server secrets, authoritative business rules, privileged R2 credentials, or the server-side Better Auth configuration.

The configured oRPC client targets `${NEXT_PUBLIC_SERVER_URL}/rpc` and forwards cookies. The Better Auth React client targets `NEXT_PUBLIC_SERVER_URL`; it is appropriate for session state and login/logout UX, not authorization authority. For example, hiding an admin action is a useful UI check, but the server must enforce the admin permission.

Zustand is for client-only state such as filters, selected rows, a wizard, notification UI, or preferences. It is not a replacement for the backend or database. TanStack Form manages browser form state; the usual flow is:

```text
TanStack Form → Zod → oRPC client → apps/server
```

TanStack Table and TanStack Virtual belong in `apps/web` for scholarship listings, application records, notifications, and large admin tables.

## `packages/api`: shared API contract only

`packages/api` is the shared API boundary consumed by both applications. It currently exports `appContract` and the derived `AppRouterClient` type from `src/index.ts`. It may grow to include input/output Zod schemas, API-safe error definitions, pagination/filter/sort schemas, shared API types, and contract metadata. A future layout might use `contracts/`, `schemas/`, `errors/`, and `types/`, but do not create those folders merely to match an example.

```text
packages/api defines WHAT the API looks like.
apps/server defines HOW the API works.
```

It must never become a backend runtime, service layer, repository layer, database layer, or an independently deployed application. In particular it must not contain Prisma Client or queries, database connections, Neon logic, business services/use cases, transactions, NestJS controllers/modules/providers, webhooks, R2 or PartyKit implementation, privileged authentication, secrets, or background processing.

### Current contract implementation

The starter `healthCheck` and `privateData` procedures are now contract-first: `packages/api` exports only their input/output contract, while `apps/server/src/orpc/orpc.router.ts` implements them. Server request context lives in `apps/server/src/orpc/orpc.context.ts`, and `OrpcService` owns the starter operation behavior. `packages/api` declares only `@orpc/contract` and `zod`; it no longer depends on Better Auth, Prisma, environment modules, or oRPC server runtime packages.

## Contract validation with Zod

Zod is the selected validation library. Structural validation that is part of a public API shape may be shared in `packages/api`; for example, `CreateScholarshipInput`, `PaginationInput`, and `ScholarshipResponse`.

```text
schema/shape validation       → may be shared in packages/api
business-rule validation      → apps/server
database-dependent validation → apps/server
```

`title must be a string` is a contract concern. `deadline must be in the future` and `a student cannot apply twice` are server concerns because they express business policy and may require current database state.

## `apps/server`: authoritative backend

`apps/server` runs NestJS on Node.js and is the authoritative backend application. `src/index.ts` bootstraps Nest, enables CORS from `env.CORS_ORIGIN`, registers Better Auth at `/api/auth/*path`, and listens on port 3000. `AppModule` composes the starter `AppController`, `AppService`, and `OrpcModule`.

If the question is “Where should this API be written?”, the default answer is:

```text
apps/server
```

All executable application APIs belong in `apps/server`: oRPC implementations, Nest modules/providers/services, REST controllers, webhooks, authentication integration, authorization, business logic, use cases, transactions, repositories, Prisma access, Neon/PostgreSQL access, R2 integration, PartyKit publishing, third-party integrations, privileged operations, health endpoints, callbacks, and infrastructure-facing endpoints.

### NestJS and oRPC have distinct roles

```text
oRPC    = typed API contract and RPC communication
NestJS  = backend runtime, DI container, application framework, and server composition
```

oRPC provides typed procedures, shared request/response contracts, and schema-based communication. NestJS provides dependency injection, modules, providers, lifecycle management, middleware, guards, controllers, integrations, and HTTP server composition. oRPC does not make `packages/api` a home for business logic.

The current `OrpcModule` routes `/rpc/*path` and `/api-reference/*path` through `OrpcMiddleware`, which constructs `RPCHandler` and `OpenAPIHandler`. Future server implementations should use the contracts from `packages/api` but bind those contracts to executable handlers in `apps/server`.

Traditional NestJS controllers are still appropriate for webhooks, health endpoints, OAuth/provider callbacks, external REST consumers, file callbacks, and infrastructure endpoints. The transport may change; the ownership does not. Executable backend APIs still belong in `apps/server`.

### Preferred backend layers

Follow this responsibility flow for non-trivial domains:

```text
API / oRPC router / Controller
          ↓
       Service
          ↓
      Repository
          ↓
        Prisma
          ↓
 PostgreSQL / Neon
```

The API layer receives validated input, reads request/auth context, performs initial authorization, calls a service, maps errors, and returns contract-compliant output. Keep it thin.

Services own use cases, business rules, transaction boundaries, coordination across repositories/integrations, domain authorization, invariants, and the decision to emit realtime events. Repositories own persistence-specific Prisma reads/writes, relation loading, pagination, filters, and persistence mapping—not high-level policy. Prefer `API → Service → Repository → Prisma`; do not put non-trivial workflows directly in handlers or use `API → Prisma` as the default.

## Prisma, PostgreSQL, and Neon

`packages/db` is an existing server-only persistence package. Its Prisma configuration is `packages/db/prisma.config.ts`; it loads `DATABASE_URL` from `apps/server/.env`, points Prisma to `packages/db/prisma/schema`, and configures migrations under `packages/db/prisma/migrations` when migrations are created. The current schema is split into `schema.prisma` and `auth.prisma`, which contains Better Auth's `User`, `Session`, `Account`, and `Verification` models.

The Prisma generator emits an ESM, Node-runtime client at `packages/db/prisma/generated`. `packages/db/src/index.ts` creates that client with `PrismaNeon` and `env.DATABASE_URL`. The database package provides scripts for `db:push`, `db:generate`, `db:migrate`, and `db:studio`; no seed script or migrations directory is currently present in the repository.

Prisma infrastructure is server-side only:

```text
apps/web       ✕ Prisma
packages/api   ✕ Prisma
apps/server    ✓ Prisma, via server-only packages/db
```

The intended production runtime path is:

```text
apps/server → repository → Prisma → Neon PostgreSQL
```

Browser code must never directly access Neon/PostgreSQL or database credentials. The `apps/web` manifest currently lists `@prisma/client`, but no inspected web source imports it; treat that dependency as an unused scaffold artifact, not permission for browser database access.

## Better Auth

The Better Auth instance is in `packages/auth/src/index.ts`, uses `packages/db` through the Prisma adapter, enables email/password authentication, and trusts `env.CORS_ORIGIN`. `apps/server/src/index.ts` is the executable host for it at `/api/auth/*path`. The web application consumes it through `apps/web/src/lib/auth-client.ts` using `better-auth/react`.

Better Auth's Admin plugin provides the current global RBAC model. The policy
definitions are in `packages/auth/src/rbac.ts` and define the `student`,
`provider`, and `admin` roles. New registrations receive `student` by default.
The plugin-added role, ban, and impersonation fields are stored in the
server-only Prisma schema. The reusable `requireSessionWithAnyRole` helper lives in
`apps/server/src/orpc/orpc.authorization.ts`; use it from an oRPC middleware
to enforce roles. Role checks do not replace domain ownership checks:
for example, a provider must also own the scholarship they are attempting to
change.

```text
apps/web
  ↓ authentication request/session UI
apps/server
  ↓ Better Auth verification and request auth context
authorization
  ↓
service
```

The frontend may read session state and provide login/logout UX. The server is authoritative for authentication verification, protected actions, roles, and permissions. Frontend authorization is only UX; server authorization is mandatory.

## PartyKit and Cloudflare R2

PartyKit is the selected realtime transport. `partykit` is currently a server dependency and `partysocket` a web dependency; no PartyKit server implementation is present yet. Use it for transport and connection handling—for example scholarship notifications, application status updates, announcements, counters, or dashboard updates—not as the primary business backend.

```text
apps/server → business action → service decides event → PartyKit → apps/web
```

Cloudflare R2 is selected object storage. The scaffold already includes `apps/server/src/lib/storage.ts`, an S3-compatible R2 client and storage helpers, including presigned upload URL support. Keep R2 credentials and authorization decisions server-side.

```text
apps/web → apps/server → authorization → R2
```

For direct uploads, the flow is `apps/web → request authorized upload → apps/server → signed upload instructions → apps/web → R2`. The browser never receives long-lived or privileged R2 credentials.

## Scholarship Monitoring examples

Scholarships, students, applications, eligibility, notifications, saved scholarships, providers, users, and administration are useful domain examples—not a claim that those modules already exist.

For a scholarship list, runtime traffic should be:

```text
User → apps/web → oRPC client → apps/server → ScholarshipService
     → ScholarshipRepository → Prisma → Neon PostgreSQL
```

The response follows the reverse path. The shared input/output shape originates in `packages/api`.

For a conceptual `scholarship.create` operation:

```text
packages/api: scholarship.create input + output contract
apps/server:  executable implementation

handler → ScholarshipService.create() → business validation
        → ScholarshipRepository.create() → Prisma → Neon
```

If a notification is needed, the service decides to publish through PartyKit after the authoritative action. A `ScholarshipRepository` may expose `findMany`, `findById`, `create`, `update`, and `delete`; the repository talks to Prisma, the service talks to the repository, and the API talks to the service.

## Deployment and CI

The repository includes `apps/web/Dockerfile`, `apps/server/Dockerfile`, and `docker-compose.yml`. Both Dockerfiles build from the monorepo root so their shared workspace dependencies are available. The Next.js image uses standalone output with the workspace root as its tracing root; the server image builds the `server` workspace and retains the server's required workspace packages at runtime. The selected deployment model is two deployable applications:

```text
                    Git repository
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        build apps/web        build apps/server
              │                     │
              ▼                     ▼
        Web Docker image      Server Docker image
```

Shared packages, including `packages/api`, are build dependencies and are not standalone deployments. The checked-in Compose file defines a local PostgreSQL container for containerized local use. It requires `BETTER_AUTH_SECRET` and accepts `DATABASE_URL`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, and `NEXT_PUBLIC_SERVER_URL` from the environment; production deployments should inject those values through their secret/configuration system and point `DATABASE_URL` at Neon rather than the local Compose database.

GitHub Actions currently runs on pushes and pull requests to `main`/`master`, installs with pnpm, then runs root `check-types`, `build`, and `test`. It does not currently build/push Docker images or deploy. Those are reasonable future CI stages, but are not current generated behavior.

Turborepo orchestrates tasks and caching via `turbo.json`; build and type-check depend on upstream package tasks. It is not an application runtime. The current root scripts use Turbo for development, build, type checks, and database commands; the current root test script explicitly runs the web, server, and API package tests. Vitest is configured as the test runner, but no test files are currently present. Suggested test ownership is contracts/schemas in `packages/api`, business and repository/integration tests in `apps/server`, and appropriate frontend/component logic tests in `apps/web`.

## Code placement matrix

| Concern | Location |
|---|---|
| Next.js page/layout, React component, Zustand store | `apps/web` |
| TanStack Form, Table, or Virtual UI | `apps/web` |
| oRPC contract and API-safe shared Zod schema | `packages/api` |
| Executable oRPC handler | `apps/server` |
| NestJS module/provider/controller, business service, webhook, health endpoint | `apps/server` |
| Repository and Prisma query/client | `apps/server` or server-only `packages/db` |
| Better Auth authoritative configuration | server-only `packages/auth`, hosted by `apps/server` |
| Authorization | `apps/server`; use `requireSessionWithAnyRole` for the session/role check and `createRoleMiddleware` to attach it to an oRPC procedure |
| PartyKit publishing decision | `apps/server` |
| PartyKit subscription | `apps/web` |
| Privileged R2 integration | `apps/server` |
| R2 upload UI | `apps/web` |
| Neon/PostgreSQL | server infrastructure |

## Where should this code go?

| Question | Location |
|---|---|
| What does the API accept or return? | `packages/api` |
| What happens when this API is called? | `apps/server` |
| What business rules apply? | `apps/server` |
| How is data read or written? | `apps/server` repository/persistence layer |
| How should this appear in the browser? | `apps/web` |
| Who is allowed to perform this? | Authoritative enforcement in `apps/server` |
| How should a webhook/callback be handled? | `apps/server` |

## Anti-patterns

Do not add `packages/api/scholarship.service.ts`; place a scholarship contract in `packages/api` and its service in `apps/server`. Do not add Prisma to `packages/api`, and never let browser code reach Prisma or Neon.

Avoid fat oRPC handlers that combine authorization, business rules, Prisma calls, PartyKit logic, R2 logic, and response mapping. Prefer a thin handler that calls a service, with repositories and integrations behind that service. Do not treat a hidden frontend button as protection; pair UI checks with server authorization.

Future shared packages—such as `packages/testing` or a narrowly scoped `packages/shared`—may be extracted only for clear responsibility and legitimate reuse. Do not create packages merely because they are common in monorepos. Server-only packages, especially `packages/db` and `packages/auth`, must remain unavailable to browser code even though they live under `packages/`.

## Golden Rules

1. `apps/server` is the authoritative backend application.
2. All executable application APIs are implemented in `apps/server`.
3. `packages/api` is the shared API contract layer only.
4. `packages/api` defines what an API accepts and returns, not how it behaves.
5. `apps/web` and `apps/server` may both depend on `packages/api`.
6. `packages/api` must never depend on `apps/server`.
7. `apps/web` must never import backend implementation code from `apps/server`.
8. Business logic and database access belong on the backend.
9. Prisma is server-side only; browser code never accesses Neon/PostgreSQL directly.
10. oRPC provides type-safe API communication; NestJS remains the backend runtime and composition framework.
11. API handlers stay thin; services orchestrate application behavior; repositories own persistence concerns.
12. Better Auth frontend state does not replace server authorization.
13. PartyKit is realtime transport, not primary business logic; R2 credentials stay server-side.
14. Webhooks and traditional HTTP endpoints still belong in `apps/server`.
15. Shared packages need explicit dependency boundaries; `packages/api` is never deployed independently.
16. MCP and AI skills are development tooling, not runtime services.
17. When unsure where executable backend behavior belongs, place it in `apps/server`.

```text
apps/web          = presentation + client
packages/api      = shared API contract
apps/server       = backend implementation
Prisma            = ORM / persistence access
Neon PostgreSQL   = relational database
PartyKit          = realtime transport
Cloudflare R2     = object storage
```
