# Database Schema

## Conventions

- Lowercase snake_case identifiers.
- `timestamptz` for all timestamps.
- UUIDs for externally visible user-owned resources.
- Bigint identity keys for high-volume internal records.
- Text plus check constraints for mutable state values.
- Every user-owned table includes `user_id` to simplify RLS and indexing.
- Reference/catalog rows are deactivated rather than deleted after use.

## Reference tables

- `body_regions(id text primary key, label, side, parent_id, sort_order)`.
- `capabilities(id text primary key, label, sort_order)`.
- `equipment(id text primary key, label, category)`.
- `goals(id text primary key, label)`.
- `muscle_groups(id text primary key, label)`.

Body regions include five central regions and left/right versions of shoulder, upper arm, elbow, forearm, wrist/hand, hip, thigh, knee, lower leg, and ankle/foot.

Capabilities include seated posture, standing, standing balance, floor transfer, supine, prone, kneeling, jumping, high impact, overhead reach, forward bend, torso rotation, left/right grip, left/right upper-body weight bearing, left/right lower-body weight bearing, and left/right single-leg balance.

## User tables

- `profiles`: `user_id` references `auth.users`, display name, timezone, experience level, intensity preference, onboarding timestamp, and timestamps.
- `movement_profiles`: one row per user, current version, and update timestamp.
- `user_body_regions`: user, region, `neutral|focus|limited|avoid`.
- `user_capabilities`: user, capability, `unknown|available|limited|avoid`.
- `user_equipment`: user/equipment pair.
- `user_goals`: user/goal pair and priority.
- `user_settings`: accessibility preferences, feedback preferences, pose overlay preference, and default rest duration.

Do not store diagnoses, free-text pain descriptions, birth dates, clinician notes, or medical records.

## Exercise tables

- `exercises`: UUID, unique slug, family key, name, summary, category, position, difficulty, default prescription, ordered instruction JSONB, safety-cue JSONB, active flag, content version, and timestamps.
- `exercise_sources`: source title, publisher, URL, publication year, access date, license note, review status, and reviewer role.
- `exercise_source_links`: exercise/source pair.
- `exercise_body_demands`: exercise/region pair, involvement, and demand level.
- `exercise_capability_demands`: exercise/capability pair, demand level, and required flag.
- `exercise_equipment_options`: exercise, equipment, required/optional mode, and OR-group key.
- `exercise_muscles`: exercise/muscle pair, role, and intensity.
- `exercise_goals`: exercise/goal pair used for deterministic ranking and generation.
- `exercise_tracking_profiles`: exercise, model-neutral tracking key, version, confidence floor, ROM/tempo targets, and supported metric flags.
- `exercise_form_rules`: tracking profile, feedback code, metric comparison, threshold, severity, and message key.

## Workout and session tables

- `workouts`: owner, source, title, status, requested duration, engine version, profile version, generation request snapshot, version, and timestamps.
- `workout_items`: owner, workout, position, exercise, sets, reps or hold duration, rest seconds, and compatibility snapshot.
- `workout_sessions`: owner, workout, client request ID, state, start/end times, pause/rest data, end reason, duration, version, and timestamps.
- `exercise_sessions`: owner, parent session/item, state, target snapshot, completed counts, tracking profile version, start/end times, and version.
- `metric_batches`: owner, exercise session, client batch ID, request hash, and received time.
- `rep_metrics`: bigint identity, owner, session, batch, set/rep number, counted flag, duration, ROM, target result, scores, confidence, feedback codes, and recording offset.
- `exercise_session_summaries`: immutable aggregate for each completed exercise session.
- `session_events`: append-only session state transitions and safe metadata.
- `daily_progress`: user/date primary key with session, time, exercise, set, rep, and score totals.

## Constraints and indexes

- Unique slugs, user/reference pairs, workout positions, client request IDs, metric batch IDs, and `(exercise_session_id, set_number, rep_number)`.
- Foreign-key indexes on every referencing column.
- History: `(user_id, started_at desc, id desc)`.
- Metrics: `(exercise_session_id, set_number, rep_number)`.
- Daily progress: `(user_id, activity_date desc)`.
- Partial unique index for one active/paused/resting exercise per workout session.
- No JSONB indexes until a measured query needs one.

## RLS and grants

- Enable and force RLS on every exposed table.
- Anonymous users can select only active public catalog/reference rows.
- Authenticated users can select and mutate only their own rows.
- Update policies include both `USING` and `WITH CHECK` ownership checks.
- Policies use `(select auth.uid())` and indexed owner columns.
- Grants and RLS policies are defined together in migrations.
- Views use `security_invoker = true`.

## Migrations and seed

Create migrations through the Supabase CLI. The expected order is:

1. Extensions, helper functions, and reference tables.
2. User/profile tables.
3. Exercise catalog tables.
4. Workout/session/metric tables.
5. Indexes, grants, RLS, triggers, and atomic functions.
6. Validation constraints and catalog-source checks.
7. Workout idempotency fields and atomic movement-profile replacement.

`supabase/seed.sql` contains only deterministic reference data, the 24 exercise catalog records, tracking rules, and local demo fixtures. It must not contain real user data, secrets, or production credentials.

Implementation status: the six CLI-created migrations and deterministic seed are in
place. A disposable PostgreSQL 16 execution applies every migration and seed row,
and `supabase/tests/rls.sql` verifies owner isolation and anonymous catalog access.
The Docker-backed `supabase db reset` and Supabase advisors are pending because the
current machine has no Docker daemon.
