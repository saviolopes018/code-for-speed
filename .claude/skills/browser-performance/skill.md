---
name: browser-performance
description: Performance methodology and budgets for the Three.js browser runtime.
---

Never optimize based only on intuition.

Measure:

- FPS
- frame time
- draw calls
- triangles
- active physics bodies
- texture count
- relevant asset sizes

Prioritize optimizations approximately in this order:

1. pathological CPU work
2. excessive draw calls
3. excessive dynamic physics
4. expensive shadows
5. excessive geometry
6. texture pressure
7. unnecessary allocations

Prefer:

- InstancedMesh
- shared BufferGeometry
- shared materials
- static colliders
- object pooling where useful
- frustum culling
- LOD where justified

Avoid per-frame allocations in hot paths.

Avoid rebuilding geometry during the game loop unless required.

Document before/after metrics for significant performance work.
