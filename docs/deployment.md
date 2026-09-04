# Deployment

This repository deploys two independent applications from one pnpm/Turborepo
workspace:

```text
apps/web     Next.js web application     Docker image
apps/server  NestJS API application      Docker image
```

`packages/api`, `packages/auth`, `packages/db`, `packages/env`, and
`packages/config` are build/runtime dependencies of those applications. They
are not deployed as independent services.

## Deployment topology

```text
Browser
  |
  v
apps/web (Next.js, port 3000)
  |
  | HTTP / oRPC
  v
apps/server (NestJS, container port 3000)
  |
  +-- Neon PostgreSQL through Prisma
  +-- Better Auth
  +-- Cloudflare R2 when storage is implemented
  +-- PartyKit when realtime is implemented
```

The web application is the browser-facing service. The server application is
the authoritative API and owns database access, Better Auth verification,
authorization, privileged R2 operations, and realtime publishing.

## Docker files and build context

Use the repository root as the Docker build context. Both application images
need workspace packages during installation and build.

```bash
docker build -f apps/web/Dockerfile -t monitoring-scholarship-web .
docker build -f apps/server/Dockerfile -t monitoring-scholarship-server .
```

Do not build with `apps/web` or `apps/server` as the context. That would omit
the root lockfile and internal workspace packages required by pnpm.

The root [`.dockerignore`](../.dockerignore) excludes source-control metadata,
local dependencies, build output, environment files, and logs from image build
contexts. Do not place production secrets in a file copied into an image.

### Web image

[`apps/web/Dockerfile`](../apps/web/Dockerfile) builds Next.js with
`output: "standalone"`. Its runtime stage contains the standalone output and
static assets, runs as the non-root `nextjs` user, and listens on port `3000`.

`NEXT_PUBLIC_SERVER_URL` is a public, build-time value. It must point to the
externally reachable API origin used by browser code, for example:

```text
https://api.example.com
```

It is intentionally not secret. Because `NEXT_PUBLIC_*` values are embedded in
the browser build, rebuilding the web image is required when it changes.

### Server image

[`apps/server/Dockerfile`](../apps/server/Dockerfile) installs the workspace,
builds the `server` package, and copies the server application plus its
workspace runtime dependencies into the final image. It exposes container port
`3000`.

The server receives configuration only at runtime through environment
variables. It must be deployed separately from the web image, normally behind
an API hostname such as `api.example.com`.

> **Current required correction:** `tsdown` currently emits
> `apps/server/dist/index.mjs`, but `apps/server/package.json` and the server
> Dockerfile start `dist/index.js`. Update those entrypoints to `dist/index.mjs`
> and rebuild the image before deploying the server. Otherwise the container
> will fail at startup with a module-not-found error.

## Local container stack

[`docker-compose.yml`](../docker-compose.yml) is a local integration stack:

```text
web (host 3000 -> container 3000)
server (host 3001 -> container 3000)
db (host 5432 -> PostgreSQL 16)
```

It uses a named PostgreSQL volume and is useful for local end-to-end testing.
It is not the intended production database topology: production should supply
a Neon `DATABASE_URL` and omit the local `db` service.

Start it with a real Better Auth secret:

```bash
export BETTER_AUTH_SECRET='a-random-secret-with-at-least-32-characters'
docker compose up --build
```

For the default local ports, use:

```bash
export NEXT_PUBLIC_SERVER_URL='http://localhost:3001'
export BETTER_AUTH_URL='http://localhost:3001'
export CORS_ORIGIN='http://localhost:3000'
```

`BETTER_AUTH_URL` is the server's public origin. `CORS_ORIGIN` is the web
origin allowed to make credentialed requests. They must use the real HTTPS
origins in production.

## Required server environment

The server validates these values in
[`packages/env/src/server.ts`](../packages/env/src/server.ts):

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon/PostgreSQL connection string; server-only. |
| `BETTER_AUTH_SECRET` | Yes | Better Auth signing secret; at least 32 characters; server-only. |
| `BETTER_AUTH_URL` | Yes | Public API/auth origin. |
| `CORS_ORIGIN` | Yes | Exact public web origin allowed by NestJS CORS and Better Auth. |
| `NODE_ENV` | No | `development`, `production`, or `test`; defaults to `development`. |
| `PORT` | Operationally yes | The current server listens on `3000`; the implementation does not yet read this variable. |

Store sensitive values in the deployment platform's secret manager. Never set
`DATABASE_URL` or `BETTER_AUTH_SECRET` as `NEXT_PUBLIC_*` values, commit them,
or bake them into either Docker image.

Better Auth uses secure, cross-site cookies. Production web and API hosts must
be served over HTTPS, and `CORS_ORIGIN` must exactly match the public web
origin.

## Production deployment procedure

1. Choose two public origins, for example `https://app.example.com` and
   `https://api.example.com`.
2. Create a Neon production database and provide its production
   `DATABASE_URL` only to `apps/server`.
3. Apply Prisma migrations as an explicit release step from a trusted CI job or
   one-off migration job. Do not run development-only `prisma migrate dev` in
   an application container startup path.
4. Build the web image with
   `NEXT_PUBLIC_SERVER_URL=https://api.example.com`.
5. Deploy the server image with `NODE_ENV=production`, `DATABASE_URL`,
   `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://api.example.com`, and
   `CORS_ORIGIN=https://app.example.com`.
6. Deploy the web image independently.
7. Configure HTTPS, route the web hostname to `apps/web`, and route the API
   hostname to `apps/server`.
8. Verify an unauthenticated oRPC health procedure, authentication, a
   credentialed browser request, and database connectivity after release.

The current server exposes its oRPC health procedure at the `/rpc` transport;
the exact request shape is defined by `packages/api` and handled in
`apps/server`. A conventional load-balancer health endpoint is not currently
implemented. Add one in `apps/server` before relying on HTTP health checks.

## CI and release boundaries

The current [GitHub Actions workflow](../.github/workflows/ci.yml) installs
dependencies, type-checks, builds, and tests on pushes and pull requests to
`main` and `master`. It does not build, push, or deploy Docker images.

Recommended future release stages are:

```text
CI validation
  -> build web image
  -> build server image
  -> vulnerability scan
  -> push images to a registry
  -> run database migration job
  -> deploy server
  -> deploy web
  -> smoke test
```

Turborepo coordinates workspace build dependencies; it is not a production
runtime. Run normal repository validation before building images:

```bash
pnpm run check-types
pnpm run build
pnpm run test
```

## Pre-production checklist

- [ ] Correct the server `index.js` versus `index.mjs` entrypoint mismatch.
- [ ] Build both images from the repository root.
- [ ] Use a secret manager for `DATABASE_URL` and `BETTER_AUTH_SECRET`.
- [ ] Use Neon rather than the Compose PostgreSQL service in production.
- [ ] Apply production migrations separately and verify rollback/restore plans.
- [ ] Set exact HTTPS values for `NEXT_PUBLIC_SERVER_URL`, `BETTER_AUTH_URL`,
      and `CORS_ORIGIN`.
- [ ] Put the web and API services behind TLS termination and restrict inbound
      network access appropriately.
- [ ] Add a conventional server health/readiness endpoint in `apps/server`.
- [ ] Run images as non-root; the web image already does, while the current
      server image still runs as root and should be hardened before production.
- [ ] Pin and regularly update base images, scan images in CI, and use
      least-privilege R2 credentials when R2 integration is added.

## What is deployed

```text
apps/web     = standalone Next.js container
apps/server  = NestJS/oRPC container
Neon         = managed PostgreSQL service
PartyKit     = separate realtime service when configured
R2           = managed object storage when configured

packages/*   = shared code; never standalone deployed services
MCP/skills   = developer and AI tooling; never production runtime services
```
