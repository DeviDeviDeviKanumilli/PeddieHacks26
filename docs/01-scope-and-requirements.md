# Scope and Requirements

## Product

Build a general-wellness fitness product for disabled adults and people with temporary
or chronic movement limitations, including simple knee or back pain. A React Native
application for iOS and Android must make the complete experience accessible, while the backend adapts exercise
discovery and workout generation to a user's available movement, preferred body regions,
avoided body regions, and equipment.

The system must support this complete core loop:

```text
movement profile
  -> exercise discovery and compatibility
  -> generated or manual workout
  -> workout session
  -> exercise metrics
  -> post-exercise analysis
  -> history and progress
```

## Required behavior

- A user can describe preferred, limited, neutral, and avoided body regions.
- A user can describe available, limited, avoided, or unknown capabilities.
- A user can save equipment and goals.
- The catalog exposes requirements, safety cues, adaptations, sources, and tracking support.
- Compatibility returns clear reasons, warnings, conflicts, and alternatives.
- Generated workouts never include hard-incompatible exercises.
- Manual exercise selection can require explicit acknowledgement of caution warnings.
- A workout is a plan; a workout session is a user's execution of that plan.
- Metrics are uploaded in retry-safe batches.
- Analysis includes completion, ROM, accuracy, control, stability, tempo, and a non-clinical performance-change indicator.
- Progress supports history, activity-grid data, totals, trends, and body coverage.
- Users can delete individual sessions and their complete account.
- The mobile client covers onboarding and authentication, exercise discovery and details,
  compatibility guidance, movement-profile summary, optional camera setup, guided
  sessions, completion, history, progress, and detailed analysis.
- The mobile client remains usable through a seeded guest adapter without hosted services.
  When configured, live mode uses Supabase Auth and the bearer-aware Fastify API client.
- Every camera-assisted screen has an equally clear path that continues without tracking.

## Current mobile product shape

The current iOS and Android client uses five tabs: Home, Explore, Workout, Progress, and
Profile. Home is intentionally focused on the next action. Explore has two distinct modes:
**For me** shows a short compatible recommendation list and collections, while **All exercises**
shows the searchable, filterable catalog. Exercise-list rows use reusable category marks, and
the detail screen uses a compact family illustration beside the exercise name rather than a
large hero banner.

Progress begins with a dropdown for Last 7 days, Last 4 weeks, or Last 12 weeks, then shows
range-scoped totals and the activity grid before muscle coverage and recent workouts. During a
no-camera session, the app keeps the movement map and manual rep control visible and labels the
state with an icon and **Tracking off** text.

## Out of scope

- A replacement desktop-first website or expansion of the legacy `apps/web` prototype.
- Training a new pose model. On-device integration uses an off-the-shelf MediaPipe pose
  model plus per-exercise calibration; the backend does not perform pose estimation.
- Raw video, images, audio, or pose-landmark storage.
- Diagnosis, treatment, rehabilitation claims, or clinician workflows.
- Admin UI, social features, notifications, subscriptions, billing, and advertising.
- LLM-generated eligibility decisions.
- External exercise APIs.
- Supabase Storage, Realtime, Redis, queues, or background workers in v1.

## Initial catalog

Seed 24 reviewed exercises. Calibrate camera-derived tracking rules for:

- Seated biceps curl
- Seated resistance-band row
- Seated march
- Seated knee extension
- Sit-to-stand
- Wall push-up

These are backend tracking profiles for validating derived metrics and interpreting
exercise results. They do not give the backend access to camera frames. Production pose
inference runs on-device in the React Native application.

Every exercise needs source metadata, requirements, equipment behavior, safety cues, and a stable slug before it can be seeded as active.

## Constraints

- Duration requests: 5–45 minutes.
- Generated workout size: 3–6 exercises.
- Sets: 1–5.
- Reps: 1–50.
- Rest: 0–300 seconds.
- Metrics batch: at most 100 reps and 64 KB.
- Progress query range: at most 366 days.
- All timestamps are UTC `timestamptz` values.
- API JSON uses camelCase; database identifiers use lowercase snake_case.
- The React Native development server uses Expo tooling and the local Fastify API uses
  port 3000.
- Mobile camera access is opt-in. Camera frames and pose landmarks stay on-device;
  only allowlisted derived metrics may cross the API boundary.

## Success criteria

The mobile app must let a user navigate the supplied reference screens, configure movement
constraints, choose camera tracking or continue without it, complete a guided exercise,
and review history, progress, and detailed analysis without hosted dependencies. The core
discovery and progress hierarchy must remain understandable without relying on illustrations,
color alone, or a camera permission.

The hosted live acceptance flow must additionally allow a demo user to generate a
compatible workout, swap an exercise, upload only derived metrics for a tracked session,
complete it, retrieve analysis, see progress, delete a session, and delete the account. A
second user must be unable to read or modify the demo user's data.
