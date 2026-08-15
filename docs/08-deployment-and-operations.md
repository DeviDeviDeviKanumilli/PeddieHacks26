# Deployment and Operations

## Environments

### Local

- Supabase CLI and Docker-compatible runtime.
- Versioned migrations and `supabase/seed.sql`.
- `supabase db reset` must reconstruct the complete local database.
- No real user data or secrets in local seeds.

### Hosted demo

- One Supabase project for Auth/Postgres.
- One Railway Fastify service.
- One API replica is sufficient for the demo.
- No Redis, queue, Storage bucket, or Realtime service.

## Railway service

- Listen on Railway's injected `PORT`.
- Bind to host `::`.
- Configure `/readyz` as the deployment health check; it returns `503 degraded` when the Supabase dependency check fails.
- Use `/healthz` as the process-only liveness check.
- Require `SUPABASE_URL` and `SUPABASE_ANON_KEY` at API startup; the server never uses a service key for client-facing requests.
- Expose `/openapi.json` and `/docs` for the versioned backend contract.
- Use config-as-code for build, start, healthcheck, restart policy, and draining.
- Deploy migrations before API code that requires them.
- The committed `railway.toml` installs dependencies with pnpm, builds all workspaces,
  starts only `@peddie/api`, and applies restart limits.

## Environment variables

```text
NODE_ENV
LOG_LEVEL
CORS_ORIGINS
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RATE_LIMIT_GENERAL
RATE_LIMIT_GENERATION
RATE_LIMIT_METRICS
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. It is used exclusively by the account
deletion adapter to call Supabase Auth Admin; it is never returned to a client,
included in OpenAPI, or used by the client-facing Supabase repository.

Demo provisioning additionally uses:

```text
DEMO_USER_EMAIL
DEMO_USER_PASSWORD
```

## Release sequence

1. Run formatting, typecheck, unit tests, integration tests, and seed validation.
2. Run local `supabase db reset`.
3. Review migration diff and security/performance advisors.
4. Apply migrations to the hosted demo.
5. Deploy the API service.
6. Run `/healthz` and `/readyz` smoke checks.
7. Run the complete demo acceptance scenario.
8. Verify `DELETE /v1/users/me` removes the Auth identity and cascaded application
   rows, then repeat it to confirm retry-safe behavior.

Never use destructive database reset commands against the hosted demo.

## Observability

Log JSON fields:

- Request ID.
- Route template.
- Status code.
- Duration.
- Safe error code.
- Deployment identifier.

Do not log request bodies, tokens, cookies, email addresses, raw user IDs, metrics payloads, or profile details.

Track request errors, latency, readiness failures, migration mismatch, rate-limit events, and account-deletion failures. Performance targets are p95 below 300 ms for profile/catalog reads, 800 ms for generation, and 500 ms for 100-rep metric batches under 50 concurrent demo users.
