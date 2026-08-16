# Deployment and Operations

## Environments

### Local

- Supabase CLI and Docker-compatible runtime.
- Versioned migrations and `supabase/seed.sql`.
- `supabase db reset` must reconstruct the complete local database.
- No real user data or secrets in local seeds.
- React Native development server through Expo, with iOS simulator, Android emulator,
  and physical-device targets.
- Fastify API on `http://localhost:3000` through `pnpm dev:api`. Bind `HOST=0.0.0.0`
  when a physical phone on the same network must reach the laptop API.
- `EXPO_PUBLIC_API_BASE_URL` must resolve from the selected simulator, emulator, or
  physical device; a physical device cannot use the development computer's `localhost`.
  Use the laptop LAN IP or a hosted API origin.
- Pose inference needs an Expo development build with `expo-dev-client`. Expo Go cannot
  load MediaPipe. The first hardware pass is an Android development APK on a physical
  phone. Compile and install with `pnpm dev:mobile:android:device` on a machine that has
  the Android SDK. That command is the next pose step; Mac-side module and session
  wiring are already in the repository.
- iOS simulator local runs use `pnpm dev:mobile:ios` (`expo run:ios`). Xcode 26.3 fails
  to compile `expo-modules-jsi@57.0.4` unless `Swift.abs` is used; the repo applies that
  one-line fix through `patches/expo-modules-jsi@57.0.4.patch`. Drop the patch after an
  upstream Expo release includes the fix or Xcode is 26.4+.

### Hosted Demo

- One Supabase project for Auth/Postgres.
- One Railway Fastify service.
- One Expo application with iOS and Android development/preview builds.
- One API replica is sufficient for the demo.
- No Redis, queue, Storage bucket, or Realtime service.

The Expo/EAS account and store identities are deployment inputs. The API origin must be
present in the mobile build configuration, and public API and Supabase variables must be
provided at build time.

## React Native Mobile Client

- Build iOS and Android development, preview, and production profiles with Expo/EAS.
  The committed `development` profile already sets `developmentClient: true`.
- Use `EXPO_PUBLIC_API_BASE_URL` for the public Fastify origin.
- Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` together to
  expose live mode.
- Treat every `EXPO_PUBLIC_` value as public build output. Never expose
  `SUPABASE_SERVICE_ROLE_KEY`, database URLs, or server credentials through the app.
- Keep guest mode available when live variables are absent so the screen flow can be
  reviewed independently of hosted services.
- Camera use must remain optional. The client must release the native camera session when
  leaving the flow or entering the background and must not upload raw frames,
  recordings, audio, or pose landmarks.
- The Expo tools floating button is hidden in development (`hideExpoDevMenuFab` plus iOS
  `EXDevMenuShowFloatingActionButton: false`) so it does not cover setup or session
  controls. Shake still opens the developer menu.
- The mobile bundle contains reviewed flat illustration families for welcome/detail contexts
  and renders compact list movement marks from native code. The API does not need to host or
  transform thumbnails for the Explore and collection rows.

## Railway Service

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

## API Environment Variables

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

## Mobile Environment Variables

```text
EXPO_PUBLIC_API_BASE_URL
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

The mobile values are optional for the self-contained guest adapter. Set both Supabase
values for live authentication. The publishable key is designed to be public and remains
constrained by RLS; it is not interchangeable with the server-only service-role key.
Example values belong in `apps/mobile/.env.example` without real credentials.

## Release Sequence

1. Run `pnpm format`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`,
   `pnpm openapi:check`, and `pnpm build`. The recursive gates must include `apps/mobile`.
2. Run local `supabase db reset`, then `pnpm test:db` and `pnpm test:prisma` with
   `DATABASE_URL` or `SUPABASE_DB_URL` set.
3. Review migration diff and security/performance advisors.
4. Apply migrations to the hosted demo.
5. Deploy the API service.
6. Build iOS and Android preview applications with the public live configuration.
7. Run `/healthz` and `/readyz` smoke checks from the mobile-configured API origin.
8. Run complete guest-mode and live-mode mobile acceptance on iOS and Android, including
   the Home/Explore hierarchy, collection navigation, visible list marks, progress range
   selection, workout-setup carousel, multi-exercise continuation, no-camera path, camera denial, native camera cleanup, and raw-media network inspection.
9. Verify `DELETE /v1/users/me` removes the Auth identity and cascaded application
   rows, then verify the old token receives `401` and the client clears local state.

## Hosted Smoke Verification

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
