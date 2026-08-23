# Vehicle & Handling

Target: **arcade, closer to Mario Kart than Assetto Corsa, but with weight.**
Not a tyre/suspension simulation.

## Model (`VehiclePhysics.step`)
Runs once per fixed step on a Rapier dynamic rigid body (cuboid collider). Pitch/roll
are locked (`enabledRotations(false, true, false)`) so only yaw is free — the car stays
upright and behaves predictably.

Each step:
1. Read heading (`forward`, `right`) from the body rotation.
2. Decompose planar velocity into `forwardSpeed` and `lateralSpeed`.
3. **Longitudinal:** throttle × `acceleration` + nitro force; brake either brakes
   (moving forward) or reverses; coasting applies `engineBraking`; then `drag` and a
   clamp to `[-reverseMaxSpeed, maxSpeed (+ nitro bonus)]`.
4. **Lateral grip (drift):** `newLateral = lateralSpeed × (1 - grip)`.
   - Normal: `grip = lateralGrip` (high → planted).
   - Handbrake: `grip = lateralGrip × handbrakeGripMultiplier` (very loose → slides).
   - Fast + steering + throttle: `grip = driftGrip` (controllable power-drift).
5. Recompose velocity (keeping vertical/gravity) and set it on the body.
6. **Steering:** target a yaw angular velocity = `-steer × steeringAngle × authority ×
   dir × rollFactor`, eased by `steeringSpeed`. Authority falls off with speed
   (`highSpeedSteerFalloff`); `rollFactor` prevents turning in place at a standstill;
   `dir` flips steering in reverse.

## Tuning
Everything lives in `VehicleConfig.ts` / `DEFAULT_VEHICLE_CONFIG`. Speeds are m/s
(HUD shows km/h ×3.6). Grips are 0..1 fractions removed per fixed step.

Feel knobs:
- More grip/harder drift entry → raise `lateralGrip`, lower `driftGrip`.
- Looser handbrake → lower `handbrakeGripMultiplier`.
- Snappier low-speed turn-in → raise `steeringAngle`; calmer at top speed → lower
  `highSpeedSteerFalloff`.
- Punchier nitro → raise `nitroForce` / `nitroMaxSpeedBonus`.

## Telemetry & drift
`VehicleTelemetry` exposes speed, throttle/brake/steer, lateral velocity, `isDrifting`,
`driftAngle` (atan2 of lateral vs forward speed), `driftDuration`, current grip and
nitro. Drift is reported (not scored) above `driftMinSpeed` and `driftAngleThreshold`.

## Nitro
`NitroSystem` — deterministic tank (0..`nitroCapacity`). Drains `nitroDrain`/s while
held with fuel, regenerates `nitroRegen`/s otherwise, resets on respawn. Unit-tested.
