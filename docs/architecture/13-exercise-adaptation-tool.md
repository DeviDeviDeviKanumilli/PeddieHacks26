# Exercise Adaptation Tool

`adaptation.propose` requests a bounded change to the in-progress prescription. It cannot
rewrite the catalog or override hard incompatibilities.

## Legal Arguments

- `action`: `reduce_range`, `reduce_reps`, `insert_rest`, `switch_alternative`
- `reasonCode`: closed issue or fatigue vocabulary
- `exerciseId`: must equal the active exercise

## Effects

- `reduce_range` asks the recipe to accept a smaller ROM envelope for remaining reps
- `reduce_reps` lowers remaining repetitions in the current set, never below one if the
  set has already started
- `insert_rest` lengthens the next rest, clamped to the same 30/45/60/90 options shown in
  setup
- `switch_alternative` is valid only when generation attached an eligible alternative

## Refusals

The tool refuses actions that would introduce incompatible equipment, standing when
standing is avoided, or jumping tags. It refuses to add exercises mid-session. The user
can dismiss a proposal; silence means the current prescription continues.
