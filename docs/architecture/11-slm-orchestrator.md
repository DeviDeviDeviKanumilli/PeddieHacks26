# Local Orchestrator

The local orchestrator converts structured session state into validated tool calls. It
runs on the device. Parameter budget is under 125 million. It does not receive frames,
landmarks, or arbitrary user prose.

## Inputs

- Active prescription (exercise, sets, reps, rest)
- Latest bus events (`rep_accepted`, `issue_code`, `tracking_unavailable`, set/exercise
  lifecycle)
- Accessibility flags that affect which tools may fire
- A closed system schema describing legal tools and argument types

## Outputs

Zero or more tool calls. Each call names a registered tool and a JSON object that must
match that tool's schema. Calls that fail validation are dropped and recorded as
`tool_rejected`.

## Constraints

- No network round-trip is required to produce a call
- No tool argument may contain media, coordinates, or free-text user feedback
- The orchestrator may not mark an exercise complete; that remains the state machine's job
- Reduced-motion and spoken-feedback flags gate animation and speech tools respectively

## Failure

If the orchestrator is unavailable, the session still runs: the tracker counts, the UI
shows reps, and the user can finish without coaching. Orchestrator outage is not a
session-ending error.
