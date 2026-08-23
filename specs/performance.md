# Performance

Target: **~60 FPS on modern desktop.** WebGL2 via Three.js. WebGPU not required.

## Techniques in use
- **Instancing:** lane markings, barriers, street lamp poles/heads (`InstancedMesh`).
- **Merged geometry:** buildings merged per category → few draw calls (`mergeGeometries`).
- **Shared materials/geometry:** wheels, posts, gate posts reuse single material/geo.
- **Static colliders:** ground = one cuboid; barriers/buildings = fixed bodies.
- **Limited dynamic lights:** one shadow-casting directional "moon"; street lamps are
  mostly emissive with a capped number of real `PointLight`s (`maxRealLights`).
- **No post-processing** for the MVP (only ACES tonemapping).
- **Scratch objects** reused in per-frame/per-step code to avoid GC churn.
- **Pixel ratio capped** at 2.

## Metrics (F3 debug panel)
FPS, draw calls, triangles, textures, geometries, physics body count, plus full vehicle
telemetry. Use this to catch regressions.

## Budgets / watch-list
- Keep total draw calls low (hundreds, not tens of thousands).
- Physics bodies in the low hundreds (barriers + buildings + car). If a bigger city is
  added, cull distant colliders or only collide near the track.
- Avoid 4K textures and per-decoration colliders.
- If FPS drops: reduce `PointLight` count, shadow map size (`Lighting.ts`), building
  density (`ProceduralCity` grid), or barrier collider resolution (`TrackBuilder`).
