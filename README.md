# Scholarship Monitoring System

A TypeScript Turborepo for monitoring scholarships, applications, students,
and related notifications. It has a Next.js web application and a NestJS/oRPC
backend.

## Architecture

```text
apps/web       = Next.js presentation and API consumer
packages/api   = shared API contract
apps/server    = NestJS backend implementation
```

`packages/api` defines what an API accepts and returns. `apps/server`
implements executable APIs, business rules, authorization, Prisma access, and
integrations. `apps/web` consumes APIs over HTTP/oRPC and must never import
server implementation code, Prisma, or database credentials.

Read the detailed references before adding features:

- [Architecture](./docs/architecture.md)
- [API guidelines](./docs/api-guidelines.md)
- [Deployment](./docs/deployment.md)

## Stack

- Web: Next.js, TypeScript, Tailwind CSS, shadcn/ui, Radix, Zustand, TanStack
  Form, Table, and Virtual
- Backend: NestJS on Node.js, oRPC, Better Auth, Zod
- Data: Prisma, PostgreSQL, Neon
- Realtime and storage: PartyKit and Cloudflare R2
- Tooling: pnpm, Turborepo, Vitest, Docker, GitHub Actions

MCP and repository skills are developer/AI tooling; they are not production
services.

## Repository layout

```text
apps/
  web/       Next.js frontend
  server/    NestJS executable backend
packages/
  api/       oRPC contracts and API-safe schemas/types
  auth/      Better Auth server configuration
  db/        Prisma schema, generated client, Neon adapter
  env/       validated server and web environment modules
  config/    shared TypeScript configuration
docs/        architecture, API, and deployment references
```

## Local development

Install workspace dependencies:

```bash
pnpm install
```

Provide server environment values, including `DATABASE_URL`,
`BETTER_AUTH_SECRET` (at least 32 characters), `BETTER_AUTH_URL`, and
`CORS_ORIGIN`. See [deployment environment requirements](./docs/deployment.md#required-server-environment).

Run the applications in separate terminals:

```bash
pnpm dev:web
pnpm dev:server
```

The web development server runs on port `3001` and the NestJS server listens
on port `3000`.

## Common commands

```bash
pnpm run check-types
pnpm run build
pnpm run test

pnpm db:generate
pnpm db:push
pnpm db:migrate
pnpm db:studio
```

Use `db:migrate` for versioned schema changes. `db:push` is for rapid local
iteration and should not replace a reviewed production migration.

## Docker

Build application images from the repository root so pnpm can access all
workspace packages:

```bash
docker build -f apps/web/Dockerfile -t monitoring-scholarship-web .
docker build -f apps/server/Dockerfile -t monitoring-scholarship-server .
```

For the local container stack:

```bash
export BETTER_AUTH_SECRET='a-random-secret-with-at-least-32-characters'
docker compose up --build
```

Production deployment, required variables, Neon migration guidance, and the
current server-image readiness caveat are documented in
[docs/deployment.md](./docs/deployment.md).

## Contributing

Use pnpm and keep dependencies close to their consumers. For a new API, follow
[docs/api-guidelines.md](./docs/api-guidelines.md): create the contract in
`packages/api`, implement it in `apps/server`, then consume it in `apps/web`.
