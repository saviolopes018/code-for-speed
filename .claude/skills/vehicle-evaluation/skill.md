---
name: vehicle-evaluation
description: Evaluation protocol for detecting regressions in Code for Speed vehicle behavior.
---

Evaluate vehicle behavior using repeatable scenarios.

Required scenarios:

STRAIGHT LINE

- 0-100 km/h
- top speed
- stability

BRAKING

- braking from defined speed
- stopping distance
- directional stability

CORNERING

- low-speed corner
- medium-speed corner
- high-speed corner

DRIFT

- initiation
- maximum controllable angle
- sustained drift
- recovery

FAIL immediately if:

- transform contains NaN
- vehicle falls through world
- vehicle accelerates indefinitely
- reset produces invalid state
- steering oscillates uncontrollably
- vehicle becomes permanently unrecoverable after normal drift
