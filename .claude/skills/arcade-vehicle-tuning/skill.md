---
name: arcade-vehicle-tuning
description: Method for tuning Code for Speed arcade vehicle handling including acceleration, steering, grip, handbrake and drift.
user-invocable: false
paths:
  - src/vehicle/**
---

When tuning Code for Speed vehicle handling:

1. Establish baseline telemetry.
2. Change one behavior category at a time.
3. Measure again.
4. Compare against specs.
5. Reject changes that improve one metric while causing severe regressions elsewhere.

Tune in this order:

1. acceleration and top speed
2. braking
3. basic steering
4. high-speed steering
5. lateral grip
6. handbrake
7. drift initiation
8. drift sustain
9. drift recovery
10. nitro behavior

Do not begin drift tuning before basic steering is stable.

Prefer speed-dependent steering.

High-speed steering should generally be less aggressive than low-speed steering.

Drift must have three recognizable phases:

INITIATION
SUSTAIN
RECOVERY

Avoid binary grip switching when a progressive transition works better.

All significant tuning parameters must live in VehicleConfig or equivalent configuration.
