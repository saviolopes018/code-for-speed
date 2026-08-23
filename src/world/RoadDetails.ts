import * as THREE from 'three';
import type { NormalizedRoad } from './geo/GeoTypes';
import { hashId } from './RoadSurfaceVariant';

/**
 * Cheap, deterministic surface detail: manhole covers merged into a single mesh.
 * Discrete, high-impact-per-cost detail that breaks the uniform asphalt without
 * physics or thousands of objects. Micro wear (cracks, stains, patches) is baked
 * into the asphalt texture itself; this layer adds the readable urban punctuation.
 */

const MANHOLE_Y = 0.065; // just above the road fill (0.06)
const MANHOLE_RADIUS = 0.38;
const MANHOLE_SEGMENTS = 14;
/** Per-eligible-vertex placement chance (0..100), by hash. Keeps them sparse. */
const PLACE_CHANCE = 5;
/** Hard cap so a huge import can never spam geometry. */
const MAX_MANHOLES = 600;
/** Only roads at least this wide carry manholes (skip alleys). */
const MIN_WIDTH = 6;

export interface RoadDetailStats {
  detailMeshes: number;
  manholes: number;
  vertices: number;
  triangles: number;
}

export interface RoadDetailResult {
  mesh: THREE.Mesh;
  stats: RoadDetailStats;
}

/**
 * Build the merged manhole mesh for the network. Placement is a stable hash of
 * (road id, vertex index): the same map always yields the same covers in the same
 * spots. Covers are nudged laterally off the centre line onto a notional lane.
 */
export function generateRoadDetails(roads: NormalizedRoad[]): RoadDetailResult {
  const positions: number[] = [];
  const indices: number[] = [];
  let vertexCount = 0;
  let manholeCount = 0;

  // Precompute a unit disc (triangle fan) once; instance it per manhole.
  const ring: Array<[number, number]> = [];
  for (let s = 0; s < MANHOLE_SEGMENTS; s++) {
    const a = (s / MANHOLE_SEGMENTS) * Math.PI * 2;
    ring.push([Math.cos(a) * MANHOLE_RADIUS, Math.sin(a) * MANHOLE_RADIUS]);
  }

  outer: for (const road of roads) {
    if (road.width < MIN_WIDTH) continue;
    const pts = road.points;
    const seed = hashId(road.id);
    const lateral = road.width * 0.22; // offset toward a lane

    for (let i = 1; i < pts.length - 1; i++) {
      const h = (seed ^ Math.imul(i + 1, 2654435761)) >>> 0;
      if (h % 100 >= PLACE_CHANCE) continue;
      if (manholeCount >= MAX_MANHOLES) break outer;

      const prev = pts[i - 1];
      const next = pts[i + 1];
      const dx = next.x - prev.x;
      const dz = next.z - prev.z;
      const len = Math.hypot(dx, dz) || 1;
      // Left-hand normal, alternating side by hash.
      const side = h & 8 ? 1 : -1;
      const offX = (-dz / len) * lateral * side;
      const offZ = (dx / len) * lateral * side;
      const cx = pts[i].x + offX;
      const cz = pts[i].z + offZ;

      // Centre vertex + ring, as a triangle fan.
      const centre = vertexCount;
      positions.push(cx, MANHOLE_Y, cz);
      vertexCount++;
      for (const [rx, rz] of ring) {
        positions.push(cx + rx, MANHOLE_Y, cz + rz);
        vertexCount++;
      }
      for (let s = 0; s < MANHOLE_SEGMENTS; s++) {
        const a = centre + 1 + s;
        const b = centre + 1 + ((s + 1) % MANHOLE_SEGMENTS);
        // Winding chosen so the disc faces +Y (up) for FrontSide lighting.
        indices.push(centre, b, a);
      }
      manholeCount++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x26282d,
    roughness: 0.65,
    metalness: 0.35,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.name = 'road-details';

  return {
    mesh,
    stats: {
      detailMeshes: 1,
      manholes: manholeCount,
      vertices: vertexCount,
      triangles: indices.length / 3,
    },
  };
}
