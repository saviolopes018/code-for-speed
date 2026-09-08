import { ShapeUtils, Vector2 } from 'three';
import { RAPIER, type Physics } from '../core/Physics';
import type { NormalizedBuilding } from './geo/GeoTypes';

/** Static footprint prisms preserve concave setbacks and use no rigid bodies. */
export function generateBuildingColliders(
  physics: Physics,
  buildings: NormalizedBuilding[],
): number {
  let count = 0;
  for (const building of buildings) {
    const { footprint, height } = building;
    if (footprint.length < 3 || !Number.isFinite(height) || height <= 0) continue;
    if (footprint.some(({ x, z }) => !Number.isFinite(x) || !Number.isFinite(z))) continue;

    const ring = footprint.map(({ x, z }) => new Vector2(x, z));
    if (ring[0].equals(ring[ring.length - 1])) ring.pop();
    if (ring.length < 3 || Math.abs(ShapeUtils.area(ring)) < 1e-6) continue;
    if (ShapeUtils.isClockWise(ring)) ring.reverse();

    const caps = ShapeUtils.triangulateShape(ring, []);
    if (caps.length === 0) continue;
    const n = ring.length;
    const vertices = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      vertices.set([ring[i].x, 0, ring[i].y], i * 3);
      vertices.set([ring[i].x, height, ring[i].y], (i + n) * 3);
    }
    const indices: number[] = [];
    for (const [a, b, c] of caps) {
      indices.push(a, b, c, a + n, c + n, b + n);
    }
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      indices.push(i, i + n, next, next, i + n, next + n);
    }
    physics.world.createCollider(
      RAPIER.ColliderDesc.trimesh(vertices, new Uint32Array(indices))
        .setFriction(0.4)
        .setRestitution(0),
    );
    count++;
  }
  return count;
}
