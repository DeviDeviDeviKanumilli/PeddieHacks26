# Motion Event Bus

The motion event bus is an in-process pub/sub on the device. It is the only coupling
between the motion pipeline and the local orchestrator.

## Event Envelope

Every event has:

- `type`: closed vocabulary
- `at`: monotonic timestamp
- `exerciseId`: catalog identifier
- `setIndex` and `repIndex` when applicable
- `payload`: schema-validated object with no landmark fields

## Published Types

- `feature_sample` (angles, velocity, ROM, stability, confidence)
- `rep_accepted`
- `set_complete`
- `rest_started`
- `exercise_complete`
- `issue_code`
- `tracking_unavailable`

## Guarantees

- Events stay in memory. The bus is not a durable log.
- Subscribers cannot read camera frames.
- Payloads are stripped of coordinates before publish.
- Backpressure drops `feature_sample` first; lifecycle events (`rep_accepted`,
  `exercise_complete`) are retained.

## Subscribers

The repetition tracker, temporal model, session UI, and local orchestrator may subscribe.
The Fastify API is not a subscriber. Sync happens later, from allowlisted aggregates, not
from the live bus.
