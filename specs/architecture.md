# Architecture

## Overview
Single-page Three.js game, no backend. Bootstrap in `src/main.ts` → `Game`.

```
main.ts → Game.init()
  Physics.init() (Rapier WASM)
  Renderer (WebGLRenderer + Scene + PerspectiveCamera)
  World.build() → Environment, Lighting, Ground, TrackBuilder, StreetLights,
                  GeoJSON → MapParser → BuildingGenerator
  Vehicle (VehiclePhysics + VehicleController + VehicleVisual)
  ChaseCamera, RaceManager (+ CheckpointManager, LapTimer), CheckpointVisuals
  HUD, Overlay, DebugPanel, InputManager, GameLoop
```

## Loop & timing
`Time` implements a fixed-timestep accumulator at 60 Hz (`fixedDelta = 1/60`).
`Game.tick(now)`:
1. `steps = time.tick(now)` — number of fixed steps owed this frame (clamped).
2. For each step (only while `state === 'playing'`): advance `RaceManager`, feed the
   vehicle a `DriveCommand` (neutral while the countdown locks controls), step Rapier,
   process race events.
3. Once per frame: sync visuals, update camera (uses render delta for smoothing), update
   HUD + debug panel, render.

Fixed steps keep physics/race deterministic and frame-rate independent; camera and
visuals interpolate at render rate.

## State machine
`Game.state`: `title → playing ⇄ paused`. `RaceManager.state`: `countdown → racing →
finished`. Controls are locked during `countdown`. `R` resets to the last checkpoint
mid-race, or restarts when finished; `ENTER` starts from the title / restarts from results.

## Boundaries
- Camera and race read the `Vehicle` facade only — never Rapier directly.
- `VehiclePhysics` never sees the keyboard (that's `VehicleController`).
- `VehicleVisual` is isolated so the debug mesh can be swapped for a model later.
- Map geometry is engine-agnostic (`MapData`); generators turn it into Three.js meshes.

## Debug hook
`window.__CFS__` exposes `getState`, `raceState`, `getSpeed`, `getFps`, `hasVehicle`,
`isRunning` for the Playwright smoke test and manual debugging.
