# Movement Profile

The movement profile is the durable input to eligibility, ranking, and generation. It is
user-owned, editable after onboarding, and sufficient to produce a workout without camera
access.

## Required Fields

- Goals: strength, mobility, balance, endurance, or equivalent closed vocabulary
- Region states: `neutral`, `focus`, `limited`, or `avoid` per body region
- Capability states: seated, standing, floor, and related posture constraints
- Equipment: closed vocabulary including everyday furniture and optional implements
- Accessibility preferences: larger text, high contrast, reduced motion, spoken
  feedback, haptic feedback, one-handed controls

## Encoding

Region and capability states are stored as explicit enumerations, not free text. Equipment
is a set of catalog tokens. Accessibility preferences are a set of named flags. The profile
must round-trip through `@peddie/contracts` validation before it is used for generation or
sync.

## Sensitive Areas

Regions marked `avoid` are hard exclusions for conflicting movement patterns. Regions
marked `limited` contribute caution scoring rather than silent omission. The profile never
stores diagnoses, medications, clinician notes, or free-text pain descriptions.

## Ownership

Guest profiles persist in on-device SQLite. Authenticated profiles sync through
`/v1/users/me` and `/v1/settings` using the caller's bearer token. The device remains able
to generate a workout from the local copy when the network is unavailable.
