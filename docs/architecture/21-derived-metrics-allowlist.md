# Derived Metrics Allowlist

A `RepMetric` is the only motion-derived object the API accepts. Unknown fields are
rejected. Landmark-shaped arrays are rejected by name.

## Permitted Fields

Closed fields from `@peddie/contracts`, including:

- Exercise and session identifiers
- Set and repetition indices
- Accepted-rep counts
- Elapsed time
- Optional range or confidence scalars when native inference produced them
- Optional `feedbackCodes` from the closed vocabulary

## Rejected Fields

- `landmarks`, `keypoints`, `coordinates`, `points`
- `image`, `frame`, `video`, `audio`, `uri`
- Arbitrary `note`, `comment`, or `feedback` strings
- Model logits or embedding vectors

## Native Gate

Live mode must not persist simulated form measurements. If the pose module did not
produce the sample, quality-like scalars are omitted and only counts and time are
eligible.

## Batching

Metrics are uploaded in bounded batches keyed by exercise session. Duplicate batches are
idempotent. Metrics after session completion return `409`.
