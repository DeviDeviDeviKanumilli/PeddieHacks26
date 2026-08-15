# PeddieHacks26 Backend Plan

This folder is the backend source of truth for the adaptive fitness product.

The project is intentionally backend-only for this checkpoint. Frontend screens, styling, web/mobile architecture, and platform-specific camera implementation are deferred until references are provided.

## Reading order

1. [Scope and requirements](01-scope-and-requirements.md)
2. [Backend architecture](02-backend-architecture.md)
3. [Database schema](03-database-schema.md)
4. [API contract](04-api-contract.md)
5. [Compatibility and workout generation](05-compatibility-and-generation.md)
6. [Session metrics and analytics](06-session-metrics-and-analytics.md)
7. [Security, privacy, and safety](07-security-privacy-and-safety.md)
8. [Deployment and operations](08-deployment-and-operations.md)
9. [Testing and acceptance](09-testing-and-acceptance.md)
10. [Implementation roadmap](10-implementation-roadmap.md)

## Locked decisions

- Backend only; no frontend work in this phase.
- Node.js 24 LTS, TypeScript, Fastify 5, and pnpm.
- Supabase Auth and Postgres; Fastify API deployed to Railway.
- Local Supabase development plus one hosted demo environment.
- Email/password authentication plus a seeded demo account.
- Public exercise catalog; authentication required for personalization and history.
- Deterministic compatibility rules and scoring; no LLM in eligibility decisions.
- Pose estimation remains on-device. The API stores derived metrics only.
- Retain derived metrics until session or account deletion.
- Seed 24 sourced exercises, with tracking rules for 6.
- General wellness positioning for adults; no diagnosis, treatment, or rehabilitation claims.

## Current state

The repository starts with only the initial README. The next implementation task is to scaffold the backend workspace and Supabase migrations from these documents.
