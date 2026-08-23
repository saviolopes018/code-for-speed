---
name: race-system
description: Conventions for deterministic race, lap and checkpoint systems.
paths:
  - src/race/**
---

Race state must be explicit.

Preferred progression:

LOADING
READY
COUNTDOWN
RACING
FINISHED

Checkpoint progression must be ordered.

The finish line does not complete a race unless:

- race state is RACING
- required checkpoints have been validated
- required laps have been completed

Timing must use a monotonic time source.

Race restart must reset all transient race state.

Avoid race logic dependent on HUD state.

HUD observes RaceManager.

RaceManager never depends on HUD.
