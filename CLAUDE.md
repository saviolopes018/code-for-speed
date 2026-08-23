# Code for Speed

Code for Speed is a browser-first 3D arcade street racing game.

The current objective is to build a small but polished vertical slice, not a complete racing game.

The highest priority is:

> Make the car genuinely enjoyable to drive.

Gameplay quality has priority over feature count, architecture complexity, and visual fidelity.

---

## Project Principles

These rules apply to every task and every agent.

1. **Browser-first**
   - The game must run directly in a modern desktop browser.
   - No installation should be required for the player.

2. **Arcade, not simulation**
   - Vehicle behavior should prioritize control, responsiveness and fun.
   - Physical realism is secondary.

3. **Gameplay before graphics**
   - A simple environment with excellent handling is better than a beautiful environment with poor handling.

4. **Performance matters**
   - Target approximately 60 FPS on modern desktop hardware.
   - Avoid unnecessary rendering, physics and allocation overhead.

5. **Keep the MVP small**
   - Do not implement systems that are not currently necessary.

6. **Prefer simple architecture**
   - Do not introduce abstractions without a concrete reason.
   - Do not design for hypothetical future requirements.

7. **Measure before optimizing**
   - Performance and handling changes should use measurable evidence whenever possible.

8. **Use open geographic data**
   - Do not scrape Google Maps or Google Street View.
   - Do not generate game assets derived from protected Google imagery.
   - Geographic world generation should use approved open data or project-provided datasets.

---

## Current MVP Scope

Build a browser-based free-roam driving sandbox
set in a geographically inspired representation
of Fortaleza, Brazil.

The player should be able to spawn into the world
and immediately drive freely without races,
missions or progression systems.

- one playable vehicle
- arcade vehicle physics
- handbrake
- drift
- nitro
- chase camera
- Fortaleza-inspired open urban area
- roads derived from open geographic data
- procedural buildings
- Brazilian urban props
- vehicle reset
- minimal HUD
- performance telemetry

---

## Explicitly Out of Scope

Do not implement unless explicitly requested:

- races
- checkpoints
- lap system
- race timer
- opponent AI
- ranking

---

## Technical Direction

Current preferred stack:

- TypeScript;
- Vite;
- Three.js;
- Rapier Physics / WASM;
- HTML/CSS for game UI;
- Vitest;
- Playwright.

Do not introduce a new major framework or replace a core dependency without a concrete technical reason.

Do not add React purely to build a small HUD.

---

## Domain Boundaries

Keep responsibilities separated.

### Vehicle

Vehicle systems own:

- acceleration;
- braking;
- steering;
- grip;
- drift;
- handbrake;
- nitro forces;
- vehicle telemetry.

Vehicle physics must not depend on HUD implementation.

Vehicle visuals must not define vehicle physics behavior.

Prefer separation between:

- VehiclePhysics
- VehicleController
- VehicleConfig
- VehicleTelemetry
- VehicleVisual

### Race

Race systems own:

- race state;
- countdown;
- checkpoints;
- laps;
- timing;
- finish detection;
- restart.

Race logic must not depend on HUD.

HUD observes race state.

### World

World systems own:

- geographic data parsing;
- normalized map representation;
- roads;
- buildings;
- world props;
- static environment collisions.

Raw external geographic data must not leak through the entire application.

Prefer:

```text
Source Data
    ↓
Parser
    ↓
Normalized Map Data
    ↓
World Generation
    ↓
Rendering / Physics
```

### Rendering

Rendering systems own:

- Three.js scene;
- renderer;
- lighting;
- materials;
- camera;
- visual effects;
- rendering performance.

Rendering code must not modify vehicle physics parameters to hide gameplay problems.

---

## Vehicle Philosophy

The vehicle is the most important system in the current project.

Vehicle behavior should be:

- responsive;
- predictable;
- forgiving;
- fast;
- easy to understand;
- difficult enough to reward skill.

Drift should have recognizable phases:

```text
INITIATION
    ↓
SUSTAIN
    ↓
RECOVERY
```

Drift should not behave like an arbitrary binary mode.

The handbrake should help initiate rotation and loss of rear grip, but the player must retain meaningful control.

High-speed steering should generally be less aggressive than low-speed steering.

Do not attempt to implement full racing simulation physics unless explicitly requested.

---

## Tunable Values

Gameplay tuning values should be centralized.

Avoid magic numbers spread across multiple files.

Examples:

- acceleration;
- braking force;
- maximum speed;
- steering response;
- grip;
- lateral grip;
- drag;
- handbrake effect;
- nitro force.

Changing a tuning value should generally not require changes to architecture or documentation.

---

## Specialized Agents

Project-level specialized agents live under:

```text
.claude/agents/
```

Use the appropriate specialized agent when a task belongs clearly to its domain.

Current agents:

### vehicle-dynamics

Use for:

- vehicle physics;
- steering;
- acceleration;
- braking;
- grip;
- drift;
- handbrake;
- nitro behavior;
- vehicle telemetry.

### gameplay-racing

Use for:

- checkpoints;
- laps;
- countdown;
- timer;
- race state;
- finish logic;
- restart logic.

### world-generation

Use for:

- GeoJSON;
- geographic data;
- road generation;
- procedural buildings;
- world construction;
- world colliders.

### rendering-performance

Use for:

- Three.js rendering;
- chase camera;
- lighting;
- shaders;
- materials;
- visual effects;
- FPS;
- draw calls;
- rendering optimization.

### game-assets

Use for:

- 3D models;
- textures;
- audio;
- GLTF/GLB;
- asset optimization;
- asset licensing.

### game-qa

Use after significant gameplay or technical changes to independently search for:

- regressions;
- broken states;
- performance degradation;
- console errors;
- physics instability;
- race exploits.

Do not delegate trivial tasks unnecessarily.

The main Claude session remains responsible for coordination and cross-domain decisions.

---

## Skills

Reusable project procedures live under:

```text
.claude/skills/
```

Agents should use the relevant skill instead of reinventing project-specific procedures.

Examples include:

- arcade vehicle tuning;
- vehicle evaluation;
- chase camera design;
- geographic data conversion;
- procedural city generation;
- browser performance analysis;
- race system conventions;
- quality gates.

Agents define **who owns a problem**.

Skills define **how recurring problems should be handled**.

---

## Development Workflow

For meaningful changes:

1. inspect the existing implementation;
2. identify the owning domain;
3. read relevant agent/skill instructions;
4. understand current behavior before changing it;
5. implement the smallest coherent change;
6. run relevant checks;
7. inspect regressions;
8. report what changed.

Do not rewrite functioning systems merely because another implementation appears cleaner.

Prefer incremental changes over large rewrites.

---

## Quality Gates

Before considering meaningful work complete, run the relevant available checks.

At minimum, when configured:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Run Playwright/browser tests for changes affecting runtime gameplay when available.

Do not claim completion if the application:

- fails to build;
- has fatal browser console errors;
- produces invalid physics values;
- prevents the race from completing;
- introduces a known significant regression.

If a check fails for an unrelated pre-existing reason, document that explicitly.

---

## Performance

Target:

```text
~60 FPS on modern desktop hardware
```

Monitor when relevant:

- FPS;
- frame time;
- draw calls;
- triangle count;
- active physics bodies;
- texture usage;
- asset sizes.

Prefer:

- shared geometry;
- shared materials;
- instancing;
- static colliders;
- frustum culling;
- LOD where justified.

Avoid per-frame allocations in hot gameplay paths when practical.

Do not prematurely optimize code that has not been measured.

---

## Geographic Data

World generation may use approved open geographic datasets such as OpenStreetMap or Overture Maps.

Do not:

- scrape Google Maps;
- scrape Street View;
- download Google imagery for game assets;
- reconstruct permanent game geometry from protected Google imagery.

Convert geographic coordinates into local game-space coordinates before they enter gameplay/rendering systems.

Geographic fidelity is secondary to:

1. gameplay;
2. road readability;
3. performance;
4. visual coherence.

It is acceptable to simplify real geography to make a better racing environment.

---

## Documentation Policy

Do not create specs for every feature.

At the current stage, the project deliberately avoids extensive specification files.

The source of truth should generally be:

```text
CLAUDE.md
+
agent instructions
+
skills
+
tests
+
code
```

Create a dedicated spec only when there is a stable cross-domain contract that multiple systems or agents need to share.

Good reasons to create a spec:

- a shared data contract;
- a major architectural boundary;
- a network protocol;
- a persistent file format;
- a complex system with multiple independent consumers.

Bad reasons:

- tuning values;
- experimental gameplay behavior;
- implementation details;
- temporary decisions;
- documenting every class.

When a spec becomes necessary, keep it focused on invariants and contracts rather than describing implementation line by line.

---

## Change Policy

Update this `CLAUDE.md` only when a project-wide rule or architectural direction changes.

Do not update it for:

- tuning changes;
- minor refactors;
- new constants;
- cosmetic adjustments;
- local implementation changes.

If an implementation contradicts this file, determine whether:

1. the implementation is wrong; or
2. the project-wide decision has intentionally changed.

Do not silently create competing conventions.

---

## Definition of Done

A task is complete when:

- its intended behavior works;
- relevant checks pass;
- no obvious regression was introduced;
- architecture boundaries remain respected;
- unnecessary scope was not added;
- important limitations are reported.

For vehicle-related work, passing tests alone is not enough.

The resulting behavior must also remain controllable and suitable for an arcade racing game.

---

## Ultimate Priority

When uncertain between two approaches, use this priority:

```text
Driving Feel
    ↓
Gameplay
    ↓
Stability
    ↓
Performance
    ↓
Visual Quality
    ↓
Architecture Elegance
```

Code for Speed is a game first.

Do not optimize the project for architectural sophistication at the expense of actually being fun to play.
