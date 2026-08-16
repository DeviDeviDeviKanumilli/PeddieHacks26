# Security, Privacy, and Safety

## Data Posture

Movement profiles and workout metrics are sensitive personal data. Store only what is required for personalization and progress.

Never store:

- Raw video, still images, audio, or pose landmarks.
- Diagnoses, medication, medical records, or clinician notes.
- Free-text pain descriptions.
- Birth dates or unnecessary identity attributes.
- Data for model training or advertising.

## Authentication and Secrets

- Supabase Auth owns authentication.
- API validates bearer tokens and creates a request-scoped user context. Private
  Supabase operations also carry the same bearer token into a request-scoped client so
  Postgres RLS evaluates the authenticated identity.
- Publishable keys may appear in clients; secret/service keys never may.
- The secret key is limited to server-side Auth-user deletion.
- Secrets are environment variables, never seed data or committed files.

## RLS

- Enable and force RLS on every exposed table.
- Anonymous access is read-only and limited to active catalog/reference data.
- Authenticated access is owner-scoped.
- Every update policy has both `USING` and `WITH CHECK` ownership predicates.
- Use `(select auth.uid())` in policies and index every policy column.
- Do not use editable user metadata for authorization.
- Use `security_invoker` for exposed views.

## API Protections

- TypeBox schemas use `additionalProperties: false`.
- Response schemas prevent accidental field leakage.
- Request bodies are not logged for profiles, metrics, or account deletion.
- Redact tokens, cookies, email addresses, secrets, and full user IDs.
- Apply CORS from an explicit environment allowlist.
- Use request IDs and structured error codes.
- Rate-limit anonymous catalog, general API, generation, metrics, and deletion separately.

Rate limits:

- Anonymous catalog: 60 requests/minute/IP.
- Authenticated API: 120 requests/minute/user.
- Generation: 10 requests/minute/user.
- Metrics: 30 batches/minute/session.
- Deletion: 3 requests/hour/user.

These limits are implemented through `RATE_LIMIT_CATALOG`, `RATE_LIMIT_GENERAL`,
`RATE_LIMIT_GENERATION`, `RATE_LIMIT_METRICS`, and `RATE_LIMIT_DELETION`. General,
generation, and deletion limits key authenticated requests by verified user ID;
metrics key by user and exercise-session ID; public catalog limits key by client IP.
The current in-memory limiter is appropriate for the single-replica demo only.

## Wellness Guardrails

- Position the product as general wellness.
- Return general stop guidance and safety-warning codes.
- Never claim to diagnose, treat, rehabilitate, or clinically assess.
- Generated workouts exclude caution exercises by default.
- Compatibility explanations are transparent and non-clinical.
- Performance-change output is explicitly an indicator derived from session metrics, not a medical fatigue diagnosis.

The no-camera path is a privacy-preserving first-class experience, not an error state. The
mobile session keeps the exercise anatomy and manual rep control available and exposes a
compact icon-plus-text **Tracking off** status. That label must remain accessible to screen
readers and must not imply that form, ROM, or fatigue data was measured.

Hiding the Expo developer-tools floating button in development is a UI choice so the FAB
does not cover product controls. Shake still opens the developer menu. That change is not
a privacy control and does not affect the camera or metrics boundary.

## Deletion and Retention

- Retain derived metrics until the user deletes a session or account.
- Session deletion removes metrics, summaries, events, and recomputes daily progress.
- Account deletion removes all application rows, then the Supabase Auth identity.
- The server-side deletion adapter treats an already-missing Auth identity as success
  and does not expose whether another user's records exist.
- Supabase JWTs remain cryptographically valid until expiry after account deletion.
  The API therefore validates every token through `auth.getUser()` instead of trusting
  offline claims. The old token receives `401` after successful deletion, and clients
  must also clear their local session.
## Database Implementation Status

### Implemented Database Controls

- Every application table is forced through RLS.
- Public roles receive explicit `SELECT` grants only for active reference/catalog rows.
- Authenticated private-table policies use `(select auth.uid())` owner predicates and both `USING` and `WITH CHECK` for writes.
- Derived metrics store scores, ranges, confidence, tempo, and known feedback codes only. Raw camera frames, images, audio, landmarks, coordinates, and arbitrary text are not schema fields.
- Account-linked rows cascade from `auth.users`; workout deletion is not exposed as physical deletion by the product contract, while account deletion removes application rows.
- Catalog activation is blocked unless content has instructions, safety cues, adaptations, body/capability demands, and an approved source.

The SQL isolation test covers two authenticated identities plus anonymous catalog
access. CI runs the same isolation boundary against disposable PostgreSQL on every
change. Hosted acceptance additionally verifies that the deleted account token is
rejected and that a second user cannot read the demo user's rows.
