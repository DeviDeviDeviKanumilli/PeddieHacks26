# Deployment and Operations

## Environments

### Local

- Supabase CLI and Docker-compatible runtime.
- Versioned migrations and `supabase/seed.sql`.
- `supabase db reset` must reconstruct the complete local database.
- No real user data or secrets in local seeds.
- Vite web client on `http://localhost:5173` through `pnpm dev` (`pnpm dev:web` is an
  explicit alias).
- Fastify API on `http://localhost:3000` through `pnpm dev:api`.
- `pnpm dev:all` starts both development servers after the API environment is configured.
- The Vite development server proxies `/api` to port 3000, so `VITE_API_URL` is optional
  for the standard local setup.

### Hosted demo

- One Supabase project for Auth/Postgres.
- One Railway Fastify service.
- One HTTPS static web deployment built from `apps/web`.
- One API replica is sufficient for the demo.
- No Redis, queue, Storage bucket, or Realtime service.

The static hosting provider is not locked. The deployed web origin must be present in
the API's `CORS_ORIGINS`, and its API and Supabase variables must be provided at build
time. HTTPS is required for production browser camera access.

## Web client

- Build with `pnpm --filter @peddie/web build`; deploy the generated `apps/web/dist`
  directory as a single-page application with route fallback to `index.html`.
- Use `VITE_API_URL` for the public Fastify origin outside the local proxy setup.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` together to expose live mode.
- Treat every `VITE_` value as public build output. Never expose
  `SUPABASE_SERVICE_ROLE_KEY`, database URLs, or server credentials through Vite.
- Keep demo mode available when live variables are absent so the screen flow can be
  reviewed independently of hosted services.
- Camera use must remain optional. The client must stop its media tracks when leaving the
  camera flow and must not upload raw frames, recordings, audio, or pose landmarks.

## Railway service

- Listen on Railway's injected `PORT`.
- Bind to host `::`.
- Configure `/readyz` as the deployment health check; it returns `503 degraded` when the Postgres/Prisma dependency check fails.
- Use `/healthz` as the process-only liveness check.
- Require `SUPABASE_URL` and `SUPABASE_ANON_KEY` at API startup; the server never uses a service key for client-facing requests.
- Require `DATABASE_URL` at API startup for the Prisma PostgreSQL adapter. Prefer a pooled runtime URL; keep `DIRECT_URL` for migration/introspection tooling.
- Expose `/openapi.json` and `/docs` for the versioned backend contract.
- Use config-as-code for build, start, healthcheck, restart policy, and draining.
- Set `TRUST_PROXY=true` on Railway so anonymous IP rate limits use the trusted
  forwarded client address rather than the Railway proxy address.
- Deploy migrations before API code that requires them.
- The committed `railway.toml` installs dependencies with pnpm, builds all workspaces,
  starts only `@peddie/api`, and applies restart limits.

## API environment variables

```text
NODE_ENV
LOG_LEVEL
PORT
HOST
TRUST_PROXY
CORS_ORIGINS
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
DIRECT_URL
RATE_LIMIT_CATALOG
RATE_LIMIT_GENERAL
RATE_LIMIT_GENERATION
RATE_LIMIT_METRICS
RATE_LIMIT_DELETION
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. It is used exclusively by the account
deletion adapter to call Supabase Auth Admin; it is never returned to a client,
included in OpenAPI, or used by the client-facing Supabase repository.

Demo-user provisioning is a deployment task handled through the Supabase Auth
dashboard or an approved operator workflow; the API does not expose a provisioning
endpoint and the database seed does not contain credentials.

## Web environment variables

```text
VITE_API_URL
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

The web values are optional for the self-contained demo adapter. Set both Supabase values
for live authentication. The anon key is designed to be public and remains constrained
by RLS; it is not interchangeable with the server-only service-role key. Example values
are listed, without secrets, in `apps/web/.env.example`.

## Release sequence

1. Run `pnpm format`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`,
   `pnpm openapi:check`, and `pnpm build`. The recursive gates include `apps/web`.
2. Run local `supabase db reset`, then `pnpm test:db` and `pnpm test:prisma` with
   `DATABASE_URL` or `SUPABASE_DB_URL` set.
3. Review migration diff and security/performance advisors.
4. Apply migrations to the hosted demo.
5. Deploy the API service.
6. Build and deploy the web client with its public live configuration.
7. Run `/healthz` and `/readyz` smoke checks from the deployed web origin.
8. Run the complete demo-mode and live-mode browser acceptance scenarios, including the
   no-camera path, camera denial, media-track cleanup, and raw-media network inspection.
9. Verify `DELETE /v1/users/me` removes the Auth identity and cascaded application
   rows, then verify the old token receives `401` and the client clears local state.

## Hosted smoke runner

Run public health, readiness, and catalog checks:

```text
API_BASE_URL=https://your-api.example pnpm smoke:hosted
```

Add `DEMO_ACCESS_TOKEN` to verify authenticated profile, settings, workout, session,
and progress reads. To execute the complete mutation loop, create a disposable demo
user and set `RUN_MUTATING_SMOKE=true`; the runner temporarily broadens that user's
movement profile, generates and completes a workout, checks metrics/analysis/progress,
then deletes the session, archives the workout, and restores the original profile.
Set `SECONDARY_ACCESS_TOKEN` to add cross-user isolation verification.

`RUN_ACCOUNT_DELETION_SMOKE=true` is intentionally separate and destructive. It
requires `RUN_MUTATING_SMOKE=true`, deletes the disposable Auth user after cleanup,
and verifies the old bearer token receives `401`. Never use this flag with a reusable
demo or real account.

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

The API emits safe JSON request-completion records with request ID, method, route
template, status, duration, service name, and Railway deployment ID when available.
Authorization/cookie/API-key headers and common credential fields are redacted;
request bodies and raw error objects are not logged.

Track request errors, latency, readiness failures, migration mismatch, rate-limit
events, and account-deletion failures in the hosting platform. External alerting and
the performance targets—p95 below 300 ms for profile/catalog reads, 800 ms for
generation, and 500 ms for 100-rep metric batches under 50 concurrent demo users—must
be validated in the hosted environment.
