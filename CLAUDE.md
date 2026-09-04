# monitoring-scholarship-app

This file provides context about the project for AI assistants.

## Project Overview

- **Ecosystem**: Typescript

## Tech Stack

- **Runtime**: node
- **Package Manager**: pnpm

### Frontend

- Framework: next
- CSS: tailwind
- UI Library: shadcn-ui
- State: zustand

### Backend

- Framework: nestjs
- API: orpc
- Validation: zod

### Database

- Database: postgres
- ORM: prisma

### Authentication

- Provider: better-auth

### Additional Features

- Testing: vitest
- Realtime: partykit

## Project Structure

```
monitoring-scholarship-app/
├── apps/
│   ├── web/         # Frontend application
│   └── server/      # Backend API
├── packages/
│   ├── api/         # API layer
│   ├── auth/        # Authentication
│   └── db/          # Database schema
```

## Common Commands

- `pnpm install` - Install dependencies
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm test` - Run tests
- `pnpm db:push` - Push database schema
- `pnpm db:studio` - Open database UI

## Better Fullstack project context

`bts.jsonc` is the authority for the current Stack Graph. Its `stackParts` array owns role selection and `ownerPartId` bindings. Top-level option fields are a compatibility projection and must not become a second mutation path.

### Stack Parts, ownership, and evidence

- `aiTooling:universal:mcp`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `aiTooling:universal:skills`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `backend.api:typescript:orpc`. It belongs to `backend:typescript:nestjs`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `backend.auth:typescript:better-auth`. It belongs to `backend:typescript:nestjs`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `backend.deploy:typescript:docker`. It belongs to `backend:typescript:nestjs`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `backend.fileStorage:typescript:r2`. It belongs to `backend:typescript:nestjs`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `backend.orm:typescript:prisma`. It belongs to `backend:typescript:nestjs`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `backend.realtime:typescript:partykit`. It belongs to `backend:typescript:nestjs`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `backend.runtime:typescript:node`. It belongs to `backend:typescript:nestjs`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `backend.testing:typescript:vitest`. It belongs to `backend:typescript:nestjs`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `backend.validation:typescript:zod`. It belongs to `backend:typescript:nestjs`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `backend:typescript:nestjs`. Its generated target is `apps/server`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `continuousIntegration:universal:github-actions`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `database.dbSetup:universal:neon`. It belongs to `database:universal:postgres`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `database:universal:postgres`. Its generated target is `packages/db`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `frontend.css:typescript:tailwind`. It belongs to `frontend:typescript:next`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `frontend.deploy:typescript:docker`. It belongs to `frontend:typescript:next`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `frontend.forms:typescript:tanstack-form`. It belongs to `frontend:typescript:next`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `frontend.libraries:typescript:tanstack-table`. It belongs to `frontend:typescript:next`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `frontend.libraries:typescript:tanstack-virtual`. It belongs to `frontend:typescript:next`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `frontend.stateManagement:typescript:zustand`. It belongs to `frontend:typescript:next`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `frontend.ui:typescript:shadcn-ui`. It belongs to `frontend:typescript:next`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `frontend:typescript:next`. Its generated target is `apps/web`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `workspaceRunner:universal:turborepo`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.

### Installed-version authority

Use `bts.jsonc` for the generator and schema version. Use local package manifests and lockfiles for installed dependency versions. Do not assume that documentation for a newer Better Fullstack release matches this project.

### Compatibility and lifecycle safety

Run `create-better-fullstack context --json` for bounded roles, capabilities, evidence, compatibility issues, and safe next actions. Run `create-better-fullstack doctor --json` before repairing graph drift. Existing-project writes must start with a plan and use the exact review token. Use `create-better-fullstack recipes check --json` before editing recipe-owned paths or managed regions, and use recipe history plus project recovery commands to undo a reviewed operation.

User code outside an explicit Better Fullstack managed region is not generator-owned. Missing or changed managed-region hashes stop recipe planning for manual review.

<!-- <better-fullstack:recipes sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855> -->

<!-- </better-fullstack:recipes> -->

## Maintenance

Keep CLAUDE.md updated when:

- Adding/removing dependencies
- Changing project structure
- Adding new features or services
- Modifying build/dev workflows

AI assistants should suggest updates to this file when they notice relevant changes.
