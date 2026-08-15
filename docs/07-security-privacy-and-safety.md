# Security, Privacy, and Safety

## Data posture

Movement profiles and workout metrics are sensitive personal data. Store only what is required for personalization and progress.

Never store:

- Raw video, still images, audio, or pose landmarks.
- Diagnoses, medication, medical records, or clinician notes.
- Free-text pain descriptions.
- Birth dates or unnecessary identity attributes.
- Data for model training or advertising.

## Authentication and secrets

- Supabase Auth owns authentication.
- API validates bearer tokens and creates a request-scoped user context.
- Publishable keys may appear in clients; secret/service keys never may.
- The secret key is limited to demo-user provisioning and Auth-user deletion.
- Secrets are environment variables, never seed data or committed files.

## RLS

- Enable and force RLS on every exposed table.
- Anonymous access is read-only and limited to active catalog/reference data.
- Authenticated access is owner-scoped.
- Every update policy has both `USING` and `WITH CHECK` ownership predicates.
- Use `(select auth.uid())` in policies and index every policy column.
- Do not use editable user metadata for authorization.
- Use `security_invoker` for exposed views.

## API protections

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

## Wellness guardrails

- Position the product as general wellness.
- Return general stop guidance and safety-warning codes.
- Never claim to diagnose, treat, rehabilitate, or clinically assess.
- Generated workouts exclude caution exercises by default.
- Compatibility explanations are transparent and non-clinical.
- Performance-change output is explicitly an indicator derived from session metrics, not a medical fatigue diagnosis.

## Deletion and retention

- Retain derived metrics until the user deletes a session or account.
- Session deletion removes metrics, summaries, events, and recomputes daily progress.
- Account deletion removes all application rows, then the Supabase Auth identity.
- Deletion is retry-safe and does not expose whether another user's records exist.
