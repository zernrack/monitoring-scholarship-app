# API Guidelines

Use this guide when adding or changing an application API. It supplements the
[architecture reference](./architecture.md).

The rule behind every API change is:

```text
packages/api = contract
apps/server  = implementation
apps/web     = consumer
```

An API contract describes what a caller may send and receive. The executable
handler, authorization, business rules, database access, storage access, and
realtime publishing belong in `apps/server`.

## Before creating an API

Decide these points first:

1. Is this browser-facing application behavior? If yes, the API is normally an
   oRPC procedure implemented in `apps/server`.
2. Is the caller an external service, a webhook provider, or infrastructure?
   If yes, a conventional NestJS controller in `apps/server` may be the better
   transport.
3. What is the resource and action? Prefer domain-oriented names such as
   `scholarship.list`, `scholarship.create`, or `application.withdraw`.
4. What shape is public at the API boundary? Define it in `packages/api`.
5. Who may call it? Enforce that rule on the server.
6. Does it change data or trigger an integration? Put orchestration in a
   service, not directly in an oRPC handler.

Do not start by adding Prisma to the web application or `packages/api`.

## Current API implementation

The repository currently has two starter procedures in
[`packages/api/src/index.ts`](../packages/api/src/index.ts):

```text
healthCheck  public health response
privateData  authenticated starter response
```

Their implementations are in
[`apps/server/src/orpc/orpc.router.ts`](../apps/server/src/orpc/orpc.router.ts),
with behavior in
[`apps/server/src/orpc/orpc.service.ts`](../apps/server/src/orpc/orpc.service.ts).
`OrpcMiddleware` mounts the oRPC transport at `/rpc`; the Next.js client in
[`apps/web/src/utils/orpc.ts`](../apps/web/src/utils/orpc.ts) consumes the
derived `AppRouterClient` type.

```text
apps/web → HTTP /rpc → apps/server
   │                       │
   └──── imports types ────┘
            packages/api
```

`packages/api` is shared source code. It is never a deployed service and never
participates in the runtime request path.

## Where each piece goes

| Concern | Location |
| --- | --- |
| Procedure name, API input/output, pagination/filter/sort schemas | `packages/api` |
| API-safe Zod schema and API type | `packages/api` |
| Executable oRPC handler | `apps/server` |
| NestJS module, provider, guard, controller, middleware | `apps/server` |
| Authentication and authorization enforcement | `apps/server` |
| Business use case and transaction orchestration | `apps/server` service |
| Prisma query and persistence mapping | `apps/server` repository, or existing server-only `packages/db` infrastructure |
| React query, form, table, and UI feedback | `apps/web` |

Never add these to `packages/api`: Prisma, repositories, services, NestJS
providers/modules/controllers, Better Auth server configuration, secrets,
environment access, R2 clients, PartyKit publishing, webhooks, or transaction
logic.

## Standard implementation flow

For a new `scholarship.create` API, use this order:

```text
1. Contract     packages/api
2. Handler      apps/server
3. Service      apps/server
4. Repository   apps/server (when persistence is needed)
5. Client use   apps/web
6. Tests        contract + server behavior + relevant UI
```

The runtime flow is:

```text
apps/web
  → oRPC client
  → apps/server oRPC handler
  → ScholarshipService
  → ScholarshipRepository
  → Prisma
  → Neon PostgreSQL
```

Keep handlers thin. Their job is to obtain validated input and request context,
perform coarse authorization, call a service, and return a contract-compliant
result. A handler should not contain a long workflow, multiple direct Prisma
queries, R2 calls, and PartyKit decisions.

## 1. Define the contract in `packages/api`

Use Zod for structural, API-safe validation. Inputs and outputs should be
explicit and stable. Avoid exposing database records wholesale: return only the
fields a caller should receive.

The current contract is a single `appContract` object in `packages/api/src/index.ts`.
For a small addition, extend that object. A conceptual addition looks like:

```ts
import { oc } from "@orpc/contract";
import { z } from "zod";

const scholarshipSummary = z.object({
  id: z.string(),
  title: z.string(),
  deadline: z.string().datetime(),
});

const createScholarshipInput = z.object({
  title: z.string().trim().min(1).max(200),
  deadline: z.string().datetime(),
});

export const appContract = {
  // existing procedures...
  scholarship: {
    create: oc.input(createScholarshipInput).output(scholarshipSummary),
  },
};
```

This is a shape example, not production code to paste blindly. Match the
current contract style and make any resulting server router shape match it.

Shared schema validation is appropriate for facts such as “title is required”
or “deadline is an ISO datetime.” The following remain server rules:

```text
deadline must be in the future              business rule
provider is allowed to create scholarships  authorization rule
provider exists and is active               database-dependent rule
student cannot apply twice                  database-dependent rule
```

Do not put those rules in `packages/api`, even when a corresponding Zod shape
is shared with the client.

## 2. Implement the contract in `apps/server`

Use `implement<typeof appContract, OrpcContext>(appContract)` in server code,
as the current [`orpc.router.ts`](../apps/server/src/orpc/orpc.router.ts) does.
Bind the contract to a handler that delegates to a NestJS service:

```ts
// apps/server/src/orpc/orpc.router.ts (conceptual)
const createScholarship = o.scholarship.create
  .use(requireAuth)
  .handler(({ input, context }) =>
    scholarshipService.create({ actor: context.session.user, input }),
  );

return o.router({
  scholarship: { create: createScholarship },
});
```

The exact oRPC router composition should follow the installed oRPC version and
the contract shape. The important placement rule does not change: the handler
is executable server code, and the service owns the use case.

### Authentication and authorization

The server creates `OrpcContext` in
[`apps/server/src/orpc/orpc.context.ts`](../apps/server/src/orpc/orpc.context.ts)
from the Better Auth session. The current `requireAuth` middleware in
`orpc.router.ts` protects `privateData`; reuse the same approach for an
authenticated procedure.

Authentication answers “who is this?” Authorization answers “may this actor
perform this action on this resource?” Do both on the server.

```ts
// conceptual service rule
if (!canManageScholarships(actor)) {
  throw new ORPCError("FORBIDDEN");
}
```

Do not rely on a hidden button, Zustand state, route protection, or a client
role value as the security boundary. Those improve UX only.

### Services and repositories

Create a domain service for a non-trivial use case. For example:

```text
apps/server/src/scholarship/
  scholarship.service.ts       use cases and business rules
  scholarship.repository.ts    Prisma persistence operations
  scholarship.module.ts        NestJS providers/imports
  scholarship.orpc.ts          contract implementation for this feature
```

This is a recommended future feature layout, not a claim that these files
already exist. Register the feature module in `AppModule`, and compose the
feature's oRPC implementation into the application router.

The expected responsibility chain is:

```text
oRPC handler
  → ScholarshipService.create()
  → business validation / authorization / transaction
  → ScholarshipRepository.create()
  → Prisma
```

Repositories may provide focused persistence methods such as `findMany`,
`findById`, `create`, `update`, and `delete`. They should not decide high-level
domain policy. Services should not require the browser to enforce an invariant.

Use the existing server-only `@monitoring-scholarship-app/db` package for the
Prisma client and schema infrastructure. Do not import it from `apps/web` or
`packages/api`.

## Keep the oRPC router maintainable

`apps/server/src/orpc/orpc.router.ts` is currently small because there are only
two procedures. It must not become a giant file as domains are added.

Split by feature as the application grows:

```text
packages/api/src/
  index.ts                         public contract exports/composition
  scholarship.contract.ts          scholarship API shapes
  application.contract.ts          application API shapes

apps/server/src/
  orpc/orpc.router.ts              application router composition
  scholarship/scholarship.orpc.ts  scholarship handlers
  scholarship/scholarship.service.ts
  scholarship/scholarship.repository.ts
  application/application.orpc.ts  application handlers
```

The root router should compose feature routers; it should not contain every
domain workflow. Keep contract files API-only and feature handler files
server-only.

## Use conventional NestJS controllers when appropriate

oRPC is the default for typed application APIs consumed by this web app. Use a
NestJS controller in `apps/server` instead when the endpoint is a webhook,
OAuth/provider callback, health/readiness endpoint, external REST endpoint, or
another infrastructure-facing HTTP surface.

For example, Better Auth is hosted by the Nest server at `/api/auth/*path`.
That does not make it an oRPC procedure, but it remains owned by
`apps/server`.

```text
Transport can differ.
Backend ownership does not.
```

## Mutations, storage, and realtime

For state-changing APIs:

1. Validate the contract input.
2. Load required data through the repository.
3. Check domain authorization and business invariants in the service.
4. Write through Prisma, using a transaction when multiple database changes
   must succeed together.
5. Return the contract output.
6. Only after a successful business action, have the service decide whether to
   publish a PartyKit event or create authorized R2 upload/download
   instructions.

R2 credentials and PartyKit publishing stay server-side. The browser may
subscribe to PartyKit or upload directly to R2 only after `apps/server` has
authorized it and supplied safe instructions such as a presigned URL.

## Errors and API compatibility

Use predictable, safe errors. Return a clear oRPC error code for expected
conditions such as unauthenticated, forbidden, not found, validation, and
conflict cases. Log unexpected server failures without returning database
details, stack traces, credentials, or internal implementation information.

Treat contract changes as compatibility changes:

- Adding an optional response field is usually safe.
- Removing or renaming a field, changing a field's type, or changing semantics
  can break consumers.
- Prefer additive changes, or introduce a versioning/migration plan when a
  breaking change is unavoidable.
- Update the web consumer and relevant tests in the same change whenever this
  repository is the only known consumer.

## Testing a new API

Vitest is the selected test framework. Add tests alongside the code they
exercise; do not claim an untested API is complete.

| Layer | What to test |
| --- | --- |
| `packages/api` | Zod input/output schemas and contract shape |
| Server service | business rules, authorization decisions, error cases |
| Repository/integration | Prisma query behavior and database constraints |
| oRPC handler | context/auth boundary and contract-compliant response |
| Web consumer | loading, success, empty, and error behavior when relevant |

Run the smallest relevant checks while developing, then the repository checks
before handoff:

```bash
pnpm --filter @monitoring-scholarship-app/api test
pnpm --filter server test
pnpm --filter web test
pnpm run check-types
```

## New API checklist

- [ ] Name the procedure after a clear domain action.
- [ ] Define API-safe input and output schemas in `packages/api`.
- [ ] Keep database models, secrets, and internal fields out of contract output.
- [ ] Implement the handler in `apps/server` against the shared contract.
- [ ] Create or reuse a NestJS service for business behavior.
- [ ] Use a repository and server-only Prisma access for persistence.
- [ ] Authenticate and authorize on the server.
- [ ] Keep business and database-dependent validation on the server.
- [ ] Return safe, predictable errors.
- [ ] Publish PartyKit events or issue R2 instructions only after successful,
      authorized server-side work.
- [ ] Update the web client without importing server implementation code.
- [ ] Add focused tests and run type checks.

## Do not do this

```text
apps/web → Prisma → Neon                         forbidden
packages/api → Prisma or NestJS                  forbidden
packages/api → scholarship.service.ts            forbidden
oRPC handler → many Prisma calls + all workflow  avoid
frontend role check → security decision           forbidden
```

Use this mental model when uncertain:

```text
What does the API accept/return?  packages/api
What happens when it is called?   apps/server
How is data persisted?            apps/server repository + Prisma
How does it look in the browser?  apps/web
```
