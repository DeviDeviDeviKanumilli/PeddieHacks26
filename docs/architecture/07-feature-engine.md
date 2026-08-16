# Feature Engine

The feature engine reduces pose angles into session features. It is a pure function of the
current sample plus a short rolling window. It does not call the network.

## Features

| Feature | Meaning | Unit |
| --- | --- | --- |
| Joint angle | Instantaneous hinge or orientation used by the recipe | degrees |
| Velocity | Discrete angle change over the sample interval | degrees / second |
| Range of motion | Peak-to-trough angle observed in the current repetition | degrees |
| Stability | Short-window variance of the tracked angle | degrees² |
| Confidence | Native visibility gate for the joints in the recipe | 0–1 |

## Windowing

The engine keeps a bounded in-memory window long enough to detect a target-then-return
cycle. It does not accumulate a full-session landmark tape. When tracking is off, the
engine emits no features and the session continues with manual or timed counting.

## Consumers

Repetition tracking consumes angle, velocity, and confidence. The temporal motion model
consumes range, stability, and the same confidence gate. Neither consumer receives raw
landmarks.
