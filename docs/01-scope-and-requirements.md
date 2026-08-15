# Scope and Requirements

## Product

Build a general-wellness fitness backend for disabled adults and people with temporary or chronic movement limitations, including simple knee or back pain. The backend must adapt exercise discovery and workout generation to a user's available movement, preferred body regions, avoided body regions, and equipment.

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

## Out of scope

- Frontend implementation, UI design, styling, or screen architecture.
- Choosing a web/mobile pose library.
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

## Success criteria

The hosted demo must allow a demo user to configure constraints, generate a compatible workout, swap an exercise, upload a tracked session, complete it, retrieve analysis, see progress, delete a session, and delete the account. A second user must be unable to read or modify the demo user's data.
