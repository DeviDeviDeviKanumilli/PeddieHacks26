# System Overview

AdaptFit constructs a compatible workout from a saved movement profile, then optionally
observes motion on the device, converts that observation into structured events, and
emits guidance through visual, speech, and haptic channels. The cloud is never required
for a session to run.

## Layer Responsibilities

| Layer | Responsibility | Trust zone |
| --- | --- | --- |
| Profile and generation | Eligibility, ranking, and prescription | Device, with optional authenticated sync |
| Motion pipeline | Camera, pose, features, reps, quality | Device only |
| Local orchestrator | Structured state to validated tool calls | Device only |
| Feedback and accessibility | Visual, voice, haptic presentation | Device only |
| Privacy-first data flow | Allowlisted derived metrics, optional history | Device trusted; cloud optional |

## Data Direction

Camera frames, images, audio, and pose coordinates originate on the device and terminate
on the device. The motion pipeline publishes derived events onto an in-process bus. The
orchestrator consumes those events plus the active prescription and may invoke tools.
Tools may update local session state, speak, vibrate, or request a prescription change.
Only allowlisted derived metrics may cross to the Fastify API.

## Non-Goals

- Diagnosis, treatment, or rehabilitation claims
- Server-side pose inference
- Free-text model training on user media
- Unbounded natural-language tool arguments
