# Race System

Single mode: **Circuit Race** — start line, ordered checkpoints, 1 lap, timer, result.

## Flow
```
LOAD → 3 → 2 → 1 → GO → checkpoints (in order) → finish → race time → restart (R)
```
`RaceManager` owns the state machine (`countdown → racing → finished`), the `LapTimer`
and the `CheckpointManager`. Controls are locked during the countdown.

## Checkpoints (`CheckpointManager`)
- Gate 0 is start/finish. A lap requires passing gates `1..N-1` **in order**, then gate 0.
- Only the current required gate (`next`) can trigger, so you **cannot finish by crossing
  the finish line early** (anti-shortcut). Do not weaken this.
- Passing = planar proximity within a gate radius (~70% of road width) — robust and
  tunnel-proof, no swept collision needed.
- `lastCheckpoint` provides the respawn transform for `R` / auto-reset.

## Timer (`LapTimer`)
Accumulates only while running; advanced by fixed `dt`. Formats `MM:SS.mmm`.

## Reset
`R` respawns the car at the last passed checkpoint (upright, facing the track) and zeroes
velocity/nitro. The game also auto-resets when the car flips (`upDot < 0.3`) or falls off
the world (`y < -5`). When the race is finished, `R`/`ENTER` restarts from the countdown.

## Tests
`LapTimer`, `CheckpointManager` and `RaceManager` are deterministic and unit-tested
(order enforcement, anti-shortcut, full-lap finish, multi-lap, countdown lock, restart).
