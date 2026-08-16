# User Profile Tool

`profile.read` and `profile.note_completion` are the only profile tools. They cannot
invent new region states or equipment from motion.

## `profile.read`

Returns the in-memory movement profile used for this session: goals, region states,
capabilities, equipment, accessibility flags. Used by the orchestrator to decide which
channels are legal.

## `profile.note_completion`

Records that a prescribed exercise was finished or skipped. Arguments:

- `exerciseId`
- `outcome`: `completed`, `skipped`, `ended_early`
- `acceptedReps`

This note feeds local history. It does not flip `avoid` to `neutral` or add equipment. Any
later profile edit is an explicit user action on Profile or onboarding.

## Refusals

Arguments that include symptoms, pain text, or media are rejected. The tool will not
write clinician-facing fields; AdaptFit does not store those fields anywhere.
