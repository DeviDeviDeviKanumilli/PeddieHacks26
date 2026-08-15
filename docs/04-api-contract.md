# API Contract

## Conventions

All application routes use `/v1`, camelCase JSON, UUID strings, and UTC ISO-8601 timestamps.

Single resource:

```json
{ "data": {} }
```

Collection:

```json
{
  "data": [],
  "page": { "nextCursor": null, "hasMore": false }
}
```

Errors use:

```json
{
  "type": "https://api.example/errors/version-conflict",
  "title": "Version conflict",
  "status": 409,
  "code": "version_conflict",
  "detail": "The resource changed since it was loaded.",
  "requestId": "...",
  "errors": []
}
```

Use opaque cursor pagination. Default limit is 20; maximum is 100.

The shared TypeBox definitions live in `packages/contracts`. They are the source of
truth for request/response validation and are intentionally independent of any web
or mobile client implementation.

## Public routes

```http
GET /healthz
GET /readyz
GET /v1/reference-data
GET /v1/exercises
GET /v1/exercises/:exerciseId
```

Exercise filters include search, body region, category, position, equipment, difficulty, tracking support, sort, cursor, and limit. `compatible=true` requires authentication.

The public catalog and reference routes, authenticated exercise compatibility route,
typed error envelope, OpenAPI document, request IDs, and general rate limit are now
implemented in `apps/api`. Supabase-backed catalog/profile adapters are selected when
the required environment variables are present; tests use an injected deterministic
repository and auth verifier.

Movement-profile reads/writes and generated/manual workout CRUD are also implemented.
Generated requests are stored with a client request ID and SHA-256 request hash;
replaying the same content returns the original workout, while reusing the ID with
different content returns `409 idempotency_conflict`. Manual caution items require
acknowledgement of every returned warning code.

## Profile routes

```http
GET    /v1/users/me
PATCH  /v1/users/me
DELETE /v1/users/me

GET    /v1/movement-profile
PUT    /v1/movement-profile

GET    /v1/settings
PATCH  /v1/settings
```

Movement-profile writes include `expectedVersion`. Stale writes return `409 version_conflict`.

`DELETE /v1/users/me` deletes application data and then the Supabase Auth identity. The operation is retry-safe.

## Exercise and workout routes

```http
GET   /v1/exercises/:exerciseId/compatibility

POST  /v1/workouts/generate
POST  /v1/workouts
GET   /v1/workouts
GET   /v1/workouts/:workoutId
PATCH /v1/workouts/:workoutId
DELETE /v1/workouts/:workoutId

GET   /v1/workouts/:workoutId/items/:itemId/alternatives
PATCH /v1/workouts/:workoutId/items/:itemId
```

`GenerateWorkoutRequest` contains `clientRequestId`, focus goals/body regions, duration from 5–45 minutes, optional equipment override, and optional intensity override.

`CompatibilityResult` contains status, score, engine/profile versions, stable reason/conflict codes, related IDs, explanations, and alternatives.

Deleting a workout archives it. Manual workouts may contain one exercise for standalone exercise sessions.

## Session routes

```http
POST   /v1/workout-sessions
GET    /v1/workout-sessions
GET    /v1/workout-sessions/:sessionId
PATCH  /v1/workout-sessions/:sessionId
POST   /v1/workout-sessions/:sessionId/complete
DELETE /v1/workout-sessions/:sessionId

PATCH  /v1/exercise-sessions/:exerciseSessionId
POST   /v1/exercise-sessions/:exerciseSessionId/metrics
POST   /v1/exercise-sessions/:exerciseSessionId/complete
GET    /v1/exercise-sessions/:exerciseSessionId/analysis
```

Creates are idempotent using `clientRequestId`. Metric ingestion uses `batchId` and a request hash. Reusing an ID with different content returns `409 idempotency_conflict`.

Metrics accept no raw video, image, landmark, coordinate, or arbitrary feedback fields. A batch contains at most 100 reps and 64 KB.

## Progress routes

```http
GET /v1/progress/summary
GET /v1/progress/activity
GET /v1/progress/exercises/:exerciseId
```

Progress supports date ranges up to 366 days. Results include totals, daily activity, body coverage, and per-exercise trend baselines.

## Status codes

- `400`: malformed request.
- `401`: missing or invalid authentication.
- `403`: authenticated but unauthorized.
- `404`: resource not found or not visible.
- `409`: version, state, or idempotency conflict.
- `422`: valid JSON but invalid domain request/profile.
- `429`: rate limit exceeded.
- `503`: readiness/dependency failure.
