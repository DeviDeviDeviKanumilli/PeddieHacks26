# Optional Cloud Sync

Cloud sync is optional. Guest mode completes workouts entirely on-device. Live mode uses
Supabase Auth and the Fastify API when public environment variables are configured.

## Stack

- Fastify 5 API: validation, authentication, orchestration
- Supabase Auth: email/password sessions, publishable key on the client
- Postgres with RLS: owner-scoped profile, workout, session, and progress rows
- Authenticated repositories: request-scoped bearer token so RLS sees the real user

## What Syncs

- Movement profile and settings
- Workout records with UUID identifiers
- Session lifecycle (create, complete, skip remaining, delete)
- Allowlisted derived metrics
- Activity and progress summaries

## What Does Not Sync

- Camera media and pose landmarks
- Local orchestrator state and tool-call traces
- Event-bus streams
- Guest SQLite rows until the user signs in and the client performs an explicit live
  start with a UUID workout

## Failure

Network loss during a session does not stop counting. The client may finish locally and
retry sync. Account deletion uses a server-only service-role adapter and removes
Auth-user plus owner-scoped rows; it cannot retrieve media that was never stored.
