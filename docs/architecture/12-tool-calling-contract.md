# Tool-Calling Contract

Tools are the only side effects the local orchestrator may request. Each tool is a named
function with a TypeBox (or equivalent) schema, a timeout, and an idempotency key.

## Call Shape

```text
{
  "tool": "feedback.emit",
  "callId": "uuid",
  "arguments": { "code": "slow_eccentric", "channel": "visual" }
}
```

## Validation

1. `tool` must be in the allowlist for the current session phase
2. `arguments` must satisfy `additionalProperties: false`
3. Enum fields must match the closed vocabulary
4. Calls targeting a completed exercise are rejected
5. Duplicate `callId` values are ignored

## Phase Allowlist

| Phase | Allowed tools |
| --- | --- |
| Setup | `profile.read` |
| Active | `feedback.emit`, `speech.speak`, `haptics.pulse`, `adaptation.propose` |
| Rest | `speech.speak`, `haptics.pulse`, `progress.record_set` |
| Complete | `progress.record_exercise`, `profile.note_completion` |

## Rejection Codes

`unknown_tool`, `invalid_arguments`, `phase_forbidden`, `duplicate_call`,
`media_field_present`. Rejected calls never execute.
