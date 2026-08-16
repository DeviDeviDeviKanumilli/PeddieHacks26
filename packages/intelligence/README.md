# @peddie/intelligence

Isolated on-device intelligence runtime for AdaptFit. It implements the five-layer
contracts under `docs/architecture` as pure TypeScript: profile eligibility, motion
features, repetition tracking, a local orchestrator, and validated tool calls.

This package has no dependency on `apps/mobile`, `apps/api`, `@peddie/contracts`, or
`@peddie/domain`. Product surfaces must not import it.

The orchestrator satisfies the tool-calling contract with a deterministic local policy.
It does not load network weights or camera frames.

Product clients and the API must not import this package. Isolation is enforced by tests.
