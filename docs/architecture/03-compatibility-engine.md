# Compatibility Engine

The compatibility engine decides whether a catalog exercise may be recommended, shown with
caution, or excluded. It is deterministic. Eligibility is not delegated to a language model.

## Inputs

- Movement profile enumerations and equipment tokens
- Catalog exercise tags: category, position, equipment groups, impact, tracking support
- Region and muscle activations declared on the exercise

## Bitmasks

Closed vocabularies are packed into bitmasks for fast set tests:

- Equipment mask: chair, wall, band, dumbbells, none-as-furniture, and related tokens
- Position mask: seated, standing, floor, kneeling
- Constraint mask: avoid-knee, avoid-shoulder, no-jump, seated-only

An exercise is equipment-eligible when its requirement mask is a subset of the user's
available mask, including OR-groups such as "dumbbells or resistance band."

## Tag Rules

Bitmasks handle set membership. Detailed tag rules handle conflicts that are not pure
subsets:

- `avoid` on a region matching a primary pattern is a hard incompatibility
- Jumping, hopping, or plyometric tags are incompatible with no-impact preferences
- Standing position is incompatible with standing `avoid`
- Missing required extra equipment is incompatible unless an OR-group is satisfied

## Outputs

Each exercise receives `compatible`, `caution`, or `incompatible` plus a stable reason
code. Ranking may use caution as a penalty. Incompatible exercises are not prescribed.
The engine version is `compatibility-v1`.
